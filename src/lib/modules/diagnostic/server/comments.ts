/**
 * Report conversation.
 *
 * Comments never edit a delivered version. A correction or revision is a new
 * version produced elsewhere; this module only records the conversation around
 * the exact version the client holds.
 *
 * Route rules:
 *   Montsel self-service — correction and explanation only.
 *   Langfell consultancy — question, revision request and correction.
 * A Montsel client cannot open a question or revision request, even by crafting
 * a request; the repository refuses it.
 */

import { getDB } from '#lib/platform/database/db.js';
import {
	assertOperationContext,
	type OperationContext
} from '#lib/modules/tenancy/server/context.js';

export type CommentKind = 'question' | 'revision_request' | 'correction' | 'explanation';
export type CommentStatus = 'open' | 'answered' | 'resolved' | 'closed';

const MONTSEL_KINDS: readonly CommentKind[] = ['correction', 'explanation'];
const LANGFELL_KINDS: readonly CommentKind[] = [
	'question',
	'revision_request',
	'correction'
];

export interface CommentMessage {
	id: string;
	authorId: string | null;
	authorRole: 'client' | 'consultant' | 'support';
	body: string;
	createdAt: string;
}

export interface CommentThread {
	id: string;
	outputId: string;
	outputVersionId: string;
	sectionKey: string | null;
	kind: CommentKind;
	status: CommentStatus;
	raisedBy: string | null;
	createdAt: string;
	messages: CommentMessage[];
}

function iso(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

export class CommentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CommentError';
	}
}

export async function latestOutputVersion(
	ctx: OperationContext,
	outputId: string
): Promise<{ id: string; versionNumber: number } | null> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{ id: string; versionNumber: number }>(
		`SELECT "id", "version_number" AS "versionNumber"
		 FROM "output_version"
		 WHERE "output_id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		 ORDER BY "version_number" DESC
		 LIMIT 1`,
		[outputId, ctx.brandId, ctx.organisationId]
	);
	return rows[0] ?? null;
}

export async function listSections(
	ctx: OperationContext,
	outputVersionId: string
): Promise<Array<{ key: string; heading: string; order: number }>> {
	assertOperationContext(ctx);
	const db = await getDB();
	const { rows } = await db.query<{
		key: string;
		heading: string;
		order: number;
	}>(
		`SELECT s."section_key" AS "key", s."heading", s."section_order" AS "order"
		 FROM "output_version_section" s
		 JOIN "output_version" v ON v."id" = s."output_version_id"
		 WHERE s."output_version_id" = $1
		   AND v."brand_id" = $2 AND v."organisation_id" = $3
		 ORDER BY s."section_order"`,
		[outputVersionId, ctx.brandId, ctx.organisationId]
	);
	return rows;
}

export async function listThreads(
	ctx: OperationContext,
	outputId: string
): Promise<CommentThread[]> {
	assertOperationContext(ctx);
	return listThreadsForScope(
		{ organisationId: ctx.organisationId, brandId: ctx.brandId },
		outputId
	);
}

/** Consultant workspace variant: the engagement scope is already authorised. */
export async function listThreadsForScope(
	scope: { organisationId: string; brandId: string },
	outputId: string
): Promise<CommentThread[]> {
	const db = await getDB();
	const { rows: threads } = await db.query<{
		id: string;
		outputId: string;
		outputVersionId: string;
		sectionKey: string | null;
		kind: CommentKind;
		status: CommentStatus;
		raisedBy: string | null;
		createdAt: Date | string;
	}>(
		`SELECT "id", "output_id" AS "outputId",
		        "output_version_id" AS "outputVersionId",
		        "section_key" AS "sectionKey", "kind", "status",
		        "raised_by" AS "raisedBy", "created_at" AS "createdAt"
		 FROM "report_comment_thread"
		 WHERE "output_id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		   AND "visibility" = 'client'
		 ORDER BY "created_at" DESC`,
		[outputId, scope.brandId, scope.organisationId]
	);
	if (threads.length === 0) return [];

	const { rows: messages } = await db.query<{
		id: string;
		threadId: string;
		authorId: string | null;
		authorRole: 'client' | 'consultant' | 'support';
		body: string;
		createdAt: Date | string;
	}>(
		`SELECT "id", "thread_id" AS "threadId", "author_id" AS "authorId",
		        "author_role" AS "authorRole", "body", "created_at" AS "createdAt"
		 FROM "report_comment_message"
		 WHERE "thread_id" = ANY($1::text[])
		 ORDER BY "created_at" ASC`,
		[threads.map((thread) => thread.id)]
	);

	const byThread = new Map<string, CommentMessage[]>();
	for (const message of messages) {
		const list = byThread.get(message.threadId) ?? [];
		list.push({
			id: message.id,
			authorId: message.authorId,
			authorRole: message.authorRole,
			body: message.body,
			createdAt: iso(message.createdAt)
		});
		byThread.set(message.threadId, list);
	}

	return threads.map((thread) => ({
		id: thread.id,
		outputId: thread.outputId,
		outputVersionId: thread.outputVersionId,
		sectionKey: thread.sectionKey,
		kind: thread.kind,
		status: thread.status,
		raisedBy: thread.raisedBy,
		createdAt: iso(thread.createdAt),
		messages: byThread.get(thread.id) ?? []
	}));
}

async function deliveryRouteForOutput(
	ctx: OperationContext,
	outputId: string
): Promise<string> {
	const db = await getDB();
	const runRef = outputId.startsWith('out_') ? outputId.slice(4) : null;
	if (!runRef) return 'montsel_self_service';
	const { rows } = await db.query<{ deliveryRoute: string }>(
		`SELECT "delivery_route" AS "deliveryRoute"
		 FROM "diagnostic_engagement"
		 WHERE "engine_run_ref" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		 LIMIT 1`,
		[runRef, ctx.brandId, ctx.organisationId]
	);
	return rows[0]?.deliveryRoute ?? 'montsel_self_service';
}

export interface CreateThreadInput {
	outputId: string;
	outputVersionId: string;
	sectionKey?: string | null;
	kind: CommentKind;
	body: string;
}

export async function createThread(
	ctx: OperationContext,
	input: CreateThreadInput
): Promise<string> {
	assertOperationContext(ctx);
	const body = input.body.trim();
	if (!body) throw new CommentError('Write the question or correction first.');
	const route = await deliveryRouteForOutput(ctx, input.outputId);
	const allowed = route === 'langfell_consultancy' ? LANGFELL_KINDS : MONTSEL_KINDS;
	if (!allowed.includes(input.kind))
		throw new CommentError(
			route === 'langfell_consultancy'
				? 'Choose a question, revision request or correction.'
				: 'Montsel reports accept corrections and explanations only.'
		);

	const db = await getDB();
	const threadId = `thr_${crypto.randomUUID()}`;
	const messageId = `msg_${crypto.randomUUID()}`;
	const client = await db.connect();
	try {
		await client.query('BEGIN');
		await client.query(
			`INSERT INTO "report_comment_thread"
			   ("id", "organisation_id", "brand_id", "output_id", "output_version_id",
			    "section_key", "raised_by", "visibility", "kind", "status")
			 VALUES ($1, $2, $3, $4, $5, $6, $7, 'client', $8, 'open')`,
			[
				threadId,
				ctx.organisationId,
				ctx.brandId,
				input.outputId,
				input.outputVersionId,
				input.sectionKey ?? null,
				ctx.userId,
				input.kind
			]
		);
		await client.query(
			`INSERT INTO "report_comment_message"
			   ("id", "thread_id", "author_id", "author_role", "body")
			 VALUES ($1, $2, $3, 'client', $4)`,
			[messageId, threadId, ctx.userId, body]
		);
		await client.query('COMMIT');
		return threadId;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function addClientMessage(
	ctx: OperationContext,
	threadId: string,
	body: string
): Promise<void> {
	assertOperationContext(ctx);
	const text = body.trim();
	if (!text) throw new CommentError('Write a message first.');
	const db = await getDB();
	const { rows } = await db.query<{ id: string }>(
		`SELECT "id" FROM "report_comment_thread"
		 WHERE "id" = $1 AND "brand_id" = $2 AND "organisation_id" = $3
		   AND "visibility" = 'client'
		 LIMIT 1`,
		[threadId, ctx.brandId, ctx.organisationId]
	);
	if (!rows[0]) throw new CommentError('That conversation is unavailable.');
	await db.query(
		`INSERT INTO "report_comment_message"
		   ("id", "thread_id", "author_id", "author_role", "body")
		 VALUES ($1, $2, $3, 'client', $4)`,
		[`msg_${crypto.randomUUID()}`, threadId, ctx.userId, text]
	);
}

export async function addConsultantMessage(
	threadId: string,
	userId: string,
	body: string
): Promise<void> {
	const text = body.trim();
	if (!text) throw new CommentError('Write a reply first.');
	const db = await getDB();
	await db.query(
		`INSERT INTO "report_comment_message"
		   ("id", "thread_id", "author_id", "author_role", "body")
		 VALUES ($1, $2, $3, 'consultant', $4)`,
		[`msg_${crypto.randomUUID()}`, threadId, userId, text]
	);
	await db.query(
		`UPDATE "report_comment_thread"
		 SET "status" = 'answered', "updated_at" = now()
		 WHERE "id" = $1 AND "status" = 'open'`,
		[threadId]
	);
}
