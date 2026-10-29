import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { SourceRecord, StrategyRepository } from "../../data/repository";
import type { AtomicMutation } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  M03Record,
  M03SealReceipt,
  type Commitments,
  type M03DraftStep,
  type M03Stage,
  type M03Upstream,
} from "./session";
import {
  m03CommandSchema,
  m03DraftCommandSchema,
  M03_DRAFT_STAGE,
  type M03Command,
} from "./commands";
import { M03_SOURCE_SLOT, validateM03Source } from "./source";
export { M03_SOURCE_SLOT } from "./source";
import {
  AdvocateBody,
  ChallengeBody,
  CostBody,
  FrictionBody,
  GridBody,
  JourneyBody,
  JudgementBody,
  ProofBody,
  confirmAdvocate,
  confirmChallenge,
  confirmConfrontations,
  confirmCost,
  confirmCredibility,
  confirmFriction,
  confirmGrid,
  confirmInputs,
  confirmJourney,
  confirmJudgement,
  confirmProof,
  confirmOutcome,
  outcomeCheck,
} from "./rules";
import { renderM03ClientDoc, m03DocumentKind } from "./render";
import { M03_VERSION_HASH_ALGORITHM, makeM03Seal, verifyM03Seal } from "./seal";
import { GRID_ACTIONS, FRICTION_SOURCES, ADVOCATE_CHALLENGES } from "./session";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export interface M03ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(
    scope: StrategyScope,
    source: SourceRecord,
    transaction?: { query(text: string, values?: unknown[]): Promise<unknown> },
  ): Promise<void>;
  generate?: (request: {
    step: M03DraftStep;
    state: unknown;
    methodRelease: string;
  }) => Promise<{ candidate: unknown; model: string; usage?: unknown }>;
}

const CONFIRM_STAGE: Record<string, M03Stage> = {
  "confirm-upstream": "upstream",
  "confirm-inputs": "inputs",
  "confirm-challenge": "challenge",
  "confirm-journey": "journey",
  "confirm-grid": "grid",
  "confirm-proof": "proof",
  "confirm-friction": "friction",
  "confirm-credibility": "credibility",
  "confirm-confrontations": "confrontations",
  "confirm-cost": "cost",
  "confirm-advocate": "advocate",
  "confirm-judgement": "judgement",
  "outcome": "judgement",
};

const NEXT_STAGE: Record<string, M03Stage> = {
  "confirm-upstream": "inputs",
  "confirm-inputs": "challenge",
  "confirm-challenge": "journey",
  "confirm-journey": "grid",
  "confirm-grid": "proof",
  "confirm-proof": "friction",
  "confirm-friction": "credibility",
  "confirm-credibility": "confrontations",
  "confirm-confrontations": "cost",
  "confirm-cost": "advocate",
  "confirm-advocate": "judgement",
};

const CONFIRMATION_KEY: Record<string, string> = {
  "confirm-upstream": "upstream",
  "confirm-inputs": "inputs",
  "confirm-challenge": "challenge",
  "confirm-journey": "journey",
  "confirm-grid": "grid",
  "confirm-proof": "proof",
  "confirm-friction": "friction",
  "confirm-credibility": "credibility",
  "confirm-confrontations": "confrontations",
  "confirm-cost": "cost",
  "confirm-advocate": "advocate",
  "confirm-judgement": "judgement",
  "outcome": "judgement",
};

const DRAFT_SCHEMAS: Record<M03DraftStep, z.ZodType> = {
  challenge: ChallengeBody,
  journey: JourneyBody,
  grid: GridBody,
  proof: ProofBody,
  friction: FrictionBody,
  cost: CostBody,
  advocate: z.object({
    challenges: z.array(
      z.object({
        id: z.enum(["case-for-default", "funded-copycat", "positioning-vs-preference"]),
        case: z.string(),
      }),
    ),
  }),
  judgement: JudgementBody,
};

/** Fill the rows a model skipped rather than failing the draft — the human sees every slot. */
function normaliseDraft(step: M03DraftStep, candidate: unknown): unknown {
  if (step === "grid") {
    const draft = candidate as { rows: any[] };
    const seen = new Set(draft.rows.map((row) => row.action));
    for (const action of GRID_ACTIONS)
      if (!seen.has(action))
        draft.rows.push({
          action,
          move: "",
          beliefRationale: "",
          proofCommitment: "",
          operationalRule: "",
          specialisationSignal: "",
          proofArtefactType: "",
          traceToBelief: "",
        });
  }
  if (step === "proof") {
    const draft = candidate as { rows: any[] };
    const seen = new Set(draft.rows.map((row) => row.action));
    for (const action of GRID_ACTIONS)
      if (!seen.has(action))
        draft.rows.push({
          action,
          product: "",
          policy: "",
          story: "",
          framework: "",
          proofEconomy: "discrete-at-cost",
          evidenceStatus: "thin",
          claimBoundaryNote: "",
          capturePlan: "",
        });
  }
  if (step === "friction") {
    const draft = candidate as { rows: any[] };
    const seen = new Set(draft.rows.map((row) => row.action));
    for (const action of GRID_ACTIONS)
      if (!seen.has(action))
        draft.rows.push({
          action,
          sources: Object.fromEntries(
            FRICTION_SOURCES.map((source) => [source, { level: "low", note: "" }]),
          ),
        });
  }
  if (step === "advocate") {
    const draft = candidate as { challenges: any[] };
    const seen = new Set(draft.challenges.map((challenge) => challenge.id));
    for (const challenge of ADVOCATE_CHALLENGES)
      if (!seen.has(challenge.id)) draft.challenges.push({ id: challenge.id, case: "" });
  }
  return candidate;
}

export function createM03Service(ports: M03ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(record: M03Record, source: SourceRecord | null): M03Upstream {
    if (!source) throw new Error("Current sealed Market Reality source is unavailable");
    const upstream = validateM03Source(source);
    if (
      source.id !== record.sourceVersionId ||
      source.hash !== record.sourceHash ||
      upstream.m02SessionId !== record.commitments.upstream.m02SessionId ||
      upstream.m02Seal.sealHash !== record.commitments.upstream.m02Seal.sealHash ||
      upstream.m01.outputsHash !== record.commitments.upstream.m01.outputsHash
    )
      throw new Error("Market Reality authority changed — create a fresh Business Commitments candidate");
    return upstream;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M03Record>(scope, id);
    if (!stored || stored.stage !== "m03") throw new Error("M03 session not found");
    const record = M03Record.parse(stored.payload);
    if (record.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, record };
  }

  function requireStage(record: M03Record, stage: M03Stage) {
    if (record.session.stage !== stage)
      throw new Error(`Session is at ${record.session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (record: M03Record, upstream: M03Upstream) => void | AtomicMutation<M03Record>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M03Record>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "m03") throw new Error("Not an M03 session");
        const record = M03Record.parse(stored.payload);
        if (record.revision !== stored.revision)
          throw new Error("Session revision integrity mismatch");
        if (record.session.stage === "sealed")
          throw new Error("This M03 version is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(M03_SOURCE_SLOT);
        if (sourceRecord) await ports.validateSource(scope, sourceRecord, tx);
        const upstream = verifyPinned(record, sourceRecord);
        const at = now();
        record.revision = stored.revision + 1;
        record.session.updatedAt = at;
        record.commitments.updatedAt = at;
        record.history.push({ action: operation, actorId: scope.actorId, at, methodRelease });
        const result = update(record, upstream);
        return {
          ...(result ?? { payload: record }),
          payload: M03Record.parse(record),
          sources: [{ slot: M03_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
          outbox: [
            {
              kind: "m03.checkpoint",
              payload: {
                sessionId: record.session.sessionId,
                stage: record.session.stage,
                revision: record.revision,
              },
            },
          ],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialRecord(
    scope: StrategyScope,
    sourceRecord: SourceRecord,
    upstream: M03Upstream,
  ): M03Record {
    const at = now();
    const sessionId = randomUUID();
    return M03Record.parse({
      revision: 1,
      session: {
        module: "03",
        sessionId,
        folder: scope.brandId,
        createdAt: at,
        updatedAt: at,
        stage: "upstream",
        m02: {
          sessionId: upstream.m02SessionId,
          sealedAt: upstream.m02SealedAt,
          outcome: upstream.m02Outcome,
          relianceScope: upstream.m02RelianceScope,
          sealReceiptId: upstream.m02Seal.receiptId,
          sealHash: upstream.m02Seal.sealHash,
        },
        m01: {
          sessionId: upstream.m01.sessionId,
          sealedAt: upstream.m01.sealedAt,
          outputsHash: upstream.m01.outputsHash,
          lockState: upstream.m01.lockState,
        },
        route: "full",
        routeStatus: "proposed",
        routeReason: "No recorded route — full run as the method specifies.",
        revisionRequest: null,
        confirmations: {},
      },
      commitments: {
        module: "03",
        sessionId,
        producedAt: at,
        updatedAt: at,
        upstream,
      },
      drafts: {},
      seal: null,
      sourceVersionId: sourceRecord.id,
      sourceHash: sourceRecord.hash,
      parentSessionId: null,
      successorReason: "",
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
    });
  }

  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M03 generation is not configured");
    const command = m03DraftCommandSchema.parse(raw);
    const { stored, record } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M03_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(record, source);
    requireStage(record, M03_DRAFT_STAGE[command.step] as M03Stage);
    const state = {
      session: record.session,
      commitments: record.commitments,
    };
    const result = await ports.generate({
      step: command.step,
      state,
      methodRelease,
    });
    const candidate = DRAFT_SCHEMAS[command.step].parse(result.candidate);
    const saved = await mutate(scope, command, "draft", "generate", (current) => {
      current.drafts[command.step] = {
        candidate: normaliseDraft(command.step, candidate),
        model: result.model,
        usage: result.usage ?? null,
        at: now(),
        methodRelease,
        sourceVersionId: current.sourceVersionId,
        sourceHash: current.sourceHash,
      };
    });
    // Drafts are untrusted candidates. A separate typed confirmation is required.
    return { candidate, model: result.model, usage: result.usage ?? null, record: saved.payload };
  }

  async function confirm(scope: StrategyScope, raw: unknown) {
    const command = m03CommandSchema.parse(raw);
    if (command.action === "create") throw new Error("Expected a confirmation command");
    if (command.action === "successor" || command.action === "seal")
      throw new Error("Command is not a confirmation action");
    const action = command.action;
    const stage = CONFIRM_STAGE[action];
    const key = CONFIRMATION_KEY[action];
    // Upstream review is an edit-level act; every other confirmation is an approval.
    const required = action === "confirm-upstream" ? "edit" : "approve";
    return mutate(scope, command, action, required, (record) => {
      requireStage(record, stage);
      if (action === "confirm-upstream") {
        const body = command as Extract<M03Command, { action: "confirm-upstream" }>;
        if (body.route && body.route !== "full")
          throw new Error(
            "This route requires an approved locked-source adoption record before it can be used.",
          );
        if (record.commitments.upstream.m01.lockState === "missing")
          throw new Error(
            "The Founder Conviction Foundation seal is missing — the conviction this builds on can't be verified",
          );
        if (body.route) {
          record.session.route = body.route;
          record.session.routeStatus = "confirmed";
        }
        record.session.confirmations.upstream = { by: scope.actorId, at: now() };
        record.session.stage = NEXT_STAGE[action];
        return;
      }
      if (action === "outcome") {
        const body = command as Extract<M03Command, { action: "outcome" }>;
        if (!record.session.confirmations.judgement)
          throw new Error("Record the strategic judgement first");
        confirmOutcome(record.commitments, body.outcome);
        record.session.confirmations.outcome = { by: scope.actorId, at: now() };
        return;
      }
      switch (action) {
        case "confirm-inputs":
          confirmInputs(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-inputs" }>).inputs,
          );
          break;
        case "confirm-challenge":
          confirmChallenge(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-challenge" }>).challenge,
          );
          break;
        case "confirm-journey":
          confirmJourney(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-journey" }>).journey,
          );
          break;
        case "confirm-grid":
          confirmGrid(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-grid" }>).grid,
          );
          break;
        case "confirm-proof":
          confirmProof(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-proof" }>).proof,
          );
          break;
        case "confirm-friction":
          confirmFriction(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-friction" }>).friction,
          );
          break;
        case "confirm-credibility":
          confirmCredibility(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-credibility" }>).credibility,
          );
          break;
        case "confirm-confrontations":
          confirmConfrontations(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-confrontations" }>).confrontations,
          );
          break;
        case "confirm-cost":
          confirmCost(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-cost" }>).cost,
          );
          break;
        case "confirm-advocate":
          confirmAdvocate(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-advocate" }>).advocate,
          );
          break;
        case "confirm-judgement":
          confirmJudgement(
            record.commitments,
            (command as Extract<M03Command, { action: "confirm-judgement" }>).judgement,
          );
          break;
      }
      record.session.confirmations[key] = { by: scope.actorId, at: now() };
      record.session.stage = NEXT_STAGE[action] ?? record.session.stage;
    });
  }

  async function seal(scope: StrategyScope, raw: unknown) {
    const command = m03CommandSchema.parse(raw);
    if (command.action !== "seal") throw new Error("Expected seal command");
    return mutate(scope, command, "seal", "approve", (record) => {
      requireStage(record, "judgement");
      if (record.commitments.outcome.outcome === "pending")
        throw new Error("No outcome recorded — the run can't seal undecided");
      if (record.commitments.outcome.outcome === "a") {
        const check = outcomeCheck(record.commitments);
        if (!check.canA)
          throw new Error(`Outcome A is no longer eligible: ${check.problems.join(" — ")}`);
      }
      const at = now();
      record.commitments.state = {
        ...record.commitments.state,
        versionState: "sealed",
        approvalState: "approved",
        gateState: "closed",
      };
      record.session.stage = "sealed";
      record.session.confirmations.sealed = { by: scope.actorId, at };
      const sealed = makeM03Seal(record, scope.actorId, at);
      record.seal = sealed;
      const rendered = renderM03ClientDoc(record.commitments);
      const renderedHash = sha256(rendered);
      const canonicalPayload = JSON.stringify({
        receipt: sealed,
        snapshots: {
          session: structuredClone(record.session),
          commitments: structuredClone(record.commitments),
        },
        lineage: {
          parentSessionId: record.parentSessionId,
          successorReason: record.successorReason,
        },
        source: { versionId: record.sourceVersionId, hash: record.sourceHash },
        rendered,
        renderedHash,
      });
      const versionHash = sha256(canonicalPayload);
      const receiptText = JSON.stringify(sealed);
      return {
        payload: record,
        version: {
          id: sealed.receiptId,
          canonicalPayload,
          sealHash: versionHash,
          hashAlgorithm: M03_VERSION_HASH_ALGORITHM,
        },
        approval: {
          versionId: sealed.receiptId,
          declaration: {
            actorId: scope.actorId,
            receiptId: sealed.receiptId,
            sealHash: sealed.sealHash,
            outcome: sealed.outcome,
          },
        },
        documents: [
          {
            id: randomUUID(),
            versionId: sealed.receiptId,
            kind: m03DocumentKind(sealed.outcome),
            content: rendered,
            hash: sha256(rendered),
          },
          {
            id: randomUUID(),
            versionId: sealed.receiptId,
            kind: "receipt",
            content: receiptText,
            hash: sha256(receiptText),
          },
        ],
      };
    });
  }

  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m03CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M03Record>(
        scope,
        (sourceRecord) => {
          const upstream = validateM03Source(sourceRecord);
          const record = initialRecord(scope, sourceRecord, upstream);
          return { id: record.session.sessionId, stage: "m03", payload: record };
        },
        M03_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateM03Source(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { record } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M03_SOURCE_SLOT);
      let current = false;
      try {
        if (source) await ports.validateSource(scope, source);
        verifyPinned(record, source);
        current = true;
      } catch {
        current = false;
      }
      let sealVerification: { valid: boolean; reason: string } | null = null;
      if (record.session.stage === "sealed") {
        const receipt = M03SealReceipt.parse(record.seal);
        const version = await repo.getVersion(scope, receipt.receiptId);
        if (!version) throw new Error("M03 immutable seal version is unavailable");
        const checked = verifyM03Seal({
          sessionId: id,
          version,
          current: record,
          expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash },
        });
        if (!checked.valid) throw new Error(checked.reason);
        sealVerification = { valid: true, reason: checked.reason };
      }
      const check = outcomeCheck(record.commitments);
      return { ...record, upstreamCurrent: current, sealVerification, outcomeCheck: check };
    },
    draft,
    confirm,
    async outcome(scope: StrategyScope, raw: unknown) {
      return confirm(scope, raw);
    },
    seal,
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m03CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M03Record>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "m03") throw new Error("Not an M03 session");
          const previous = M03Record.parse(current.payload);
          if (!previous.seal || previous.session.stage !== "sealed")
            throw new Error("Only a sealed M03 record can have a successor");
          const sourceRecord = await tx.getSource(M03_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Market Reality source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const upstream = validateM03Source(sourceRecord);
          const successor = initialRecord(scope, sourceRecord, upstream);
          successor.session.route = previous.session.route;
          successor.session.routeReason = command.reason;
          successor.parentSessionId = previous.session.sessionId;
          successor.successorReason = command.reason;
          successor.history.push({
            action: "successor",
            actorId: scope.actorId,
            at: now(),
            methodRelease,
          });
          successor.history.push({
            action: `successor-reason:${command.reason}`,
            actorId: scope.actorId,
            at: now(),
            methodRelease,
          });
          return {
            successor: { id: successor.session.sessionId, stage: "m03", payload: successor },
            outbox: [
              {
                kind: "m03.checkpoint",
                payload: {
                  sessionId: successor.session.sessionId,
                  stage: successor.session.stage,
                  revision: 1,
                },
              },
            ],
          };
        },
        command,
      );
    },
  };
}
