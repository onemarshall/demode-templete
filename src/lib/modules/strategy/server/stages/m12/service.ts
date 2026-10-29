import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import { ClientDecision, Session, STAGE_SCHEMAS, type Checks, type M12Session, type Stage, type StressReview } from "./contracts";
import { m12CommandSchema, m12GenerationSchema, type M12DataStage } from "./commands";
import { M12_SOURCE_SLOT, m12Capability, validateM12Source, type M12Chain } from "./source";
import {
  assetProblems,
  checklistProblems,
  computeGates,
  inheritanceProblems,
  responseProblems,
  rhythmProblems,
  ruleProblems,
  scheduleProblems,
  scorecardProblems,
  transitionProblems,
} from "./rules";
import { M12_DOCUMENT_KIND, M12_RECEIPT_KIND, renderM12 } from "./render";
import { M12_VERSION_HASH_ALGORITHM, makeM12Seal, sealedRecord, verifyM12Seal } from "./seal";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const NEXT_STAGE: Record<M12DataStage, Stage> = {
  inheritance: "assets",
  assets: "rhythm",
  rhythm: "schedule",
  schedule: "response",
  response: "scorecard",
  scorecard: "rules",
  rules: "checklist",
  checklist: "transition",
  transition: "checks",
};

const STAGE_ORDER: Stage[] = [
  "eligibility",
  "inheritance",
  "assets",
  "rhythm",
  "schedule",
  "response",
  "scorecard",
  "rules",
  "checklist",
  "transition",
  "checks",
  "review",
  "client-decision",
  "sealed",
];

type CyclePlans = { plans: { consequenceId: string; quantity: string; owner: string; threshold: string }[] };
type CycleDecision = { thresholds: string[]; reviewEvent: string };

export interface M12ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(scope: StrategyScope, source: SourceRecord, transaction?: { query(text: string, values?: unknown[]): Promise<unknown> }): Promise<void>;
  generate?: (request: {
    action: "draft" | "review";
    stage?: M12DataStage;
    session: M12Session;
    methodRelease: string;
  }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
    review?: { review: unknown; model: string; usage?: unknown };
  }>;
}

export function createM12Service(ports: M12ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: M12Session, source: SourceRecord | null): M12Chain {
    if (!source) throw new Error("Current sealed Commercial Cycle source is unavailable");
    const chain = validateM12Source(source);
    if (sha256(JSON.stringify(chain)) !== session.sourceHash)
      throw new Error("Upstream authority changed. Create a new working cycle session.");
    return chain;
  }

  function cycleOf(session: M12Session): { plans: CyclePlans; decision: CycleDecision } {
    const chain = session.sources as { m11?: { data?: { plans?: CyclePlans; decision?: CycleDecision } } };
    const plans = chain?.m11?.data?.plans;
    if (!plans) throw new Error("The sealed cycle's plans are unavailable.");
    return { plans, decision: (chain?.m11?.data?.decision ?? { thresholds: [], reviewEvent: "" }) as CycleDecision };
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M12Session>(scope, id);
    if (!stored || stored.stage !== "m12") throw new Error("Working cycle session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  function requireStage(session: M12Session, stage: Stage) {
    if (session.stage !== stage) throw new Error(`Session is at ${session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: M12Session, chain: M12Chain) => void | AtomicMutation<M12Session>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M12Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "m12") throw new Error("Not an M12 session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This cycle is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(M12_SOURCE_SLOT);
        if (sourceRecord) await ports.validateSource(scope, sourceRecord, tx);
        const chain = verifyPinned(session, sourceRecord);
        const at = now();
        session.revision = stored.revision + 1;
        session.updatedAt = at;
        session.history.push({ action: operation, actorId: scope.actorId, at, methodRelease });
        const result = update(session, chain);
        return {
          ...(result ?? { payload: session }),
          payload: Session.parse(session),
          sources: [{ slot: M12_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
          outbox: [{ kind: "m12.checkpoint", payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision } }],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(scope: StrategyScope, chain: M12Chain): M12Session {
    const at = now();
    return Session.parse({
      module: "m12",
      sessionId: randomUUID(),
      folder: scope.brandId,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      stage: "eligibility",
      status: "draft",
      route: "full",
      equivalentEvidence: "",
      sourceHash: sha256(JSON.stringify(chain)),
      sources: chain,
      capability: m12Capability(chain),
      confirmations: {},
      data: {},
      drafts: {},
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
      candidateHash: null,
      seal: null,
    });
  }

  function invalidateFrom(session: M12Session, stage: M12DataStage) {
    const index = STAGE_ORDER.indexOf(stage);
    for (const key of Object.keys(STAGE_SCHEMAS) as (keyof typeof STAGE_SCHEMAS)[]) {
      if (STAGE_ORDER.indexOf(key as Stage) >= index) {
        delete session.confirmations[key];
        if (key !== stage) delete session.data[key === "client-decision" ? "clientDecision" : key];
      }
    }
    delete session.data.checks;
    delete session.data.review;
    delete session.data.clientDecision;
    session.candidateHash = null;
    session.stage = stage;
    session.status = "revision-requested";
  }

  function stageProblems(stage: M12DataStage, value: never, session: M12Session): string[] {
    const { plans, decision } = cycleOf(session);
    switch (stage) {
      case "inheritance":
        return inheritanceProblems(value, plans, decision);
      case "assets":
        return assetProblems(value);
      case "rhythm":
        return rhythmProblems(value);
      case "schedule":
        return scheduleProblems(value, plans);
      case "response":
        return responseProblems(value);
      case "scorecard":
        return scorecardProblems(value, plans);
      case "rules":
        return ruleProblems(value);
      case "checklist":
        return checklistProblems(value);
      default:
        return transitionProblems(value);
    }
  }

  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M12 generation is not configured");
    const command = m12GenerationSchema.parse(raw);
    if (command.action !== "draft") throw new Error("Expected a draft command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M12_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, command.stage);
    const result = await ports.generate({ action: "draft", stage: command.stage, session, methodRelease });
    if (!result.draft) throw new Error("M12 draft provider returned no candidate");
    const candidate = STAGE_SCHEMAS[command.stage].parse(result.draft.candidate);
    return mutate(scope, command, "model-draft", "generate", (current) => {
      current.drafts[command.stage] = { candidate, model: result.draft!.model, usage: result.draft!.usage ?? null, at: now(), methodRelease, sourceHash: current.sourceHash };
    });
  }

  async function review(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M12 generation is not configured");
    const command = m12GenerationSchema.parse(raw);
    if (command.action !== "review") throw new Error("Expected a review command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M12_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, "review");
    const result = await ports.generate({ action: "review", session, methodRelease });
    if (!result.review) throw new Error("M12 review provider returned no review");
    const parsed = result.review.review as StressReview;
    if (parsed.candidateHash !== session.candidateHash)
      throw new Error("The review covers a different candidate than the frozen one.");
    return mutate(scope, command, "independent-review", "generate", (current) => {
      current.data.review = parsed;
      current.confirmations.review = {
        actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
        at: now(),
        decision: parsed.verdict,
        target: "review",
        revision: current.revision + 1,
        hash: sha256(JSON.stringify(parsed)),
        sourceHash: current.sourceHash,
      };
      if (parsed.verdict === "pass") {
        current.stage = "client-decision";
        current.status = "candidate";
      }
    });
  }

  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M12Session>(
        scope,
        (sourceRecord) => {
          const chain = validateM12Source(sourceRecord);
          const session = initialSession(scope, chain);
          return { id: session.sessionId, stage: "m12", payload: session };
        },
        M12_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateM12Source(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M12_SOURCE_SLOT);
      let upstreamCurrent = false;
      try {
        if (source) await ports.validateSource(scope, source);
        verifyPinned(session, source);
        upstreamCurrent = true;
      } catch {
        upstreamCurrent = false;
      }
      let sealCheck: { valid: boolean; reason: string } | null = null;
      if (session.seal) {
        const version = await repo.getVersion(scope, session.seal.versionId);
        if (!version) throw new Error("M12 seal version is unavailable");
        const checked = verifyM12Seal({ sessionId: id, version, current: session, expectedSourceHash: session.sourceHash });
        sealCheck = { valid: checked.valid, reason: checked.reason };
      }
      return {
        session,
        checks: (session.data.checks as Checks | undefined) ?? null,
        gates: computeGates(session),
        upstreamCurrent,
        sealCheck,
        review: (session.data.review as StressReview | undefined) ?? null,
        rendered: session.data.checks ? (session.data.checks as Checks).rendered : renderM12(session),
      };
    },
    draft,
    review,
    async save(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        requireStage(session, command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "confirm") throw new Error("Expected confirm command");
      return mutate(scope, command, "confirm", "approve", (session) => {
        requireStage(session, command.stage);
        const parsed = STAGE_SCHEMAS[command.stage].parse(command.payload);
        const problems = stageProblems(command.stage, parsed as never, session);
        if (problems.length) throw new Error(problems.join("\n"));
        session.data[command.stage] = parsed;
        delete session.drafts[command.stage];
        session.confirmations[command.stage] = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: "confirmed",
          target: command.stage,
          revision: session.revision + 1,
          hash: sha256(JSON.stringify(parsed)),
          sourceHash: session.sourceHash,
        };
        session.stage = NEXT_STAGE[command.stage];
        session.status = "draft";
      });
    },
    async revise(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        if (!session.confirmations[command.stage]) throw new Error("There is no confirmed stage to revise");
        invalidateFrom(session, command.stage);
      });
    },
    async confirmEligibility(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "confirm-eligibility") throw new Error("Expected confirm-eligibility command");
      return mutate(scope, command, "confirm-eligibility", "approve", (session) => {
        requireStage(session, "eligibility");
        session.confirmations.eligibility = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: "confirmed",
          target: "eligibility",
          revision: session.revision + 1,
          hash: sha256(JSON.stringify({ capability: session.capability })),
          sourceHash: session.sourceHash,
        };
        session.stage = "inheritance";
      });
    },
    async runChecks(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "run-checks") throw new Error("Expected run-checks command");
      return mutate(scope, command, "run-checks", "approve", (session) => {
        requireStage(session, "checks");
        const rendered = renderM12(session);
        const gates = computeGates(session);
        const allPass = gates.every((entry) => entry.result === "pass");
        const renderHash = sha256(rendered);
        const candidateHash = allPass ? renderHash : "";
        const checks: Checks = { gates, rendered, renderHash, candidateHash, frozenAt: allPass ? now() : "", ranAt: now() };
        session.data.checks = checks;
        session.confirmations.checks = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: allPass ? "candidate-frozen" : "checks-failed",
          target: "checks",
          revision: session.revision + 1,
          hash: sha256(JSON.stringify(checks)),
          sourceHash: session.sourceHash,
        };
        if (allPass) {
          session.candidateHash = candidateHash;
          session.status = "candidate";
          session.stage = "review";
        }
      });
    },
    async decide(scope: StrategyScope, raw: unknown) {
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "decide") throw new Error("Expected decide command");
      return mutate(scope, command, "client-decision", "approve", (session) => {
        requireStage(session, "client-decision");
        const decision = ClientDecision.parse(command.decision);
        session.data.clientDecision = decision;
        session.confirmations["client-decision"] = {
          actor: decision.approver,
          at: now(),
          decision: decision.response,
          target: "client-decision",
          revision: session.revision + 1,
          hash: sha256(JSON.stringify(decision)),
          sourceHash: session.sourceHash,
        };
        if (decision.response === "revise") {
          if (!decision.revisionNote.trim() || !decision.returnStage)
            throw new Error("A revision request needs the note and the stage it returns to.");
          session.stage = decision.returnStage;
          session.status = "revision-requested";
          delete session.data.clientDecision;
          delete session.confirmations["client-decision"];
          return;
        }
        if (decision.response === "decline") {
          if (!decision.declineReason.trim()) throw new Error("A decline needs its reason.");
          session.status = "declined";
          return;
        }
        const checks = session.data.checks as Checks;
        const review = session.data.review as StressReview;
        if (!checks?.candidateHash) throw new Error("The candidate was never frozen.");
        if (session.candidateHash !== checks.candidateHash) throw new Error("The candidate changed after it was frozen.");
        if (!review || review.verdict !== "pass") throw new Error("The independent review did not pass.");
        const at = now();
        session.stage = "sealed";
        session.status = "sealed";
        const sealed = makeM12Seal(session, scope.actorId, at);
        session.seal = { versionId: sealed.receiptId, hash: sealed.sealHash, at: sealed.sealedAt, path: `database:${sealed.receiptId}` };
        session.history.push({ action: "sealed", ...sealed });
        const rendered = checks.rendered;
        const renderedHash = sha256(rendered);
        const canonicalPayload = JSON.stringify({
          receipt: sealed,
          payload: sealedRecord(session),
          lineage: { parentSessionId: session.parentSessionId ?? null },
          source: { hash: session.sourceHash },
          rendered,
          renderedHash,
        });
        const receiptText = JSON.stringify(sealed);
        return {
          payload: session,
          version: { id: sealed.receiptId, canonicalPayload, sealHash: sha256(canonicalPayload), hashAlgorithm: M12_VERSION_HASH_ALGORITHM },
          approval: {
            versionId: sealed.receiptId,
            declaration: {
              actorId: scope.actorId,
              receiptId: sealed.receiptId,
              sealHash: sealed.sealHash,
              candidateHash: sealed.candidateHash,
              verdict: sealed.reviewVerdict,
              cycleVersionId: sealed.cycleVersionId,
            },
          },
          documents: [
            { id: randomUUID(), versionId: sealed.receiptId, kind: M12_DOCUMENT_KIND, content: rendered, hash: renderedHash },
            { id: randomUUID(), versionId: sealed.receiptId, kind: M12_RECEIPT_KIND, content: receiptText, hash: sha256(receiptText) },
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m12CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M12Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "m12") throw new Error("Not an M12 session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed") throw new Error("Only a sealed cycle can have a successor");
          const sourceRecord = await tx.getSource(M12_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Commercial Cycle source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateM12Source(sourceRecord);
          const next = initialSession(scope, chain);
          next.parentSessionId = previous.sessionId;
          next.history.push({
            action: "successor",
            parent: previous.sessionId,
            reason: command.reason,
            at: now(),
            invalidation: "Every confirmation and the decision require fresh review; the historical version is preserved.",
          });
          return {
            successor: { id: next.sessionId, stage: "m12", payload: next },
            outbox: [{ kind: "m12.checkpoint", payload: { sessionId: next.sessionId, stage: next.stage, revision: 1 } }],
          };
        },
        command,
      );
    },
  };
}

export { M12_SOURCE_SLOT } from "./source";
