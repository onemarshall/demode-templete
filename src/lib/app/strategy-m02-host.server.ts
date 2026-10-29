/** Auth transport for Market Reality. Scope, actor and upstream authority are resolved server-side. */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createStrategyAccess, StrategyAccessError, type StrategyAction, type StrategyScope } from '#lib/modules/strategy/server/access.js';
import { StrategyConflict, StrategyNotFound, type StrategyRepository } from '#lib/modules/strategy/server/data/repository.js';
import { StrategyDocumentServiceError, type StrategyDocumentReader } from '#lib/modules/strategy/server/data/directus-documents.js';
import { StrategyJobs } from '#lib/modules/strategy/server/data/jobs.js';
import { createM02Service, M02_SOURCE_SLOT } from '#lib/modules/strategy/server/stages/m02/service.js';
import { allowedOutcomes } from '#lib/modules/strategy/server/stages/m02/gates.js';
import type { createM02Upstream } from './strategy-m02-source.server';
import { m02CommandSchema } from '#lib/modules/strategy/server/stages/m02/commands.js';
import { strategyMethodRelease } from '#lib/modules/strategy/server/resources.js';
import { renderStrategyMarkdown } from '#lib/modules/strategy/server/document-markdown.js';
import { strategyHttpError, type StrategyEvent, type StrategyHostPorts } from './strategy-host.server';

export { m02CommandSchema } from '#lib/modules/strategy/server/stages/m02/commands.js';

export interface M02HostPorts {
  repository: StrategyRepository;
  documentReader?: StrategyDocumentReader;
  target: StrategyHostPorts['target'];
  authority: StrategyHostPorts['authority'];
  jobs?: StrategyJobs;
  generationPolicy?(event: StrategyEvent, scope: StrategyScope): Promise<void>;
  dispatchJob?(jobId: string): Promise<void>;
  methodRelease?: string;
  upstream: ReturnType<typeof createM02Upstream>;
}

const documentKinds = new Set(['market-reality', 'receipt']);
const queuedActions = new Set(['draft', 'collect-url']);
const noStore = { 'cache-control': 'private, no-store' };
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: noStore });

async function parseBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Unsupported body');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function failure(error: unknown) {
  if (error instanceof StrategyDocumentServiceError) return response({ error: error.message }, 503);
  if (error instanceof Error && /M01 source authority changed|Current sealed M01 source is unavailable|Founder Conviction source changed/.test(error.message)) {
    return response({ error: 'The sealed M01 source changed or is unavailable. Create a fresh Market Reality record from the current source.', code: 'm02-source-stale' }, 409);
  }
  if (error instanceof Error && error.message === 'M02 session not found') return response({ error: 'Strategy resource not found' }, 404);
  return strategyHttpError(error);
}

export function createM02Host(ports: M02HostPorts) {
  async function scope(event: StrategyEvent, action: StrategyAction) {
    const target = await ports.target(event);
    return createStrategyAccess((request, tx) => ports.authority(event, request, tx)).authorize({ ...target, action });
  }
  function service() {
    return createM02Service({
      repository: ports.repository,
      methodRelease: ports.methodRelease,
      validateSource: ports.upstream.validate,
    });
  }
  async function exactDocuments(access: StrategyScope, sessionId: string) {
    const metadata = await ports.repository.listDocuments(access, sessionId);
    const documents = [];
    for (const item of metadata) {
      if (!documentKinds.has(item.kind)) continue;
      if (!ports.documentReader) throw new StrategyDocumentServiceError();
      const stored = await ports.documentReader.getDocument(access, item.id);
      if (!stored || stored.sessionId !== sessionId || stored.versionId !== item.versionId || stored.kind !== item.kind || stored.hash !== item.hash) {
        throw new StrategyDocumentServiceError();
      }
      documents.push({ ...item, content: stored.content, ...(item.kind === 'market-reality' ? { contentHtml: renderStrategyMarkdown(stored.content) } : {}) });
    }
    return documents;
  }
  async function read(event: StrategyEvent) {
    const access = await scope(event, 'read');
    const id = event.url.searchParams.get('sessionId');
    if (!id) {
      const sessions = await ports.repository.listSessions(access, 'm02');
      const source = await ports.repository.getSource(access, M02_SOURCE_SLOT);
      return { sessions: sessions.map(s => ({ id: s.id, revision: s.revision, payload: s.payload })), sourceReady: !!source };
    }
    const sessionId = z.uuid().parse(id);
    let loaded: Awaited<ReturnType<ReturnType<typeof createM02Service>['load']>>;
    try { loaded = await service().load(access, sessionId); }
    catch (error) { if (error instanceof Error && error.message === 'M02 session not found') throw new StrategyNotFound(); throw error; }
    const documents = loaded.session.stage === 'sealed' ? await exactDocuments(access, sessionId) : [];
    const progressionRecon = structuredClone(loaded.recon);
    if (loaded.session.evidenceReview) progressionRecon.entanglement = loaded.session.evidenceReview.entanglement;
    const progression = allowedOutcomes(progressionRecon, loaded.collection.state);
    if (loaded.session.evidenceReview?.disposition !== 'sufficient_for_provisional') {
      progression.options = progression.options.filter(option => !['provisional_a', 'validated_a'].includes(option.outcome));
      if (!progression.options.length && !progression.blocked) progression.blocked = 'Outcome A requires a sufficient evidence judgement tied to the current evidence basis.';
    }
    if (loaded.session.evidenceReview?.evidenceProblems.length) {
      progression.options = [];
      progression.blocked = 'The recorded evidence-kind checks failed. Return to evidence gathering and revise the affected gate before choosing a progression outcome.';
    }
    return { ...loaded, progression, documents };
  }
  return {
    read,
    async GET(event: StrategyEvent) {
      try {
        if (event.url.searchParams.has('jobId')) {
          const access = await scope(event, 'generate');
          if (!ports.jobs) throw new Error('Background generation unavailable');
          const sessionId = z.uuid().parse(event.url.searchParams.get('sessionId'));
          const record = await ports.repository.getSession(access, sessionId);
          if (!record || record.stage !== 'm02') throw new StrategyNotFound();
          const job = await ports.jobs.get(access, z.uuid().parse(event.url.searchParams.get('jobId')));
          if (!job || job.sessionId !== sessionId) throw new StrategyNotFound();
          return response({ jobId: job.id, status: job.status, sessionId: job.sessionId,
            ...(job.status === 'succeeded' ? { result: job.result } : {}) });
        }
        return response(await read(event));
      } catch (error) { return failure(error); }
    },
    async POST(event: StrategyEvent) {
      try {
        if (event.request.headers.get('origin') !== event.url.origin) throw new StrategyAccessError();
        const input = m02CommandSchema.parse(await parseBody(event.request));
        const action: StrategyAction = input.action === 'seal' || input.action === 'revise' || input.action.startsWith('confirm-') || input.action === 'evidence-review' || input.action === 'outcome' || input.action === 'review-artifacts' || input.action === 'builder-inputs'
          ? 'approve'
          : queuedActions.has(input.action) ? 'generate' : 'edit';
        const access = await scope(event, action);
        const m02 = service();
        if (input.action === 'create') {
          await ports.upstream.connect(access);
          return response(await m02.create(access, input));
        }
        if (queuedActions.has(input.action)) {
          if (!ports.jobs || (input.action === 'draft' && !ports.generationPolicy)) throw new Error('Background generation unavailable');
          if (input.action === 'draft') await ports.generationPolicy!(event, access);
          const readAccess = await scope(event, 'read');
          const loaded = await m02.load(readAccess, input.sessionId);
          if (loaded.revision !== input.expectedRevision) throw new StrategyConflict(loaded.revision);
          if (!loaded.upstreamCurrent) throw new Error('M01 source authority changed — create a fresh M02 candidate');
          if (loaded.session.stage === 'sealed') throw new Error('This M02 record is sealed.');
          if (input.action === 'collect-url' && loaded.session.stage !== 'gather') throw new Error('Public URL collection is only available during evidence gathering.');
          const source = await ports.repository.getSource(access, M02_SOURCE_SLOT);
          if (!source || source.id !== loaded.sourceVersionId || source.hash !== loaded.sourceHash) throw new StrategyNotFound();
          const job = await ports.jobs.enqueue(access, {
            id: randomUUID(), sessionId: input.sessionId, expectedRevision: input.expectedRevision, commandId: input.commandId,
            command: { ...input, module: 'm02', stage: 'm02' },
            pins: [{ slot: M02_SOURCE_SLOT, versionId: source.id, hash: source.hash }],
            methodRelease: ports.methodRelease ?? strategyMethodRelease,
          });
          try { await ports.dispatchJob?.(job.id); } catch { /* The committed outbox recovers delivery. */ }
          return response({ jobId: job.id, status: job.status, sessionId: job.sessionId }, 202);
        }
        if (input.action === 'add-artifact') return response(await m02.addArtifact(access, input));
        if (input.action === 'delete-artifact') return response(await m02.deleteArtifact(access, input));
        if (input.action === 'successor') {
          await ports.upstream.connect(access);
          return response(await m02.successor(access, input));
        }
        return response(await m02.confirm(access, input));
      } catch (error) { return failure(error); }
    },
    async handoff(event: StrategyEvent) {
      try {
        const access = await scope(event, 'export');
        const sessionId = z.uuid().parse(event.url.searchParams.get('sessionId'));
        const versionId = z.uuid().parse(event.url.searchParams.get('versionId'));
        const documentId = z.uuid().parse(event.url.searchParams.get('documentId'));
        const session = await ports.repository.getSession(access, sessionId);
        if (!session || session.stage !== 'm02' || (session.payload as { seal?: { receiptId?: string } }).seal?.receiptId !== versionId) throw new StrategyNotFound();
        const metadata = (await ports.repository.listDocuments(access, sessionId)).find(item => item.id === documentId && item.versionId === versionId && documentKinds.has(item.kind));
        if (!metadata) throw new StrategyNotFound();
        if (!ports.documentReader) throw new StrategyDocumentServiceError();
        const document = await ports.documentReader.getDocument(access, documentId);
        if (!document || document.sessionId !== sessionId || document.versionId !== versionId || document.kind !== metadata.kind || document.hash !== metadata.hash) throw new StrategyNotFound();
        return new Response(document.content, { headers: {
          'content-type': document.kind === 'market-reality' ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
          'content-disposition': `attachment; filename="market-reality-${documentId}.${document.kind === 'receipt' ? 'json' : 'md'}"`,
          ...noStore, 'x-content-type-options': 'nosniff',
        } });
      } catch (error) { return failure(error); }
    },
  };
}
