#!/usr/bin/env bun
/**
 * Step 2 proof, part one: the engagement model on a disposable database.
 *
 *   docker run -d --rm --name montsel-engagement-verify \
 *     -e POSTGRES_PASSWORD=verify -e POSTGRES_DB=montsel_diagnostic_engagement_verify \
 *     -p 127.0.0.1:55441:5432 postgres:16
 *
 *   MONTSEL_ENGAGEMENT_VERIFY_DATABASE_URL=postgresql://postgres:verify@127.0.0.1:55441/montsel_diagnostic_engagement_verify \
 *     bun scripts/diagnostic/verify-engagement.ts
 *
 * Proves, with no engine call and no payment integration:
 *   - intake is validated before anything is written
 *   - an identical intake resumes instead of commissioning a second engagement
 *   - a different intake is a different engagement
 *   - route and family are fixed at creation
 *   - another brand cannot read or cancel the engagement
 *   - the engine envelope carries three facts and refuses without a mapping
 */

import {
	assert,
	closeDisposableDatabase,
	prepareDisposableDatabase,
	requireSafeDatabase
} from './disposable-db.ts';

const DATABASE_NAME = 'montsel_diagnostic_engagement_verify';
const url = requireSafeDatabase(process.env.MONTSEL_ENGAGEMENT_VERIFY_DATABASE_URL, DATABASE_NAME);

const { configureDatabase } = await import('../../src/lib/platform/database/db.ts');
configureDatabase(url);

const database = await prepareDisposableDatabase(url, 15);
const { pool, pilot, other } = database;

try {
	const { startEngagement, getEngagement, listEngagements, cancelEngagement } = await import(
		'../../src/lib/modules/diagnostic/server/engagement.ts'
	);
	const { buildEngineEnvelope } = await import('../../src/lib/modules/diagnostic/server/context.ts');
	const { requireBrandAccess } = await import('../../src/lib/modules/tenancy/server/context.ts');

	const pilotCtx = await requireBrandAccess(pilot.userId, pilot.brandId, 'brand:read');
	const otherCtx = await requireBrandAccess(other.userId, other.brandId, 'brand:read');

	const intake = {
		subjectUrl: 'https://www.hestia.org',
		commissionedDecision: 'Whether the public surface reads as a coherent, credible multi-service charity.',
		decisionOwner: 'Managing director',
		intendedReader: 'Referrer, commissioner or supporter',
		decisionTiming: 'Before the autumn campaign planning',
		declaredScope: ['homepage', 'services']
	};

	// 1. Intake is validated before any write.
	let refused = false;
	try {
		await startEngagement(pilotCtx, {
			productKey: 'diagnostic.signal',
			intake: { ...intake, subjectUrl: 'not-a-url' }
		});
	} catch {
		refused = true;
	}
	assert(refused, 'An invalid intake was accepted.');
	const count = async (): Promise<number> =>
		Number(
			(await pool.query<{ n: string }>('SELECT count(*) AS n FROM "diagnostic_engagement"')).rows[0]!
				.n
		);
	assert((await count()) === 0, 'A refused intake still wrote an engagement.');

	// 1b. A valid intake is still refused while the brand holds no entitlement.
	// Payment precedes the write, so an unpaid request leaves nothing behind.
	let unpaid = false;
	try {
		await startEngagement(pilotCtx, { productKey: 'diagnostic.signal', intake });
	} catch (error) {
		unpaid = /has not been paid for/.test((error as Error).message);
	}
	assert(unpaid, 'An engagement started without a live entitlement.');
	assert((await count()) === 0, 'A refused payment still wrote an engagement.');

	// The proof then uses an explicit grant, the supported administrative path
	// that does not require a purchase. A purchase-sourced entitlement would need
	// an activated order, which is a different proof.
	await pool.query(
		`INSERT INTO "product_entitlement" ("id", "organisation_id", "brand_id", "product_key", "source")
		 VALUES ('ent_verify_signal', $1, $2, 'diagnostic.signal', 'grant')`,
		[pilot.organisationId, pilot.brandId]
	);

	// 2. First submission creates the work item and the engagement.
	const first = await startEngagement(pilotCtx, { productKey: 'diagnostic.signal', intake });
	assert(first.status === 'started', 'The first submission did not start an engagement.');
	assert(first.engagement.status === 'enquired', 'A new engagement must start at enquired.');
	assert(first.engagement.deliveryRoute === 'montsel_self_service', 'Route was not copied from the product.');
	assert(first.engagement.family === 'signal', 'Family was not copied from the variant.');

	// 3. The same intake resumes; it does not commission a second engagement.
	const repeat = await startEngagement(pilotCtx, { productKey: 'diagnostic.signal', intake });
	assert(repeat.status === 'resumed', 'An identical intake was not recognised.');
	assert(repeat.engagement.id === first.engagement.id, 'A repeat intake produced a different engagement.');
	assert((await count()) === 1, 'A repeat intake created a second engagement.');

	// 4. A different question is a different engagement.
	const second = await startEngagement(pilotCtx, {
		productKey: 'diagnostic.signal',
		intake: { ...intake, commissionedDecision: 'Whether to run a winter appeal to existing supporters.' }
	});
	assert(second.status === 'started', 'A different intake reused the earlier engagement.');
	assert(second.engagement.id !== first.engagement.id, 'A different intake collided with the first.');
	assert((await count()) === 2, 'The second engagement was not stored.');

	// 5. Identity, route and family are fixed at creation.
	let frozen = false;
	try {
		await pool.query(`UPDATE "diagnostic_engagement" SET "delivery_route" = 'langfell_consultancy'`);
	} catch {
		frozen = true;
	}
	assert(frozen, 'delivery_route was mutable after creation.');

	// 6. Another brand sees nothing and cannot cancel it.
	assert((await getEngagement(otherCtx, first.engagement.id)) === null, 'The engagement leaked to another brand.');
	assert((await listEngagements(otherCtx)).length === 0, 'The engagement appeared in another brand list.');
	assert((await cancelEngagement(otherCtx, first.engagement.id)) === null, 'Another brand cancelled the engagement.');

	// 7. The owner can withdraw, and a withdrawn engagement leaves the current set.
	const withdrawn = await cancelEngagement(pilotCtx, second.engagement.id);
	assert(withdrawn?.status === 'withdrawn', 'The owner could not withdraw an engagement.');
	assert((await listEngagements(pilotCtx)).length === 2, 'Withdrawn engagements must stay visible in history.');

	// 8. The engine envelope refuses while the brand has no engine identity.
	let envelopeRefused = false;
	try {
		await buildEngineEnvelope(pilotCtx, first.engagement.id);
	} catch (error) {
		envelopeRefused = /no engine identity/.test((error as Error).message);
	}
	assert(envelopeRefused, 'The envelope was built without an engine brand mapping.');

	// 9. With a mapping it carries exactly three facts.
	await pool.query(
		`INSERT INTO "brand_engine_ref" ("brand_id", "organisation_id", "engine_brand_id", "engine_brand_slug")
		 VALUES ($1, $2, 2, 'hestia')`,
		[pilot.brandId, pilot.organisationId]
	);
	const envelope = await buildEngineEnvelope(pilotCtx, first.engagement.id);
	assert(
		JSON.stringify(Object.keys(envelope).sort()) ===
			JSON.stringify(['dataClassification', 'engagementRef', 'engineBrandRef']),
		`The envelope carried more than three facts: ${Object.keys(envelope).join(', ')}`
	);
	assert(envelope.engineBrandRef === 'hestia', 'The envelope used the wrong engine brand.');
	assert(
		!(await buildEngineEnvelope(pilotCtx, first.engagement.id)).hasOwnProperty('outputPath'),
		'The envelope must never carry a caller-supplied output path.'
	);

	console.log('Step 2 engagement model verified on the disposable database:');
	console.log(`  created   ${first.engagement.id} (${first.engagement.family}, ${first.engagement.deliveryRoute})`);
	console.log(`  resumed   identical intake -> ${repeat.engagement.id}`);
	console.log(`  separate  different intake -> ${second.engagement.id}`);
	console.log(`  envelope  ${JSON.stringify(envelope)}`);
	console.log('  intake validation, idempotence, frozen route, cross-brand denial and envelope scoping all hold.');
} finally {
	await closeDisposableDatabase(database);
}
