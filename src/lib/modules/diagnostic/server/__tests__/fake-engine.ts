/**
 * A loopback diagnostic engine for integration tests.
 *
 * Implements the four endpoints the application calls, plus the intake action
 * endpoint the automation supervisor uses to publish an approved report. No
 * network leaves the machine and no real engine is involved.
 *
 * Not a `.test.ts` file, so Vitest does not collect it.
 */

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeCheck {
	key: string;
	passed: boolean;
	detail: string;
}

export interface FakeJob {
	status: string;
	stage: string;
	message: string;
	checks: FakeCheck[];
	/** What the engine claims the published bytes hash to. */
	claimedHash: string;
	content: string;
	/** The intake body the application sent, for family assertions. */
	intake: Record<string, unknown> | null;
	/** Actions the application requested, in order. */
	actions: string[];
}

export type PublishBehaviour = 'release' | 'ignore';

export interface FakeEngine {
	baseUrl: string;
	jobs: Map<string, FakeJob>;
	/** How `publish_report` behaves. `ignore` models an engine that refuses. */
	publishBehaviour: PublishBehaviour;
	/** Status a newly created intake starts in. Defaults to `queued`. */
	newJobStatus: string;
	jobForRun(runPublicId: string): FakeJob | undefined;
	job(jobId: string): FakeJob;
	lastJob(): FakeJob;
	close(): Promise<void>;
}

export function sha256(value: string): string {
	return createHash('sha256').update(value, 'utf8').digest('hex');
}

const BODY = [
	'# Reading',
	'',
	'The material presents a single service line and no proof of delivery.',
	'',
	'## Limits',
	'',
	'Only the supplied scope was examined.'
].join('\n');

function newJob(jobId: string, family: string): FakeJob {
	// Distinct bytes per run: `output_version` is unique on `content_hash`, so a
	// second import of identical bytes is refused by design.
	const content = `${BODY}\n\nRun ${jobId} (${family}).`;
	return {
		status: 'queued',
		stage: 'intake',
		message: 'Queued.',
		checks: [{ key: 'source_bounded', passed: true, detail: 'Every claim carries a source.' }],
		claimedHash: sha256(content),
		content,
		intake: null,
		actions: []
	};
}

export async function startFakeEngine(): Promise<FakeEngine> {
	const jobs = new Map<string, FakeJob>();
	let counter = 0;

	// One object, mutated in place: the request handler closes over it, so a
	// spread copy would silently ignore `newJobStatus` and `publishBehaviour`.
	const engine: FakeEngine = {
		baseUrl: '',
		close: async () => {},
		jobs,
		publishBehaviour: 'release',
		newJobStatus: 'queued',
		jobForRun(runPublicId: string) {
			return jobs.get(`job_${decodeURIComponent(runPublicId).replace(/^run_job_/, '')}`);
		},
		job(jobId: string) {
			const job = jobs.get(jobId);
			if (!job) throw new Error(`No such fake job: ${jobId}`);
			return job;
		},
		lastJob() {
			const entries = [...jobs.values()];
			const job = entries[entries.length - 1];
			if (!job) throw new Error('No fake job has been created.');
			return job;
		}
	};

	const server = createServer(async (request, response) => {
		const url = new URL(request.url ?? '/', 'http://127.0.0.1');
		const send = (body: unknown, status = 200): void => {
			response.writeHead(status, { 'content-type': 'application/json' });
			response.end(JSON.stringify(body));
		};

		if (request.method === 'GET' && url.pathname === '/v1/options')
			return send({
				ok: true,
				data: {
					model: 'fake-model',
					provider: 'fake',
					providerConfigured: true,
					configurationError: null,
					scope: 'verification',
					sectorIntelligence: [{ ref: 'manufacturing', name: 'Manufacturing' }],
					families: ['signal', 'gap', 'direction'],
					deliveryRoutes: ['montsel_self_service', 'langfell_consultancy'],
					limits: { maxPages: 1, maxReviewBatches: 1, maxModelCalls: 1 }
				}
			});

		if (request.method === 'POST' && url.pathname === '/v1/intakes') {
			let raw = '';
			for await (const chunk of request) raw += chunk;
			let intake: Record<string, unknown> | null = null;
			try {
				intake = JSON.parse(raw) as Record<string, unknown>;
			} catch {
				intake = null;
			}
			const jobId = `job_${++counter}`;
			const family = String(intake?.reportFamily ?? 'signal');
			const job = newJob(jobId, family);
			job.status = engine.newJobStatus;
			job.intake = intake;
			jobs.set(jobId, job);
			return send({
				ok: true,
				data: { jobId, status: 'queued', stage: 'intake', message: 'Queued.' }
			});
		}

		const actionMatch = url.pathname.match(/^\/v1\/intakes\/([^/]+)\/actions$/);
		if (request.method === 'POST' && actionMatch) {
			const jobId = decodeURIComponent(actionMatch[1]!);
			const job = jobs.get(jobId);
			if (!job) return send({ ok: false, error: { code: 'not_found', message: 'No such intake.' } }, 404);
			let raw = '';
			for await (const chunk of request) raw += chunk;
			const body = raw ? (JSON.parse(raw) as { action?: string }) : {};
			const action = String(body.action ?? '');
			job.actions.push(action);
			// Mirrors `review-publication/service.ts`: a self-service run publishes
			// from `automation_ready`, and from no other state.
			if (
				action === 'publish_report' &&
				job.status === 'automation_ready' &&
				engine.publishBehaviour === 'release'
			) {
				job.status = 'published';
				job.stage = 'publication';
				job.message = 'Published.';
			}
			return send({
				ok: true,
				data: {
					jobId,
					status: job.status,
					stage: job.stage,
					message: job.message,
					state: { productionRunPublicId: `run_${jobId}` }
				}
			});
		}

		const intakeMatch = url.pathname.match(/^\/v1\/intakes\/([^/]+)$/);
		if (request.method === 'GET' && intakeMatch) {
			const jobId = decodeURIComponent(intakeMatch[1]!);
			const job = jobs.get(jobId);
			if (!job) return send({ ok: false, error: { code: 'not_found', message: 'No such intake.' } }, 404);
			return send({
				ok: true,
				data: {
					jobId,
					status: job.status,
					stage: job.stage,
					message: job.message,
					state: { productionRunPublicId: `run_${jobId}` }
				}
			});
		}

		const qualityMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/quality$/);
		if (request.method === 'GET' && qualityMatch) {
			const job = engine.jobForRun(qualityMatch[1]!);
			if (!job) return send({ ok: false, error: { code: 'not_found', message: 'No such run.' } }, 404);
			return send({
				ok: true,
				data: {
					publicId: decodeURIComponent(qualityMatch[1]!),
					status: job.status,
					reportFamily: String(job.intake?.reportFamily ?? 'signal'),
					deliveryRoute: 'montsel_self_service',
					reviewRequirement: 'automated',
					checks: job.checks,
					publication: {
						contentHash: job.claimedHash,
						outputPath: 'report.md',
						publishedAt: new Date().toISOString()
					},
					sections: [{ key: 'reading', heading: 'Reading', order: 1 }]
				}
			});
		}

		const publicationMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/publication$/);
		if (request.method === 'GET' && publicationMatch) {
			const job = engine.jobForRun(publicationMatch[1]!);
			if (!job) return send({ ok: false, error: { code: 'not_found', message: 'No such run.' } }, 404);
			const bytes = Buffer.from(job.content, 'utf8');
			return send({
				ok: true,
				data: {
					publicId: decodeURIComponent(publicationMatch[1]!),
					contentHash: job.claimedHash,
					contentType: 'text/markdown',
					contentBase64: bytes.toString('base64'),
					bytes: bytes.byteLength,
					sections: [{ key: 'reading', heading: 'Reading', order: 1 }]
				}
			});
		}

		return send({ ok: false, error: { code: 'not_found', message: `Unhandled ${url.pathname}` } }, 404);
	});

	engine.baseUrl = await new Promise<string>((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const port = (server.address() as AddressInfo).port;
			resolve(`http://127.0.0.1:${port}`);
		});
	});
	engine.close = () => new Promise<void>((resolve) => server.close(() => resolve()));

	return engine;
}
