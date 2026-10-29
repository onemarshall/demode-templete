import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import { Decision, Session, STAGE_SCHEMAS, type CDSession, type Stage } from "./contracts";
import { cdCommandSchema, cdGenerationSchema, type CDDataStage } from "./commands";
import { CD_SOURCE_SLOT, cdCapability, validateCDSource, type CDChain } from "./source";
import {
  computeGates,
  decisionProblems,
  evidenceProblems,
  exclusionProblems,
  horizonProblems,
  inheritanceProblems,
  moveProblems,
  portfolioProblems,
  recommendationProblems,
  routeProblems,
  sequenceProblems,
} from "./rules";
import { CD_DOCUMENT_KIND, CD_HANDOFF_KIND, CD_RECEIPT_KIND, renderCD } from "./render";
import { CD_VERSION_HASH_ALGORITHM, makeCDHandoff, makeCDSeal, sealedRecord, verifyCDSeal } from "./seal";
import type { Checks } from "./contracts";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const NEXT_STAGE: Record<CDDataStage, Stage> = {
  inheritance: "horizon",
  horizon: "recommendation",
  recommendation: "route",
  route: "moves",
  moves: "sequence",
  sequence: "portfolio",
  portfolio: "exclusions",
  exclusions: "evidence",
  evidence: "decision",
};

const STAGE_ORDER: Stage[] = [
  "eligibility",
  "inheritance",
  "horizon",
  "recommendation",
  "route",
  "moves",
  "sequence",
  "portfolio",
  "exclusions",
  "evidence",
  "decision",
  "sealed",
];

const STAGE_CHECK: Record<CDDataStage, (value: never) => string[]> = {
  inheritance: inheritanceProblems,
  horizon: horizonProblems,
  recommendation: recommendationProblems,
  route: routeProblems,
  moves: moveProblems,
  sequence: sequenceProblems,
  portfolio: portfolioProblems,
  exclusions: exclusionProblems,
  evidence: evidenceProblems,
};

export interface CDServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(scope: StrategyScope, source: SourceRecord, transaction?: { query(text: string, values?: unknown[]): Promise<unknown> }): Promise<void>;
  generate?: (request: { action: "draft"; stage: CDDataStage; session: CDSession; methodRelease: string }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
  }>;
}

export function createCDService(ports: CDServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: CDSession, source: SourceRecord | null): CDChain {
    if (!source) throw new Error("Current sealed Visual Identity source is unavailable");
    const chain = validateCDSource(source);
    if (sha256(JSON.stringify(chain)) !== session.sourceHash)
      throw new Error("Upstream authority changed. Create a new commercial direction session.");
    return chain;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<CDSession>(scope, id);
    if (!stored || stored.stage !== "cd") throw new Error("Commercial direction session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  function requireStage(session: CDSession, stage: Stage) {
    if (session.stage !== stage) throw new Error(`Session is at ${session.stage}, not ${stage}`);
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: CDSession, chain: CDChain) => void | AtomicMutation<CDSession>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<CDSession>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "cd") throw new Error("Not a commercial direction session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This direction is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(CD_SOURCE_SLOT);
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
          sources: [{ slot: CD_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
          outbox: [{ kind: "cd.checkpoint", payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision } }],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(scope: StrategyScope, chain: CDChain): CDSession {
    const at = now();
    return Session.parse({
      module: "cd",
      sessionId: randomUUID(),
      folder: scope.brandId,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      stage: "eligibility",
      status: "draft",
      sourceHash: sha256(JSON.stringify(chain)),
      sources: chain,
      capability: cdCapability(chain),
      confirmations: {},
      data: {},
      drafts: {},
      history: [{ action: "created", actorId: scope.actorId, at, methodRelease }],
      candidateHash: null,
      seal: null,
    });
  }

  function invalidateFrom(session: CDSession, stage: CDDataStage) {
    const index = STAGE_ORDER.indexOf(stage);
    for (const key of Object.keys(STAGE_SCHEMAS) as (keyof typeof STAGE_SCHEMAS)[]) {
      if (STAGE_ORDER.indexOf(key as Stage) >= index) {
        delete session.confirmations[key];
        if (key !== stage) delete session.data[key];
      }
    }
    delete session.data.checks;
    delete session.data.decision;
    session.candidateHash = null;
    session.stage = stage;
    session.status = "draft";
  }

  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<CDSession>(
        scope,
        (sourceRecord) => {
          const chain = validateCDSource(sourceRecord);
          const session = initialSession(scope, chain);
          return { id: session.sessionId, stage: "cd", payload: session };
        },
        CD_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateCDSource(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, CD_SOURCE_SLOT);
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
        if (!version) throw new Error("Commercial Direction seal version is unavailable");
        const checked = verifyCDSeal({ sessionId: id, version, current: session, expectedSourceHash: session.sourceHash });
        sealCheck = { valid: checked.valid, reason: checked.reason };
      }
      return {
        session,
        checks: (session.data.checks as Checks | undefined) ?? null,
        gates: computeGates(session),
        upstreamCurrent,
        sealCheck,
        rendered: session.data.checks ? (session.data.checks as Checks).rendered : renderCD(session),
      };
    },
    async draft(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["generate"]);
      if (!ports.generate) throw new Error("Commercial Direction generation is not configured");
      const command = cdGenerationSchema.parse(raw);
      const { stored, session } = await loadRecord(scope, command.sessionId);
      if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
      const source = await repo.getSource(scope, CD_SOURCE_SLOT);
      if (source) await ports.validateSource(scope, source);
      verifyPinned(session, source);
      requireStage(session, command.stage);
      const result = await ports.generate({ action: "draft", stage: command.stage, session, methodRelease });
      if (!result.draft) throw new Error("Commercial Direction provider returned no candidate");
      const candidate = STAGE_SCHEMAS[command.stage].parse(result.draft.candidate);
      return mutate(scope, command, "model-draft", "generate", (current) => {
        current.drafts[command.stage] = { candidate, model: result.draft!.model, usage: result.draft!.usage ?? null, at: now(), methodRelease, sourceHash: current.sourceHash };
      });
    },
    async save(scope: StrategyScope, raw: unknown) {
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        requireStage(session, command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "confirm") throw new Error("Expected confirm command");
      return mutate(scope, command, "confirm", "approve", (session) => {
        requireStage(session, command.stage);
        const parsed = STAGE_SCHEMAS[command.stage].parse(command.payload);
        const problems = STAGE_CHECK[command.stage](parsed as never);
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
      });
    },
    async revise(scope: StrategyScope, raw: unknown) {
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        if (!session.confirmations[command.stage]) throw new Error("There is no confirmed stage to revise");
        invalidateFrom(session, command.stage);
      });
    },
    async confirmEligibility(scope: StrategyScope, raw: unknown) {
      const command = cdCommandSchema.parse(raw);
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
    /** The authorised decision owner records the decision; an accepting decision freezes and seals. */
    async decide(scope: StrategyScope, raw: unknown) {
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "decide") throw new Error("Expected decide command");
      return mutate(scope, command, "decision", "approve", (session) => {
        requireStage(session, "decision");
        const decision = Decision.parse(command.decision);
        const problems = decisionProblems(decision);
        if (problems.length) throw new Error(problems.join("\n"));
        session.data.decision = decision;
        session.confirmations.decision = {
          actor: decision.owner,
          at: now(),
          decision: decision.response,
          target: "decision",
          revision: session.revision + 1,
          hash: sha256(JSON.stringify(decision)),
          sourceHash: session.sourceHash,
        };

        if (decision.response === "return-upstream") {
          session.status = "revision-required";
          delete session.data.decision;
          delete session.confirmations.decision;
          return;
        }
        if (decision.response === "revise") {
          session.status = "revision-required";
          delete session.data.decision;
          delete session.confirmations.decision;
          session.stage = "recommendation";
          return;
        }

        const rendered = renderCD(session);
        const gates = computeGates(session);
        const allPass = gates.every((entry) => entry.result === "pass");
        const renderHash = sha256(rendered);
        const candidateHash = allPass ? renderHash : "";
        const checks: Checks = { gates, rendered, renderHash, candidateHash, frozenAt: allPass ? now() : "", ranAt: now() };
        session.data.checks = checks;
        if (!allPass) {
          const failed = gates.filter((entry) => entry.result !== "pass").map((entry) => entry.id);
          throw new Error(`The direction cannot be sealed: ${failed.join(", ")} did not pass.`);
        }

        const at = now();
        session.candidateHash = candidateHash;
        session.stage = "sealed";
        session.status = "sealed";
        const sealed = makeCDSeal(session, decision.owner.name, at);
        session.seal = { versionId: sealed.receiptId, hash: sealed.sealHash, at: sealed.sealedAt, path: `database:${sealed.receiptId}` };
        session.history.push({ action: "sealed", ...sealed });

        const handoff = makeCDHandoff(session, sealed);
        const canonicalPayload = JSON.stringify({
          receipt: sealed,
          payload: sealedRecord(session),
          lineage: { parentSessionId: session.parentSessionId ?? null },
          source: { hash: session.sourceHash },
          rendered,
          renderedHash: renderHash,
          handoff,
        });
        const receiptText = JSON.stringify(sealed);
        const handoffText = JSON.stringify(handoff);
        return {
          payload: session,
          version: { id: sealed.receiptId, canonicalPayload, sealHash: sha256(canonicalPayload), hashAlgorithm: CD_VERSION_HASH_ALGORITHM },
          approval: {
            versionId: sealed.receiptId,
            declaration: {
              actorId: decision.owner.name,
              receiptId: sealed.receiptId,
              sealHash: sealed.sealHash,
              candidateHash: sealed.candidateHash,
              decisionState: sealed.decisionState,
              executionPermission: sealed.executionPermission,
              m11Permission: handoff.downstream.m11Permission,
            },
          },
          documents: [
            { id: randomUUID(), versionId: sealed.receiptId, kind: CD_DOCUMENT_KIND, content: rendered, hash: renderHash },
            { id: randomUUID(), versionId: sealed.receiptId, kind: CD_RECEIPT_KIND, content: receiptText, hash: sha256(receiptText) },
            { id: randomUUID(), versionId: sealed.receiptId, kind: CD_HANDOFF_KIND, content: handoffText, hash: sha256(handoffText) },
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = cdCommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<CDSession>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "cd") throw new Error("Not a commercial direction session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed") throw new Error("Only a sealed direction can have a successor");
          const sourceRecord = await tx.getSource(CD_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed Visual Identity source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateCDSource(sourceRecord);
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
            successor: { id: next.sessionId, stage: "cd", payload: next },
            outbox: [{ kind: "cd.checkpoint", payload: { sessionId: next.sessionId, stage: next.stage, revision: 1 } }],
          };
        },
        command,
      );
    },
  };
}

export { CD_SOURCE_SLOT } from "./source";
