import { randomUUID, createHash } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { StrategyRepository, AtomicMutation, MutationContext } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  createM01,
  requireCurrent,
  runStage,
  confirmOutput,
  editAnchor,
  successorM01,
  type M01Session,
  type M01Input,
} from "./session";
import { PlanSchema, intakeMessages } from "./preparation";
import { conversationMessages, readTranscript, type TranscriptLine } from "./conversation";
import {
  synthesise,
  reviseAnchor,
  reviseManifesto,
  reviseEvidenceMatrix,
  deriveSetTwo,
  type ModelCall,
} from "./synthesis";
import {
  qualityGateReport,
  sealHandoff,
  renderPack,
  SetTwo,
  SourceType,
  outputsHash,
} from "./handoff";
import { checkpointEvent } from "./checkpoints";
export const M01_SOURCE_SLOT = "m01-input";
export interface M01Command {
  sessionId: string;
  expectedRevision: number;
  commandId: string;
  jobLease?: { jobId: string; fence: number };
}
export interface M01Ports {
  repository: StrategyRepository;
  /** Verify conviction-source attribution using the mutation transaction and lock
   * any host-owned attribution/grant rows until the approval commits. */
  validateSourceAuthority(
    scope: StrategyScope,
    source: { type: string; name: string; materialUsed: string },
    input: M01Input,
    transaction: MutationContext,
  ): Promise<void>;
  model?: {
    name: string;
    call: ModelCall;
    chat(messages: { role: string; content: string }[]): Promise<string>;
  };
}
export function createM01Service(ports: M01Ports) {
  const repo = ports.repository;
  async function loadRecord(scope: StrategyScope, id: string) {
    const record = await repo.getSession<M01Session>(scope, id);
    if (!record || record.stage !== "m01") throw new Error("Session not found");
    return record;
  }
  async function mutate(
    scope: StrategyScope,
    command: M01Command,
    operation: string,
    fn: (
      s: M01Session,
      input: M01Input,
      transaction: MutationContext,
    ) => AtomicMutation<M01Session> | void | Promise<AtomicMutation<M01Session> | void>,
  ) {
    return repo.mutateSession<M01Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (record, tx) => {
        if (record.stage !== "m01") throw new Error("Not an M01 session");
        if (command.jobLease)
          await tx.assertJobLease(command.jobLease.jobId, command.jobLease.fence);
        const s = record.payload;
        if (s.seal || s.handoff)
          throw new Error("This version is sealed. Create a successor to revise it.");
        if (s.revision !== record.revision) throw new Error("Session revision integrity mismatch");
        const source = await tx.getSource(M01_SOURCE_SLOT);
        if (!source) throw new Error("M01 source unavailable");
        requireCurrent(s, source.body as M01Input);
        const result = (await fn(s, source.body as M01Input, tx)) ?? { payload: s };
        s.revision = record.revision + 1;
        s.updatedAt = new Date().toISOString();
        s.history.push({
          action: operation,
          actorId: scope.actorId,
          methodRelease: strategyMethodRelease,
          at: s.updatedAt,
        });
        return {
          ...result,
          payload: s,
          sources: [{ slot: M01_SOURCE_SLOT, versionId: source.id, expectedHash: source.hash }],
        };
      },
      {
        ...Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
        operation,
      },
    );
  }
  async function generation(scope: StrategyScope, command: M01Command) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.model) throw new Error("M01 model generation is not configured");
    const record = await loadRecord(scope, command.sessionId);
    if (record.revision !== command.expectedRevision) throw new Error("Revision conflict");
    if (record.payload.seal)
      throw new Error("This version is sealed. Create a successor to revise it.");
    const source = await repo.getSource(scope, M01_SOURCE_SLOT);
    if (!source) throw new Error("M01 source unavailable");
    requireCurrent(record.payload, source.body as M01Input);
    return { s: record.payload, model: ports.model, source: source.body as M01Input };
  }
  function transcript(s: M01Session) {
    return readTranscript(s.transcript).readable;
  }
  return {
    async create(scope: StrategyScope, command: { commandId: string }) {
      assertStrategyScope(scope, ["edit"]);
      return repo.createSessionWithSource<M01Session>(
        scope,
        (source) => {
          const s = createM01(source.body as M01Input, null);
          s.history.push({
            action: "created",
            actorId: scope.actorId,
            methodRelease: strategyMethodRelease,
            at: s.createdAt,
          });
          return { id: s.sessionId, stage: "m01", payload: s };
        },
        M01_SOURCE_SLOT,
        () => {},
        { commandId: command.commandId, commandInput: { stage: "m01", operation: "create" } },
      );
    },
    async load(scope: StrategyScope, id: string) {
      const record = await loadRecord(scope, id),
        s = record.payload;
      return {
        session: s,
        stage: runStage(s),
        plan: s.plan,
        note: s.note,
        chat: s.chat,
        outputs: s.outputs,
        gates: s.outputs ? qualityGateReport(s.outputs) : [],
        setTwoDraft: s.setTwoDraft,
        handoff: s.handoff,
      };
    },
    async prepare(scope: StrategyScope, command: M01Command) {
      const { source, model } = await generation(scope, command),
        messages = intakeMessages(source.parts, source.engagement);
      const response = await model.call(messages[0].content, messages[1].content);
      const plan = {
        ...PlanSchema.parse(response),
        engagement: source.engagement || undefined,
        files: source.parts.map((p) => p.file),
      };
      return mutate(scope, command, "prepare", (s) => {
        s.plan = plan;
      });
    },
    note(scope: StrategyScope, command: M01Command & { note: string }) {
      assertStrategyScope(scope, ["edit"]);
      return mutate(scope, command, "note", (s) => {
        s.note = command.note;
      });
    },
    appendEvents(scope: StrategyScope, command: M01Command & { events: unknown[] }) {
      assertStrategyScope(scope, ["edit"]);
      if (!command.events.length || command.events.length > 500)
        throw new Error("Supply between 1 and 500 transcript events");
      return mutate(scope, command, "transcript", (s) => {
        for (const event of command.events)
          s.transcript.push({ at: new Date().toISOString(), event });
      });
    },
    async turn(scope: StrategyScope, command: M01Command & { message: string | null }) {
      const { s, model } = await generation(scope, command);
      if (!s.plan) throw new Error("This run has no interview plan.");
      // Exact original message ordering retained; latest-message omission is a recorded legacy defect.
      const reply = (await model.chat(conversationMessages(s.plan, s.note, s.chat))).trim();
      if (!reply) throw new Error("The interviewer returned nothing — try again.");
      const now = new Date().toISOString(),
        events: TranscriptLine[] = [];
      const committed = await mutate(scope, command, "turn", (current) => {
        if (command.message) {
          current.chat.push({ role: "user", content: command.message, at: now });
          events.push({
            at: now,
            event: { type: "session.input_transcript.delta", delta: command.message },
          });
        }
        const at = new Date().toISOString();
        current.chat.push({ role: "assistant", content: reply, at });
        events.push({ at, event: { type: "session.output_transcript.delta", delta: reply } });
        current.transcript.push(...events);
      });
      return { session: committed, reply };
    },
    async synthesise(scope: StrategyScope, command: M01Command) {
      const { s, model } = await generation(scope, command);
      if (!s.plan) throw new Error("This run has no interview plan.");
      const lines = transcript(s);
      if (lines.length < 4)
        throw new Error("There's barely a conversation yet — answer a few questions first.");
      const outputs = await synthesise(s.plan, lines, s.note, model.call, model.name);
      return mutate(scope, command, "synthesise", (current) => ({
        payload: Object.assign(current, { outputs }),
        outbox: [checkpointEvent(current.sessionId, "conversation", current.revision + 1)],
      }));
    },
    async reviseAnchor(
      scope: StrategyScope,
      command: M01Command & { anchorKey: string; note: string },
    ) {
      const { s, model } = await generation(scope, command);
      if (!s.plan || !s.outputs) throw new Error("Nothing to revise.");
      const current =
        s.outputs.outputs.anchors.find((a) => a.key === command.anchorKey)?.sentence ?? "";
      const sentence = await reviseAnchor(
        command.anchorKey,
        current,
        command.note,
        s.plan,
        transcript(s),
        s.note,
        model.call,
        model.name,
      );
      return mutate(scope, command, "revise-anchor", (next) => {
        if (!next.outputs) throw new Error("Nothing to revise.");
        next.outputs.outputs.anchors = next.outputs.outputs.anchors.map((a) =>
          a.key === command.anchorKey ? { ...a, sentence } : a,
        );
        next.outputs.anchorStatus[command.anchorKey] = "candidate";
      });
    },
    async reviseManifesto(scope: StrategyScope, command: M01Command & { note: string }) {
      const { s, model } = await generation(scope, command);
      if (!s.plan || !s.outputs) throw new Error("Nothing to revise.");
      const manifesto = await reviseManifesto(
        s.outputs.outputs.manifesto,
        command.note,
        s.plan,
        transcript(s),
        s.note,
        model.call,
        model.name,
      );
      return mutate(scope, command, "revise-manifesto", (next) => {
        if (!next.outputs) throw new Error("Nothing to revise.");
        next.outputs.outputs.manifesto = manifesto;
        next.outputs.status.manifesto = "candidate";
      });
    },
    async reviseMatrix(scope: StrategyScope, command: M01Command & { note: string }) {
      const { s, model } = await generation(scope, command);
      if (!s.plan || !s.outputs) throw new Error("Nothing to revise.");
      const revised = await reviseEvidenceMatrix(
        s.outputs.outputs.evidenceMatrix,
        command.note,
        s.plan,
        transcript(s),
        s.note,
        model.call,
        model.name,
      );
      return mutate(scope, command, "revise-matrix", (next) => {
        if (!next.outputs) throw new Error("Nothing to revise.");
        next.outputs.outputs.evidenceMatrix = revised.evidenceMatrix;
        next.outputs.outputs.claimsBoundaryInputs = revised.claimsBoundaryInputs;
        next.outputs.status.evidenceMatrix = "candidate";
      });
    },
    confirm(scope: StrategyScope, command: M01Command & { part: string; anchorKey?: string }) {
      assertStrategyScope(scope, ["approve"]);
      return mutate(scope, command, "confirm", (s) => {
        if (!s.outputs) throw new Error("Nothing to confirm.");
        confirmOutput(s.outputs, command.part, command.anchorKey);
        return { payload: s, outbox: [checkpointEvent(s.sessionId, command.part, s.revision + 1)] };
      });
    },
    editAnchor(
      scope: StrategyScope,
      command: M01Command & { anchorKey: string; sentence: string },
    ) {
      assertStrategyScope(scope, ["edit"]);
      return mutate(scope, command, "edit-anchor", (s) => {
        if (!s.outputs) throw new Error("Nothing to edit.");
        editAnchor(s.outputs, command.anchorKey, command.sentence);
      });
    },
    async derive(scope: StrategyScope, command: M01Command) {
      const { s, model } = await generation(scope, command);
      if (!s.plan || !s.outputs) throw new Error("Nothing to draft from.");
      const draft = SetTwo.parse(
        await deriveSetTwo(
          s.plan,
          transcript(s),
          s.note,
          s.outputs.outputs.anchors,
          s.outputs.outputs.manifesto,
          model.call,
          model.name,
        ),
      );
      return mutate(scope, command, "derive", (next) => {
        next.setTwoDraft = draft;
      });
    },
    async seal(
      scope: StrategyScope,
      command: M01Command & {
        reviewAnswers: Record<string, "pass" | "fail">;
        derived: unknown;
        source: { type: string; name: string; materialUsed: string };
        notes: string;
      },
    ) {
      assertStrategyScope(scope, ["approve"]);
      const source = { ...command.source, type: SourceType.parse(command.source.type) };
      if (!source.name.trim()) throw new Error("Whose conviction is this?");
      return mutate(scope, command, "seal", async (s, input, tx) => {
        if (!s.outputs || !s.plan) throw new Error("Nothing to seal.");
        await ports.validateSourceAuthority(scope, source, input, tx);
        const report = qualityGateReport(s.outputs).map((c) =>
          c.kind === "review" ? { ...c, result: command.reviewAnswers[c.id] ?? "pending" } : c,
        );
        const failing = report.filter((c) => c.result !== "pass");
        if (failing.length)
          throw new Error(`Not ready to seal: ${failing.map((c) => c.name).join("; ")}`);
        const derived = SetTwo.parse(command.derived),
          authority = { ...source, materialUsed: source.materialUsed || s.plan.files.join(", ") };
        const handoff = sealHandoff(s.outputs, derived, authority, report, command.notes),
          versionId = randomUUID();
        const rendered = renderPack(
          s.folder,
          s.outputs,
          derived,
          authority,
          handoff.sealedAt,
          command.notes,
          transcript(s).length,
        );
        s.handoff = handoff;
        s.seal = { versionId, hash: handoff.outputsHash };
        const documents = [
          { kind: "founder-convictions", content: rendered },
          { kind: "receipt", content: JSON.stringify(handoff) },
          {
            kind: "method-provenance",
            content: JSON.stringify({
              methodRelease: strategyMethodRelease,
              stage: "m01",
              sourceHash: s.sourceHash,
              outputsHash: handoff.outputsHash,
            }),
          },
        ].map((d) => ({
          id: randomUUID(),
          versionId,
          ...d,
          hash: createHash("sha256").update(d.content).digest("hex"),
        }));
        return {
          payload: s,
          version: {
            id: versionId,
            canonicalPayload: JSON.stringify(s.outputs),
            sealHash: outputsHash(s.outputs),
            hashAlgorithm: "m01-outputs-json-sha256",
          },
          documents,
          approval: { versionId, declaration: handoff },
          outbox: [checkpointEvent(s.sessionId, "seal", s.revision + 1)],
        };
      });
    },
    async successor(scope: StrategyScope, command: M01Command & { reason: string }) {
      assertStrategyScope(scope, ["edit"]);
      return repo.forkSession<M01Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (record, tx) => {
          if (record.stage !== "m01") throw new Error("Not an M01 session");
          const source = await tx.getSource(M01_SOURCE_SLOT);
          if (!source) throw new Error("M01 source unavailable");
          const next = successorM01(record.payload, source.body as M01Input, command.reason);
          return {
            successor: { id: next.sessionId, stage: "m01", payload: next },
            outbox: [
              {
                kind: "m01.successor",
                payload: { parentId: record.id, sessionId: next.sessionId },
              },
            ],
          };
        },
        { ...command, operation: "successor" },
      );
    },
  };
}
