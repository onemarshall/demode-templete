import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  ClientDecision,
  Session,
  STAGE_SCHEMAS,
  type Checks,
  type M06Session,
  type Stage,
  type StressReview,
} from "./contracts";
import { m06CommandSchema, m06GenerationSchema, type M06DataStage } from "./commands";
import { M06_SOURCE_SLOT, m06Capability, validateM06Source, type M06Chain } from "./source";
import {
  activationProblems,
  audienceProblems,
  computeGates,
  expressionProblems,
  foundationProblems,
  inheritanceProblems,
  measurementProblems,
  positioningProblems,
  routeProblems,
} from "./rules";
import { M06_DOCUMENT_KIND, M06_RECEIPT_KIND, renderM06 } from "./render";
import { M06_VERSION_HASH_ALGORITHM, makeM06Seal, sealedRecord, verifyM06Seal } from "./seal";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const NEXT_STAGE: Record<M06DataStage, Stage> = {
  inheritance: "foundation",
  foundation: "audience",
  audience: "positioning",
  positioning: "expressions",
  expressions: "routes",
  routes: "activation",
  activation: "measurement",
  measurement: "checks",
};

const STAGE_ORDER: Stage[] = [
  "eligibility",
  "inheritance",
  "foundation",
  "audience",
  "positioning",
  "expressions",
  "routes",
  "activation",
  "measurement",
  "checks",
  "review",
  "client-decision",
  "sealed",
];

export interface M06ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(
    scope: StrategyScope,
    source: SourceRecord,
    transaction?: { query(text: string, values?: unknown[]): Promise<unknown> },
  ): Promise<void>;
  generate?: (request: {
    action: "draft" | "review";
    stage?: M06DataStage;
    session: M06Session;
    methodRelease: string;
  }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
    review?: { review: unknown; model: string; usage?: unknown };
  }>;
}

function stageProblems(stage: M06DataStage, value: never, session: M06Session): string[] {
  if (stage === "inheritance") return inheritanceProblems(value);
  if (stage === "foundation") return foundationProblems(value);
  if (stage === "audience") return audienceProblems(value);
  if (stage === "positioning") return positioningProblems(value);
  if (stage === "expressions") return expressionProblems(value);
  if (stage === "routes") return routeProblems(value, session.data.audience as never);
  if (stage === "activation") return activationProblems(value);
  return measurementProblems(value);
}

export function createM06Service(ports: M06ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: M06Session, source: SourceRecord | null): M06Chain {
    if (!source) throw new Error("Current sealed Brand Strategy source is unavailable");
    const chain = validateM06Source(source);
    if (sha256(JSON.stringify(chain)) !== session.sourceHash)
      throw new Error("Upstream authority changed. Create a new marketing strategy session.");
    return chain;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M06Session>(scope, id);
    if (!stored || stored.stage !== "m06") throw new Error("Marketing strategy session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  function requireStage(session: M06Session, stage: Stage) {
    if (session.stage !== stage) throw new Error(`Session is at ${session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: M06Session, chain: M06Chain) => void | AtomicMutation<M06Session>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M06Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "m06") throw new Error("Not an M06 session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This strategy is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(M06_SOURCE_SLOT);
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
          sources: [{ slot: M06_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
          outbox: [
            {
              kind: "m06.checkpoint",
              payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision },
            },
          ],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(scope: StrategyScope, chain: M06Chain): M06Session {
    const at = now();
    return Session.parse({
      module: "06",
      sessionId: randomUUID(),
      folder: scope.brandId,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      stage: "eligibility",
      status: "draft",
      route: chain.route.route,
      equivalentEvidence: "",
      sourceHash: sha256(JSON.stringify(chain)),
      sources: chain,
      capability: m06Capability(chain),
      confirmations: {},
      data: {},
      drafts: {},
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
      candidateHash: null,
      seal: null,
    });
  }

  function invalidateFrom(session: M06Session, stage: M06DataStage) {
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

  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M06 generation is not configured");
    const command = m06GenerationSchema.parse(raw);
    if (command.action !== "draft") throw new Error("Expected a draft command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M06_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, command.stage);
    const result = await ports.generate({ action: "draft", stage: command.stage, session, methodRelease });
    if (!result.draft) throw new Error("M06 draft provider returned no candidate");
    const candidate = STAGE_SCHEMAS[command.stage].parse(result.draft.candidate);
    return mutate(scope, command, "model-draft", "generate", (current) => {
      current.drafts[command.stage] = {
        candidate,
        model: result.draft!.model,
        usage: result.draft!.usage ?? null,
        at: now(),
        methodRelease,
        sourceHash: current.sourceHash,
      };
    });
  }

  async function review(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M06 generation is not configured");
    const command = m06GenerationSchema.parse(raw);
    if (command.action !== "review") throw new Error("Expected a review command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M06_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, "review");
    const result = await ports.generate({ action: "review", session, methodRelease });
    if (!result.review) throw new Error("M06 review provider returned no review");
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
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M06Session>(
        scope,
        (sourceRecord) => {
          const chain = validateM06Source(sourceRecord);
          const session = initialSession(scope, chain);
          return { id: session.sessionId, stage: "m06", payload: session };
        },
        M06_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateM06Source(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M06_SOURCE_SLOT);
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
        if (!version) throw new Error("M06 immutable seal version is unavailable");
        const checked = verifyM06Seal({
          sessionId: id,
          version,
          current: session,
          expectedSourceHash: session.sourceHash,
        });
        sealCheck = { valid: checked.valid, reason: checked.reason };
      }
      return {
        session,
        checks: (session.data.checks as Checks | undefined) ?? null,
        gates: computeGates(session),
        upstreamCurrent,
        sealCheck,
        review: (session.data.review as StressReview | undefined) ?? null,
        rendered: session.data.checks ? (session.data.checks as Checks).rendered : renderM06(session),
      };
    },
    draft,
    review,
    async save(scope: StrategyScope, raw: unknown) {
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        requireStage(session, command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = m06CommandSchema.parse(raw);
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
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        if (!session.confirmations[command.stage]) throw new Error("There is no confirmed stage to revise");
        invalidateFrom(session, command.stage);
      });
    },
    async confirmEligibility(scope: StrategyScope, raw: unknown) {
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "confirm-eligibility") throw new Error("Expected confirm-eligibility command");
      return mutate(scope, command, "confirm-eligibility", "approve", (session) => {
        requireStage(session, "eligibility");
        session.confirmations.eligibility = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: "confirmed",
          target: "eligibility",
          revision: session.revision + 1,
          hash: sha256(JSON.stringify({ route: session.route, capability: session.capability })),
          sourceHash: session.sourceHash,
        };
        session.stage = "inheritance";
      });
    },
    async runChecks(scope: StrategyScope, raw: unknown) {
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "run-checks") throw new Error("Expected run-checks command");
      return mutate(scope, command, "run-checks", "approve", (session) => {
        requireStage(session, "checks");
        const rendered = renderM06(session);
        const gates = computeGates(session);
        const allPass = gates.every((entry) => entry.result === "pass");
        const renderHash = sha256(rendered);
        const candidateHash = allPass ? renderHash : "";
        const checks: Checks = {
          gates,
          rendered,
          renderHash,
          candidateHash,
          frozenAt: allPass ? now() : "",
          ranAt: now(),
        };
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
      const command = m06CommandSchema.parse(raw);
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
        const sealed = makeM06Seal(session, scope.actorId, at);
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
          version: {
            id: sealed.receiptId,
            canonicalPayload,
            sealHash: sha256(canonicalPayload),
            hashAlgorithm: M06_VERSION_HASH_ALGORITHM,
          },
          approval: {
            versionId: sealed.receiptId,
            declaration: {
              actorId: scope.actorId,
              receiptId: sealed.receiptId,
              sealHash: sealed.sealHash,
              candidateHash: sealed.candidateHash,
              verdict: sealed.reviewVerdict,
            },
          },
          documents: [
            { id: randomUUID(), versionId: sealed.receiptId, kind: M06_DOCUMENT_KIND, content: rendered, hash: renderedHash },
            { id: randomUUID(), versionId: sealed.receiptId, kind: M06_RECEIPT_KIND, content: receiptText, hash: sha256(receiptText) },
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m06CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M06Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "m06") throw new Error("Not an M06 session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed") throw new Error("Only a sealed strategy can have a successor");
          const sourceRecord = await tx.getSource(M06_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Brand Strategy source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateM06Source(sourceRecord);
          const next = initialSession(scope, chain);
          next.parentSessionId = previous.sessionId;
          next.history.push({
            action: "successor",
            parent: previous.sessionId,
            reason: command.reason,
            at: now(),
            invalidation: "All confirmations, checks and reviews require fresh review; the historical version is preserved.",
          });
          return {
            successor: { id: next.sessionId, stage: "m06", payload: next },
            outbox: [{ kind: "m06.checkpoint", payload: { sessionId: next.sessionId, stage: next.stage, revision: 1 } }],
          };
        },
        command,
      );
    },
  };
}

export { M06_SOURCE_SLOT } from "./source";
