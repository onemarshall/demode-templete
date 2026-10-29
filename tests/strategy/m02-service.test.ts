import { test, expect } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM02Service, M02_SOURCE_SLOT } from "../../src/lib/modules/strategy/server/stages/m02/service";
import { validateM02Source } from "../../src/lib/modules/strategy/server/stages/m02/source";
import { verifyM02Seal } from "../../src/lib/modules/strategy/server/stages/m02/seal";
import { assertEvidenceDispositionForOutcome, allowedOutcomes } from "../../src/lib/modules/strategy/server/stages/m02/gates";
import { ReconLog } from "../../src/lib/modules/strategy/server/stages/m02/session";
import {collectM02Url} from "../../src/lib/modules/strategy/server/providers/m02-collection";
import { createStrategyTestDatabase } from "./db";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const m01Source = () => {
  const anchors = [
    ["The Broken Thing", "The market rewards shallow proof."],
    ["The Hidden Truth", "Buyers need observable evidence."],
    ["Market-Deployable Hidden Truth", "Buyers choose evidence they can inspect."],
    ["The Non-Negotiable", "We will not make unsupported claims."],
    ["The Hard-Won Teaching", "Proof must be visible in use."],
    ["The Legacy", "A market that trusts what it can verify."],
    ["Core Belief", "Visible proof changes buying decisions."],
  ].map(([key, sentence]) => ({ key, sentence }));
  const claimsBoundaryInputs = { canClaim: ["Claim supported"], mustQualify: ["Claim qualified"], cannotClaim: ["Claim prohibited"] };
  const outputs = { outputs: { anchors, claimsBoundaryInputs } };
  const originCanonicalPayload = JSON.stringify(outputs);
  const sessionId = randomUUID(), sealedAt = "2026-10-29T12:00:00.000Z";
  const inputs = {
    sessionId, sealedAt, coreBelief: anchors[6]!["sentence"], brokenThing: anchors[0]!["sentence"],
    hiddenTruth: anchors[1]!["sentence"], marketDeployableHiddenTruth: anchors[2]!["sentence"],
    nonNegotiable: anchors[3]!["sentence"], hardWonTeaching: anchors[4]!["sentence"], legacy: anchors[5]!["sentence"], claimsBoundaryInputs,
  };
  const body = { sessionId, sealedAt, outputsHash: sha256(originCanonicalPayload), inputs,
    originVersionId: randomUUID(), originRevision: 4, originCanonicalPayload, originApproval: { sealedAt, outputsHash: sha256(originCanonicalPayload) } };
  return { id: randomUUID(), slot: M02_SOURCE_SLOT, body, hash: sha256(JSON.stringify(body)) };
};

test("M02 database service preserves source pins, human approvals, independent gates and immutable seal", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repository = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-m02-operator", organisationId: request.organisationId, brandId: request.brandId,
      activeMembership: true, activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"], approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) => access.authorize({ organisationId: "m02-org", brandId: "m02-brand", engagementId: "m02-engagement", action });
    await repository.createEngagement(await scope("manage"), { id: "m02-engagement", label: "Synthetic M02 service regression" });
    const upstream = m01Source();
    await repository.setSource(await scope("manage"), upstream);
    const setupDraft = {
      competitors: [{ name: "Acme", url: "https://acme.example" }], cohort: "UK independent repair shops",
      geography: "UK", platforms: [], sectorGuess: "", rationale: "Synthetic form",
    };
    const service = createM02Service({ repository, validateSource: async (_scope, source) => { validateM02Source(source); },
      generate: async ({ gate }) => ({ candidate: gate === "setup" ? setupDraft : {}, model: "synthetic-m02-model" }) });
    const created = await service.create(await scope("edit"), { action: "create", commandId: "m02-create" });
    let record = created.payload;
    const command = (action: string, fields: Record<string, unknown> = {}) => ({
      action, sessionId: created.id, expectedRevision: record.revision, commandId: randomUUID(), ...fields,
    });
    expect(record.session.stage).toBe("setup");
    const loaded = await service.load(await scope("read"), created.id);
    expect(loaded.upstreamCurrent).toBe(true);
    expect(loaded.recon.m01Inputs.coreBelief).toBe(upstream.body.inputs.coreBelief);
    const drafted = await service.draft(await scope("generate"), { sessionId: created.id, expectedRevision: record.revision, commandId: "m02-setup-draft", gate: "setup" });
    record = drafted.record;
    expect(record.drafts.setup).toMatchObject({ candidate: setupDraft, model: "synthetic-m02-model" });

    await expect(service.confirm(await scope("approve"),command("confirm-setup",{route:"skip",research:{competitors:[{name:"Synthetic competitor"}],cohort:"Synthetic cohort",geography:"Synthetic geography"}}))).rejects.toThrow("approved locked-source adoption record");
    record = (await service.confirm(await scope("approve"), command("confirm-setup", { research: {
      ...setupDraft,
    } }))).payload;
    const collecting = createM02Service({repository,validateSource:async(_scope,source)=>{validateM02Source(source)},collect:collectM02Url});
    record = (await collecting.collectUrl(await scope("generate"),command("collect-url",{url:"https://127.0.0.1/private",kind:"market",target:"Synthetic denied destination"}))).payload;
    expect(record.artifacts.artifacts[0]!.status).toBe("failed");
    expect(record.artifacts.artifacts[0]!.httpStatus).toBe(0);
    expect(record.artifacts.artifacts[0]!.verbatim).toBe("");

    const artifact = async (kind: string, target: string, url: string, source: string) => {
      record = (await service.addArtifact(await scope("edit"), command("add-artifact", { artifact: {
        kind, channel: "paste", target, source, url, retrievedAt: "2026-10-29T12:30:00.000Z", evidenceDate: "2026-10-01",
        verbatim: `Synthetic evidence for ${target}`, access: "public", consent: "public artifact", status: "gathered",
      } }))).record;
      return record.artifacts.artifacts.at(-1)!.id;
    };
    const competitor = await artifact("competitor", "Acme", "https://acme.example/default", "Acme public page");
    const customer = await artifact("customer", "UK independent repair shops", "https://customers.example/review", "Customer review");
    const market = await artifact("market", "UK", "https://market.example/report", "Market report");
    record = (await service.confirm(await scope("edit"), command("finish-gather"))).payload;
    record = (await service.confirm(await scope("approve"), command("review-artifacts"))).payload;
    record = (await service.confirm(await scope("approve"), command("builder-inputs", { inputs: {
      p1: { verdict: "pass", finding: "Synthetic capability" },
      p2: { verdict: "pass", segment: "UK repair shops", standingStrength: "moderate", finding: "Synthetic standing" },
      p3: { verdict: "pass", finding: "Synthetic alignment" }, foundersProblem: "Synthetic problem",
      secondVoice: { present: false, name: "", role: "", competingDiagnosis: "", converge: "", diverge: "", signal: "" }, ownedAudit: [],
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate1", { terrain: {
      tam: "Unknown", trajectory: "stable", tailwind: "", diagnosis: "ambiguous-needs-evidence", diagnosisEvidence: "Synthetic",
    }, gate: { decodes: [{ competitor: "Acme", beliefs: [{ belief: "Feature-led claims", confidence: "medium", vulnerability: "" }] }],
      descriptiveDefault: "Competitors sell features.", cohort: "UK repair shops", concentration: "competitive", verdict: "pass", finding: "Synthetic", }, }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate2", { gate: {
      vulnerabilityEvidence: "Synthetic vulnerability", defendersCase: "Synthetic defence", rebuttal: "Synthetic rebuttal",
      artifactRefs: [competitor], verdict: "pass", finding: "Synthetic",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate1", { terrain: {
      tam: "Unknown", trajectory: "stable", tailwind: "", diagnosis: "ambiguous-needs-evidence", diagnosisEvidence: "Synthetic",
    }, gate: { decodes: [{ competitor: "Acme", beliefs: [{ belief: "Feature-led claims", confidence: "medium", vulnerability: "" }] }],
      descriptiveDefault: "Competitors sell features.", cohort: "UK repair shops", concentration: "competitive", verdict: "pass", finding: "Reconfirmed synthetic finding", }, }))).payload;
    expect(record.recon.gate2.verdict).toBe("pending");
    record = (await service.confirm(await scope("approve"), command("confirm-gate2", { gate: {
      vulnerabilityEvidence: "Synthetic vulnerability", defendersCase: "Synthetic defence", rebuttal: "Synthetic rebuttal",
      artifactRefs: [competitor], verdict: "pass", finding: "Synthetic",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate3", { gate: {
      trigger: "Trigger", hack: "Workaround", pain: "Pain", limitingBelief: "Belief", traceToDefault: "Trace",
      artifactRefs: [customer], verdict: "pass", finding: "Synthetic",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate4", { gate: {
      priceRange: "£100–£200", evidence: "Synthetic spend evidence", artifactRefs: [customer], verdict: "pass", finding: "Synthetic",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate5", { gate: { risks: ["r1", "r2", "r3", "r4"].map((pattern) => ({
      pattern, state: "absent", evidence: "Synthetic check", severity: null, mitigationRouting: null, acknowledgmentLine: "", declined: false, dispute: "",
    })) } }))).payload;
    record = (await service.confirm(await scope("approve"), command("confirm-gate6", { gate: {
      implication: "Observable implication", traceSentence: "The gap follows from visible proof.", standsWithoutTruth: false,
      artifactRefs: [market], verdictA: "pass", verdictB: "pass", finding: "Synthetic",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("evidence-review", { review: {
      disposition: "sufficient_for_provisional", rationale: "Synthetic review of complete evidence.",
    } }))).payload;
    record = (await service.confirm(await scope("approve"), command("outcome", { outcome: {
      outcome: "provisional_a", statement: "Proceed to hypothesis work only.", contrarianFlags: [],
    } }))).payload;
    expect(record.recon.state.relianceScope).toBe("Module 03 hypothesis work only");
    const sealed = await service.confirm(await scope("approve"), command("seal"));
    record = sealed.payload;
    expect(record.session.stage).toBe("sealed");
    expect(record.seal).toMatchObject({ status: "sealed", outcome: "provisional_a", sealedBy: "synthetic-m02-operator" });
    const version = await repository.getVersion(await scope("read"), (record.seal as { receiptId: string }).receiptId);
    expect(version?.canonicalPayload).toContain("Market Reality Check");
    const documents = await repository.listDocuments(await scope("read"), created.id);
    expect(documents.map((doc) => doc.kind).sort()).toEqual(["market-reality", "receipt"].sort());
    const verified = verifyM02Seal({ sessionId: created.id, version: version!, current: record, expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash } });
    expect(verified.valid).toBe(true);
    const canonical = JSON.parse(version!.canonicalPayload);
    expect(canonical.receipt.hashes.session).toBe(sha256(JSON.stringify(canonical.snapshots.session, null, 2)));
    expect(canonical.receipt.sealHash).toBe(sha256(JSON.stringify(Object.fromEntries(Object.entries(canonical.receipt).filter(([key]) => key !== "sealHash")))));
    expect(canonical.lineage).toEqual({ parentSessionId: null, successorReason: "" });
    expect(verifyM02Seal({ sessionId: created.id, version: version!, current: { ...record, collection: { ...record.collection, state: "partial" } }, expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash } }).valid).toBe(false);
    expect(verifyM02Seal({ sessionId: created.id, version: version!, current: record, expectedSource: { versionId: randomUUID(), hash: record.sourceHash } }).valid).toBe(false);
    expect(verifyM02Seal({ sessionId: created.id, version: version!, current: { ...record, parentSessionId: randomUUID() }, expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash } }).valid).toBe(false);
    await expect(service.confirm(await scope("approve"), command("seal"))).rejects.toThrow("sealed");

    const newSource = m01Source();
    await repository.setSource(await scope("manage"), newSource);
    const successor = await service.successor(await scope("edit"), command("successor", { reason: "Synthetic new M01 basis." }));
    expect(successor.payload.parentSessionId).toBe(created.id);
    expect(successor.payload.sourceVersionId).toBe(newSource.id);
    expect((await service.load(await scope("read"), created.id)).session.stage).toBe("sealed");
    let next = successor.payload;
    const successorCommand = (action: string, fields: Record<string, unknown> = {}) => ({
      action, sessionId: successor.id, expectedRevision: next.revision, commandId: randomUUID(), ...fields,
    });
    next = (await service.confirm(await scope("approve"), successorCommand("confirm-setup", { research: setupDraft }))).payload;
    next = (await service.confirm(await scope("edit"), successorCommand("finish-gather"))).payload;
    next = (await service.confirm(await scope("approve"), successorCommand("review-artifacts"))).payload;
    next = (await service.confirm(await scope("approve"), successorCommand("revise", { from: "gather", reason: "Add the missing market sources." }))).payload;
    expect(next.session.stage).toBe("gather");
    expect(next.collection.state).toBe("resumed");
    expect(next.recon.state.relianceScope).toBe("");
    expect((await service.load(await scope("read"), created.id)).session.stage).toBe("sealed");
  } finally {
    await db.close();
  }
});

test("M02 source validator rejects paraphrased anchor text and output tampering", () => {
  const source = m01Source();
  expect(() => validateM02Source(source)).not.toThrow();
  const changed = structuredClone(source);
  changed.body.inputs.coreBelief = "A paraphrased conviction";
  changed.hash = sha256(JSON.stringify(changed.body));
  expect(() => validateM02Source(changed)).toThrow("not inherited verbatim");
  const wrongTuple = structuredClone(source);
  wrongTuple.body.inputs.sessionId = randomUUID();
  wrongTuple.hash = sha256(JSON.stringify(wrongTuple.body));
  expect(() => validateM02Source(wrongTuple)).toThrow();
  const wrongOutputs = structuredClone(source);
  wrongOutputs.body.outputsHash = "a".repeat(64);
  wrongOutputs.hash = sha256(JSON.stringify(wrongOutputs.body));
  expect(() => validateM02Source(wrongOutputs)).toThrow();
});

test("M02 outcome rules preserve B/C routes and block partial or contested A", () => {
  const source = m01Source();
  const recon = ReconLog.parse({ module: "02", sessionId: source.body.sessionId, producedAt: source.body.sealedAt,
    updatedAt: source.body.sealedAt, m01Inputs: source.body.inputs });
  recon.preconditions.p1.verdict = "pass";
  recon.preconditions.p2.verdict = "pass";
  recon.preconditions.p3.verdict = "pass";
  recon.gate1.verdict = "pass";
  recon.gate2.verdict = "pass";
  recon.gate3.verdict = "pass";
  recon.entanglement.pass = true;
  recon.gate5.risks = ["r1", "r2", "r3", "r4"].map((pattern) => ({
    pattern: pattern as "r1" | "r2" | "r3" | "r4", state: "absent" as const, evidence: "reviewed", severity: null,
    mitigationRouting: null, acknowledgment: { signedBy: "", signedAt: "", line: "", declined: false, dispute: "" },
  }));
  recon.gate4.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options.map((item) => item.outcome)).toEqual(["outcome_b"]);
  recon.gate4.verdict = "pass";
  recon.gate6.a.verdict = "fail";
  expect(allowedOutcomes(recon, "completed").options.map((item) => item.outcome)).toEqual(["outcome_c"]);
  recon.gate6.a.verdict = "pass";
  recon.gate6.b.verdict = "pass";
  expect(allowedOutcomes(recon, "completed").options.map((item) => item.outcome)).toEqual(["provisional_a"]);
  expect(allowedOutcomes(recon, "partial").blocked).toContain("incomplete log");
  expect(() => assertEvidenceDispositionForOutcome("provisional_a", "contested")).toThrow("separate evidence review");
  expect(() => assertEvidenceDispositionForOutcome("provisional_a", "insufficient")).toThrow("separate evidence review");
  expect(() => assertEvidenceDispositionForOutcome("provisional_a", "sufficient_for_provisional")).not.toThrow();
});
