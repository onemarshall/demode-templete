import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { assertStrategyScope, type StrategyScope } from "../../access";
import type { AtomicMutation, StrategyRepository, SourceRecord } from "../../data/repository";
import { strategyMethodRelease } from "../../resources";
import {
  M02Session, ReconLog, CollectionRecord, M02SealReceipt, m02EvidenceBasisHash,
  type M02Session as SessionRecord, type ReconLog as ReconRecord,
} from "./session";
import { ResearchForm, type BuilderInputBody } from "./session";
import {
  Artifact, ArtifactStore, newArtifactId, gateEvidenceCheck, entanglementCheck, artifactById,
  type Artifact as ArtifactRecord,
} from "./evidence";
import {
  allowedOutcomes, assertEvidenceDispositionForOutcome, requireGate, type TerrainBody, type Gate1Body, type Gate2Body,
  type Gate3Body, type Gate4Body, type Gate5Body, type Gate6Body,
  Gate1Draft, Gate2Draft, Gate3Draft, Gate4Draft, Gate5Draft, Gate6Draft,
  type EvidenceReviewBody, type OutcomeBody,
} from "./gates";
import { m02CommandSchema, m02DraftCommandSchema, m02CollectCommandSchema, type M02Command, type M02DraftGate } from "./commands";
import { renderM02ClientDoc } from "./render";
import { makeM02Seal, verifyM02Seal } from "./seal";
import { validateM02Source, type M02Upstream } from "./source";

export const M02_SOURCE_SLOT = "m02-m01";

export const M02Record = z.object({
  revision: z.number().int().positive(),
  session: M02Session,
  recon: ReconLog,
  artifacts: ArtifactStore,
  collection: CollectionRecord,
  seal: z.unknown().nullable().default(null),
  sourceVersionId: z.string(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  drafts: z.record(z.string(), z.unknown()).default(() => ({})),
  parentSessionId: z.string().uuid().nullable().default(null),
  successorReason: z.string().default(""),
  history: z.array(z.object({ action: z.string(), actorId: z.string(), at: z.string(), methodRelease: z.string() })).default(() => []),
});
export type M02Record = z.infer<typeof M02Record>;
type M02MutationCommand = { sessionId: string; expectedRevision: number; commandId: string; action?: string; jobLease?: { jobId: string; fence: number } };

const now = () => new Date().toISOString();
const confirmation = (actorId: string, at: string) => ({ by: actorId, at });
function verifyPinned(record: M02Record, source: SourceRecord | null) {
  if (!source) throw new Error("Current sealed M01 source is unavailable");
  const current = validateM02Source(source);
  if (source.id !== record.sourceVersionId || source.hash !== record.sourceHash ||
      current.sessionId !== record.session.m01.sessionId || current.sealedAt !== record.session.m01.sealedAt ||
      current.outputsHash !== record.session.m01.outputsHash)
    throw new Error("M01 source authority changed — create a fresh M02 candidate");
  return current;
}

function initialRecord(scope: StrategyScope, sourceRecord: SourceRecord, source: M02Upstream, methodRelease: string): M02Record {
  const at = now(), id = randomUUID();
  const session = M02Session.parse({
    module: "02", sessionId: id, folder: scope.brandId, createdAt: at, updatedAt: at,
    stage: "setup", m01: { sessionId: source.sessionId, sealedAt: source.sealedAt, outputsHash: source.outputsHash },
    route: "full", routeStatus: "proposed", routeReason: "", research: {},
  });
  const recon = ReconLog.parse({ module: "02", sessionId: id, producedAt: at, updatedAt: at, m01Inputs: source.inputs });
  const collection = CollectionRecord.parse({ collectionId: randomUUID(), state: "not_started", updatedAt: at });
  return M02Record.parse({ revision: 1, session, recon, artifacts: { artifacts: [] }, collection, seal: null, drafts: {}, parentSessionId: null, successorReason: "",
    sourceVersionId: sourceRecord.id, sourceHash: sourceRecord.hash,
    history: [{ action: "created", actorId: scope.actorId, at, methodRelease }] });
}

function clearOutcome(r: M02Record) {
  r.recon.entanglement = { pass: null, problems: [] };
  r.recon.contrarianTrap = { flags: [], clear: null };
  r.recon.synthesis = { outcome: "pending", statement: "", acknowledgedRisks: [] };
  r.session.evidenceReview = null;
  r.session.progressionDecision = null;
  delete r.session.confirmations.outcome;
  delete r.session.confirmations.sealed;
}
function clearFromGate(r: M02Record, gate: "gate1" | "gate2" | "gate3" | "gate4" | "gate5" | "gate6") {
  const fresh = ReconLog.parse({ module: "02", sessionId: r.session.sessionId, producedAt: r.recon.producedAt, updatedAt: r.recon.updatedAt, m01Inputs: r.recon.m01Inputs });
  if (gate === "gate1") {
    r.recon.gate2 = fresh.gate2; r.recon.gate3 = { ...fresh.gate3, ownedAudit: r.recon.gate3.ownedAudit };
    r.recon.gate4 = fresh.gate4; r.recon.gate5 = fresh.gate5; r.recon.gate6 = fresh.gate6;
    for (const key of ["gate2", "gate3", "gate4", "gate5", "gate6"] as const) { delete r.session.confirmations[key]; delete r.drafts[key]; }
  } else if (gate === "gate2") {
    r.recon.gate3 = { ...fresh.gate3, ownedAudit: r.recon.gate3.ownedAudit }; r.recon.gate4 = fresh.gate4;
    r.recon.gate5 = fresh.gate5; r.recon.gate6 = fresh.gate6;
    for (const key of ["gate3", "gate4", "gate5", "gate6"] as const) { delete r.session.confirmations[key]; delete r.drafts[key]; }
  } else if (gate === "gate3") {
    r.recon.gate4 = fresh.gate4; r.recon.gate5 = fresh.gate5; r.recon.gate6 = fresh.gate6;
    for (const key of ["gate4", "gate5", "gate6"] as const) { delete r.session.confirmations[key]; delete r.drafts[key]; }
  } else if (gate === "gate4") {
    r.recon.gate5 = fresh.gate5; r.recon.gate6 = fresh.gate6;
    for (const key of ["gate5", "gate6"] as const) { delete r.session.confirmations[key]; delete r.drafts[key]; }
  } else if (gate === "gate5") {
    r.recon.gate6 = fresh.gate6; delete r.session.confirmations.gate6; delete r.drafts.gate6;
  }
  clearOutcome(r);
}

export interface M02ServicePorts {
  repository: StrategyRepository;
  methodRelease?: string;
  validateSource(scope: StrategyScope, source: SourceRecord, transaction?: { query(text: string, values?: unknown[]): Promise<unknown> }): Promise<void>;
  collect?: (request: {url:string;kind:"competitor"|"customer"|"market"|"owned";target:string;note?:string})=>Promise<{artifacts:Omit<ArtifactRecord,"id">[]}>;
  generate?: (request: { gate: M02DraftGate; state: unknown; methodRelease: string }) => Promise<{ candidate: unknown; model: string; usage?: unknown }>;
}

export function createM02Service(ports: M02ServicePorts) {
  const repo = ports.repository;
  const methodRelease = ports.methodRelease ?? strategyMethodRelease;
  async function loadRecord(scope: StrategyScope, id: string) {
    const stored = await repo.getSession<M02Record>(scope, id);
    if (!stored || stored.stage !== "m02") throw new Error("M02 session not found");
    const record = M02Record.parse(stored.payload);
    if (record.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
    return { stored, record };
  }
  async function mutate(
    scope: StrategyScope,
    command: M02MutationCommand,
    operation: string,
    required: "edit" | "approve" | "generate" = "edit",
    update: (record: M02Record, source: M02Upstream) => void | AtomicMutation<M02Record> | Promise<void | AtomicMutation<M02Record>>,
  ) {
    assertStrategyScope(scope, [required]);
    return repo.mutateSession<M02Record>(scope, command.sessionId, command.expectedRevision, command.commandId, async (stored, tx) => {
      if (stored.stage !== "m02") throw new Error("Not an M02 session");
      const record = M02Record.parse(stored.payload);
      if (record.revision !== stored.revision) throw new Error("Session revision integrity mismatch");
      if (record.session.stage === "sealed") throw new Error("This M02 version is sealed. Create a successor to revise it.");
      const sourceRecord = await tx.getSource(M02_SOURCE_SLOT);
      if (sourceRecord) await ports.validateSource(scope, sourceRecord, tx);
      const source = verifyPinned(record, sourceRecord);
      const at = now();
      if (command.jobLease) await tx.assertJobLease(command.jobLease.jobId, command.jobLease.fence);
      if (operation === "seal") {
        record.revision = stored.revision + 1;
        record.session.updatedAt = at;
        record.recon.updatedAt = at;
      }
      const result = await update(record, source);
      if (operation !== "seal") {
        record.revision = stored.revision + 1;
        record.session.updatedAt = at;
        record.recon.updatedAt = at;
        record.history.push({ action: operation, actorId: scope.actorId, at, methodRelease });
      } else record.history.push({ action: operation, actorId: scope.actorId, at, methodRelease });
      return {
        ...(result ?? { payload: record }), payload: M02Record.parse(record),
        sources: [{ slot: M02_SOURCE_SLOT, versionId: sourceRecord!.id, expectedHash: sourceRecord!.hash }],
        outbox: [{ kind: "m02.checkpoint", payload: { sessionId: record.session.sessionId, stage: record.session.stage, revision: record.revision } }],
      };
    }, Object.fromEntries(Object.entries(command).filter(([key]) => key !== "jobLease")));
  }
  function requireStage(record: M02Record, stage: SessionRecord["stage"]) {
    if (record.session.stage !== stage) throw new Error(`Session is at ${record.session.stage}, not ${stage}`);
  }
  function checkEvidence(record: M02Record) {
    const r = record.recon;
    const gate6Applicable = r.gate4.verdict === "pass";
    const entanglement = entanglementCheck(record.artifacts, {
      gate2: r.gate2.artifactRefs, gate3: r.gate3.artifactRefs, gate6a: r.gate6.a.artifactRefs,
    }, { gate2: true, gate3: true, gate6a: gate6Applicable });
    const evidence = gateEvidenceCheck(record.artifacts, {
      gate1: r.gate1.artifactRefs, gate2: r.gate2.artifactRefs, gate3: r.gate3.artifactRefs,
      gate4: r.gate4.artifactRefs, gate6a: r.gate6.a.artifactRefs,
    }, {
      gate1: r.gate1.verdict === "pass", gate2: r.gate2.verdict === "pass", gate3: r.gate3.verdict === "pass",
      gate4: r.gate4.verdict === "pass" || r.gate4.verdict === "fail",
      gate6a: gate6Applicable && ["pass", "fail"].includes(r.gate6.a.verdict),
    });
    return { entanglement, evidence };
  }
  async function draft(scope: StrategyScope, raw: unknown) {
    assertStrategyScope(scope, ["generate"]);
    if (!ports.generate) throw new Error("M02 generation is not configured");
    const command = m02DraftCommandSchema.parse(raw);
    const { stored, record } = await loadRecord(scope, command.sessionId);
    if (stored.revision !== command.expectedRevision) throw new Error("Revision conflict");
    const source = await repo.getSource(scope, M02_SOURCE_SLOT);
    if (source) await ports.validateSource(scope, source);
    const upstream = verifyPinned(record, source);
    if (command.gate === "setup" && record.session.stage !== "setup") throw new Error("Setup draft is only available during setup");
    if (["terrain", "gate1"].includes(command.gate) && record.session.stage !== "gates") throw new Error("Terrain and Gate 1 drafts require the gates stage");
    if (command.gate === "gate2") requireGate(record.recon, "gate1");
    if (command.gate === "gate3") requireGate(record.recon, "gate2");
    if (command.gate === "gate4") requireGate(record.recon, "gate3");
    if (command.gate === "gate5" && record.session.stage !== "risk") throw new Error("Gate 5 draft requires the risk stage");
    if (command.gate === "gate6" && (record.session.stage !== "outcome" || record.recon.gate4.verdict !== "pass")) throw new Error("Gate 6 draft requires a passed Gate 4");
    const state = { ...record, upstream: upstream.inputs };
    const result = await ports.generate({ gate: command.gate, state, methodRelease });
    const schemas = {
      setup: ResearchForm,
      terrain: z.object({ tam: z.string().default(""), trajectory: z.enum(["growing", "stable", "declining"]).nullable().default(null), tailwind: z.string().default(""), diagnosis: z.enum(["cyclical", "structural-positive", "structural-negative", "ambiguous-needs-evidence"]), diagnosisEvidence: z.string().default(""), artifactRefs: z.array(z.string()).default(() => []) }),
      gate1: Gate1Draft, gate2: Gate2Draft, gate3: Gate3Draft, gate4: Gate4Draft, gate5: Gate5Draft, gate6: Gate6Draft,
    };
    const candidate = schemas[command.gate].parse(result.candidate);
    const saved = await mutate(scope, command, "draft", "generate", (current) => {
      current.drafts[command.gate] = { candidate, model: result.model, usage: result.usage, at: now(), methodRelease,
        sourceVersionId: current.sourceVersionId, sourceHash: current.sourceHash };
    });
    // Drafts are untrusted candidates. The user must submit a separate typed approval command.
    return { candidate, model: result.model, usage: result.usage, record: saved.payload };
  }
  return {
    async create(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m02CommandSchema.parse(raw);
      if (command.action !== "create") throw new Error("Expected create command");
      return repo.createSessionWithSource<M02Record>(scope, (sourceRecord) => {
        const upstream = validateM02Source(sourceRecord);
        const record = initialRecord(scope, sourceRecord, upstream, methodRelease);
        return { id: record.session.sessionId, stage: "m02", payload: record };
      }, M02_SOURCE_SLOT, async (sourceRecord, tx) => {
        validateM02Source(sourceRecord);
        await ports.validateSource(scope, sourceRecord, tx);
      }, { commandId: command.commandId, commandInput: command });
    },
    async load(scope: StrategyScope, id: string) {
      assertStrategyScope(scope, ["read"]);
      const { record } = await loadRecord(scope, id);
      const source = await repo.getSource(scope, M02_SOURCE_SLOT);
      let current = false;
      try { if (source) await ports.validateSource(scope, source); verifyPinned(record, source); current = true; } catch { current = false; }
      let sealVerification: { valid: boolean; reason: string } | null = null;
      if (record.session.stage === "sealed") {
        const receipt = M02SealReceipt.parse(record.seal);
        const version = await repo.getVersion(scope, receipt.receiptId);
        if (!version) throw new Error("M02 immutable seal version is unavailable");
        const checked = verifyM02Seal({ sessionId: id, version, current: record, expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash } });
        if (!checked.valid) throw new Error(checked.reason);
        sealVerification = { valid: true, reason: checked.reason };
      }
      return { ...record, upstreamCurrent: current, sealVerification };
    },
    draft,
    async collectUrl(scope:StrategyScope,raw:unknown) {
      assertStrategyScope(scope,["generate"]);
      if(!ports.collect)throw new Error("Public URL collection is unavailable");
      const command=m02CollectCommandSchema.parse(raw);
      const {stored,record}=await loadRecord(scope,command.sessionId);
      if(stored.revision!==command.expectedRevision)throw new Error("Revision conflict");
      requireStage(record,"gather");
      const source=await repo.getSource(scope,M02_SOURCE_SLOT);
      if(source)await ports.validateSource(scope,source);verifyPinned(record,source);
      const result=await ports.collect(command);
      return mutate(scope,command,"collect-url","generate",current=>{
        requireStage(current,"gather");
        for(const captured of result.artifacts)current.artifacts.artifacts.push(Artifact.parse({...captured,id:newArtifactId(),kind:command.kind,target:command.target,channel:"url_fetch"}));
        const at=now();current.collection.updatedAt=at;
        current.collection.events.push({id:randomUUID(),at,event:"url_collection_recorded",detail:command.url});
      });
    },
    async addArtifact(scope: StrategyScope, raw: unknown) {
      const command = m02CommandSchema.parse(raw);
      if (command.action !== "add-artifact") throw new Error("Expected add-artifact command");
      let added!: ArtifactRecord;
      const result = await mutate(scope, command, "add-artifact", "edit", (record) => {
        requireStage(record, "gather");
        if (command.artifact.kind === "sector_synthesis") throw new Error("Sector synthesis can only be inherited from the approved corpus");
        if (!command.artifact.source.trim()) throw new Error("Name the evidence source");
        if (command.artifact.status === "gathered" && !command.artifact.verbatim.trim()) throw new Error("Gathered evidence must retain its verbatim source text");
        if ((command.artifact.kind === "owned" || command.artifact.access !== "public") && (!command.artifact.consent.trim() || command.artifact.consent === "public artifact"))
          throw new Error("Internal or owned evidence needs its permission basis recorded");
        added = Artifact.parse({ ...command.artifact, id: newArtifactId() });
        record.artifacts.artifacts.push(added);
        const at = now(); record.collection.updatedAt = at; record.collection.events.push({ id: randomUUID(), at, event: "artifact_added", detail: added.id });
      });
      return { record: result.payload, artifact: added };
    },
    async deleteArtifact(scope: StrategyScope, raw: unknown) {
      const command = m02CommandSchema.parse(raw);
      if (command.action !== "delete-artifact") throw new Error("Expected delete-artifact command");
      return mutate(scope, command, "delete-artifact", "edit", (record) => {
        requireStage(record, "gather");
        record.artifacts.artifacts = record.artifacts.artifacts.filter((a) => a.id !== command.artifactId);
      });
    },
    async confirm(scope: StrategyScope, raw: unknown) {
      const command = m02CommandSchema.parse(raw);
      const actor = scope.actorId;
      switch (command.action) {
        case "confirm-setup": return mutate(scope, command, "confirm-setup", "approve", (r) => {
          requireStage(r, "setup");
          if(command.route && command.route!=="full")throw new Error("This route requires an approved locked-source adoption record before it can be used.");
          const at = now(); r.session.research.confirmed = command.research; r.session.route = command.route ?? r.session.route;
          r.session.routeReason = command.routeReason; r.session.routeStatus = "confirmed"; r.session.stage = "gather";
          r.session.confirmations.setup = confirmation(actor, at);
          r.collection.state = "in_progress"; r.collection.cohort = command.research.cohort; r.collection.geography = command.research.geography;
          r.collection.openedAt = at; r.collection.expected = [
            ...command.research.competitors.map((c) => ({ kind: "competitor" as const, target: c.name, detail: c.url ?? "" })),
            { kind: "market" as const, target: command.research.geography, detail: "TAM + trajectory + tailwind" },
            { kind: "customer" as const, target: command.research.cohort, detail: `review platforms: ${command.research.platforms.join(", ") || "to be identified"}` },
          ];
          r.collection.updatedAt = at;
          r.collection.events.push({ id: randomUUID(), at, event: "collection_opened", detail: `confirmed by ${actor}` });
        });
        case "finish-gather": return mutate(scope, command, "finish-gather", "edit", (r) => {
          requireStage(r, "gather"); r.session.stage = "artefact-review"; r.collection.reviewTrigger = "artefact log review at artefact-review stage"; r.collection.updatedAt = now();
        });
        case "review-artifacts": return mutate(scope, command, "review-artifacts", "approve", (r) => {
          requireStage(r, "artefact-review"); const at = now();
          const missing = r.collection.expected.filter((expected) => !r.artifacts.artifacts.some((artifact) => artifact.kind === expected.kind && artifact.target.toLowerCase() === expected.target.toLowerCase() && artifact.status === "gathered"));
          r.collection.state = missing.length ? "partial" : "completed"; r.collection.updatedAt = at;
          r.collection.events.push({ id: randomUUID(), at, event: "artifact_review_confirmed", detail: missing.length ? `missing: ${missing.map((item) => `${item.kind}: ${item.target}`).join("; ")}` : "all expected items gathered" });
          r.session.confirmations["artefact-review"] = confirmation(actor, at); r.session.stage = "builder-inputs";
        });
        case "builder-inputs": return mutate(scope, command, "builder-inputs", "approve", (r) => {
          requireStage(r, "builder-inputs");
          const b = command.inputs as BuilderInputBody;
          for (const [key, value] of Object.entries({ p1: b.p1, p2: b.p2, p3: b.p3 }))
            if (value.verdict === "pass" && !value.finding.trim()) throw new Error(`${key.toUpperCase()}: record the evidence for the pass`);
          if (b.p2.verdict === "pass" && (!b.p2.segment.trim() || !b.p2.standingStrength))
            throw new Error("P2 needs a named segment and a standing-strength read to pass");
          r.recon.preconditions.p1 = { ...r.recon.preconditions.p1, ...b.p1 };
          r.recon.preconditions.p2 = { ...r.recon.preconditions.p2, ...b.p2, standingStrength: b.p2.standingStrength ?? "pending" };
          r.recon.preconditions.p3 = { ...r.recon.preconditions.p3, ...b.p3 };
          r.recon.secondVoice = { ...b.secondVoice, foundersProblem: b.foundersProblem };
          r.recon.gate3.ownedAudit = b.ownedAudit;
          const at = now(); for (const k of ["p1", "p2", "p3"] as const) { r.recon.preconditions[k].assessedAt = at; r.recon.preconditions[k].confirmedBy = actor; }
          r.session.confirmations["builder-inputs"] = confirmation(actor, at);
          if ([b.p1.verdict, b.p2.verdict, b.p3.verdict].every((v) => v === "pass")) r.session.stage = "gates";
        });
        case "confirm-gate1": return mutate(scope, command, "confirm-gate1", "approve", (r) => {
          requireStage(r, "gates"); const t = command.terrain as TerrainBody, g = command.gate as Gate1Body;
          clearFromGate(r, "gate1");
          const competitors = r.artifacts.artifacts.filter((a) => a.kind === "competitor" && a.status === "gathered");
          if (g.verdict === "pass" && !competitors.length) throw new Error("Gate 1 cannot pass without gathered competitor evidence");
          if (t.diagnosis !== "ambiguous-needs-evidence" && !t.artifactRefs.length) throw new Error("A terrain conclusion needs cited market evidence, or an explicit ambiguous-needs-evidence diagnosis");
          for (const ref of t.artifactRefs) {
            const item = artifactById(r.artifacts, ref);
            if (!item || item.status !== "gathered" || item.kind !== "market") throw new Error(`Terrain citation ${ref} must be gathered market evidence`);
          }
          const at = now(); r.recon.terrain = { tam: t.tam, trajectory: t.trajectory ?? "pending", tailwind: t.tailwind, diagnosis: t.diagnosis, diagnosisEvidence: t.diagnosisEvidence, artifactRefs: t.artifactRefs };
          r.recon.gate1 = { ...r.recon.gate1, verdict: g.verdict, finding: g.finding, assessedAt: at, confirmedBy: actor, decodes: g.decodes.map((d) => ({ ...d,
            artifactRefs: competitors.filter((a) => a.target.toLowerCase().includes(d.competitor.toLowerCase()) || d.competitor.toLowerCase().includes(a.target.toLowerCase())).map((a) => a.id) })),
            artifactRefs: [], descriptiveDefault: g.descriptiveDefault, cohort: g.cohort, concentration: g.concentration };
          r.recon.gate1.artifactRefs = [...new Set(r.recon.gate1.decodes.flatMap((d) => d.artifactRefs))];
          r.session.confirmations.gate1 = confirmation(actor, at);
        });
        case "confirm-gate2": return mutate(scope, command, "confirm-gate2", "approve", (r) => {
          requireStage(r, "gates"); requireGate(r.recon, "gate1"); const g = command.gate as Gate2Body;
          if (g.verdict === "pass" && !g.artifactRefs.length) throw new Error("Gate 2 cannot pass without cited artifacts");
          clearFromGate(r, "gate2");
          const at = now(); Object.assign(r.recon.gate2, g, { assessedAt: at, confirmedBy: actor }); r.session.confirmations.gate2 = confirmation(actor, at);
        });
        case "confirm-gate3": return mutate(scope, command, "confirm-gate3", "approve", (r) => {
          requireStage(r, "gates"); requireGate(r.recon, "gate2"); const g = command.gate as Gate3Body;
          if (g.verdict === "pass" && !g.artifactRefs.length) throw new Error("Gate 3 cannot pass without cited artifacts");
          clearFromGate(r, "gate3");
          const at = now(); r.recon.gate3 = { ...r.recon.gate3, ...g, assessedAt: at, confirmedBy: actor,
            painProfile: { trigger: g.trigger, hack: g.hack, pain: g.pain, limitingBelief: g.limitingBelief, traceToDefault: g.traceToDefault } };
          r.session.confirmations.gate3 = confirmation(actor, at);
        });
        case "confirm-gate4": return mutate(scope, command, "confirm-gate4", "approve", (r) => {
          requireStage(r, "gates"); requireGate(r.recon, "gate3"); const g = command.gate as Gate4Body, at = now();
          clearFromGate(r, "gate4");
          Object.assign(r.recon.gate4, g, { assessedAt: at, confirmedBy: actor }); r.session.confirmations.gate4 = confirmation(actor, at); r.session.stage = "risk";
        });
        case "confirm-gate5": return mutate(scope, command, "confirm-gate5", "approve", (r) => {
          requireStage(r, "risk"); const g = command.gate as Gate5Body, at = now();
          clearFromGate(r, "gate5");
          const rows = new Map(g.risks.map((x) => [x.pattern, x]));
          if (rows.size !== 4 || ["r1", "r2", "r3", "r4"].some((x) => !rows.has(x as never))) throw new Error("All four risk patterns need a read");
          r.recon.gate5.risks = g.risks.map((x) => {
            if (x.state === "present" && !x.mitigationRouting) throw new Error(`${x.pattern} needs a mitigation routing`);
            if (x.state === "present" && !x.declined && !x.acknowledgmentLine.trim()) throw new Error(`${x.pattern} needs a signed acknowledgment`);
            if (x.state === "present" && x.declined && !x.dispute.trim()) throw new Error(`${x.pattern} dispute must be recorded`);
            return { pattern: x.pattern, state: x.state, evidence: x.evidence, severity: x.state === "present" ? x.severity : null,
              mitigationRouting: x.state === "present" ? x.mitigationRouting : null,
              acknowledgment: x.state !== "present" ? { line: "", signedBy: null, signedAt: null, declined: false, dispute: "" } : x.declined
                ? { line: x.acknowledgmentLine, signedBy: null, signedAt: null, declined: true, dispute: x.dispute }
                : { line: x.acknowledgmentLine, signedBy: actor, signedAt: at, declined: false, dispute: "" } };
          });
          const r2 = r.recon.gate5.risks.find((x) => x.pattern === "r2");
          if ((r.recon.terrain.diagnosis === "structural-negative" || r.recon.terrain.trajectory === "declining") && r2?.state === "absent") r2.state = "unclear";
          r.session.confirmations.gate5 = confirmation(actor, at); r.session.stage = r.recon.gate4.verdict === "pass" ? "outcome" : "outcome";
        });
        case "confirm-gate6": return mutate(scope, command, "confirm-gate6", "approve", (r) => {
          requireStage(r, "outcome"); requireGate(r.recon, "gate4"); const g = command.gate as Gate6Body;
          clearFromGate(r, "gate6");
          if (g.standsWithoutTruth && g.verdictB === "pass") throw new Error("Gate 6b cannot pass when the vacuum stands without the Hidden Truth");
          const at = now(); r.recon.gate6 = { a: { ...r.recon.gate6.a, verdict: g.verdictA, artifactRefs: g.artifactRefs, finding: g.finding, assessedAt: at, confirmedBy: actor, implication: g.implication },
            b: { verdict: g.verdictB, traceSentence: g.traceSentence, standsWithoutTruth: g.standsWithoutTruth } };
          r.session.confirmations.gate6 = confirmation(actor, at);
        });
        case "evidence-review": return mutate(scope, command, "evidence-review", "approve", (r) => {
          requireStage(r, "outcome"); if (r.recon.gate4.verdict === "pass" && r.recon.gate6.a.verdict === "pending") throw new Error("Complete Gate 6 before evidence review");
          const checks = checkEvidence(r), basisHash = m02EvidenceBasisHash(r.recon, r.artifacts, r.collection), review = command.review as Omit<EvidenceReviewBody, "confirmedBy">;
          if (review.disposition === "sufficient_for_provisional" && (!checks.entanglement.pass || !checks.evidence.pass)) throw new Error("Evidence checks must pass before marking sufficient");
          r.session.evidenceReview = { receiptId: randomUUID(), by: actor, at: now(), disposition: review.disposition, rationale: review.rationale, basisHash,
            entanglement: checks.entanglement, evidenceProblems: checks.evidence.problems };
          r.session.progressionDecision = null;
        });
        case "outcome": return mutate(scope, command, "outcome", "approve", (r) => {
          requireStage(r, "outcome"); const g = command.outcome as OutcomeBody;
          if (!r.session.evidenceReview) throw new Error("Record the evidence judgement separately before choosing progression");
          const checks = checkEvidence(r), basisHash = m02EvidenceBasisHash(r.recon, r.artifacts, r.collection);
          if (!checks.evidence.pass) throw new Error(`Evidence checks failed: ${checks.evidence.problems.join("; ")}`);
          if (r.session.evidenceReview.basisHash !== basisHash) throw new Error("Evidence changed after review; review it again");
          if (g.contrarianFlags.length) throw new Error("Resolve the contrarian-trap cautions before recording an outcome");
          assertEvidenceDispositionForOutcome(g.outcome, r.session.evidenceReview.disposition);
          r.recon.entanglement = checks.entanglement;
          const allowed = allowedOutcomes(r.recon, r.collection.state);
          if (allowed.blocked || !allowed.options.some((x) => x.outcome === g.outcome)) throw new Error(allowed.blocked ?? "Outcome is not permitted by recorded gates");
          r.recon.contrarianTrap = { flags: g.contrarianFlags, clear: g.contrarianFlags.length === 0 };
          r.recon.synthesis = { outcome: g.outcome, statement: g.statement, acknowledgedRisks: r.recon.gate5.risks.filter((x) => x.state === "present").map((x) => `${x.pattern} (${x.severity ?? "unrecorded"} → ${x.mitigationRouting ?? "unrouted"})`) };
          r.recon.state = { ...r.recon.state, runtime: g.outcome, evidenceState: r.collection.state === "completed" ? "complete" : "partial", relianceScope: g.outcome === "provisional_a" ? "Module 03 hypothesis work only" : g.outcome === "validated_a" ? "Module 03 reliance as scoped — does not authorise Module 05" : "Return route only — no Module 03 construction handoff" };
          r.session.progressionDecision = { receiptId: randomUUID(), by: actor, at: now(), outcome: g.outcome as "provisional_a" | "outcome_b" | "outcome_c", statement: g.statement, basisHash, evidenceReceiptId: r.session.evidenceReview.receiptId };
          r.session.confirmations.outcome = confirmation(actor, now()); r.session.stage = "judgements";
        });
        case "seal": return mutate(scope, command, "seal", "approve", (r) => {
          requireStage(r, "judgements"); const checks = checkEvidence(r), basisHash = m02EvidenceBasisHash(r.recon, r.artifacts, r.collection);
          if (!r.session.evidenceReview || !r.session.progressionDecision) throw new Error("Both evidence and progression judgements are required");
          if (!checks.entanglement.pass || !checks.evidence.pass) throw new Error("M02 source checks failed before seal");
          if (r.session.evidenceReview.basisHash !== basisHash || r.session.progressionDecision.basisHash !== basisHash || r.session.progressionDecision.evidenceReceiptId !== r.session.evidenceReview.receiptId) throw new Error("Judgement basis changed before seal");
          const options = allowedOutcomes(r.recon, r.collection.state);
          if (options.blocked || !options.options.some((x) => x.outcome === r.recon.synthesis.outcome)) throw new Error(options.blocked ?? "Recorded outcome is no longer permitted");
          assertEvidenceDispositionForOutcome(r.recon.synthesis.outcome, r.session.evidenceReview.disposition);
          const at = now(); r.recon.state = { ...r.recon.state, versionState: "sealed", gateState: "closed", approvalState: "approved" };
          r.session.stage = "sealed"; r.session.confirmations.sealed = confirmation(actor, at);
          const sealed = makeM02Seal(r, actor, at); r.seal = sealed;
          const rendered = renderM02ClientDoc(r.session, r.recon, r.collection, r.artifacts);
          const snapshots = { session: structuredClone(r.session), recon: structuredClone(r.recon), artifacts: structuredClone(r.artifacts), collection: structuredClone(r.collection) };
          const renderedHash = createHash("sha256").update(rendered).digest("hex");
          const canonicalPayload = JSON.stringify({ receipt: sealed, snapshots,
            lineage: { parentSessionId: r.parentSessionId, successorReason: r.successorReason },
            source: { versionId: r.sourceVersionId, hash: r.sourceHash }, rendered, renderedHash });
          const versionHash = createHash("sha256").update(canonicalPayload).digest("hex");
          const receiptText = JSON.stringify(sealed);
          return { payload: r, version: { id: sealed.receiptId, canonicalPayload, sealHash: versionHash, hashAlgorithm: "sha256-json-stringify-v1" },
            approval: { versionId: sealed.receiptId, declaration: { actorId: scope.actorId, receiptId: sealed.receiptId, sealHash: sealed.sealHash, outcome: sealed.outcome } },
            documents: [
              { id: randomUUID(), versionId: sealed.receiptId, kind: "market-reality", content: rendered, hash: createHash("sha256").update(rendered).digest("hex") },
              { id: randomUUID(), versionId: sealed.receiptId, kind: "receipt", content: receiptText, hash: createHash("sha256").update(receiptText).digest("hex") },
            ] };
        });
        case "revise": return mutate(scope, command, "revise", "approve", (r) => {
          const order = ["setup", "gather", "artefact-review", "builder-inputs", "gates", "risk", "outcome", "judgements"];
          const current = order.indexOf(r.session.stage), target = order.indexOf(command.from);
          if (current < target) throw new Error(`Cannot revise ${command.from} before reaching that stage`);
          const old = r.recon;
          const fresh = ReconLog.parse({ module: "02", sessionId: r.session.sessionId, producedAt: old.producedAt, updatedAt: now(), m01Inputs: old.m01Inputs });
          if (["gates", "risk", "outcome"].includes(command.from)) {
            fresh.preconditions = structuredClone(old.preconditions);
            fresh.secondVoice = structuredClone(old.secondVoice);
            fresh.gate3.ownedAudit = structuredClone(old.gate3.ownedAudit);
          }
          if (["risk", "outcome"].includes(command.from)) {
            fresh.terrain = structuredClone(old.terrain); fresh.gate1 = structuredClone(old.gate1);
            fresh.gate2 = structuredClone(old.gate2); fresh.gate3 = structuredClone(old.gate3); fresh.gate4 = structuredClone(old.gate4);
          }
          if (command.from === "outcome") {
            fresh.terrain = structuredClone(old.terrain); fresh.gate1 = structuredClone(old.gate1);
            fresh.gate2 = structuredClone(old.gate2); fresh.gate3 = structuredClone(old.gate3); fresh.gate4 = structuredClone(old.gate4);
            fresh.gate5 = structuredClone(old.gate5);
          }
          r.recon = fresh; r.session.evidenceReview = null; r.session.progressionDecision = null;
          r.session.stage = command.from;
          const clear = command.from === "gather" ? ["artefact-review", "builder-inputs", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "outcome"]
            : command.from === "builder-inputs" ? ["builder-inputs", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "outcome"]
            : command.from === "gates" ? ["gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "outcome"]
            : command.from === "risk" ? ["gate5", "gate6", "outcome"] : ["gate6", "outcome"];
          for (const key of clear) delete r.session.confirmations[key];
          const clearDrafts = command.from === "gather" ? ["terrain", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6"]
            : command.from === "builder-inputs" || command.from === "gates" ? ["terrain", "gate1", "gate2", "gate3", "gate4", "gate5", "gate6"]
            : command.from === "risk" ? ["gate5", "gate6"] : ["gate6"];
          for (const key of clearDrafts) delete r.drafts[key];
          if (command.from === "gather") {
            r.collection.state = "resumed"; r.collection.updatedAt = now(); r.collection.events.push({ id: randomUUID(), at: now(), event: "collection_resumed", detail: command.reason });
          }
          r.history.push({ action: `revision-request:${command.from}:${command.reason}`, actorId: actor, at: now(), methodRelease });
        });
        case "successor": throw new Error("Use successor() to fork a sealed M02 record");
        default: throw new Error("Command is not a confirmation action");
      }
    },
    async successor(scope: StrategyScope, raw: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const command = m02CommandSchema.parse(raw);
      if (command.action !== "successor") throw new Error("Expected successor command");
      return repo.forkSession<M02Record>(scope, command.sessionId, command.expectedRevision, command.commandId, async (current, tx) => {
        if (current.stage !== "m02") throw new Error("Not an M02 session");
        const previous = M02Record.parse(current.payload);
        if (!previous.seal || previous.session.stage !== "sealed") throw new Error("Only a sealed M02 record can have a successor");
        const sourceRecord = await tx.getSource(M02_SOURCE_SLOT);
        if (!sourceRecord) throw new Error("Current sealed M01 source is unavailable");
        await ports.validateSource(scope, sourceRecord, tx);
        const upstream = validateM02Source(sourceRecord);
        const successor = initialRecord(scope, sourceRecord, upstream, methodRelease);
        successor.session.research.draft = previous.session.research.confirmed ?? previous.session.research.draft;
        successor.session.route = previous.session.route;
        successor.session.routeReason = command.reason;
        successor.parentSessionId = previous.session.sessionId;
        successor.successorReason = command.reason;
        successor.history.push({ action: "successor", actorId: scope.actorId, at: now(), methodRelease });
        successor.history.push({ action: `successor-reason:${command.reason}`, actorId: scope.actorId, at: now(), methodRelease });
        return {
          successor: { id: successor.session.sessionId, stage: "m02", payload: successor },
          outbox: [{ kind: "m02.checkpoint", payload: { sessionId: successor.session.sessionId, stage: successor.session.stage, revision: 1 } }],
        };
      }, command);
    },
  };
}
