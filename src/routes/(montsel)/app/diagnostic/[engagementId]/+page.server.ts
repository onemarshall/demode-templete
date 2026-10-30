import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { getProduct, isProductKey } from '#lib/modules/products/shared/registry.js';
import { getEngagement } from '#lib/modules/diagnostic/server/engagement.js';
import { syncDiagnosticRun } from '#lib/modules/diagnostic/server/orchestration.js';
import { readOutputReport } from '#lib/modules/diagnostic/server/report.js';
import {
	isTerminalEngagement,
	labelForEngagement
} from '#lib/modules/diagnostic/server/status.js';
import {
	addClientMessage,
	createThread,
	latestOutputVersion,
	listSections,
	listThreads
} from '#lib/modules/diagnostic/server/comments.js';
import { getDB } from '#lib/platform/database/db.js';

export const load: PageServerLoad = async (event) => {
	const { ctx } = await resolveActiveBrand(event);
	let engagement = await getEngagement(ctx, event.params.engagementId);
	if (!engagement) error(404, 'Diagnostic unavailable');

	// Refresh from the engine when a job exists and the engagement is not in a
	// terminal state. The Trigger task does the same work; this makes the page
	// honest immediately after a return visit.
	// A settled engagement has nothing left to sync. `retrying` is deliberately
	// unsettled, so a page visit retries an import the worker could not complete.
	if (engagement.engineJobId && !isTerminalEngagement(engagement.status)) {
		try {
			await syncDiagnosticRun(engagement.id, {
				organisationId: ctx.organisationId,
				brandId: ctx.brandId,
				userId: ctx.userId
			});
			engagement = (await getEngagement(ctx, event.params.engagementId)) ?? engagement;
		} catch {
			// The timeline still shows the last persisted state.
		}
	}

	const db = await getDB();
	const events = await db.query<{
		status: string;
		stage: string | null;
		message: string | null;
		occurredAt: string;
	}>(
		`SELECT "status", "stage", "message", "occurred_at" AS "occurredAt"
		 FROM "diagnostic_run_event"
		 WHERE "engagement_id" = $1
		 ORDER BY "occurred_at" ASC
		 LIMIT 50`,
		[engagement.id]
	);

	const outputId =
		engagement.deliveredAt && engagement.engineRunRef
			? `out_${engagement.engineRunRef}`
			: null;
	const report = outputId ? await readOutputReport(ctx, outputId) : null;
	const outputVersion = outputId ? await latestOutputVersion(ctx, outputId) : null;
	const sections = outputVersion ? await listSections(ctx, outputVersion.id) : [];
	const threads = outputId ? await listThreads(ctx, outputId) : [];

	return {
		engagement,
		productName: isProductKey(engagement.productKey)
			? (getProduct(engagement.productKey)?.name ?? engagement.productKey)
			: engagement.productKey,
		statusLabel: labelForEngagement(engagement.status),
		events: events.rows,
		outputId,
		outputVersion,
		sections,
		threads,
		report: report
			? {
					versionNumber: report.versionNumber,
					contentHash: report.contentHash,
					contentHtml: report.contentHtml,
					createdAt: report.createdAt
				}
			: null
	};
};

export const actions = {
	comment: async (event) => {
		const { ctx } = await resolveActiveBrand(event);
		const form = await event.request.formData();
		const outputId = String(form.get('outputId') ?? '').trim();
		const outputVersionId = String(form.get('outputVersionId') ?? '').trim();
		const sectionKey = String(form.get('sectionKey') ?? '').trim() || null;
		const kind = String(form.get('kind') ?? '');
		const body = String(form.get('body') ?? '').trim();
		if (!outputId || !outputVersionId || !body)
			return { ok: false, message: 'Write the question or correction first.' };
		try {
			await createThread(ctx, {
				outputId,
				outputVersionId,
				sectionKey,
				kind: kind as never,
				body
			});
			return { ok: true, message: 'Your message has been recorded against this version.' };
		} catch (cause) {
			return {
				ok: false,
				message: cause instanceof Error ? cause.message : 'The message could not be recorded.'
			};
		}
	},

	reply: async (event) => {
		const { ctx } = await resolveActiveBrand(event);
		const form = await event.request.formData();
		const threadId = String(form.get('threadId') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!threadId || !body)
			return { ok: false, message: 'Write a reply first.' };
		try {
			await addClientMessage(ctx, threadId, body);
			return { ok: true, message: 'Reply recorded.' };
		} catch (cause) {
			return {
				ok: false,
				message: cause instanceof Error ? cause.message : 'The reply could not be recorded.'
			};
		}
	}
};
