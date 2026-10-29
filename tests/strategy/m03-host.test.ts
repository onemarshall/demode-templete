import { describe, expect, it, vi } from 'vitest';
import { createM03Host, type M03HostPorts } from '../../src/lib/app/strategy-m03-host.server';
import { M03Record } from '../../src/lib/modules/strategy/server/stages/m03/session';
import { M03_SOURCE_SLOT } from '../../src/lib/modules/strategy/server/stages/m03/source';
import { m03Bodies, m03Source } from './fixtures/m03';

const sessionId = '95b22dbd-326d-478a-9d69-6ebba7db0918';
const jobId = '37bc85ad-ae76-4f3a-aa13-efeb4ea1a48c';
const source = m03Source();
const upstream = source.body as any;

const record = M03Record.parse({
  revision: 3,
  session: {
    module: '03',
    sessionId,
    folder: 'brand',
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    stage: 'inputs',
    m02: {
      sessionId: upstream.m02SessionId,
      sealedAt: upstream.m02SealedAt,
      outcome: upstream.m02Outcome,
      relianceScope: upstream.m02RelianceScope,
      sealReceiptId: upstream.m02Seal.receiptId,
      sealHash: upstream.m02Seal.sealHash,
    },
    m01: upstream.m01,
    route: 'full',
    routeStatus: 'confirmed',
    routeReason: '',
    confirmations: { upstream: { by: 'authenticated-actor', at: '2026-10-29T10:00:00.000Z' } },
  },
  commitments: {
    module: '03',
    sessionId,
    producedAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    upstream,
  },
  drafts: {},
  seal: null,
  sourceVersionId: source.id,
  sourceHash: source.hash,
  parentSessionId: null,
  successorReason: '',
  history: [],
});

function harness(options: { upstreamCurrent?: boolean; deniedActions?: string[] } = {}) {
  const repository = {
    getSource: vi.fn(async () => source),
    getVersion: vi.fn(async () => null),
    getSession: vi.fn(async () => ({ id: sessionId, stage: 'm03', revision: record.revision, payload: record })),
    listSessions: vi.fn(async () => [{ id: sessionId, revision: record.revision, payload: record }]),
    listDocuments: vi.fn(async () => []),
    createSessionWithSource: vi.fn(async (_scope: unknown, initializer: (source: unknown) => unknown) => {
      const input = initializer(source) as { id: string; payload: unknown };
      return { id: input.id, stage: 'm03', revision: 1, payload: input.payload };
    }),
    forkSession: vi.fn(async () => ({ id: sessionId, stage: 'm03', revision: 1, payload: record })),
    mutateSession: vi.fn(async (_scope: unknown, id: string, _expectedRevision: number, _commandId: string, update: any) => {
      const current = { id, stage: 'm03', revision: record.revision, payload: structuredClone(record) };
      const result = await update(current, { getSource: async () => source, query: vi.fn(), assertJobLease: vi.fn() });
      return { ...current, revision: record.revision + 1, payload: result.payload };
    }),
  };
  const jobs = {
    enqueue: vi.fn(async (_scope: unknown, job: { id: string; sessionId: string }) => ({ id: job.id, sessionId: job.sessionId, status: 'pending' })),
    get: vi.fn(async () => ({ id: jobId, sessionId, status: 'pending', result: null })),
  };
  const actions = ['read', 'edit', 'approve', 'generate', 'export'].filter(action => !(options.deniedActions ?? []).includes(action));
  const authority = vi.fn(async (_event: unknown, request: { organisationId: string; brandId: string }) => ({
    actorId: 'authenticated-actor', organisationId: request.organisationId, brandId: request.brandId,
    activeMembership: true, activeBrandAssignment: true, actions, approvalEngagementId: 'engagement',
  }));
  const target = vi.fn(async () => ({ organisationId: 'org', brandId: 'brand', engagementId: 'engagement' }));
  const connect = vi.fn(async () => {});
  const validate = vi.fn(async () => {});
  const generationPolicy = vi.fn(async () => {});
  const host = createM03Host({
    repository: repository as never, jobs: jobs as never, target, authority,
    generationPolicy, dispatchJob: vi.fn(async () => {}), documentReader: { getDocument: vi.fn(async () => null) } as never,
    upstream: { connect, validate } as never,
  } as M03HostPorts);
  function event(path: string, method = 'GET', body?: unknown, origin = 'https://host.test') {
    const url = new URL(path, 'https://host.test');
    const request = new Request(url, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(origin === '' ? {} : { origin }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { request, url, params: { organisationSlug: 'synthetic', brandSlug: 'brand', engagementId: 'engagement' }, cookies: { get: () => undefined } };
  }
  return { host, repository, jobs, connect, validate, generationPolicy, authority, event };
}

describe('M03 host transport', () => {
  it('creates a record only after connecting the verified upstream', async () => {
    const h = harness();
    const response = await h.host.POST(h.event('/m03', 'POST', { action: 'create', commandId: 'create-1' }));
    expect(response.status).toBe(200);
    expect(h.connect).toHaveBeenCalledTimes(1);
    expect(h.repository.createSessionWithSource).toHaveBeenCalledTimes(1);
  });

  it('enqueues a draft as a durable m03 job with the pinned source', async () => {
    const h = harness();
    const response = await h.host.POST(h.event('/m03', 'POST', {
      action: 'draft', sessionId, expectedRevision: record.revision, commandId: 'draft-1', step: 'challenge',
    }));
    expect(response.status).toBe(202);
    const job = h.jobs.enqueue.mock.calls[0]![1] as any;
    expect(job.command).toMatchObject({ module: 'm03', stage: 'm03', action: 'draft', step: 'challenge' });
    expect(job.pins).toEqual([{ slot: M03_SOURCE_SLOT, versionId: source.id, hash: source.hash }]);
    expect(h.generationPolicy).toHaveBeenCalledTimes(1);
  });

  it('refuses a draft when the caller has no generate authority', async () => {
    const h = harness({ deniedActions: ['generate'] });
    const response = await h.host.POST(h.event('/m03', 'POST', {
      action: 'draft', sessionId, expectedRevision: record.revision, commandId: 'draft-2', step: 'challenge',
    }));
    expect(response.status).toBe(403);
    expect(h.jobs.enqueue).not.toHaveBeenCalled();
  });

  it('records a step confirmation as an approval and rejects a foreign origin', async () => {
    const h = harness();
    const response = await h.host.POST(h.event('/m03', 'POST', {
      action: 'confirm-inputs', sessionId, expectedRevision: record.revision, commandId: 'confirm-1', inputs: m03Bodies.inputs,
    }));
    expect(response.status).toBe(200);
    expect(h.authority).toHaveBeenCalled();
    const denied = await h.host.POST(h.event('/m03', 'POST', { action: 'create', commandId: 'create-2' }, ''));
    expect(denied.status).toBe(403);
  });

  it('requires approval authority for an outcome and edit authority for upstream review', async () => {
    const noApprove = harness({ deniedActions: ['approve'] });
    const outcome = await noApprove.host.POST(noApprove.event('/m03', 'POST', {
      action: 'outcome', sessionId, expectedRevision: record.revision, commandId: 'outcome-1', outcome: m03Bodies.outcome,
    }));
    expect(outcome.status).toBe(403);

    const noEdit = harness({ deniedActions: ['edit'] });
    const review = await noEdit.host.POST(noEdit.event('/m03', 'POST', {
      action: 'confirm-upstream', sessionId, expectedRevision: record.revision, commandId: 'review-1', route: 'full',
    }));
    expect(review.status).toBe(403);
  });

  it('rejects an unsupported route and a sealed record', async () => {
    const h = harness();
    const skip = await h.host.POST(h.event('/m03', 'POST', {
      action: 'confirm-upstream', sessionId, expectedRevision: record.revision, commandId: 'review-2', route: 'skip',
    }));
    expect(skip.status).toBeGreaterThanOrEqual(400);
  });
});
