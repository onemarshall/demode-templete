import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  ClientDecision,
  Session,
  STAGE_SCHEMAS,
  type Checks,
  type M05Session,
  type Package,
  type Stage,
  type StressReview,
} from "./contracts";
import { m05CommandSchema, m05GenerationSchema, type M05DataStage } from "./commands";
import { M05_SOURCE_SLOT, m05Capability, validateM05Source, type M05Chain } from "./source";
export { M05_SOURCE_SLOT } from "./source";
import { checkCoverage, computeGates, hashM05 } from "./gates";
import { inheritanceProblems } from "./meaning";
import { semanticProblems } from "./semantic";
import { M05_DOCUMENT_KIND, M05_RECEIPT_KIND, renderStrategy, renderViews } from "./render";
import { M05_VERSION_HASH_ALGORITHM, makeM05Seal, sealedRecord, verifyM05Seal } from "./seal";

const now = () => new Date().toISOString();
/** Raw byte hash for rendered text and canonical payloads. */
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const NEXT_STAGE: Record<M05DataStage, Stage> = {
  inheritance: "semantic",
  semantic: "identity",
  identity: "audience",
  audience: "character",
  character: "expression",
  expression: "synthesis",
  synthesis: "packet",
  packet: "checks",
};

const STAGE_ORDER: Stage[] = [
  "eligibility",
  "inheritance",
  "semantic",
  "identity",
  "audience",
  "character",
  "expression",
  "synthesis",
  "packet",
  "checks",
  "review",
  "package",
  "client-decision",
  "sealed",
];

export interface M05ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(
    scope: StrategyScope,
    source: SourceRecord,
    transaction?: { query(text: string, values?: unknown[]): Promise<unknown> },
  ): Promise<void>;
  generate?: (request: {
    action: "draft" | "review";
    stage?: M05DataStage;
    session: M05Session;
    methodRelease: string;
  }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
    review?: { review: unknown; model: string; usage?: unknown };
  }>;
}

export function createM05Service(ports: M05ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: M05Session, source: SourceRecord | null): M05Chain {
    if (!source) throw new Error("Current sealed Foundation source is unavailable");
    const chain = validateM05Source(source);
    if (hashM05(chain) !== session.sourceHash)
      throw new Error("Upstream authority changed. Create a new brand strategy session.");
    return chain;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M05Session>(scope, id);
    if (!stored || stored.stage !== "m05") throw new Error("Brand strategy session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  function requireStage(session: M05Session, stage: Stage) {
    if (session.stage !== stage) throw new Error(`Session is at ${session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: M05Session, chain: M05Chain) => void | AtomicMutation<M05Session>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M05Session>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "m05") throw new Error("Not an M05 session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision)
          throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This strategy is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(M05_SOURCE_SLOT);
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
          sources: [
            { slot: M05_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash },
          ],
          outbox: [
            {
              kind: "m05.checkpoint",
              payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision },
            },
          ],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(scope: StrategyScope, chain: M05Chain): M05Session {
    const at = now();
    return Session.parse({
      module: "05",
      sessionId: randomUUID(),
      folder: scope.brandId,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      stage: "eligibility",
      status: "draft",
      route: chain.route.route,
      equivalentEvidence: "",
      sourceHash: hashM05(chain),
      sources: chain,
      capability: m05Capability(chain),
      confirmations: {},
      data: {},
      drafts: {},
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
      candidateHash: null,
      candidateVersionId: null,
      seal: null,
    });
  }

  function invalidateFrom(session: M05Session, stage: M05DataStage) {
    const index = STAGE_ORDER.indexOf(stage);
    for (const key of Object.keys(STAGE_SCHEMAS) as (keyof typeof STAGE_SCHEMAS)[]) {
      if (STAGE_ORDER.indexOf(key as Stage) >= index) {
        delete session.confirmations[key];
        if (key !== stage) delete session.data[key === "client-decision" ? "clientDecision" : key];
      }
    }
    delete session.data.checks;
    delete session.data.review;
    delete session.data.package;
    delete session.data.clientDecision;
    session.candidateHash = null;
    session.candidateVersionId = null;
    session.stage = stage;
    session.status = "revision-requested";
  }

  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M05 generation is not configured");
    const command = m05GenerationSchema.parse(raw);
    if (command.action !== "draft") throw new Error("Expected a draft command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M05_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, command.stage);
    const result = await ports.generate({
      action: "draft",
      stage: command.stage,
      session,
      methodRelease,
    });
    if (!result.draft) throw new Error("M05 draft provider returned no candidate");
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
    if (!ports.generate) throw new Error("M05 generation is not configured");
    const command = m05GenerationSchema.parse(raw);
    if (command.action !== "review") throw new Error("Expected a review command");
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M05_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    requireStage(session, "review");
    const result = await ports.generate({ action: "review", session, methodRelease });
    if (!result.review) throw new Error("M05 review provider returned no review");
    const parsed = result.review.review as StressReview;
    if (parsed.candidateHash !== session.candidateHash)
      throw new Error("The review covers a different candidate than the frozen one.");
    return mutate(scope, command, "gate-7-review", "generate", (current) => {
      current.data.review = { ...parsed, hashMatch: true };
      current.confirmations.review = {
        actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
        at: now(),
        decision: parsed.verdict,
        target: "review",
        revision: current.revision + 1,
        hash: hashM05(parsed),
        sourceHash: current.sourceHash,
      };
      if (parsed.verdict === "pass") {
        current.stage = "package";
        current.status = "candidate";
      }
    });
  }

  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M05Session>(
        scope,
        (sourceRecord) => {
          const chain = validateM05Source(sourceRecord);
          const session = initialSession(scope, chain);
          return { id: session.sessionId, stage: "m05", payload: session };
        },
        M05_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateM05Source(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M05_SOURCE_SLOT);
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
        if (!version) throw new Error("M05 immutable seal version is unavailable");
        const checked = verifyM05Seal({
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
        rendered: session.data.checks ? (session.data.checks as Checks).rendered : renderStrategy(session),
      };
    },
    draft,
    review,
    async save(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        requireStage(session, command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "confirm") throw new Error("Expected confirm command");
      return mutate(scope, command, "confirm", "approve", (session) => {
        requireStage(session, command.stage);
        const parsed = STAGE_SCHEMAS[command.stage].parse(command.payload);
        if (command.stage === "inheritance") {
          const problems = inheritanceProblems(parsed as never);
          if (problems.length) throw new Error(problems.join("\n"));
        }
        if (command.stage === "semantic") {
          const problems = semanticProblems(parsed as never);
          if (problems.length) throw new Error(problems.join("\n"));
        }
        session.data[command.stage] = parsed;
        delete session.drafts[command.stage];
        session.confirmations[command.stage] = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: "confirmed",
          target: command.stage,
          revision: session.revision + 1,
          hash: hashM05(parsed),
          sourceHash: session.sourceHash,
        };
        session.stage = NEXT_STAGE[command.stage];
        session.status = "draft";
      });
    },
    async revise(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        if (!session.confirmations[command.stage])
          throw new Error("There is no confirmed stage to revise");
        invalidateFrom(session, command.stage);
      });
    },
    async confirmEligibility(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "confirm-eligibility")
        throw new Error("Expected confirm-eligibility command");
      return mutate(scope, command, "confirm-eligibility", "approve", (session) => {
        requireStage(session, "eligibility");
        session.confirmations.eligibility = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: "confirmed",
          target: "eligibility",
          revision: session.revision + 1,
          hash: hashM05({ route: session.route, capability: session.capability }),
          sourceHash: session.sourceHash,
        };
        session.stage = "inheritance";
      });
    },
    async runChecks(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "run-checks") throw new Error("Expected run-checks command");
      return mutate(scope, command, "run-checks", "approve", (session) => {
        requireStage(session, "checks");
        const rendered = renderStrategy(session);
        const packet = session.data.packet as never;
        const coverage = checkCoverage(rendered, packet);
        const gates = computeGates(session);
        const allPass = gates.every((entry) => entry.result === "pass");
        const renderHash = sha256(rendered);
        const packetHash = hashM05(packet);
        const candidateHash = allPass ? sha256(`${renderHash}:${packetHash}`) : "";
        const checks: Checks = {
          gates,
          coverage,
          rendered,
          renderHash,
          packetHash,
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
          hash: hashM05(checks),
          sourceHash: session.sourceHash,
        };
        if (allPass) {
          session.candidateHash = candidateHash;
          session.status = "candidate";
          session.stage = "review";
        }
      });
    },
    async buildPackage(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "build-package") throw new Error("Expected build-package command");
      return mutate(scope, command, "build-package", "approve", (session) => {
        requireStage(session, "package");
        const checks = session.data.checks as Checks;
        if (session.candidateHash !== checks.candidateHash)
          throw new Error("The candidate changed after it was frozen.");
        const views = renderViews(checks.rendered);
        const pkg: Package = {
          views: views.map((view) => ({
            id: view.id as never,
            title: view.id.replace(/-/g, " "),
            path: `database:${session.sessionId}/${view.id}`,
            collection: "03-strategies",
            state: "rendered" as const,
            hash: hashM05(view.content),
          })),
          reconciliation: views.every((view) => view.content.trim().length > 0) ? "pass" : "fail",
          notes: "",
        };
        session.data.package = pkg;
        session.confirmations.package = {
          actor: { name: scope.actorId, role: "authenticated operator", authorityRef: scope.actorId },
          at: now(),
          decision: pkg.reconciliation,
          target: "package",
          revision: session.revision + 1,
          hash: hashM05(pkg),
          sourceHash: session.sourceHash,
        };
        if (pkg.reconciliation === "pass") session.stage = "client-decision";
      });
    },
    async decide(scope: StrategyScope, raw: unknown) {
      const command = m05CommandSchema.parse(raw);
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
          hash: hashM05(decision),
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
        const pkg = session.data.package as Package;
        if (!checks?.candidateHash) throw new Error("The candidate was never frozen.");
        if (session.candidateHash !== checks.candidateHash)
          throw new Error("The candidate changed after it was frozen.");
        if (!review || review.verdict !== "pass") throw new Error("Gate 7 review did not pass.");
        if (!pkg || pkg.reconciliation !== "pass")
          throw new Error("The package reconciliation did not pass.");
        const at = now();
        session.stage = "sealed";
        session.status = "sealed";
        const sealed = makeM05Seal(session, scope.actorId, at);
        session.seal = {
          versionId: sealed.receiptId,
          hash: sealed.sealHash,
          at: sealed.sealedAt,
          path: `database:${sealed.receiptId}`,
        };
        session.history.push({ action: "sealed", ...sealed });
        const rendered = checks.rendered;
        const renderedHash = sha256(rendered);
        const canonicalPayload = JSON.stringify({
          receipt: sealed,
          payload: sealedRecord(session),
          lineage: { parentSessionId: session.parentSessionId ?? null, successorReason: "" },
          source: { hash: session.sourceHash },
          rendered,
          renderedHash,
        });
        const receiptText = JSON.stringify(sealed);
        const views = renderViews(rendered).filter((view) => view.id !== "brand-strategy");
        return {
          payload: session,
          version: {
            id: sealed.receiptId,
            canonicalPayload,
            sealHash: sha256(canonicalPayload),
            hashAlgorithm: M05_VERSION_HASH_ALGORITHM,
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
            {
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: M05_DOCUMENT_KIND,
              content: rendered,
              hash: renderedHash,
            },
            {
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: M05_RECEIPT_KIND,
              content: receiptText,
              hash: sha256(receiptText),
            },
            ...views.map((view) => ({
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: view.id,
              content: view.content,
              hash: sha256(view.content),
            })),
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m05CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M05Session>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "m05") throw new Error("Not an M05 session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed")
            throw new Error("Only a sealed strategy can have a successor");
          const sourceRecord = await tx.getSource(M05_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Foundation source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateM05Source(sourceRecord);
          const next = initialSession(scope, chain);
          next.parentSessionId = previous.sessionId;
          next.history.push({
            action: "successor",
            parent: previous.sessionId,
            reason: command.reason,
            at: now(),
            invalidation:
              "All confirmations, packet resolutions, checks and reviews require fresh review; the historical version is preserved.",
          });
          return {
            successor: { id: next.sessionId, stage: "m05", payload: next },
            outbox: [
              {
                kind: "m05.checkpoint",
                payload: { sessionId: next.sessionId, stage: next.stage, revision: 1 },
              },
            ],
          };
        },
        command,
      );
    },
  };
}
