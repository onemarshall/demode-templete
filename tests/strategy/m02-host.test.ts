import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createM02Host, type M02HostPorts } from '../../src/lib/app/strategy-m02-host.server';
import { M02Record, M02_SOURCE_SLOT } from '../../src/lib/modules/strategy/server/stages/m02/service';
import { M02Session, ReconLog, CollectionRecord } from '../../src/lib/modules/strategy/server/stages/m02/session';
import { makeM02Seal } from '../../src/lib/modules/strategy/server/stages/m02/seal';

const sessionId = '95b22dbd-326d-478a-9d69-6ebba7db0918';
const jobId = '37bc85ad-ae76-4f3a-aa13-efeb4ea1a48c';
const originSession = '1d8d487d-8406-4b75-a60b-52d9821320c2';
const documentId = '82233ec2-b471-4208-b098-fb7ce9c84ac7';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const claimsBoundaryInputs = { canClaim: ['Claim grounded in evidence'], mustQualify: ['Qualified claim'], cannotClaim: ['Unsupported claim'] };
const sourceInputs = {
  sessionId: originSession, sealedAt: '2026-10-28T12:00:00.000Z', coreBelief: 'Core belief', brokenThing: 'Broken thing',
  hiddenTruth: 'Hidden truth', marketDeployableHiddenTruth: 'Investigable truth', nonNegotiable: 'Non-negotiable',
  hardWonTeaching: 'Hard-won teaching', legacy: 'Legacy', claimsBoundaryInputs,
};
const originPayload = JSON.stringify({ outputs: {
  anchors: [
    { key: 'Core Belief', sentence: sourceInputs.coreBelief }, { key: 'The Broken Thing', sentence: sourceInputs.brokenThing },
    { key: 'The Hidden Truth', sentence: sourceInputs.hiddenTruth }, { key: 'Market-Deployable Hidden Truth', sentence: sourceInputs.marketDeployableHiddenTruth },
    { key: 'The Non-Negotiable', sentence: sourceInputs.nonNegotiable }, { key: 'The Hard-Won Teaching', sentence: sourceInputs.hardWonTeaching },
    { key: 'The Legacy', sentence: sourceInputs.legacy },
  ], claimsBoundaryInputs,
} });
const sourceBody = {
  sessionId: originSession, sealedAt: sourceInputs.sealedAt, outputsHash: hash(originPayload), inputs: sourceInputs,
  originVersionId: 'a5ceaa58-e6c8-40a2-b605-50bde35b5bea', originRevision: 4,
  originCanonicalPayload: originPayload, originApproval: { approvalId: 'approval-1' },
};
const source = { id: 'source-v1', slot: M02_SOURCE_SLOT, body: sourceBody, hash: hash(JSON.stringify(sourceBody)) };
const record = M02Record.parse({
  revision: 1,
  session: M02Session.parse({ module: '02', sessionId, folder: 'brand', createdAt: '2026-10-29T10:00:00.000Z', updatedAt: '2026-10-29T10:00:00.000Z', stage: 'setup', m01: { sessionId: originSession, sealedAt: sourceInputs.sealedAt, outputsHash: sourceBody.outputsHash }, route: 'full', routeStatus: 'proposed', research: {} }),
  recon: ReconLog.parse({ module: '02', sessionId, producedAt: '2026-10-29T10:00:00.000Z', updatedAt: '2026-10-29T10:00:00.000Z', m01Inputs: sourceInputs }),
  artifacts: { artifacts: [] }, collection: CollectionRecord.parse({ collectionId: 'collection-1', state: 'not_started', updatedAt: '2026-10-29T10:00:00.000Z' }),
  seal: null, sourceVersionId: source.id, sourceHash: source.hash, history: [],
});
const sealedBase = M02Record.parse({
  ...record,
  session: {
    ...record.session, stage: 'sealed',
    evidenceReview: { receiptId: '7e93feda-2cbc-465e-a38d-e9657ea42e3e', by: 'authenticated-actor', at: '2026-10-29T10:00:00.000Z', disposition: 'insufficient', rationale: 'Evidence review.', basisHash: 'd'.repeat(64), entanglement: { pass: true, problems: [] }, evidenceProblems: [] },
    progressionDecision: { receiptId: 'eb76e3ea-5ff8-4bec-89db-e457d7fc0a46', by: 'authenticated-actor', at: '2026-10-29T10:00:00.000Z', outcome: 'outcome_b', statement: 'Recorded decision.', basisHash: 'd'.repeat(64), evidenceReceiptId: '7e93feda-2cbc-465e-a38d-e9657ea42e3e' },
  },
  recon: { ...record.recon, synthesis: { outcome: 'outcome_b', statement: 'Recorded decision.', acknowledgedRisks: [] } },
});
const seal = makeM02Seal(sealedBase, 'authenticated-actor', '2026-10-29T10:00:00.000Z');
const sealedPayload = M02Record.parse({ ...sealedBase, seal });
const sealedSnapshots = { session: sealedPayload.session, recon: sealedPayload.recon, artifacts: sealedPayload.artifacts, collection: sealedPayload.collection };
const rendered = '# Saved';
const sealedCanonical = JSON.stringify({ receipt: seal, snapshots: sealedSnapshots, lineage: { parentSessionId: null, successorReason: '' }, source: { versionId: source.id, hash: source.hash }, rendered, renderedHash: hash(rendered) });
const sealedVersion = { canonicalPayload: sealedCanonical, sealHash: hash(sealedCanonical), hashAlgorithm: 'sha256-json-stringify-v1' };

function harness(options: { currentRevision?: number; currentSource?: typeof source | null; docs?: any[]; directusDoc?: any; job?: any; persistedStage?: string; stage?: string; sealed?: boolean; denied?: boolean } = {}) {
  const currentSource = options.currentSource === undefined ? source : options.currentSource;
  const currentRevision = options.currentRevision ?? 1;
  const payload = M02Record.parse({ ...record, revision: currentRevision, session: { ...record.session, stage: options.stage ?? record.session.stage },
    ...(options.sealed ? sealedPayload : {}) });
  const repository = {
    getSource: vi.fn(async () => currentSource),
    getVersion: vi.fn(async () => options.sealed ? sealedVersion : null),
    getSession: vi.fn(async () => ({ id: sessionId, stage: options.persistedStage ?? 'm02', revision: currentRevision, payload })),
    listSessions: vi.fn(async () => []),
    listDocuments: vi.fn(async () => options.docs ?? []),
    createSessionWithSource: vi.fn(async (_scope, initializer) => {
      const input = typeof initializer === 'function' ? initializer(source) : initializer;
      return { id: input.id, stage: 'm02', revision: 1, payload: input.payload };
    }),
    forkSession: vi.fn(async (_scope, _parentId, _expectedRevision, _commandId, initialize) => {
      const result = await initialize({ id: sessionId, stage: 'm02', revision: currentRevision, payload }, { getSource: async () => currentSource, query: vi.fn(), assertJobLease: vi.fn() });
      return { id: result.successor.id, stage: result.successor.stage, revision: 1, payload: result.successor.payload };
    }),
  };
  const jobs = {
    enqueue: vi.fn(async (_scope, job) => ({ id: job.id, sessionId: job.sessionId, status: 'pending' })),
    get: vi.fn(async () => options.job ?? { id: jobId, sessionId, status: 'pending', result: null }),
  };
  const target = vi.fn(async () => ({ organisationId: 'org', brandId: 'brand', engagementId: 'engagement' }));
  const authority = vi.fn(async (_event, request) => options.denied ? null : ({
    actorId: 'authenticated-actor', organisationId: request.organisationId, brandId: request.brandId,
    activeMembership: true, activeBrandAssignment: true,
    actions: ['read', 'edit', 'approve', 'generate', 'export'] as const,
    approvalEngagementId: 'engagement',
  }));
  const connect = vi.fn(async () => {});
  const validate = vi.fn(async () => {});
  const generationPolicy = vi.fn(async () => {});
  const documentReader = { getDocument: vi.fn(async () => options.directusDoc ?? null) };
  const host = createM02Host({
    repository: repository as never, jobs: jobs as never, target, authority,
    generationPolicy, dispatchJob: vi.fn(async () => {}), documentReader: documentReader as never,
    upstream: { connect, validate } as never,
  } as M02HostPorts);
  function event(path: string, method = 'GET', body?: unknown, origin = 'https://host.test') {
    const url = new URL(path, 'https://host.test');
    const request = new Request(url, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(origin === '' ? {} : { origin }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { request, url, params: {}, locals: {} };
  }
  return { host, repository, jobs, target, authority, connect, validate, generationPolicy, documentReader, event };
}
const command = (action: string, extra: Record<string, unknown> = {}) => ({ action, sessionId, expectedRevision: 1, commandId: 'command-1', ...extra });

describe('M02 host boundary', () => {
  it('requires same-origin strict commands before resolving authority', async () => {
    const h = harness();
    expect((await h.host.POST(h.event('/m02', 'POST', { action: 'create', commandId: 'x' }, 'https://attacker.test'))).status).toBe(403);
    expect((await h.host.POST(h.event('/m02', 'POST', { action: 'create', commandId: 'x', actorId: 'root' }))).status).toBe(400);
    expect(h.target).not.toHaveBeenCalled();
    expect(h.authority).not.toHaveBeenCalled();
  });

  it('denies an unauthenticated principal before connecting an upstream or creating a record', async () => {
    const h = harness({ denied: true });
    expect((await h.host.POST(h.event('/m02', 'POST', { action: 'create', commandId: 'create-1' }))).status).toBe(403);
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.repository.createSessionWithSource).not.toHaveBeenCalled();
  });

  it('connects the verified upstream only on explicit create and persists no browser actor', async () => {
    const h = harness();
    const result = await h.host.POST(h.event('/m02', 'POST', { action: 'create', commandId: 'create-1' }));
    expect(result.status).toBe(200);
    expect(h.connect).toHaveBeenCalledOnce();
    expect(h.repository.createSessionWithSource).toHaveBeenCalledOnce();
    expect(h.authority).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'edit' }), undefined);
  });

  it('queues drafts with the trusted source version/hash and current authenticated scope', async () => {
    const h = harness();
    const result = await h.host.POST(h.event('/m02', 'POST', command('draft', { gate: 'setup' })));
    expect(result.status).toBe(202);
    const [scope, job] = h.jobs.enqueue.mock.calls[0]!;
    expect(scope).toMatchObject({ action: 'generate', actorId: 'authenticated-actor' });
    expect(job).toMatchObject({
      sessionId, expectedRevision: 1,
      command: { action: 'draft', gate: 'setup', module: 'm02', stage: 'm02' },
      pins: [{ slot: M02_SOURCE_SLOT, versionId: source.id, hash: source.hash }],
    });
    expect(h.validate).toHaveBeenCalled();
  });

  it('queues public URL collection without invoking the model generation policy', async () => {
    const h = harness({ stage: 'gather' });
    const response = await h.host.POST(h.event('/m02', 'POST', command('collect-url', {
      url: 'https://example.test/research', kind: 'competitor', target: 'Example competitor', note: 'Pricing page',
    })));
    expect(response.status).toBe(202);
    const [, job] = h.jobs.enqueue.mock.calls[0]!;
    expect(job).toMatchObject({
      sessionId, expectedRevision: 1,
      command: { action: 'collect-url', url: 'https://example.test/research', kind: 'competitor', target: 'Example competitor', module: 'm02', stage: 'm02' },
      pins: [{ slot: M02_SOURCE_SLOT, versionId: source.id, hash: source.hash }],
    });
    expect(h.generationPolicy).not.toHaveBeenCalled();
    const unsafe = await h.host.POST(h.event('/m02', 'POST', command('collect-url', {
      url: 'http://127.0.0.1/private', kind: 'competitor', target: 'Internal service',
    })));
    expect(unsafe.status).toBe(400);
  });

  it('rejects stale revisions and changed upstream sources before enqueue', async () => {
    const staleRevision = harness({ currentRevision: 2 });
    expect((await staleRevision.host.POST(staleRevision.event('/m02', 'POST', command('draft', { gate: 'setup' })))).status).toBe(409);
    expect(staleRevision.jobs.enqueue).not.toHaveBeenCalled();
    const staleSource = harness({ currentSource: { ...source, id: 'source-v2' } });
    expect((await staleSource.host.POST(staleSource.event('/m02', 'POST', command('draft', { gate: 'setup' })))).status).toBe(409);
    expect(staleSource.jobs.enqueue).not.toHaveBeenCalled();
  });

  it('keeps job status inside the M02 session and exposes a completed candidate only to its authorized reader', async () => {
    const h = harness({ job: { id: jobId, sessionId, status: 'succeeded', result: { candidate: { cohort: 'candidate' } } } });
    const result = await h.host.GET(h.event(`/m02?jobId=${jobId}&sessionId=${sessionId}`));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ status: 'succeeded', result: { candidate: { cohort: 'candidate' } } });
    const foreign = harness({ job: { id: jobId, sessionId: '9c10bdd3-9a91-437f-b668-0f16000ca573', status: 'pending' } });
    expect((await foreign.host.GET(foreign.event(`/m02?jobId=${jobId}&sessionId=${sessionId}`))).status).toBe(404);
  });

  it('reads sealed documents only when the exact Directus tuple matches metadata', async () => {
    const document = { id: documentId, versionId: seal.receiptId, sessionId, kind: 'market-reality', content: rendered, hash: hash(rendered) };
    const metadata = { id: document.id, versionId: document.versionId, sessionId, kind: document.kind, hash: document.hash };
    const good = harness({ docs: [metadata], directusDoc: document, sealed: true });
    const response = await good.host.GET(good.event(`/m02?sessionId=${sessionId}`));
    expect(response.status).toBe(200);
    expect((await response.json() as any).documents).toMatchObject([{ ...metadata, content: document.content, contentHtml: expect.stringContaining('<h1>Saved</h1>') }]);
    const bad = harness({ docs: [metadata], directusDoc: { ...document, hash: 'b'.repeat(64) }, sealed: true });
    expect((await bad.host.GET(bad.event(`/m02?sessionId=${sessionId}`))).status).toBe(503);
  });

  it('exports only a document attached to the sealed receipt and verified metadata', async () => {
    const document = { id: documentId, versionId: seal.receiptId, sessionId, kind: 'market-reality', content: rendered, hash: hash(rendered) };
    const metadata = { id: document.id, versionId: document.versionId, sessionId, kind: document.kind, hash: document.hash };
    const h = harness({ docs: [metadata], directusDoc: document, sealed: true });
    const response = await h.host.handoff(h.event(`/m02/handoff?sessionId=${sessionId}&versionId=${seal.receiptId}&documentId=${documentId}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(document.content);
    expect(response.headers.get('content-disposition')).toContain(`market-reality-${documentId}.md`);
  });

  it('creates a successor from the current M01 source through the scoped repository fork', async () => {
    const h = harness({ sealed: true });
    const response = await h.host.POST(h.event('/m02', 'POST', command('successor', { reason: 'Research scope changed.' })));
    expect(response.status).toBe(200);
    expect(h.repository.forkSession).toHaveBeenCalledOnce();
    expect(h.connect).toHaveBeenCalledOnce();
    expect(h.validate).toHaveBeenCalled();
    expect(h.authority).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'edit' }), undefined);
  });
});
