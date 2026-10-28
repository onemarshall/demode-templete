import {StrategyDocumentServiceError,type StrategyDocumentReader} from "#lib/modules/strategy/server/data/directus-documents.js";
import {renderStrategyMarkdown} from "#lib/modules/strategy/server/document-markdown.js";
import { z } from "zod";
import { M04ReviewRequiredError } from "#lib/modules/strategy/server/stages/m04/workflow.js";
import { randomUUID } from "node:crypto";
import type { StrategyJobs } from "#lib/modules/strategy/server/data/jobs.js";
import { strategyMethodRelease } from "#lib/modules/strategy/server/resources.js";
import {
  createStrategyAccess,
  StrategyAccessError,
  type AccessRequest,
  type AuthorityQuery,
  type StrategyAction,
  type StrategyAuthority,
  type StrategyScope,
} from "#lib/modules/strategy/server/access.js";
import {
  StrategyConflict,
  StrategyNotFound,
  type StrategyRepository,
} from "#lib/modules/strategy/server/data/repository.js";
import {
  createM04Service,
  type M04ServicePorts,
} from "#lib/modules/strategy/server/stages/m04/service.js";

export interface StrategyEvent {
  request: Request;
  url: URL;
  params: Record<string, string | undefined>;
  locals: object;
}
export interface StrategyHostPorts {
  repository: StrategyRepository;
  documentReader?: StrategyDocumentReader;
  /** Resolve route slugs against host-owned organisation/brand/engagement records. */
  target(event: StrategyEvent): Promise<Omit<AccessRequest, "action">>;
  /** Resolve the authenticated principal and live membership, assignment and permission.
   * Lock authority rows when a transaction is supplied. Browser input is never authority. */
  authority(
    event: StrategyEvent,
    request: Readonly<AccessRequest>,
    transaction?: AuthorityQuery,
  ): Promise<StrategyAuthority | null>;
  actor(event: StrategyEvent, scope: StrategyScope): ReturnType<M04ServicePorts["actor"]>;
  method?: M04ServicePorts["method"];
  generate?: M04ServicePorts["generate"];
  chat?: M04ServicePorts["chat"];
  jobs?: StrategyJobs;
  generationPolicy?(event: StrategyEvent, scope: StrategyScope): Promise<void>;
  /** Optional delivery acceleration. The committed outbox remains authoritative on failure. */
  dispatchJob?(jobId: string): Promise<void>;
}
const command = z.object({
  sessionId: z.uuid(),
  commandId: z.string().trim().min(1).max(200),
  expectedRevision: z.number().int().positive(),
});
const stage = z.enum([
  "context",
  "conviction-cost",
  "market-readiness",
  "human-load",
  "financial-grounding",
  "awareness-and-weighing",
  "recommendation",
  "human-decision",
]);
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), commandId: z.string().trim().min(1).max(200) }).strict(),
  command
    .extend({ action: z.enum(["save", "confirm", "revise"]), stage, payload: z.unknown() })
    .strict(),
  command.extend({ action: z.enum(["present", "seal"]) }).strict(),
  command.extend({ action: z.literal("decide"), payload: z.unknown() }).strict(),
  command.extend({ action: z.literal("successor"), reason: z.string().trim().min(1) }).strict(),
  command
    .extend({
      action: z.literal("return"),
      owner: z.enum(["entry", "m01", "m02", "m03"]),
      finding: z.string().trim().min(1),
      changedPremise: z.string().trim().min(1),
    })
    .strict(),
  command.extend({ action: z.literal("draft"), stage }).strict(),
  command
    .extend({
      action: z.literal("chat"),
      stage: z.enum([
        "context",
        "conviction-cost",
        "market-readiness",
        "human-load",
        "financial-grounding",
        "awareness-and-weighing",
      ]),
      message: z.string().trim().min(1).max(16000).nullable(),
    })
    .strict(),
]);
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
}
export function strategyHttpError(error: unknown): Response {
  if (error instanceof M04ReviewRequiredError) return json({error:error.message,code:error.code},400);
  if (error instanceof StrategyDocumentServiceError) return json({error:error.message},503);
  if (error instanceof StrategyAccessError) return json({ error: "Strategy access denied" }, 403);
  if (error instanceof StrategyNotFound) return json({ error: "Strategy resource not found" }, 404);
  if (error instanceof StrategyConflict)
    return json(
      {
        error: "This session changed. Reload before continuing.",
        currentRevision: error.currentRevision,
      },
      409,
    );
  if (error instanceof z.ZodError)
    return json(
      {
        error: "Invalid request or stage data",
        issues: error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      400,
    );
  // Business guards are safe to display; infrastructure errors remain private.
  return json(
    { error: "Unable to complete this strategy request. Reload and check the stage requirements." },
    400,
  );
}
export function createStrategyHost(ports: StrategyHostPorts) {
  async function scope(event: StrategyEvent, action: StrategyAction) {
    const target = await ports.target(event);
    return createStrategyAccess((request, tx) => ports.authority(event, request, tx)).authorize({
      ...target,
      action,
    });
  }
  function service(event: StrategyEvent) {
    return createM04Service({ ...ports, actor: (s) => ports.actor(event, s) });
  }
  async function read(event: StrategyEvent) {
    const access = await scope(event, "read");
    const id = event.url.searchParams.get("sessionId");
    if (id) {
      const sessionId = z.uuid().parse(id);
      const loaded=await service(event).load(access,sessionId);
      const metadata=await ports.repository.listDocuments(access,sessionId);
      if(!ports.documentReader)return {...loaded,documents:metadata};
      const documents=[];
      for(const item of metadata) {
        if(!['viability-check','receipt'].includes(item.kind))continue;
        const stored=await ports.documentReader.getDocument(access,item.id);
        if(!stored||stored.sessionId!==sessionId||stored.versionId!==item.versionId||stored.hash!==item.hash||stored.kind!==item.kind)throw new StrategyDocumentServiceError();
        documents.push({...item,content:stored.content,...(item.kind==='viability-check'?{contentHtml:renderStrategyMarkdown(stored.content)}:{})});
      }
      return {...loaded,documents};
    }
    const sessions = await ports.repository.listSessions(access, "m04");
    return {
      sessions: sessions.map((s) => ({ id: s.id, revision: s.revision, payload: s.payload })),
    };
  }
  return {
    read,
    async GET(event: StrategyEvent) {
      try {
        if (event.url.searchParams.has("jobId")) {
          const access = await scope(event, "generate");
          if (!ports.jobs) throw new Error("Background generation unavailable");
          const job = await ports.jobs.get(
            access,
            z.uuid().parse(event.url.searchParams.get("jobId")),
          );
          if (!job || job.sessionId !== z.uuid().parse(event.url.searchParams.get("sessionId")))
            throw new StrategyNotFound();
          return json({ jobId: job.id, status: job.status, sessionId: job.sessionId });
        }
        return json(await read(event));
      } catch (e) {
        return strategyHttpError(e);
      }
    },
    async POST(event: StrategyEvent) {
      try {
        const origin = event.request.headers.get("origin");
        if (origin && origin !== event.url.origin) throw new StrategyAccessError();
        if (!event.request.headers.get("content-type")?.startsWith("application/json"))
          return json({ error: "JSON request required" }, 415);
        const raw = await event.request.text();
        if (raw.length > 1_000_000) return json({ error: "Request too large" }, 413);
        const input = bodySchema.parse(JSON.parse(raw));
        const action =
          input.action === "decide" || input.action === "seal"
            ? "approve"
            : input.action === "draft" || input.action === "chat"
              ? "generate"
              : "edit";
        const access = await scope(event, action),
          m04 = service(event);
        let result: unknown;
        switch (input.action) {
          case "create":
            result = await m04.create(access, input);
            break;
          case "save":
          case "confirm":
          case "revise":
            result = await m04.step(access, input);
            break;
          case "present":
            result = await m04.present(access, input);
            break;
          case "decide":
            result = await m04.decide(access, input);
            break;
          case "seal":
            result = await m04.seal(access, input);
            break;
          case "successor":
            result = await m04.successor(access, input);
            break;
          case "return":
            result = await m04.returnUpstream(access, input);
            break;
          case "draft":
          case "chat": {
            if (!ports.jobs || !ports.generationPolicy)
              throw new Error("Background generation unavailable");
            await ports.generationPolicy(event, access);
            // Validate current stage and source before reserving durable work. CAS and pins
            // are checked again by enqueue and by the fenced worker at publication.
            const review = await m04.load(access, input.sessionId);
            if (
              review.session.stage !== input.stage ||
              review.session.seal ||
              input.stage === "human-decision" ||
              !review.upstreamCurrent
            )
              throw new Error("Reload the current editable stage before requesting a suggestion");
            const source = await ports.repository.getSource(access, "m04-chain");
            if (!source) throw new StrategyNotFound();
            const job = await ports.jobs.enqueue(access, {
              id: randomUUID(),
              sessionId: input.sessionId,
              expectedRevision: input.expectedRevision,
              commandId: input.commandId,
              command: input,
              pins: [{ slot: "m04-chain", versionId: source.id, hash: source.hash }],
              methodRelease: strategyMethodRelease,
            });
            try {
              await ports.dispatchJob?.(job.id);
            } catch {
              /* Durable outbox recovers delivery. */
            }
            return json({ jobId: job.id, status: job.status, sessionId: job.sessionId }, 202);
          }
        }
        return json(result);
      } catch (e) {
        return strategyHttpError(e);
      }
    },
    async handoff(event: StrategyEvent) {
      try {
        const access = await scope(event, "export");
        const documentId = z.uuid().parse(event.url.searchParams.get("documentId"));
        const versionId = z.uuid().parse(event.url.searchParams.get("versionId"));
        const sessionId = z.uuid().parse(event.url.searchParams.get("sessionId"));
        const doc = ports.documentReader ? await ports.documentReader.getDocument(access,documentId) : await ports.repository.getDocument(access, documentId);
        if (!doc || !["viability-check","receipt"].includes(doc.kind) || doc.versionId !== versionId || doc.sessionId !== sessionId)
          throw new StrategyNotFound();
        return new Response(doc.content, {
          headers: {
            "content-type":
              doc.kind === "receipt"
                ? "application/json; charset=utf-8"
                : "text/markdown; charset=utf-8",
            "content-disposition": `attachment; filename="viability-check-${documentId}.${doc.kind === "receipt" ? "json" : "md"}"`,
            "cache-control": "private, no-store",
            "x-content-type-options": "nosniff",
          },
        });
      } catch (e) {
        return strategyHttpError(e);
      }
    },
  };
}
export type StrategyHost = ReturnType<typeof createStrategyHost>;
let configured: StrategyHost | undefined;
/** Called once by trusted server composition. No public route can install authority. */
export function configureStrategyHost(ports: StrategyHostPorts) {
  if (configured) throw new Error("Strategy host already configured");
  configured = createStrategyHost(ports);
}
export function strategyHost(): StrategyHost {
  if (!configured) throw new StrategyAccessError();
  return configured;
}
