import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  ClientDecision,
  Session,
  STAGE_SCHEMAS,
  type Checks,
  type M08Session,
  type Stage,
  type StressReview,
} from "./contracts";
import { m08CommandSchema, m08GenerationSchema, type M08DataStage } from "./commands";
import { M08_SOURCE_SLOT, m08Capability, validateM08Source, type M08Chain } from "./source";
import {
  claimProblems,
  complianceProblems,
  computeGates,
  distributionProblems,
  gapProblems,
  inheritanceProblems,
  libraryProblems,
  measureProblems,
  missionProblems,
  operationsProblems,
  pillarProblems,
  productionProblems,
  salesMapProblems,
} from "./rules";
import { M08_DOCUMENT_KIND, M08_RECEIPT_KIND, renderM08 } from "./render";
import { M08_VERSION_HASH_ALGORITHM, makeM08Seal, sealedRecord, verifyM08Seal } from "./seal";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const NEXT_STAGE: Record<M08DataStage, Stage> = {
  inheritance: "mission",
  mission: "pillars",
  pillars: "library",
  library: "gaps",
  gaps: "sales-map",
  "sales-map": "claims",
  claims: "distribution",
  distribution: "production",
  production: "measures",
  measures: "operations",
  operations: "compliance",
  compliance: "checks",
};

const STAGE_ORDER: Stage[] = [
  "eligibility",
  "inheritance",
  "mission",
  "pillars",
  "library",
  "gaps",
  "sales-map",
  "claims",
  "distribution",
  "production",
  "measures",
  "operations",
  "compliance",
  "checks",
  "review",
  "client-decision",
  "sealed",
];

export interface M08ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(
    scope: StrategyScope,
    source: SourceRecord,
    transaction?: { query(text: string, values?: unknown[]): Promise<unknown> },
  ): Promise<void>;
  generate?: (request: {
    action: "draft" | "review";
    stage?: M08DataStage;
    session: M08Session;
    methodRelease: string;
  }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
    review?: { review: unknown; model: string; usage?: unknown };
  }>;
}

export function createM08Service(ports: M08ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: M08Session, source: SourceRecord | null): M08Chain {
    if (!source) throw new Error("Current sealed Sales Strategy source is unavailable");
    const chain = validateM08Source(source);
    if (sha256(JSON.stringify(chain)) !== session.sourceHash)
      throw new Error("Upstream authority changed. Create a new content strategy session.");
    return chain;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M08Session>(scope, id);
    if (!stored || stored.stage !== "m08") throw new Error("Content strategy session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  function requireStage(session: M08Session, stage: Stage) {
    if (session.stage !== stage) throw new Error(`Session is at ${session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: M08Session, chain: M08Chain) => void | AtomicMutation<M08Session>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M08Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "m08") throw new Error("Not an M08 session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This strategy is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(M08_SOURCE_SLOT);
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
          sources: [{ slot: M08_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
          outbox: [
            {
              kind: "m08.checkpoint",
              payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision },
            },
          ],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(scope: StrategyScope, chain: M08Chain): M08Session {
    const at = now();
    return Session.parse({
      module: "08",
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
      capability: m08Capability(chain),
      confirmations: {},
      data: {},
      drafts: {},
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
      candidateHash: null,
      seal: null,
    });
  }

  function invalidateFrom(session: M08Session, stage: M08DataStage) {
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

  function stageProblems(stage: M08DataStage, value: never, session: M08Session): string[] {
    const pillars = session.data.pillars as never;
    switch (stage) {
      case "inheritance":
        return inheritanceProblems(value);
      case "mission":
        return missionProblems(value);
      case "pillars":
        return pillarProblems(value);
      case "library":
        return libraryProblems(value, pillars);
      case "gaps":
        return gapProblems(value, pillars);
      case "sales-map":
        return salesMapProblems(value);
      case "claims":
        return claimProblems(value);
      case "distribution":
        return distributionProblems(value, pillars);
      case "production":
        return productionProblems(value);
      case "measures":
        return measureProblems(value);
      case "operations":
        return operationsProblems(value);
      default:
        return complianceProblems(value);
    }
  }

  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M08 generation is not configured");
    const command = m08GenerationSchema.parse(raw);
    if (command.action !== "draft") throw new Error("Expected a draft command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M08_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, command.stage);
    const result = await ports.generate({ action: "draft", stage: command.stage, session, methodRelease });
    if (!result.draft) throw new Error("M08 draft provider returned no candidate");
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
    if (!ports.generate) throw new Error("M08 generation is not configured");
    const command = m08GenerationSchema.parse(raw);
    if (command.action !== "review") throw new Error("Expected a review command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M08_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, "review");
    const result = await ports.generate({ action: "review", session, methodRelease });
    if (!result.review) throw new Error("M08 review provider returned no review");
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
      const command = m08CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M08Session>(
        scope,
        (sourceRecord) => {
          const chain = validateM08Source(sourceRecord);
          const session = initialSession(scope, chain);
          return { id: session.sessionId, stage: "m08", payload: session };
        },
        M08_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateM08Source(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M08_SOURCE_SLOT);
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
        if (!version) throw new Error("M08 immutable seal version is unavailable");
        const checked = verifyM08Seal({ sessionId: id, version, current: session, expectedSourceHash: session.sourceHash });
        sealCheck = { valid: checked.valid, reason: checked.reason };
      }
      return {
        session,
        checks: (session.data.checks as Checks | undefined) ?? null,
        gates: computeGates(session),
        upstreamCurrent,
        sealCheck,
        review: (session.data.review as StressReview | undefined) ?? null,
        rendered: session.data.checks ? (session.data.checks as Checks).rendered : renderM08(session),
      };
    },
    draft,
    review,
    async save(scope: StrategyScope, raw: unknown) {
      const command = m08CommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        requireStage(session, command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = m08CommandSchema.parse(raw);
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
      const command = m08CommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        if (!session.confirmations[command.stage]) throw new Error("There is no confirmed stage to revise");
        invalidateFrom(session, command.stage);
      });
    },
    async confirmEligibility(scope: StrategyScope, raw: unknown) {
      const command = m08CommandSchema.parse(raw);
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
      const command = m08CommandSchema.parse(raw);
      if (command.action !== "run-checks") throw new Error("Expected run-checks command");
      return mutate(scope, command, "run-checks", "approve", (session) => {
        requireStage(session, "checks");
        const rendered = renderM08(session);
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
      const command = m08CommandSchema.parse(raw);
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
        const sealed = makeM08Seal(session, scope.actorId, at);
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
            hashAlgorithm: M08_VERSION_HASH_ALGORITHM,
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
            { id: randomUUID(), versionId: sealed.receiptId, kind: M08_DOCUMENT_KIND, content: rendered, hash: renderedHash },
            { id: randomUUID(), versionId: sealed.receiptId, kind: M08_RECEIPT_KIND, content: receiptText, hash: sha256(receiptText) },
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m08CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M08Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "m08") throw new Error("Not an M08 session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed") throw new Error("Only a sealed strategy can have a successor");
          const sourceRecord = await tx.getSource(M08_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Sales Strategy source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateM08Source(sourceRecord);
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
            successor: { id: next.sessionId, stage: "m08", payload: next },
            outbox: [{ kind: "m08.checkpoint", payload: { sessionId: next.sessionId, stage: next.stage, revision: 1 } }],
          };
        },
        command,
      );
    },
  };
}

export { M08_SOURCE_SLOT } from "./source";
