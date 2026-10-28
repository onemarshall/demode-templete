/**
 * Visual Contract — persistence.
 *
 * Every function takes a `DraftActor` and folds it into the WHERE clause, so
 * authorisation is structural rather than a check a caller can forget. A brand
 * actor is constrained to its own brand and organisation; a guest actor is
 * constrained to its token hash and expiry.
 *
 * Guest drafts never create an `output` row. Only a brand draft does, which is
 * what makes a contract appear in Documents.
 */

import { getDB, withTransaction } from '#lib/platform/database/db.js';
import type { OperationContext } from '#lib/modules/tenancy/server/context.js';
import type {
	AxisKey,
	ChoiceValue,
	ContractChoices,
	DraftStatus,
	FlowStep,
	ProjectContext
} from '../shared/types.js';
import { safeParseCompleteChoices, safeParseProjectContext } from '../shared/choices.js';
import { buildContractContent, type ContractContent } from '../shared/generate.js';
import { createGuestToken, contractExpiry, guestExpiry, hashGuestToken, type DraftActor } from './actor.js';

export interface DraftRecord {
	id: string;
	ownerUserId: string | null;
	organisationId: string | null;
	brandId: string | null;
	projectContext: ProjectContext;
	choices: ContractChoices;
	currentStep: FlowStep;
	status: DraftStatus;
	generatedVersionId: string | null;
	guestExpiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ContractVersionRecord {
	id: string;
	publicId: string;
	versionNumber: number;
	choices: Record<AxisKey, ChoiceValue>;
	projectContext: ProjectContext;
	contentVersion: number;
	rendered: ContractContent;
	confirmedAt: string;
	createdAt: string;
	/** Null means permanent: claimed and brand contracts never expire. */
	expiresAt: string | null;
}

const iso = (value: Date | string | null): string | null =>
	value === null ? null : value instanceof Date ? value.toISOString() : value;

/**
 * The authorisation clause for one actor.
 *
 * `$1` is always the draft id. The brand variant consumes two parameters and the
 * guest variant one, so the caller is given `next` — the placeholder index that
 * follows — instead of hard-coding `$4` and silently shifting the payload.
 */
function actorClause(
	actor: DraftActor,
	start = 2
): { sql: string; params: unknown[]; next: number } {
	if (actor.kind === 'brand') {
		return {
			sql: `"brand_id" = $${start} AND "organisation_id" = $${start + 1}`,
			params: [actor.brandId, actor.organisationId],
			next: start + 2
		};
	}
	return {
		sql: `"guest_edit_token_hash" = $${start} AND "guest_expires_at" > now()`,
		params: [actor.tokenHash],
		next: start + 1
	};
}

interface DraftRow {
	id: string;
	ownerUserId: string | null;
	organisationId: string | null;
	brandId: string | null;
	projectContext: unknown;
	choices: unknown;
	currentStep: FlowStep;
	status: DraftStatus;
	generatedVersionId: string | null;
	guestExpiresAt: Date | string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

const toDraft = (row: DraftRow): DraftRecord => ({
	id: row.id,
	ownerUserId: row.ownerUserId,
	organisationId: row.organisationId,
	brandId: row.brandId,
	projectContext: safeParseProjectContext(row.projectContext),
	choices: (row.choices ?? {}) as ContractChoices,
	currentStep: row.currentStep,
	status: row.status,
	generatedVersionId: row.generatedVersionId,
	guestExpiresAt: iso(row.guestExpiresAt),
	createdAt: iso(row.createdAt) ?? '',
	updatedAt: iso(row.updatedAt) ?? ''
});

const DRAFT_COLUMNS = `"id", "owner_user_id" AS "ownerUserId", "organisation_id" AS "organisationId",
	"brand_id" AS "brandId", "project_context" AS "projectContext", "choices",
	"current_step" AS "currentStep", "status", "generated_version_id" AS "generatedVersionId",
	"guest_expires_at" AS "guestExpiresAt", "created_at" AS "createdAt", "updated_at" AS "updatedAt"`;

/** Create a draft for a signed-in user, optionally attached to the active brand. */
export async function createBrandDraft(
	actor: Extract<DraftActor, { kind: 'brand' }>,
	context: ProjectContext = {}
): Promise<DraftRecord> {
	const db = await getDB();
	const { rows } = await db.query<DraftRow>(
		`INSERT INTO "visual_contract_draft"
			("id", "owner_user_id", "organisation_id", "brand_id", "project_context", "current_step")
		 VALUES ($1, $2, $3, $4, $5::jsonb, 'context')
		 RETURNING ${DRAFT_COLUMNS}`,
		[crypto.randomUUID(), actor.userId, actor.organisationId, actor.brandId, JSON.stringify(context)]
	);
	return toDraft(rows[0]);
}

/**
 * Create a guest draft. The raw token is returned once, for the cookie and the
 * optional save link; only its hash is stored.
 */
export async function createGuestDraft(
	context: ProjectContext = {}
): Promise<{ draft: DraftRecord; token: string }> {
	const db = await getDB();
	const token = createGuestToken();
	const tokenHash = await hashGuestToken(token);
	const expires = guestExpiry();
	const { rows } = await db.query<DraftRow>(
		`INSERT INTO "visual_contract_draft"
			("id", "guest_edit_token_hash", "guest_expires_at", "project_context", "current_step")
		 VALUES ($1, $2, $3, $4::jsonb, 'context')
		 RETURNING ${DRAFT_COLUMNS}`,
		[crypto.randomUUID(), tokenHash, expires, JSON.stringify(context)]
	);
	return { draft: toDraft(rows[0]), token };
}

/** Load a draft the actor is allowed to edit. A miss is indistinguishable from a wrong id. */
export async function loadDraft(actor: DraftActor, draftId: string): Promise<DraftRecord | null> {
	const db = await getDB();
	const clause = actorClause(actor);
	const { rows } = await db.query<DraftRow>(
		`SELECT ${DRAFT_COLUMNS} FROM "visual_contract_draft" WHERE "id" = $1 AND ${clause.sql}`,
		[draftId, ...clause.params]
	);
	return rows[0] ? toDraft(rows[0]) : null;
}

/** Find the draft a guest token belongs to, without knowing the draft id first. */
export async function findGuestDraft(tokenHash: string): Promise<DraftRecord | null> {
	const db = await getDB();
	const { rows } = await db.query<DraftRow>(
		`SELECT ${DRAFT_COLUMNS} FROM "visual_contract_draft"
		 WHERE "guest_edit_token_hash" = $1 AND "guest_expires_at" > now()
		 LIMIT 1`,
		[tokenHash]
	);
	return rows[0] ? toDraft(rows[0]) : null;
}

/** Record one choice. Re-choosing the same pair overwrites it; other pairs are untouched. */
export async function saveChoice(
	actor: DraftActor,
	draftId: string,
	axis: AxisKey,
	value: ChoiceValue
): Promise<DraftRecord | null> {
	const db = await getDB();
	const clause = actorClause(actor);
	const { rows } = await db.query<DraftRow>(
		`UPDATE "visual_contract_draft"
		 SET "choices" = "choices" || jsonb_build_object($${clause.next}::text, $${clause.next + 1}::text),
		     "updated_at" = now()
		 WHERE "id" = $1 AND ${clause.sql}
		 RETURNING ${DRAFT_COLUMNS}`,
		[draftId, ...clause.params, axis, value]
	);
	return rows[0] ? toDraft(rows[0]) : null;
}

export async function saveProjectContext(
	actor: DraftActor,
	draftId: string,
	context: ProjectContext
): Promise<DraftRecord | null> {
	const db = await getDB();
	const clause = actorClause(actor);
	const { rows } = await db.query<DraftRow>(
		`UPDATE "visual_contract_draft"
		 SET "project_context" = $${clause.next}::jsonb, "updated_at" = now()
		 WHERE "id" = $1 AND ${clause.sql}
		 RETURNING ${DRAFT_COLUMNS}`,
		[draftId, ...clause.params, JSON.stringify(context)]
	);
	return rows[0] ? toDraft(rows[0]) : null;
}

export async function setStep(
	actor: DraftActor,
	draftId: string,
	step: FlowStep,
	status?: DraftStatus
): Promise<DraftRecord | null> {
	const db = await getDB();
	const clause = actorClause(actor);
	const { rows } = await db.query<DraftRow>(
		`UPDATE "visual_contract_draft"
		 SET "current_step" = $${clause.next}::text,
		     "status" = COALESCE($${clause.next + 1}::text, "status"),
		     "updated_at" = now()
		 WHERE "id" = $1 AND ${clause.sql}
		 RETURNING ${DRAFT_COLUMNS}`,
		[draftId, ...clause.params, step, status ?? null]
	);
	return rows[0] ? toDraft(rows[0]) : null;
}

/** A brand's drafts plus the user's personal ones, most recently updated first. */
export async function listBrandDrafts(ctx: OperationContext, userId: string): Promise<DraftRecord[]> {
	const db = await getDB();
	const { rows } = await db.query<DraftRow>(
		`SELECT ${DRAFT_COLUMNS} FROM "visual_contract_draft"
		 WHERE ("brand_id" = $1 AND "organisation_id" = $2)
		    OR ("owner_user_id" = $3 AND "brand_id" IS NULL)
		 ORDER BY "updated_at" DESC
		 LIMIT 50`,
		[ctx.brandId, ctx.organisationId, userId]
	);
	return rows.map(toDraft);
}

function randomPublicId(): string {
	// 24 random bytes, base64url. Unguessable, and short enough to read aloud.
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a contract version.
 *
 * Idempotent: a draft that already has a version returns that version instead
 * of creating a duplicate, so a double-submit cannot fork a shared link.
 * The row lock keeps two concurrent submits from both passing the check.
 */
export async function generateContract(
	actor: DraftActor,
	draftId: string
): Promise<{ version: ContractVersionRecord; created: boolean } | null> {
	return withTransaction(async (client) => {
		const clause = actorClause(actor);
		const { rows } = await client.query<DraftRow>(
			`SELECT ${DRAFT_COLUMNS} FROM "visual_contract_draft"
			 WHERE "id" = $1 AND ${clause.sql}
			 FOR UPDATE`,
			[draftId, ...clause.params]
		);
		const draft = rows[0] ? toDraft(rows[0]) : null;
		if (!draft) return null;

		if (draft.generatedVersionId) {
			const existing = await loadVersionById(draft.generatedVersionId);
			return existing ? { version: existing, created: false } : null;
		}

		const choices = safeParseCompleteChoices(draft.choices);
		if (!choices) throw new Error('Cannot generate a contract without six valid choices.');

		const rendered = buildContractContent(choices, draft.projectContext);
		const versionId = crypto.randomUUID();
		const publicId = randomPublicId();

		await client.query(
			`INSERT INTO "visual_contract_version"
				("id", "draft_id", "public_id", "version_number", "choices", "project_context",
				 "content_version", "rendered", "confirmed_at", "created_by_user_id",
				 "organisation_id", "brand_id", "expires_at")
			 VALUES ($1, $2, $3, 1, $4::jsonb, $5::jsonb, $6, $7::jsonb, now(), $8, $9, $10, $11)`,
			[
				versionId,
				draft.id,
				publicId,
				JSON.stringify(choices),
				JSON.stringify(draft.projectContext),
				rendered.contentVersion,
				JSON.stringify(rendered),
				draft.ownerUserId,
				draft.organisationId,
				draft.brandId,
				// A brand contract is owned from the start and never expires. A guest
				// contract lives for the stated window unless it is claimed.
				draft.brandId ? null : contractExpiry()
			]
		);

		let outputId: string | null = null;
		if (draft.brandId && draft.organisationId) {
			outputId = await createBrandOutput(client, draft, publicId);
			await client.query(`UPDATE "visual_contract_version" SET "output_id" = $2 WHERE "id" = $1`, [
				versionId,
				outputId
			]);
		}

		await client.query(
			`UPDATE "visual_contract_draft"
			 SET "generated_version_id" = $2, "status" = 'generated',
			     "current_step" = 'generated', "updated_at" = now()
			 WHERE "id" = $1`,
			[draft.id, versionId]
		);

		const version = await loadVersionById(versionId, client);
		if (!version) throw new Error('Contract version disappeared after insert.');
		return { version, created: true };
	});
}

/**
 * The Documents entry for a generated contract.
 *
 * `share_slug` is the same public id, so the existing /share/[slug] route and
 * the Documents Share action work without a second identifier.
 */
async function createBrandOutput(
	client: { query: (text: string, values?: unknown[]) => Promise<unknown> },
	draft: DraftRecord,
	publicId: string
): Promise<string> {
	const outputId = crypto.randomUUID();
	const title = draft.projectContext.projectName?.trim() || 'Visual Contract';
	await client.query(
		`INSERT INTO "output"
			("id", "organisation_id", "brand_id", "product_key", "title", "format",
			 "share_slug", "can_view", "can_share", "can_download")
		 VALUES ($1, $2, $3, 'tool.visual_contract', $4, 'web_page', $5, true, true, false)`,
		[outputId, draft.organisationId, draft.brandId, title, publicId]
	);
	return outputId;
}

interface VersionRow {
	id: string;
	publicId: string;
	versionNumber: number;
	choices: unknown;
	projectContext: unknown;
	contentVersion: number;
	rendered: unknown;
	confirmedAt: Date | string;
	createdAt: Date | string;
	expiresAt: Date | string | null;
}

const VERSION_COLUMNS = `"id", "public_id" AS "publicId", "version_number" AS "versionNumber",
	"choices", "project_context" AS "projectContext", "content_version" AS "contentVersion",
	"rendered", "confirmed_at" AS "confirmedAt", "created_at" AS "createdAt",
	"expires_at" AS "expiresAt"`;

const toVersion = (row: VersionRow): ContractVersionRecord => ({
	id: row.id,
	publicId: row.publicId,
	versionNumber: row.versionNumber,
	choices: row.choices as Record<AxisKey, ChoiceValue>,
	projectContext: safeParseProjectContext(row.projectContext),
	contentVersion: row.contentVersion,
	rendered: row.rendered as ContractContent,
	confirmedAt: iso(row.confirmedAt) ?? '',
	createdAt: iso(row.createdAt) ?? '',
	expiresAt: iso(row.expiresAt)
});

async function loadVersionById(
	versionId: string,
	client?: { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> }
): Promise<ContractVersionRecord | null> {
	if (client) {
		const { rows } = await client.query(
			`SELECT ${VERSION_COLUMNS} FROM "visual_contract_version" WHERE "id" = $1`,
			[versionId]
		);
		return rows[0] ? toVersion(rows[0] as VersionRow) : null;
	}
	const db = await getDB();
	const { rows } = await db.query<VersionRow>(
		`SELECT ${VERSION_COLUMNS} FROM "visual_contract_version" WHERE "id" = $1`,
		[versionId]
	);
	return rows[0] ? toVersion(rows[0]) : null;
}

/**
 * The public contract page. Read-only, keyed by an unguessable id.
 * Returns nothing that could be used to edit the underlying draft.
 *
 * Expiry is checked by the caller so an expired link can say so rather than
 * pretending the contract never existed.
 */
export async function loadPublicContract(publicId: string): Promise<ContractVersionRecord | null> {
	const db = await getDB();
	const { rows } = await db.query<VersionRow>(
		`SELECT ${VERSION_COLUMNS} FROM "visual_contract_version" WHERE "public_id" = $1`,
		[publicId]
	);
	return rows[0] ? toVersion(rows[0]) : null;
}

/**
 * Attach a guest contract to the account that signed in.
 *
 * The guest token is the proof of ownership, so claiming requires both the
 * signed-in user and the browser that created the contract. Claiming is the
 * only thing that makes a contract permanent.
 */
export async function claimDraft(params: {
	draftId: string;
	tokenHash: string;
	userId: string;
	brand: { organisationId: string; brandId: string } | null;
}): Promise<DraftRecord | null> {
	return withTransaction(async (client) => {
		const { rows } = await client.query<DraftRow>(
			`SELECT ${DRAFT_COLUMNS} FROM "visual_contract_draft"
			 WHERE "id" = $1 AND "guest_edit_token_hash" = $2
			 FOR UPDATE`,
			[params.draftId, params.tokenHash]
		);
		const draft = rows[0] ? toDraft(rows[0]) : null;
		if (!draft) return null;

		// A claim must never take over another account's work.
		if (draft.ownerUserId && draft.ownerUserId !== params.userId) return null;

		const organisationId = params.brand?.organisationId ?? null;
		const brandId = params.brand?.brandId ?? null;

		const { rows: updated } = await client.query<DraftRow>(
			`UPDATE "visual_contract_draft"
			 SET "owner_user_id" = $2,
			     "organisation_id" = $3,
			     "brand_id" = $4,
			     "guest_edit_token_hash" = NULL,
			     "guest_expires_at" = NULL,
			     "claimed_at" = now(),
			     "updated_at" = now()
			 WHERE "id" = $1
			 RETURNING ${DRAFT_COLUMNS}`,
			[draft.id, params.userId, organisationId, brandId]
		);

		// The public page becomes permanent at the same moment.
		await client.query(
			`UPDATE "visual_contract_version"
			 SET "expires_at" = NULL, "organisation_id" = $2, "brand_id" = $3
			 WHERE "draft_id" = $1`,
			[draft.id, organisationId, brandId]
		);

		if (brandId && organisationId) {
			await createOutputsForDraft(client, draft.id, draft.projectContext, {
				organisationId,
				brandId
			});
		}

		return updated[0] ? toDraft(updated[0]) : null;
	});
}

/**
 * Delete a draft and everything that hangs off it.
 *
 * A Documents entry points at the public page, so it is removed with the
 * contract rather than left listing a link that no longer resolves. Versions
 * and delivery records cascade from the draft.
 */
export async function deleteDraft(actor: DraftActor, draftId: string): Promise<boolean> {
	return withTransaction(async (client) => {
		const clause = actorClause(actor);
		const { rows } = await client.query<{ id: string }>(
			`SELECT "id" FROM "visual_contract_draft"
			 WHERE "id" = $1 AND ${clause.sql}
			 FOR UPDATE`,
			[draftId, ...clause.params]
		);
		if (!rows[0]) return false;

		await client.query(
			`DELETE FROM "output"
			 WHERE "id" IN (
				SELECT "output_id" FROM "visual_contract_version"
				WHERE "draft_id" = $1 AND "output_id" IS NOT NULL
			 )`,
			[draftId]
		);
		await client.query(`DELETE FROM "visual_contract_draft" WHERE "id" = $1`, [draftId]);
		return true;
	});
}

/** Documents entries for every version of a draft, once it belongs to a brand. */
async function createOutputsForDraft(
	client: { query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }> },
	draftId: string,
	context: ProjectContext,
	brand: { organisationId: string; brandId: string }
): Promise<void> {
	const { rows } = await client.query(
		`SELECT "id", "public_id" AS "publicId" FROM "visual_contract_version" WHERE "draft_id" = $1`,
		[draftId]
	);
	const title = context.projectName?.trim() || 'Visual Contract';

	for (const row of rows as { id: string; publicId: string }[]) {
		const outputId = crypto.randomUUID();
		await client.query(
			`INSERT INTO "output"
				("id", "organisation_id", "brand_id", "product_key", "title", "format",
				 "share_slug", "can_view", "can_share", "can_download")
			 VALUES ($1, $2, $3, 'tool.visual_contract', $4, 'web_page', $5, true, true, false)`,
			[outputId, brand.organisationId, brand.brandId, title, row.publicId]
		);
		await client.query(`UPDATE "visual_contract_version" SET "output_id" = $2 WHERE "id" = $1`, [
			row.id,
			outputId
		]);
	}
}

/** The version a draft produced, for the owner's "generated" screen. */
export async function loadGeneratedVersion(
	actor: DraftActor,
	draftId: string
): Promise<ContractVersionRecord | null> {
	const draft = await loadDraft(actor, draftId);
	if (!draft?.generatedVersionId) return null;
	return loadVersionById(draft.generatedVersionId);
}
