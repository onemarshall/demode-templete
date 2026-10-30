/**
 * Diagnostic engine readiness check.
 *
 * Run before the P2/P3/P4 acceptance runs:
 *
 *   DIAGNOSTIC_ENGINE_URL=https://engine.example \
 *   DIAGNOSTIC_ENGINE_TOKEN=... \
 *   bun scripts/diagnostic/engine-readiness.ts
 *
 * It checks reachability, provider configuration, approved sectors and family
 * support. It does not start a run, spend a model call or change a record.
 */

const url = process.env.DIAGNOSTIC_ENGINE_URL?.trim();
const token = process.env.DIAGNOSTIC_ENGINE_TOKEN?.trim();

if (!url || !token) {
	console.error(
		'Set DIAGNOSTIC_ENGINE_URL and DIAGNOSTIC_ENGINE_TOKEN before running this check.'
	);
	process.exit(1);
}

interface Envelope<T> {
	ok: boolean;
	data?: T;
	error?: { code?: string; message?: string };
}

async function get<T>(path: string): Promise<T> {
	const response = await fetch(new URL(path, url!), {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${token}`
		}
	});
	const body = (await response.json().catch(() => null)) as Envelope<T> | null;
	if (!response.ok || !body?.ok)
		throw new Error(
			`${path} failed (${response.status}): ${body?.error?.message ?? 'unreadable response'}`
		);
	return body.data as T;
}

interface Options {
	model: string | null;
	provider: string;
	providerConfigured: boolean;
	configurationError: string | null;
	sectorIntelligence: Array<{ ref: string; name: string }>;
	families: string[];
	deliveryRoutes: string[];
	limits: { maxPages: number; maxReviewBatches: number; maxModelCalls: number };
}

const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

try {
	const options = await get<Options>('/v1/options');
	checks.push({
		name: 'engine reachable',
		pass: true,
		detail: `API responded with ${options.families.length} families.`
	});
	checks.push({
		name: 'provider configured',
		pass: options.providerConfigured,
		detail: options.providerConfigured
			? `${options.provider} / ${options.model ?? 'model not named'}`
			: (options.configurationError ?? 'Provider configuration is incomplete.')
	});
	checks.push({
		name: 'Signal supported',
		pass: options.families.includes('signal'),
		detail: options.families.join(', ')
	});
	checks.push({
		name: 'Gap supported',
		pass: options.families.includes('gap'),
		detail: options.families.join(', ')
	});
	checks.push({
		name: 'Direction supported',
		pass: options.families.includes('direction'),
		detail: options.families.join(', ')
	});
	checks.push({
		name: 'approved sectors',
		pass: options.sectorIntelligence.length > 0,
		detail:
			options.sectorIntelligence.length === 0
				? 'No approved sector intelligence; Gap and Direction cannot run.'
				: `${options.sectorIntelligence.length} approved: ${options.sectorIntelligence
						.slice(0, 8)
						.map((sector) => sector.name)
						.join(', ')}${options.sectorIntelligence.length > 8 ? '…' : ''}`
	});
	checks.push({
		name: 'delivery routes',
		pass:
			options.deliveryRoutes.includes('montsel_self_service') &&
			options.deliveryRoutes.includes('langfell_consultancy'),
		detail: options.deliveryRoutes.join(', ')
	});
	checks.push({
		name: 'bounded limits',
		pass:
			options.limits.maxPages > 0 &&
			options.limits.maxReviewBatches > 0 &&
			options.limits.maxModelCalls > 0,
		detail: `pages ${options.limits.maxPages}, batches ${options.limits.maxReviewBatches}, calls ${options.limits.maxModelCalls}`
	});
} catch (error) {
	checks.push({
		name: 'engine reachable',
		pass: false,
		detail: error instanceof Error ? error.message : 'Unreachable.'
	});
}

for (const check of checks) {
	console.log(`${check.pass ? '✓' : '✗'} ${check.name} — ${check.detail}`);
}

const failed = checks.filter((check) => !check.pass);
console.log(
	`\n${checks.length - failed.length}/${checks.length} checks passed.`
);
if (failed.length > 0) process.exit(2);
console.log(
	'Engine is ready for a bounded acceptance run. Set MONTSEL_INTAKE_JOB_ROOT on the engine host and apply migration 0021 in the app before starting.'
);
