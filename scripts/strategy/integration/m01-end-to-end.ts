/** Actual Auth HTTP + separate M01 worker + PostgreSQL + Directus integration.
 * Uses only the existing disposable local integration stack and synthetic fixture.
 * The stack lifecycle and migrations are owned by the integration operator.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { request } from '@playwright/test';
import { readConnection, integrationState } from './local-stack';
import { StrategyRepository } from '../../../src/lib/modules/strategy/server/data/repository';
import { createStrategyAccess } from '../../../src/lib/modules/strategy/server/access';
import { sourceHash } from '../../../src/lib/modules/strategy/server/stages/m01/session';
import { ANCHOR_KEYS } from '../../../src/lib/modules/strategy/server/stages/m01/synthesis';
import { m01Source, m01ReviewAnswers, m01SetTwo } from '../../../tests/strategy/fixtures/m01';

const config = await readConnection();
const read = async (name: string) => JSON.parse(await readFile(resolve(integrationState, name), 'utf8'));
const test = await read('test.json');
const pool = new Pool({ connectionString: config.databaseUrl });
const api = await request.newContext({ baseURL: test.appUrl, extraHTTPHeaders: { origin: test.appUrl } });
let assertions = 0;
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); assertions++; };
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const hashText = (value: string) => createHash('sha256').update(value).digest('hex');
const sendAuth = async (path: string, data: unknown) => api.post(`/api/auth/${path}`, { data });

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await api.get('/api/auth/get-session', { timeout: 10000 })).ok()) break; }
    catch { /* Wait for the already-started isolated app. */ }
    if (attempt === 59) throw new Error('Isolated Auth server did not become ready');
    await delay(1000);
  }
  let user = (await pool.query('SELECT id FROM "user" WHERE email=$1', [test.email])).rows[0];
  if (!user) {
    const signup = await sendAuth('sign-up/email', { email: test.email, password: test.password, name: test.actor.name });
    check(signup.ok(), `Synthetic sign-up failed (${signup.status()})`);
    user = (await pool.query('SELECT id FROM "user" WHERE email=$1', [test.email])).rows[0];
  }
  check(!!user, 'Real Auth user persisted');
  await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1 AND email=$2', [user.id, test.email]);
  const signin = await sendAuth('sign-in/email', { email: test.email, password: test.password });
  check(signin.ok(), `Real sign-in failed (${signin.status()})`);
  const updated = await sendAuth('update-user', { name: test.actor.name });
  check(updated.ok(), 'Auth profile synchronization succeeded');
  const synced = await pool.query('SELECT count(*)::int AS count FROM directus_users WHERE email=$1', [test.email]);
  check(synced.rows[0].count === 1, 'Synthetic Auth profile synchronized to Directus');
  const current = await api.get('/api/auth/get-session');
  check((await current.json()).user.id === user.id, 'Real session cookie resolves the test user');

  const suffix = test.grantId.slice(0, 8);
  const organisationId = `strategy-org-${suffix}`;
  const brandId = `strategy-brand-${suffix}`;
  const organisationSlug = `strategy-${suffix}`;
  const engagementId = randomUUID();
  const grantId = randomUUID();
  await pool.query('INSERT INTO organization(id,name,slug,"createdAt") VALUES($1,$2,$3,now()) ON CONFLICT DO NOTHING', [organisationId, 'Synthetic integration organisation', organisationSlug]);
  await pool.query('INSERT INTO member(id,"organizationId","userId",role,"createdAt") VALUES($1,$2,$3,$4,now()) ON CONFLICT DO NOTHING', [`strategy-member-${suffix}`, organisationId, user.id, 'owner']);
  await pool.query('INSERT INTO personal_organisation_owner(organisation_id,owner_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [organisationId, user.id]);
  await pool.query('INSERT INTO brand(id,organisation_id,name,slug,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [brandId, organisationId, 'Synthetic integration brand', 'synthetic', user.id]);
  await pool.query("INSERT INTO brand_member(id,brand_id,user_id,role,status,grant_source,granted_by) VALUES($1,$2,$3,'brand_admin','active','administrative',$3) ON CONFLICT DO NOTHING", [`strategy-assignment-${suffix}`, brandId, user.id]);
  await pool.query('INSERT INTO subscription(id,plan,"referenceId",status,"periodEnd") VALUES($1,$2,$3,$4,now()+interval \'1 day\') ON CONFLICT DO NOTHING', [`strategy-subscription-${suffix}`, 'synthetic-test-only', user.id, 'active']);
  await pool.query('UPDATE subscription SET status=$2,"periodEnd"=now()+interval \'1 day\' WHERE "referenceId"=$1', [user.id, 'active']);
  await pool.query('INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [organisationId, brandId]);
  await pool.query('INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [organisationId, brandId, engagementId, 'Synthetic M01 integration engagement', user.id]);
  await pool.query("INSERT INTO strategy_access_grant(id,organisation_id,brand_id,engagement_id,user_id,actions,is_approver,authority_role) VALUES($1,$2,$3,$4,$5,ARRAY['read','edit','approve','generate','export','manage'],true,$6) ON CONFLICT(id) DO UPDATE SET revoked_at=NULL", [grantId, organisationId, brandId, engagementId, user.id, test.actor.role]);

  // The trusted synthetic fixture is published through the repository boundary;
  // all workflow commands below use real authenticated HTTP authority.
  const access = createStrategyAccess(async request => ({ actorId: user.id, organisationId: request.organisationId, brandId: request.brandId, activeMembership: true, activeBrandAssignment: true, actions: ['manage'], approvalEngagementId: request.engagementId }));
  const scope = await access.authorize({ organisationId, brandId, engagementId, action: 'manage' });
  const repository = new StrategyRepository(pool);
  await repository.setSource(scope, { id: randomUUID(), slot: 'm01-input', body: m01Source, hash: sourceHash(m01Source) });

  const base = `/o/${organisationSlug}/synthetic/strategy/engagements/${engagementId}/founder-conviction`;
  const anonymous = await request.newContext({ baseURL: test.appUrl });
  check((await anonymous.get(base, { headers: { accept: 'application/json' } })).status() === 403, 'Anonymous cannot read Founder Conviction');
  await anonymous.dispose();

  const result = async (body: unknown) => {
    const response = await api.post(base, { data: body });
    let value: any = null;
    try { value = await response.json(); } catch { /* Preserve status-only assertion failures. */ }
    return { response, value };
  };
  const post = async (body: unknown) => {
    const { response, value } = await result(body);
    check(response.ok(), `M01 command failed (${response.status()})`);
    return value;
  };
  let record = await post({ action: 'create', commandId: randomUUID() });
  const command = (action: string, extra: Record<string, unknown> = {}) => ({
    action, sessionId: record.id, expectedRevision: record.revision, commandId: randomUUID(), ...extra,
  });
  const reload = async () => {
    const response = await api.get(`${base}?sessionId=${encodeURIComponent(record.id)}`, { headers: { accept: 'application/json' } });
    check(response.ok(), `M01 session reload failed (${response.status()})`);
    const body = await response.json();
    record = { id: body.session.sessionId, revision: body.session.revision, payload: body.session };
    return body;
  };
  const runJob = async (action: string, extra: Record<string, unknown> = {}) => {
    const queued = await post(command(action, extra));
    check(!!queued.jobId, `${action} committed a durable job`);
    let job: any;
    for (let attempt = 0; attempt < 180; attempt++) {
      const response = await api.get(`${base}?sessionId=${encodeURIComponent(record.id)}&jobId=${encodeURIComponent(queued.jobId)}`, { headers: { accept: 'application/json' } });
      check(response.ok(), `M01 job status read failed (${response.status()})`);
      job = await response.json();
      if (job.status === 'succeeded' || job.status === 'failed') break;
      await delay(500);
    }
    check(job?.status === 'succeeded', `${action} separate worker completed`);
    return reload();
  };

  await runJob('prepare');
  await runJob('turn', { message: null });
  await runJob('turn', { message: 'Synthetic interview answer: I learned to name the difficult conversation early.' });
  const stale = await result({ ...command('note', { note: 'Stale write must be rejected.' }), expectedRevision: record.revision - 1 });
  check(stale.response.status() === 409, 'Stale M01 revision rejected by compare-and-swap');
  record = await post(command('note', { note: 'Synthetic note for this disposable workflow test.' }));
  const eventsCommand = command('append-events', { events: [{ event_id: randomUUID(), type: 'session.input_transcript.delta', delta: 'Synthetic source evidence only.' }] });
  const firstEvents = await post(eventsCommand);
  const replayEvents = await post(eventsCommand);
  check(firstEvents.revision === replayEvents.revision, 'Transcript event command replay is idempotent');
  record = replayEvents;

  await runJob('synthesise');
  await runJob('revise-anchor', { anchorKey: ANCHOR_KEYS[0], note: 'Keep the synthetic founder wording clear.' });
  await runJob('revise-manifesto', { note: 'Keep this synthetic test wording direct.' });
  await runJob('revise-matrix', { note: 'Keep each synthetic evidence boundary explicit.' });
  await runJob('derive');

  for (const anchorKey of ANCHOR_KEYS) record = await post(command('confirm', { part: 'anchor', anchorKey }));
  for (const part of ['manifesto', 'languageBank', 'evidenceMatrix', 'factsAnchor', 'readiness'])
    record = await post(command('confirm', { part }));

  const attested = await post({ action: 'attest-source', type: 'single founder / owner', name: 'Synthetic founder', materialUsed: 'intake.md', evidenceRefs: ['intake.md'], statement: 'I am the synthetic founder and attest to the cited synthetic input for this workflow test.' });
  const attributionId = attested.attribution.id;
  check(!!attributionId, 'Authenticated manager records a source attestation');
  const review = m01ReviewAnswers();
  const invalidAuthority = await result(command('seal', { reviewAnswers: review, derived: record.payload.setTwoDraft, sourceAttributionId: randomUUID(), notes: 'Synthetic source-attribution rejection check.' }));
  check(invalidAuthority.response.status() === 403, 'Seal rejects an unknown source attestation');

  record = await post(command('seal', { reviewAnswers: review, derived: record.payload.setTwoDraft, sourceAttributionId: attributionId, notes: 'Synthetic integration seal.' }));
  check(!!record.payload.seal?.versionId && !!record.payload.handoff, 'M01 version and handoff sealed');
  const readResponse = await api.get(`${base}?sessionId=${encodeURIComponent(record.id)}`, { headers: { accept: 'application/json' } });
  check(readResponse.ok(), 'Sealed M01 reads through authenticated HTTP and Directus');
  const loaded = await readResponse.json();
  const document = loaded.documents.find((entry: any) => entry.kind === 'founder-convictions');
  check(!!document?.content && document.content.includes('# Founder Convictions'), 'Directus-backed Founder Convictions document is readable');
  const stored = (await pool.query('SELECT content,hash,version_id FROM strategy_document WHERE id=$1', [document.id])).rows[0];
  check(stored.content === document.content && stored.version_id === document.versionId, 'Directus content matches the sealed SQL record');
  check(hashText(stored.content) === stored.hash && stored.hash === document.hash, 'Persisted content hash is preserved');
  const handoff = `${base}/handoff?sessionId=${record.id}&versionId=${document.versionId}&documentId=${document.id}`;
  const download = await api.get(handoff);
  check(download.ok() && await download.text() === stored.content, 'HTTP handoff export equals immutable document content');
  const directusUrl = `${config.directusUrl}/items/strategy_document?filter[id][_eq]=${encodeURIComponent(document.id)}&fields=id,version_id,kind,content,hash&limit=1`;
  const directusRead = await fetch(directusUrl, { headers: { authorization: `Bearer ${config.readerToken}` } });
  check(directusRead.ok, 'Read-only Directus identity can read the sealed document');
  const directusRow = (await directusRead.json() as any).data?.[0];
  check(directusRow?.content === stored.content && directusRow?.hash === stored.hash, 'Directus API returns exact sealed bytes and hash');
  const directusWrite = await fetch(`${config.directusUrl}/items/strategy_document/${encodeURIComponent(directusRow?.id ?? document.id)}`, {
    method: 'PATCH', headers: { authorization: `Bearer ${config.readerToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'forged' }),
  });
  check(directusWrite.status === 403, 'Directus reader identity cannot write');
  let sqlImmutable = false;
  try { await pool.query('UPDATE strategy_document SET content=$1 WHERE organisation_id=$2 AND brand_id=$3 AND engagement_id=$4 AND id=$5', ['forged', organisationId, brandId, engagementId, document.id]); }
  catch (error) { sqlImmutable = error instanceof Error && error.message.includes('immutable'); }
  check(sqlImmutable, 'Database rejects mutation of an immutable sealed document');

  await writeFile(resolve(integrationState, 'm01-browser-target.json'), JSON.stringify({
    url: `${test.appUrl}${base}?sessionId=${loaded.session.sessionId}`, base,
    sessionId: loaded.session.sessionId, engagementId, grantId,
    documentId: document.id, versionId: document.versionId, handoff,
  }, null, 2), { mode: 0o600 });
  await writeFile(resolve(integrationState, 'm01-browser-state.json'), JSON.stringify(await api.storageState()), { mode: 0o600 });

  const sealedWrite = await result(command('note', { note: 'Must be denied after seal.' }));
  check(!sealedWrite.response.ok(), 'Sealed M01 session rejects writes');
  const cross = await api.get(base.replace('/synthetic/strategy/', '/not-assigned-synthetic/strategy/') + `?sessionId=${record.id}`, { headers: { accept: 'application/json' } });
  check([403, 404].includes(cross.status()), 'Cross-brand route is denied');

  const successor = await post(command('successor', { reason: 'Synthetic successor revocation check.' }));
  record = { id: successor.id, revision: successor.revision, payload: successor.payload };
  const revoke = await post({ action: 'revoke-source', attributionId, reason: 'Synthetic integration revocation check.' });
  check(revoke.revoked === true, 'Source attestation is audibly revoked');
  const deniedRevokedSeal = await result(command('seal', { reviewAnswers: review, derived: m01SetTwo(), sourceAttributionId: attributionId, notes: 'Expected denial for revoked attribution.' }));
  check(deniedRevokedSeal.response.status() === 403, 'Revoked source attribution cannot seal a successor');

  // Exercise upstream staleness with a separate unsealed probe, then restore the
  // original trusted input bytes so the saved browser target remains current.
  if (!process.argv.includes('--for-m02-chain')) {
  const probe = await post({ action: 'create', commandId: randomUUID() });
  const changedInput = structuredClone(m01Source);
  changedInput.parts[0].text = 'Synthetic source changed only to prove stale-input rejection.';
  await repository.setSource(scope, { id: randomUUID(), slot: 'm01-input', body: changedInput, hash: sourceHash(changedInput) });
  try {
    const staleSource = await result({ action: 'note', sessionId: probe.id, expectedRevision: probe.revision, commandId: randomUUID(), note: 'Must fail against changed upstream source.' });
    check(!staleSource.response.ok(), 'M01 mutation is denied when its upstream source has changed');
  } finally {
    await repository.setSource(scope, { id: randomUUID(), slot: 'm01-input', body: m01Source, hash: sourceHash(m01Source) });
  }

  }

  await writeFile(resolve(integrationState, 'm01-end-to-end-result.json'), JSON.stringify({
    passed: true, assertions, stage: 'm01', realAuth: true, separateWorker: true, directus: true,
    sourceAttribution: true, liveDatabaseChanged: false, organisationId, brandId, engagementId,
    sessionId: loaded.session.sessionId, versionId: document.versionId, at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
  console.log(`PASS: ${assertions} assertions across real Auth, separate M01 worker, PostgreSQL, Directus, attestation and immutable export.`);
} finally {
  await api.dispose();
  await pool.end();
}
