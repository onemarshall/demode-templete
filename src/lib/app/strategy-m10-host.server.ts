/** Auth transport for Visual Identity. Scope, actor and upstream authority are resolved server-side. */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createStrategyAccess,
  StrategyAccessError,
  type StrategyAction,
  type StrategyScope,
} from "#lib/modules/strategy/server/access.js";
import {
  StrategyConflict,
  StrategyNotFound,
  type StrategyRepository,
} from "#lib/modules/strategy/server/data/repository.js";
import {
  StrategyDocumentServiceError,
  type StrategyDocumentReader,
} from "#lib/modules/strategy/server/data/directus-documents.js";
import { StrategyJobs } from "#lib/modules/strategy/server/data/jobs.js";
import { createM10Service, M10_SOURCE_SLOT } from "#lib/modules/strategy/server/stages/m10/service.js";
import { m10BrowserCommandSchema } from "#lib/modules/strategy/server/stages/m10/commands.js";
import { strategyMethodRelease } from "#lib/modules/strategy/server/resources.js";
import { renderStrategyMarkdown } from "#lib/modules/strategy/server/document-markdown.js";
import { strategyHttpError, type StrategyEvent, type StrategyHostPorts } from "./strategy-host.server";
import type { createM10Upstream } from "./strategy-m10-source.server";
import type { createM10RouteAuthority } from "./strategy-m10-route.server";

export interface M10HostPorts {
  repository: StrategyRepository;
  documentReader?: StrategyDocumentReader;
  target: StrategyHostPorts["target"];
  authority: StrategyHostPorts["authority"];
  jobs?: StrategyJobs;
  generationPolicy?(event: StrategyEvent, scope: StrategyScope): Promise<void>;
  dispatchJob?(jobId: string): Promise<void>;
  methodRelease?: string;
  upstream: ReturnType<typeof createM10Upstream>;
  route: ReturnType<typeof createM10RouteAuthority>;
}

const documentKinds = new Set(["visual-identity", "receipt"]);
const queuedActions = new Set(["draft", "review"]);
const noStore = { "cache-control": "private, no-store" };
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: noStore });

async function parseBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new Error("Unsupported body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function failure(error: unknown) {
  if (error instanceof StrategyDocumentServiceError) return response({ error: error.message }, 503);
  if (
    error instanceof Error &&
    /Upstream authority changed|Confirm the M10 module route|sealed Sales Strategy|independent review|accepted client decision/.test(
      error.message,
    )
  )
    return response(
      {
        error:
          "The sealed Sales Strategy or its route no longer authorises Visual Identity. Create a new checked session.",
        code: "m10-source-stale",
      },
      409,
    );
  if (error instanceof Error && error.message === "Visual identity session not found")
    return response({ error: "Strategy resource not found" }, 404);
  return strategyHttpError(error);
}

export function createM10Host(ports: M10HostPorts) {
  async function scope(event: StrategyEvent, action: StrategyAction) {
    const target = await ports.target(event);
    return createStrategyAccess((request, tx) => ports.authority(event, request, tx)).authorize({ ...target, action });
  }
  function service() {
    return createM10Service({
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
      if (
        !stored ||
        stored.sessionId !== sessionId ||
        stored.versionId !== item.versionId ||
        stored.kind !== item.kind ||
        stored.hash !== item.hash
      )
        throw new StrategyDocumentServiceError();
      documents.push({
        ...item,
        content: stored.content,
        ...(item.kind === "visual-identity" ? { contentHtml: renderStrategyMarkdown(stored.content) } : {}),
      });
    }
    return documents;
  }
  async function read(event: StrategyEvent) {
    const access = await scope(event, "read");
    const id = event.url.searchParams.get("sessionId");
    if (!id) {
      const sessions = await ports.repository.listSessions(access, "m10");
      const source = await ports.repository.getSource(access, M10_SOURCE_SLOT);
      return {
        sessions: sessions.map((session) => ({ id: session.id, revision: session.revision, payload: session.payload })),
        sourceReady: !!source,
      };
    }
    const sessionId = z.uuid().parse(id);
    let loaded: Awaited<ReturnType<ReturnType<typeof createM10Service>["load"]>>;
    try {
      loaded = await service().load(access, sessionId);
    } catch (error) {
      if (error instanceof Error && error.message === "Visual identity session not found") throw new StrategyNotFound();
      throw error;
    }
    const documents = loaded.session.stage === "sealed" ? await exactDocuments(access, sessionId) : [];
    return { ...loaded, documents };
  }
  return {
    read,
    async GET(event: StrategyEvent) {
      try {
        if (event.url.searchParams.has("jobId")) {
          const access = await scope(event, "generate");
          if (!ports.jobs) throw new Error("Background generation unavailable");
          const sessionId = z.uuid().parse(event.url.searchParams.get("sessionId"));
          const record = await ports.repository.getSession(access, sessionId);
          if (!record || record.stage !== "m10") throw new StrategyNotFound();
          const job = await ports.jobs.get(access, z.uuid().parse(event.url.searchParams.get("jobId")));
          if (!job || job.sessionId !== sessionId) throw new StrategyNotFound();
          return response({
            jobId: job.id,
            status: job.status,
            sessionId: job.sessionId,
            ...(job.status === "succeeded" ? { result: job.result } : {}),
          });
        }
        return response(await read(event));
      } catch (error) {
        return failure(error);
      }
    },
    async POST(event: StrategyEvent) {
      try {
        if (event.request.headers.get("origin") !== event.url.origin) throw new StrategyAccessError();
        const input = m10BrowserCommandSchema.parse(await parseBody(event.request));
        const action: StrategyAction = queuedActions.has(input.action)
          ? "generate"
          : ["confirm", "confirm-eligibility", "run-checks", "decide"].includes(input.action)
            ? "approve"
            : "edit";
        const access = await scope(event, action);
        const m10 = service();
        if (input.action === "confirm-route") {
          await ports.route.confirm(access, { route: input.route, reason: input.reason });
          return response({ route: input.route });
        }
        if (input.action === "create") {
          await ports.upstream.connect(access);
          return response(await m10.create(access, input));
        }
        if (queuedActions.has(input.action)) {
          if (!ports.jobs || !ports.generationPolicy) throw new Error("Background generation unavailable");
          await ports.generationPolicy!(event, access);
          const readAccess = await scope(event, "read");
          const loaded = await m10.load(readAccess, input.sessionId);
          if (loaded.session.revision !== input.expectedRevision) throw new StrategyConflict(loaded.session.revision);
          if (!loaded.upstreamCurrent) throw new Error("Upstream authority changed. Create a new digital direction session.");
          if (loaded.session.seal) throw new Error("This strategy is sealed.");
          const source = await ports.repository.getSource(access, M10_SOURCE_SLOT);
          if (!source || source.hash !== loaded.session.sourceHash) throw new StrategyNotFound();
          const job = await ports.jobs.enqueue(access, {
            id: randomUUID(),
            sessionId: input.sessionId,
            expectedRevision: input.expectedRevision,
            commandId: input.commandId,
            command: { ...input, module: "m10", stage: "m10" },
            pins: [{ slot: M10_SOURCE_SLOT, versionId: source.id, hash: source.hash }],
            methodRelease: ports.methodRelease ?? strategyMethodRelease,
          });
          try {
            await ports.dispatchJob?.(job.id);
          } catch {
            /* The committed outbox recovers delivery. */
          }
          return response({ jobId: job.id, status: job.status, sessionId: job.sessionId }, 202);
        }
        if (input.action === "successor") {
          await ports.upstream.connect(access);
          return response(await m10.successor(access, input));
        }
        if (input.action === "confirm-eligibility") return response(await m10.confirmEligibility(access, input));
        if (input.action === "save") return response(await m10.save(access, input));
        if (input.action === "confirm") return response(await m10.confirm(access, input));
        if (input.action === "revise") return response(await m10.revise(access, input));
        if (input.action === "run-checks") return response(await m10.runChecks(access, input));
        if (input.action === "decide") return response(await m10.decide(access, input));
        throw new Error("Unsupported digital direction command");
      } catch (error) {
        return failure(error);
      }
    },
    async handoff(event: StrategyEvent) {
      try {
        const access = await scope(event, "export");
        const sessionId = z.uuid().parse(event.url.searchParams.get("sessionId"));
        const versionId = z.uuid().parse(event.url.searchParams.get("versionId"));
        const documentId = z.uuid().parse(event.url.searchParams.get("documentId"));
        const session = await ports.repository.getSession(access, sessionId);
        if (!session || session.stage !== "m10" || (session.payload as { seal?: { versionId?: string } }).seal?.versionId !== versionId)
          throw new StrategyNotFound();
        const metadata = (await ports.repository.listDocuments(access, sessionId)).find(
          (item) => item.id === documentId && item.versionId === versionId && documentKinds.has(item.kind),
        );
        if (!metadata) throw new StrategyNotFound();
        if (!ports.documentReader) throw new StrategyDocumentServiceError();
        const document = await ports.documentReader.getDocument(access, documentId);
        if (
          !document ||
          document.sessionId !== sessionId ||
          document.versionId !== versionId ||
          document.kind !== metadata.kind ||
          document.hash !== metadata.hash
        )
          throw new StrategyNotFound();
        return new Response(document.content, {
          headers: {
            "content-type": document.kind === "receipt" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
            "content-disposition": `attachment; filename="visual-identity-${documentId}.${document.kind === "receipt" ? "json" : "md"}"`,
            ...noStore,
            "x-content-type-options": "nosniff",
          },
        });
      } catch (error) {
        return failure(error);
      }
    },
  };
}
