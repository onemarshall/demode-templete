import { createHash, randomUUID } from "node:crypto";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, SourceRecord, StrategyRepository } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  Assessment,
  ClientDecision,
  DATA_KEYS,
  FoundationDoc,
  Manifesto,
  Session,
  STAGES,
  STAGE_SCHEMAS,
  type Actor,
  type BFSource,
  type BFSession,
  type DataStage,
} from "./contracts";
import {
  bfCommandSchema,
  bfGenerationSchema,
  type BFCommand,
  type BFGenerationCommand,
} from "./commands";
import { BF_SOURCE_SLOT, validateBFSource } from "./source";
export { BF_SOURCE_SLOT } from "./source";
import {
  checksBF,
  computeGate,
  declarationProblems,
  guardStageMutation,
  hashBF,
  invalidateFrom,
  prefillAssessment,
  prefillSourceTrace,
  renderProblems,
  validateStage,
} from "./rules";
import { renderBF, BF_DECLARATION_KIND, BF_DOCUMENT_KIND, BF_RECEIPT_KIND } from "./render";
import { BF_VERSION_HASH_ALGORITHM, makeBFSeal, sealPayload, verifyBFSeal } from "./seal";

const now = () => new Date().toISOString();
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export interface BFServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(
    scope: StrategyScope,
    source: SourceRecord,
    transaction?: { query(text: string, values?: unknown[]): Promise<unknown> },
  ): Promise<void>;
  generate?: (request: {
    action: "draft" | "fresh-review" | "recheck";
    stage?: DataStage;
    session: BFSession;
    methodRelease: string;
  }) => Promise<{
    draft?: { candidate: unknown; model: string; usage?: unknown };
    review?: { findings: { classification: string; finding: string }[]; model: string; usage?: unknown };
    recheck?: { result: "pass" | "findings-remain"; note: string; model: string; usage?: unknown };
  }>;
}

const DRAFT_SCHEMAS = STAGE_SCHEMAS;

function normaliseDraft(stage: DataStage, candidate: unknown): unknown {
  if (stage === "manifesto") {
    const manifesto = Manifesto.parse(candidate);
    const traced = new Set(manifesto.sourceTrace.map((entry) => entry.item.trim().toLowerCase()));
    for (const item of prefillSourceTrace(manifesto))
      if (!traced.has(item.item.trim().toLowerCase()))
        manifesto.sourceTrace.push({ item: item.item, sourceRef: "Not yet traced" });
    return Manifesto.parse(manifesto);
  }
  if (stage === "document") {
    const doc = FoundationDoc.parse(candidate);
    for (const id of [
      "category",
      "transaction",
      "customer",
      "outcome",
      "delivery",
      "specificity",
      "consistency",
      "distinction",
      "evidence",
      "portfolio",
    ] as const)
      if (!doc.structuralTests.some((test) => test.id === id))
        doc.structuralTests.push({ id, result: "unassessed", basis: "Not yet assessed by a human." });
    return FoundationDoc.parse(doc);
  }
  return Assessment.parse(candidate);
}

export function createBFService(ports: BFServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;

  function verifyPinned(session: BFSession, source: SourceRecord | null): BFSource {
    if (!source) throw new Error("Current sealed viability source is unavailable");
    const chain = validateBFSource(source);
    if (hashBF(chain) !== session.sourceHash)
      throw new Error(
        "Upstream authority changed or is ineligible. Reconcile and create a new checked session.",
      );
    return chain;
  }

  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<BFSession>(scope, id);
    if (!stored || stored.stage !== "bf") throw new Error("Foundation session not found");
    const session = Session.parse(stored.payload);
    if (session.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, session };
  }

  async function mutate(
    scope: StrategyScope,
    command: { sessionId: string; expectedRevision: number; commandId: string },
    operation: string,
    required: "edit" | "approve" | "generate",
    update: (session: BFSession, chain: BFSource) => void | AtomicMutation<BFSession>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<BFSession>(
      scope,
      command.sessionId,
      command.expectedRevision,
      command.commandId,
      async (stored, tx) => {
        if (stored.stage !== "bf") throw new Error("Not a BF session");
        const session = Session.parse(stored.payload);
        if (session.revision !== stored.revision)
          throw new Error("Session revision integrity mismatch");
        if (session.seal) throw new Error("This version is sealed. Create a successor to revise it.");
        const sourceRecord = await tx.getSource(BF_SOURCE_SLOT);
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
            { slot: BF_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash },
          ],
          outbox: [
            {
              kind: "bf.checkpoint",
              payload: { sessionId: session.sessionId, stage: session.stage, revision: session.revision },
            },
          ],
        };
      },
      Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")),
    );
  }

  function initialSession(
    scope: StrategyScope,
    sourceRecord: SourceRecord,
    chain: BFSource,
  ): BFSession {
    const at = now();
    const sessionId = randomUUID();
    const session = Session.parse({
      module: "bf",
      sessionId,
      folder: scope.brandId,
      revision: 1,
      createdAt: at,
      updatedAt: at,
      stage: "assessment",
      status: "draft",
      sourceHash: hashBF(chain),
      sources: chain,
      confirmations: {},
      review: null,
      data: {},
      drafts: { assessment: prefillAssessment(chain) },
      history: [
        { action: "created", actorId: scope.actorId, at, methodRelease },
        {
          action: "assessment-prefilled",
          note: "Rows seeded from the pinned viability record; every state still needs a human call.",
          at,
        },
      ],
      gate: null,
      seal: null,
    });
    return session;
  }

  async function generation(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("BF generation is not configured");
    const command = bfGenerationSchema.parse(raw);
    const { stored, session } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, BF_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    verifyPinned(session, source);
    if (command.action === "draft") {
      const stage = command.stage;
      if (session.stage !== stage) throw new Error("Reload the current stage before drafting");
      const result = await ports.generate({
        action: "draft",
        stage,
        session,
        methodRelease,
      });
      if (!result.draft) throw new Error("BF draft provider returned no candidate");
      const candidate = normaliseDraft(stage, DRAFT_SCHEMAS[stage].parse(result.draft.candidate));
      return mutate(scope, command, "model-draft", "generate", (current) => {
        current.drafts[stage] = {
          candidate,
          model: result.draft!.model,
          usage: result.draft!.usage ?? null,
          at: now(),
          methodRelease,
          sourceHash: current.sourceHash,
        };
      });
    }
    if (command.action === "fresh-review") {
      if (session.stage !== "client-decision")
        throw new Error("Confirm the document before the fresh review.");
      const result = await ports.generate({ action: "fresh-review", session, methodRelease });
      if (!result.review) throw new Error("BF review provider returned no findings");
      const at = now();
      return mutate(scope, command, "fresh-review", "generate", (current) => {
        current.review = {
          model: result.review!.model,
          at,
          findings: result.review!.findings.map((finding) => ({
            id: randomUUID(),
            classification: finding.classification as never,
            finding: finding.finding,
            disposition: "pending" as const,
            note: "",
          })),
          recheck: null,
        };
      });
    }
    if (session.stage !== "client-decision" || !session.review) throw new Error("Nothing to recheck.");
    if (session.review.findings.some((finding) => finding.disposition === "pending"))
      throw new Error("Give every finding a disposition before the recheck.");
    const result = await ports.generate({ action: "recheck", session, methodRelease });
    if (!result.recheck) throw new Error("BF recheck provider returned no result");
    const at = now();
    return mutate(scope, command, "recheck", "generate", (current) => {
      if (!current.review) throw new Error("Nothing to recheck.");
      current.review.recheck = {
        at,
        result: result.recheck!.result,
        note: result.recheck!.note,
      };
    });
  }

  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<BFSession>(
        scope,
        (sourceRecord) => {
          const chain = validateBFSource(sourceRecord);
          const session = initialSession(scope, sourceRecord, chain);
          return { id: session.sessionId, stage: "bf", payload: session };
        },
        BF_SOURCE_SLOT,
        async (sourceRecord, tx) => {
          validateBFSource(sourceRecord);
          await ports.validateSource(scope, sourceRecord, tx);
        },
        { commandId: command.commandId, commandInput: command },
      );
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { session } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, BF_SOURCE_SLOT);
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
        if (!version) throw new Error("BF immutable seal version is unavailable");
        const checked = verifyBFSeal({
          sessionId: id,
          version,
          current: session,
          expectedSourceHash: session.sourceHash,
        });
        sealCheck = { valid: checked.valid, reason: checked.reason };
      }
      const doc = FoundationDoc.safeParse(session.data[DATA_KEYS.document]);
      const manifesto = Manifesto.safeParse(session.data[DATA_KEYS.manifesto]);
      return {
        session,
        checks: checksBF(session, upstreamCurrent),
        gate: session.gate ?? computeGate(session, upstreamCurrent),
        upstreamCurrent,
        sealCheck,
        review: session.review,
        rendered:
          doc.success && manifesto.success
            ? renderBF(
                doc.data,
                manifesto.data,
                session.data.approval ? ClientDecision.parse(session.data.approval) : null,
                session.revision,
              )
            : null,
      };
    },
    draft: generation,
    async save(scope: StrategyScope, raw: unknown) {
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "save") throw new Error("Expected save command");
      return mutate(scope, command, "save", "edit", (session) => {
        guardStageMutation(session, "save", command.stage);
        session.drafts[command.stage] = command.payload;
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "confirm") throw new Error("Expected confirm command");
      return mutate(scope, command, "confirm", "approve", (session) => {
        guardStageMutation(session, "confirm", command.stage);
        const parsed = validateStage(session, command.stage, command.payload);
        session.data[DATA_KEYS[command.stage]] = parsed;
        delete session.drafts[command.stage];
        session.confirmations[command.stage] = {
          actor: {
            name: scope.actorId,
            role: "authenticated operator",
            authorityRef: scope.actorId,
          },
          at: now(),
          decision: "confirmed",
          target: command.stage,
          revision: session.revision + 1,
          hash: hashBF(parsed),
          sourceHash: session.sourceHash,
        };
        if (command.stage === "assessment" && (parsed as Assessment).decision.state !== "passed") {
          session.stage = "assessment";
          session.status = "awaiting-input";
        } else {
          session.stage = STAGES[STAGES.indexOf(command.stage) + 1];
          session.status = "draft";
        }
      });
    },
    async revise(scope: StrategyScope, raw: unknown) {
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "revise") throw new Error("Expected revise command");
      return mutate(scope, command, "revise", "edit", (session) => {
        guardStageMutation(session, "revise", command.stage);
        invalidateFrom(session, command.stage);
      });
    },
    async resolveFinding(scope: StrategyScope, raw: unknown) {
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "resolve-finding") throw new Error("Expected resolve-finding command");
      return mutate(scope, command, "resolve-finding", "approve", (session) => {
        if (session.stage !== "client-decision" || !session.review)
          throw new Error("Run the fresh review before resolving findings.");
        const finding = session.review.findings.find((entry) => entry.id === command.findingId);
        if (!finding) throw new Error("Finding not found.");
        if (command.disposition === "returned-upstream" && !(command.note ?? "").trim())
          throw new Error("A returned finding needs the owning source named in the note.");
        finding.disposition = command.disposition;
        finding.note = command.note ?? "";
        session.review.recheck = null;
      });
    },
    async decide(scope: StrategyScope, raw: unknown) {
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "decide") throw new Error("Expected decide command");
      return mutate(scope, command, "client-decision", "approve", (session, chain) => {
        if (session.stage !== "client-decision") throw new Error("The client decision is out of order.");
        const decision = ClientDecision.parse(command.decision);
        const owner = (chain.entry.receipt as {
          decisionOwner?: { name?: string; authorityBasis?: string };
        }).decisionOwner;
        if (
          decision.approver.name !== owner?.name ||
          decision.approver.authorityRef !== owner?.authorityBasis
        )
          throw new Error(
            "The approver must be the named decision owner from the engagement authority.",
          );
        session.data.approval = decision;
        session.confirmations["client-decision"] = {
          actor: decision.approver,
          at: now(),
          decision: decision.response,
          target: "client-decision",
          revision: session.revision + 1,
          hash: hashBF(decision),
          sourceHash: session.sourceHash,
        };
        if (decision.response === "revision-requested") {
          if (!decision.revisionNote.trim())
            throw new Error("A revision request needs a plain note of what to change.");
          session.stage = "document";
          session.status = "revision-requested";
          delete session.data.approval;
          delete session.confirmations["client-decision"];
          delete session.confirmations.document;
          session.drafts.document = session.data.document;
          delete session.data.document;
          session.review = null;
          return;
        }
        if (decision.response === "source-disputed") {
          if (!decision.disputedField.trim() || !decision.returnOwner)
            throw new Error("A disputed source needs the field and its owning stage named.");
          session.status = "source-disputed";
          session.history.push({
            action: "source-disputed",
            disputedField: decision.disputedField,
            returnOwner: decision.returnOwner,
            at: now(),
          });
          return;
        }
        if (!decision.businessConfirmed || !decision.standConfirmed)
          throw new Error(
            "Approval needs both confirmations: this is our business, and this is where we stand.",
          );
        // Approval seals in the same act, as in the legacy module.
        const failed = checksBF(session, true).filter(
          (check) => !check.passed && check.id !== "route-authorisation",
        );
        if (failed.length)
          throw new Error(failed.map((check) => `${check.id}: ${check.detail}`).join("\n"));
        const assessment = Assessment.parse(session.data[DATA_KEYS.assessment]);
        const manifesto = Manifesto.parse(session.data[DATA_KEYS.manifesto]);
        const doc = FoundationDoc.parse(session.data[DATA_KEYS.document]);
        void assessment;
        const gate = computeGate(session, true);
        session.gate = gate;
        session.stage = "sealed";
        session.status = "sealed";
        const rendered = renderBF(doc, manifesto, decision, session.revision);
        const sealed = makeBFSeal(session, gate, rendered, scope.actorId);
        session.seal = {
          versionId: sealed.receiptId,
          hash: sealed.sealHash,
          at: sealed.sealedAt,
          path: `database:${sealed.receiptId}`,
        };
        session.history.push({ action: "sealed", ...sealed });
        const renderedHash = sha256(rendered);
        const canonicalPayload = JSON.stringify({
          receipt: sealed,
          payload: sealPayload(session, gate),
          lineage: {
            parentSessionId: session.parentSessionId ?? null,
            successorReason: "",
          },
          source: { hash: session.sourceHash },
          rendered,
          renderedHash,
        });
        const declaration = JSON.stringify({
          source_hash: sha256(JSON.stringify(manifesto)),
          manifesto: manifesto.manifesto,
          declarations: manifesto.declarations,
          spine: manifesto.spine,
          convictions: manifesto.convictions,
          implications: manifesto.implications,
          source_trace: manifesto.sourceTrace,
          bound_at: sealed.sealedAt,
        });
        const receiptText = JSON.stringify(sealed);
        return {
          payload: session,
          version: {
            id: sealed.receiptId,
            canonicalPayload,
            sealHash: sha256(canonicalPayload),
            hashAlgorithm: BF_VERSION_HASH_ALGORITHM,
          },
          approval: {
            versionId: sealed.receiptId,
            declaration: {
              actorId: scope.actorId,
              receiptId: sealed.receiptId,
              sealHash: sealed.sealHash,
              gate: sealed.gate,
            },
          },
          documents: [
            {
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: BF_DOCUMENT_KIND,
              content: rendered,
              hash: renderedHash,
            },
            {
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: BF_RECEIPT_KIND,
              content: receiptText,
              hash: sha256(receiptText),
            },
            {
              id: randomUUID(),
              versionId: sealed.receiptId,
              kind: BF_DECLARATION_KIND,
              content: declaration,
              hash: sha256(declaration),
            },
          ],
        };
      });
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = bfCommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<BFSession>(
        scope,
        command.sessionId,
        command.expectedRevision,
        command.commandId,
        async (current, tx) => {
          if (current.stage !== "bf") throw new Error("Not a BF session");
          const previous = Session.parse(current.payload);
          if (!previous.seal || previous.stage !== "sealed")
            throw new Error("Only a sealed foundation can have a successor");
          const sourceRecord = await tx.getSource(BF_SOURCE_SLOT);
          if (!sourceRecord) throw new Error("Current sealed viability source is unavailable");
          await ports.validateSource(scope, sourceRecord, tx);
          const chain = validateBFSource(sourceRecord);
          const next = initialSession(scope, sourceRecord, chain);
          next.parentSessionId = previous.sessionId;
          next.history.push({
            action: "successor",
            parent: previous.sessionId,
            reason: command.reason,
            at: now(),
            invalidation: "All confirmations require fresh review; historical source is preserved.",
          });
          return {
            successor: { id: next.sessionId, stage: "bf", payload: next },
            outbox: [
              {
                kind: "bf.checkpoint",
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

export type BFService = ReturnType<typeof createBFService>;
export { DATA_KEYS, STAGES, type DataStage };
export const BF_STAGE_ORDER = STAGES;
export type BFCommandAction = BFCommand["action"];
export type BFGenerationAction = BFGenerationCommand["action"];
