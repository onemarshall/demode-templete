import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/modules/auth/server/config.js';
import {
	loadConsultantEngagement,
	requireConsultantAccess,
	type ConsultantAction
} from '#lib/modules/diagnostic/server/consultant.js';
import { syncDiagnosticRun } from '#lib/modules/diagnostic/server/orchestration.js';
import {
	applyDecisionDelta,
	approveDecisionVersion,
	generateDecisionRecord,
	getBrief,
	getDecisionRecord,
	runIntakeAction
} from '#lib/modules/diagnostic/server/engine.js';
import { getDB } from '#lib/platform/database/db.js';
import {
	addConsultantMessage,
	listThreadsForScope
} from '#lib/modules/diagnostic/server/comments.js';

async function sessionUser(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) error(401, 'Sign in required');
	return session.user.id;
}

async function engagementFor(engagementId: string) {
	const engagement = await loadConsultantEngagement(engagementId);
	if (!engagement) error(404, 'Engagement unavailable');
	return engagement;
}

async function guard(
	request: Request,
	engagementId: string,
	action: ConsultantAction
) {
	const userId = await sessionUser(request);
	const grant = await requireConsultantAccess(userId, engagementId, action);
	return { userId, grant };
}

export const load: PageServerLoad = async ({ request, params }) => {
	const userId = await sessionUser(request);
	const grant = await requireConsultantAccess(userId, params.engagementId, 'read');
	let engagement = await engagementFor(params.engagementId);

	if (engagement.engineJobId) {
		try {
			await syncDiagnosticRun(engagement.id);
			engagement = (await loadConsultantEngagement(engagement.id)) ?? engagement;
		} catch {
			// The persisted state remains the source of truth.
		}
	}

	let decision = null;
	let brief = null;
	if (engagement.engineRunRef) {
		try {
			decision = await getDecisionRecord(engagement.engineRunRef);
		} catch {
			decision = null;
		}
		try {
			brief = await getBrief(engagement.engineRunRef);
		} catch {
			brief = null;
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

	const output = await db.query<{
		outputId: string;
		outputVersionId: string;
		versionNumber: number;
	}>(
		`SELECT o."id" AS "outputId", v."id" AS "outputVersionId",
		        v."version_number" AS "versionNumber"
		 FROM "output" o
		 JOIN "output_version" v ON v."output_id" = o."id"
		 WHERE o."engine_publication_ref" = $1
		   AND o."brand_id" = $2 AND o."organisation_id" = $3
		 ORDER BY v."version_number" DESC
		 LIMIT 1`,
		[engagement.engineRunRef, engagement.brandId, engagement.organisationId]
	);
	const outputRow = output.rows[0] ?? null;
	const threads = outputRow
		? await listThreadsForScope(
				{
					organisationId: engagement.organisationId,
					brandId: engagement.brandId
				},
				outputRow.outputId
			)
		: [];

	return { engagement, grant, decision, brief, events: events.rows, output: outputRow, threads };
};

async function actionBody(request: Request) {
	return await request.formData();
}

function message(cause: unknown): string {
	return cause instanceof Error ? cause.message : 'The action could not be completed.';
}

export const actions: Actions = {
	accept: async ({ request, params }) => {
		await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineJobId)
			return fail(400, { message: 'This engagement has no running intake.' });
		const form = await actionBody(request);
		const notes = String(form.get('notes') ?? '').trim();
		if (!notes) return fail(400, { message: 'Record substantive review notes before accepting.' });
		try {
			await runIntakeAction(engagement.engineJobId, 'accept_analysis', { notes });
			await syncDiagnosticRun(engagement.id).catch(() => undefined);
			return { ok: true, message: 'Analysis accepted. Generate the decision record next.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	decision: async ({ request, params }) => {
		await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineRunRef)
			return fail(400, { message: 'The production run is not available yet.' });
		try {
			await generateDecisionRecord(engagement.engineRunRef);
			return { ok: true, message: 'Candidate decision record generated.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	delta: async ({ request, params }) => {
		await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineRunRef)
			return fail(400, { message: 'The production run is not available yet.' });
		const form = await actionBody(request);
		const raw = String(form.get('delta') ?? '').trim();
		const version = Number(form.get('version') ?? 0);
		if (!raw) return fail(400, { message: 'Paste a decision delta.' });
		if (!Number.isInteger(version) || version < 1)
			return fail(400, { message: 'Choose the version the delta is written against.' });
		let delta: unknown;
		try {
			delta = JSON.parse(raw);
		} catch {
			return fail(400, { message: 'The delta must be valid JSON.' });
		}
		try {
			await applyDecisionDelta(engagement.engineRunRef, version, delta);
			return { ok: true, message: 'Delta applied as a new version.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	approve: async ({ request, params }) => {
		await guard(request, params.engagementId, 'approve');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineRunRef)
			return fail(400, { message: 'The production run is not available yet.' });
		const form = await actionBody(request);
		const version = Number(form.get('version') ?? 0);
		if (!Number.isInteger(version) || version < 1)
			return fail(400, { message: 'Choose the version to approve.' });
		try {
			await approveDecisionVersion(engagement.engineRunRef, version);
			return { ok: true, message: 'Decision record approved. The report can now be generated.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	generate: async ({ request, params }) => {
		await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineJobId)
			return fail(400, { message: 'This engagement has no running intake.' });
		try {
			await runIntakeAction(engagement.engineJobId, 'generate_report');
			await syncDiagnosticRun(engagement.id).catch(() => undefined);
			return { ok: true, message: 'Report generation started.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	review: async ({ request, params }) => {
		await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineJobId)
			return fail(400, { message: 'This engagement has no running intake.' });
		const form = await actionBody(request);
		const decision = String(form.get('decision') ?? '');
		const notes = String(form.get('notes') ?? '').trim();
		if (!['approved', 'changes_requested', 'rejected'].includes(decision))
			return fail(400, { message: 'Choose an explicit report review decision.' });
		if (!notes) return fail(400, { message: 'Record substantive review notes.' });
		try {
			await runIntakeAction(engagement.engineJobId, 'review_report', { decision, notes });
			await syncDiagnosticRun(engagement.id).catch(() => undefined);
			return { ok: true, message: `Report review recorded: ${decision}.` };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	save: async ({ request, params }) => {
		const { userId } = await guard(request, params.engagementId, 'review');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineRunRef)
			return fail(400, { message: 'The production run is not available yet.' });
		const record = await getDecisionRecord(engagement.engineRunRef);
		const current = record.currentVersion;
		const form = await actionBody(request);
		const rationale = String(form.get('rationale') ?? '').trim();
		if (!rationale)
			return fail(400, { message: 'State why this pass changes the record.' });

		const changes: Array<{
			field: string;
			from?: unknown;
			to: unknown;
			reason: string;
		}> = [];
		const same = (a: unknown, b: unknown) =>
			JSON.stringify(a) === JSON.stringify(b);

		for (const field of [
			'principal_finding',
			'recommendation',
			'counterevidence',
			'unknowns',
			'commercial_material_consequence',
			'next_decision_gate'
		] as const) {
			const raw = form.get(field);
			if (raw === null) continue;
			const to = String(raw).trim();
			const from = current.fields[field];
			const fromText = typeof from === 'string' ? from : '';
			if (to !== fromText)
				changes.push({
					field,
					from,
					to: to || (field === 'next_decision_gate' ? null : to),
					reason: rationale
				});
		}

		const confidence = String(form.get('confidence') ?? '').trim();
		if (confidence && confidence !== current.fields.confidence)
			changes.push({
				field: 'confidence',
				from: current.fields.confidence,
				to: confidence,
				reason: rationale
			});

		for (const field of ['do_now', 'hold', 'do_not_do_yet'] as const) {
			const raw = form.get(field);
			if (raw === null) continue;
			const to = String(raw)
				.split('\n')
				.map((item) => item.trim())
				.filter(Boolean);
			if (!same(to, current.fields[field]))
				changes.push({
					field,
					from: current.fields[field],
					to,
					reason: rationale
				});
		}

		if (changes.length === 0)
			return fail(400, { message: 'Nothing has changed in this pass.' });

		try {
			await applyDecisionDelta(engagement.engineRunRef, current.version, {
				schema_version: 'diagnostic-decision-delta.v1',
				base_version: current.version,
				changes,
				authored_by: userId,
				authored_outside_app: false
			});
			return { ok: true, message: 'Saved as a new decision version.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	reply: async ({ request, params }) => {
		const { userId } = await guard(request, params.engagementId, 'review');
		const form = await actionBody(request);
		const threadId = String(form.get('threadId') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!threadId || !body)
			return fail(400, { message: 'Write a reply first.' });
		try {
			await addConsultantMessage(threadId, userId, body);
			return { ok: true, message: 'Reply recorded.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	},

	publish: async ({ request, params }) => {
		await guard(request, params.engagementId, 'publish');
		const engagement = await engagementFor(params.engagementId);
		if (!engagement.engineJobId)
			return fail(400, { message: 'This engagement has no running intake.' });
		try {
			await runIntakeAction(engagement.engineJobId, 'publish_report');
			await syncDiagnosticRun(engagement.id).catch(() => undefined);
			return { ok: true, message: 'Report published and imported.' };
		} catch (cause) {
			return fail(400, { message: message(cause) });
		}
	}
};
