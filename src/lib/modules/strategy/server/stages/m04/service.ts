import { createHash, randomUUID } from "node:crypto";
import { strategyMethodRelease } from "../../resources";
import { assertStrategyScope, type StrategyScope } from "../../access";
import { StrategyNotFound, type StrategyRepository, type AtomicMutation } from "../../data/repository";
import {
  Actor,
  Session,
  Decision,
  STAGE_SCHEMAS,
  type M04Session,
  type DataStage,
} from "./contracts";
import { createM04, successorM04, hashM04 } from "./session";
import { M04_SOURCE_SLOT, type CurrentM04Source } from "./sources";
import {
  stepM04,
  presentM04,
  decideM04,
  requireCurrent,
  guardStageMutation,
  currentChain,
  biasM04,
} from "./workflow";
import { sealM04, checksM04, downstreamM04 } from "./seal";
import { CHAT_STAGES, Reply, systemPrompt, type ChatStage, type M04ChatLine } from "./chat";
import { checkpointEvent } from "./checkpoints";
export interface M04Command {
  sessionId: string;
  expectedRevision: number;
  commandId: string;
  /** Internal durable worker fence; never accepted by public transport. */ jobLease?: {
    jobId: string;
    fence: number;
  };
}
export interface M04ServicePorts {
  repository: StrategyRepository;
  /** Host-resolved business authority, never supplied by browser input. */
  actor(scope: StrategyScope): Promise<Actor>;
  method?(): Promise<string>;
  chat?(request: {
    modelContext: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }): Promise<{ reply: unknown; model: string }>;
  generate?(request: {
    session: M04Session;
    stage: DataStage;
    method: string;
  }): Promise<{ candidate: unknown; model: string; usage?: unknown }>;
}
export function createM04Service(ports: M04ServicePorts) {
  const repo = ports.repository;
  async function source(scope: StrategyScope) {
    const record = await repo.getSource(scope, M04_SOURCE_SLOT);
    if (!record) throw new Error("Current M04 source bundle unavailable");
    return record.body as CurrentM04Source;
  }
  async function mutate(
    scope: StrategyScope,
    command: M04Command & { operation?: string },
    fn: (
      s: M04Session,
      current: CurrentM04Source,
      actor: Actor,
    ) => AtomicMutation<M04Session> | void,
  ) {
    const actor = Actor.parse(await ports.actor(scope));
    return repo.mutateSession<M04Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (record, tx) => {
        if (command.jobLease)
          await tx.assertJobLease(command.jobLease.jobId, command.jobLease.fence);
        const s = Session.parse(record.payload);
        if (record.stage !== "m04") throw new Error("Not an M04 session");
        if (s.seal) throw new Error("This version is sealed. Create a successor to revise it.");
        if (
          ["dependency-return", "adjustment-return"].includes(s.status) &&
          ["step", "present", "decide", "draft", "chat"].includes(command.operation ?? "")
        )
          throw new Error("This M04 session is closed for upstream reconciliation.");
        if (s.revision !== record.revision) throw new Error("Session revision integrity mismatch");
        const current = await tx.getSource(M04_SOURCE_SLOT);
        if (!current) throw new Error("Current M04 source bundle unavailable");
        const result = fn(s, current.body as CurrentM04Source, actor) ?? { payload: s };
        s.history.push({
          action: "authenticated-command",
          methodRelease: strategyMethodRelease,
          actorId: scope.actorId,
          commandId: command.commandId,
          at: new Date().toISOString(),
        });
        s.revision = record.revision + 1;
        s.updatedAt = new Date().toISOString();
        return {
          ...result,
          payload: Session.parse(s),
          sources: [{ slot: M04_SOURCE_SLOT, versionId: current.id, expectedHash: current.hash }],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }
  function returnCandidate(
    s: M04Session,
    actor: Actor,
    owner: string,
    finding: string,
    changedPremise: string,
  ) {
    if (!["entry", "m01", "m02", "m03"].includes(owner))
      throw new Error("Choose the owning upstream module");
    if (!finding.trim() || !changedPremise.trim())
      throw new Error("A finding and changed premise are required");
    if (
      s.history.some(
        (x) => !!x && typeof x === "object" && "action" in x && x.action === "upstream-return",
      )
    )
      throw new Error(
        "This M04 session already has a linked upstream return. Create a successor after the source owner completes it.",
      );
    const id = randomUUID();
    const candidate = {
      id,
      owner,
      sourceSessionId: s.sessionId,
      sourceHash: s.sourceHash,
      sourceBundle: s.sources,
      finding,
      changedPremise,
      authority: "candidate-only",
      actor,
      at: new Date().toISOString(),
    };
    s.history.push({
      action: "upstream-return",
      actor,
      owner,
      finding,
      returned: { id, authority: "candidate-only" },
      at: candidate.at,
    });
    s.status = "adjustment-return";
    if (s.routeAuthorization)
      s.routeAuthorization = {
        ...s.routeAuthorization,
        generation_permission: "none",
        authorised_capability: "none",
        allowed_outputs: [],
        closure_condition: "Closed pending upstream reconciliation",
      };
    return { id, stage: "source-revision", payload: candidate };
  }
  return {
    async create(
      scope: StrategyScope,
      command: { commandId: string } = { commandId: randomUUID() },
    ) {
      assertStrategyScope(scope, ["edit"]);
      const actor = Actor.parse(await ports.actor(scope));
      return repo.createSessionWithSource<M04Session>(
        scope,
        (record) => {
          const s = createM04(record.body as CurrentM04Source, actor);
          s.revision = 1;
          s.history.push({ action: "method-release", methodRelease: strategyMethodRelease });
          return { id: s.sessionId, stage: "m04", payload: s };
        },
        M04_SOURCE_SLOT,
        () => {},
        { commandId: command.commandId, commandInput: { stage: "m04", operation: "create" } },
      );
    },
    async load(scope: StrategyScope, id: string) {
      const record = await repo.getSession<M04Session>(scope, id);
      if (!record || record.stage !== "m04") throw new StrategyNotFound();
      const s = Session.parse(record.payload),
        current = await source(scope);
      return {
        session: s,
        checks: checksM04(s, current),
        upstreamCurrent: currentChain(s, current).valid,
        downstream: downstreamM04(s),
        bias: biasM04(s),
      };
    },
    step(
      scope: StrategyScope,
      command: M04Command & { action: string; stage: DataStage; payload: unknown },
    ) {
      assertStrategyScope(scope, ["edit"]);
      return mutate(scope, { ...command, operation: "step" }, (s, current, actor) => {
        stepM04(s, current, actor, command.action, command.stage, command.payload);
        return {
          payload: s,
          outbox:
            command.action === "revise"
              ? [
                  {
                    kind: "m04.revise",
                    payload: {
                      sessionId: s.sessionId,
                      restartFrom: command.stage,
                      revision: s.revision + 1,
                    },
                  },
                ]
              : command.action === "confirm"
                ? [checkpointEvent(s.sessionId, command.stage, s.revision + 1)]
                : [],
        };
      });
    },
    present(scope: StrategyScope, command: M04Command) {
      assertStrategyScope(scope, ["edit"]);
      return mutate(scope, { ...command, operation: "present" }, (s, current, actor) =>
        presentM04(s, current, actor),
      );
    },
    decide(scope: StrategyScope, command: M04Command & { payload: unknown }) {
      assertStrategyScope(scope, ["approve"]);
      return mutate(scope, { ...command, operation: "decide" }, (s, current, actor) => {
        decideM04(s, current, actor, command.payload);
        const d = Decision.parse(command.payload);
        const successor =
          s.status === "adjustment-return"
            ? returnCandidate(s, actor, d.returnOwner!, d.rationale, d.changedPremise)
            : null;
        return {
          payload: s,
          successors: successor ? [successor] : [],
          outbox: [checkpointEvent(s.sessionId, "human-decision", s.revision + 1)],
        };
      });
    },
    seal(scope: StrategyScope, command: M04Command) {
      assertStrategyScope(scope, ["approve"]);
      return mutate(scope, { ...command, operation: "seal" }, (s, current, actor) => {
        const result = sealM04(s, current, actor, randomUUID()),
          versionId = s.seal!.versionId;
        const methodProvenance = JSON.stringify({
          methodRelease: strategyMethodRelease,
          stage: "m04",
          sourceHash: s.sourceHash,
          sealHash: result.hash,
        });
        return {
          payload: s,
          version: {
            id: versionId,
            canonicalPayload: result.canonicalPayload,
            sealHash: result.hash,
            hashAlgorithm: "json-sha256",
          },
          documents: [
            {
              id: randomUUID(),
              versionId,
              kind: "method-provenance",
              content: methodProvenance,
              hash: createHash("sha256").update(methodProvenance).digest("hex"),
            },
            {
              id: randomUUID(),
              versionId,
              kind: "viability-check",
              content: result.rendered,
              hash: createHash("sha256").update(result.rendered).digest("hex"),
            },
            {
              id: randomUUID(),
              versionId,
              kind: "receipt",
              content: JSON.stringify(result.receipt),
              hash: createHash("sha256").update(JSON.stringify(result.receipt)).digest("hex"),
            },
          ],
          approval: { versionId, declaration: result.receipt },
          outbox: [
            checkpointEvent(s.sessionId, "checks", s.revision + 1),
            checkpointEvent(s.sessionId, "sealed", s.revision + 1),
          ],
        };
      });
    },
    async successor(scope: StrategyScope, command: M04Command & { reason: string }) {
      assertStrategyScope(scope, ["edit"]);
      const actor = Actor.parse(await ports.actor(scope));
      // The parent remains unchanged. CAS and current source validation happen under the same engagement lock.
      return repo.forkSession<M04Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (record, tx) => {
          if (record.stage !== "m04") throw new Error("Not an M04 session");
          const current = await tx.getSource(M04_SOURCE_SLOT);
          if (!current) throw new Error("Current M04 source bundle unavailable");
          const next = successorM04(
            Session.parse(record.payload),
            current.body as CurrentM04Source,
            actor,
            command.reason,
          );
          next.revision = 1;
          next.history.push({ action: "method-release", methodRelease: strategyMethodRelease });
          return {
            successor: { id: next.sessionId, stage: "m04", payload: next },
            outbox: [
              {
                kind: "m04.successor",
                payload: { parentId: record.id, sessionId: next.sessionId },
              },
            ],
          };
        },
        command,
      );
    },
    returnUpstream(
      scope: StrategyScope,
      command: M04Command & { owner: string; finding: string; changedPremise: string },
    ) {
      assertStrategyScope(scope, ["edit"]);
      return mutate(scope, { ...command, operation: "returnUpstream" }, (s, _current, actor) => ({
        payload: s,
        successors: [
          returnCandidate(s, actor, command.owner, command.finding, command.changedPremise),
        ],
        outbox: [checkpointEvent(s.sessionId, s.stage, s.revision + 1)],
      }));
    },
    async chat(
      scope: StrategyScope,
      command: M04Command & { stage: ChatStage; message: string | null },
    ) {
      assertStrategyScope(scope, ["generate"]);
      if (!ports.chat) throw new Error("Guided conversation is not configured");
      if (!(CHAT_STAGES as readonly string[]).includes(command.stage))
        throw new Error("This stage is not worked through conversation");
      const record = await repo.getSession<M04Session>(scope, command.sessionId);
      if (!record || record.stage !== "m04") throw new StrategyNotFound();
      const s = Session.parse(record.payload);
      requireCurrent(s, await source(scope));
      if (s.seal || s.revision !== command.expectedRevision || s.stage !== command.stage)
        throw new Error("Reload the current stage before conversation");
      guardStageMutation(s, "chat", command.stage);
      const messages = s.history.flatMap((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("action" in item) ||
          item.action !== "chat-turn" ||
          !("stage" in item) ||
          item.stage !== command.stage ||
          !("messages" in item)
        )
          return [];
        return item.messages as M04ChatLine[];
      });
      const added: M04ChatLine[] = [];
      if (command.message?.trim())
        added.push({
          stage: command.stage,
          role: "user",
          content: command.message.trim(),
          at: new Date().toISOString(),
        });
      else if (messages.length)
        return { session: record, messages, ready: Boolean(s.drafts[command.stage]) };
      const modelContext = systemPrompt(s, command.stage);
      const reply = await ports.chat({
        modelContext,
        messages: [...messages, ...added].map(({ role, content }) => ({ role, content })),
      });
      const response = Reply.parse(reply.reply);
      added.push({
        stage: command.stage,
        role: "assistant",
        content: response.say,
        at: new Date().toISOString(),
      });
      let candidate: unknown;
      if (response.complete && response.record !== undefined) {
        try {
          candidate = STAGE_SCHEMAS[command.stage].parse(response.record);
        } catch (first) {
          try {
            const corrected = await ports.chat({
              modelContext,
              messages: [...messages, ...added]
                .map(({ role, content }) => ({ role, content }))
                .concat([
                  {
                    role: "user",
                    content: `The record you produced failed validation and was not saved: ${String(first)}. Return only the corrected JSON object {"say": string, "complete": true, "summary": string, "record": object} — do not change what was agreed.`,
                  },
                ]),
            });
            candidate = STAGE_SCHEMAS[command.stage].parse(Reply.parse(corrected.reply).record);
          } catch {
            candidate = undefined;
          }
        }
      }
      const committed = await mutate(
        scope,
        { ...command, operation: "chat" },
        (current, authority) => {
          requireCurrent(current, authority);
          guardStageMutation(current, "chat", command.stage);
          current.history.push({
            action: "chat-turn",
            candidateProvided: candidate !== undefined,
            methodRelease: strategyMethodRelease,
            stage: command.stage,
            messages: added,
            model: reply.model,
            sourceHash: s.sourceHash,
            promptHash: hashM04(modelContext),
            at: new Date().toISOString(),
            authority: "candidate-only",
          });
          if (candidate !== undefined) current.drafts[command.stage] = candidate;
        },
      );
      return {
        session: committed,
        messages: [...messages, ...added],
        ready: candidate !== undefined,
        summary: candidate !== undefined ? response.summary : undefined,
      };
    },
    async draft(scope: StrategyScope, command: M04Command & { stage: DataStage }) {
      assertStrategyScope(scope, ["generate"]);
      if (!ports.method || !ports.generate) throw new Error("Draft generation is not configured");
      const record = await repo.getSession<M04Session>(scope, command.sessionId);
      if (!record || record.stage !== "m04") throw new StrategyNotFound();
      const s = Session.parse(record.payload);
      requireCurrent(s, await source(scope));
      if (s.seal || s.revision !== command.expectedRevision || s.stage !== command.stage)
        throw new Error("Reload the current stage before drafting");
      if (command.stage === "human-decision")
        throw new Error("Human decisions cannot be model-generated");
      guardStageMutation(s, "draft", command.stage);
      const method = await ports.method(),
        response = await ports.generate({ session: s, stage: command.stage, method });
      const candidate = STAGE_SCHEMAS[command.stage].parse(response.candidate);
      return mutate(scope, { ...command, operation: "draft" }, (current, authority) => {
        requireCurrent(current, authority);
        guardStageMutation(current, "draft", command.stage);
        current.drafts[command.stage] = candidate;
        current.history.push({
          action: "model-draft",
          methodRelease: strategyMethodRelease,
          stage: command.stage,
          model: response.model,
          usage: response.usage ?? null,
          sourceHash: s.sourceHash,
          promptHash: hashM04(method),
          at: new Date().toISOString(),
          authority: "candidate-only",
        });
      });
    },
  };
}
