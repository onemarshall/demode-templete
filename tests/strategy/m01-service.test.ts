import { test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { createStrategyAccess, type StrategyAction } from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { createM01Service } from "../../src/lib/modules/strategy/server/stages/m01/service";
import { sourceHash, type M01Input } from "../../src/lib/modules/strategy/server/stages/m01/session";
import { qualityGateReport, outputsHash, renderPack } from "../../src/lib/modules/strategy/server/stages/m01/handoff";
import { createStrategyTestDatabase } from "./db";
import { m01Outputs, m01Plan, m01ReviewAnswers, m01SetTwo, m01Source, m01SourceAuthority } from "./fixtures/m01";

test("M01 preserves historical output bytes and the independent human review gates", () => {
  const outputs = m01Outputs();
  expect(outputsHash(outputs)).toBe("66aa1b46afd59211250ad2ce24ec00d7d6e444037370dd70a8727c252c902014");
  expect(qualityGateReport(outputs).map(({ id, kind, result }) => ({ id, kind, result }))).toEqual([
    { id: "all-confirmed", kind: "auto", result: "fail" },
    { id: "core-belief-form", kind: "auto", result: "pass" },
    { id: "anchors-quotable", kind: "auto", result: "pass" },
    { id: "claims-boundary", kind: "auto", result: "pass" },
    { id: "evidence-matrix", kind: "auto", result: "pass" },
    { id: "manifesto-substance", kind: "auto", result: "pass" },
    { id: "language-bank", kind: "auto", result: "pass" },
    { id: "facts-anchor", kind: "auto", result: "pass" },
    ...["depth", "recognition", "coherence", "prospective", "four-signals", "distillation"].map((id) => ({ id, kind: "review", result: "pending" })),
  ]);
});

test("M01 database workflow covers immediate turns, event replay, independent approvals, sealing, CAS and immutable successors", async () => {
  const db = await createStrategyTestDatabase();
  try {
    const repo = new StrategyRepository(db.pool);
    const access = createStrategyAccess(async (request) => ({
      actorId: "synthetic-founder",
      organisationId: request.organisationId,
      brandId: request.brandId,
      activeMembership: true,
      activeBrandAssignment: true,
      actions: ["read", "edit", "approve", "generate", "export", "manage"],
      approvalEngagementId: request.engagementId,
    }));
    const scope = (action: StrategyAction) => access.authorize({ organisationId: "m01-test-org", brandId: "m01-test-brand", engagementId: "m01-test-engagement", action });
    await repo.createEngagement(await scope("manage"), { id: "m01-test-engagement", label: "Synthetic M01 service regression" });
    const input: M01Input = structuredClone(m01Source);
    await repo.setSource(await scope("manage"), { id: randomUUID(), slot: "m01-input", body: input, hash: sourceHash(input) });

    let modelResponse: unknown = m01Plan();
    let denySource = false;
    const validations: unknown[] = [];
    const chats: Array<Array<{ role: string; content: string }>> = [];
    const service = createM01Service({
      repository: repo,
      validateSourceAuthority: async (_scope, source, _input, _transaction) => {
        validations.push(source);
        if (denySource) throw new Error("Synthetic source declaration denied");
      },
      model: {
        name: "synthetic-m01-model",
        call: async () => modelResponse,
        chat: async (messages) => { chats.push(messages); return "Synthetic interviewer reply."; },
      },
    });
    let record = await service.create(await scope("edit"), { commandId: "m01-create" });
    expect((await service.create(await scope("edit"), { commandId: "m01-create" })).id).toBe(record.id);
    const command = () => ({ sessionId: record.id, expectedRevision: record.revision, commandId: randomUUID() });
    record = await service.prepare(await scope("generate"), command());
    expect((await service.load(await scope("read"), record.id)).stage).toBe("plan");

    const pendingInput = "The latest answer must reach the model now.";
    const turned = await service.turn(await scope("generate"), { ...command(), message: pendingInput });
    record = turned.session;
    expect(chats).toHaveLength(1);
    expect(chats[0]!.filter((message) => message.role === "user" && message.content === pendingInput)).toHaveLength(1);
    expect(record.payload.chat.filter((line) => line.role === "user" && line.content === pendingInput)).toHaveLength(1);

    const keyed = { event_id: "synthetic-event-1", type: "session.input_transcript.delta", delta: "Synthetic first answer." };
    record = await service.appendEvents(await scope("edit"), { ...command(), events: [keyed, structuredClone(keyed),
      { type: "session.output_transcript.delta", delta: "Synthetic first question." },
      { type: "session.input_transcript.delta", delta: "Synthetic second answer." },
      { type: "session.output_transcript.delta", delta: "Synthetic second question." }] });
    expect(record.payload.transcript.filter((line) => (line.event as { event_id?: string }).event_id === "synthetic-event-1")).toHaveLength(1);
    await expect(service.appendEvents(await scope("edit"), { ...command(), events: [{ ...keyed, delta: "Changed duplicate payload." }] })).rejects.toThrow("event id was reused with different content");

    const fixture = m01Outputs();
    modelResponse = { ...fixture.outputs, publicRecordReadiness: fixture.publicRecordReadiness, factsAnchor: fixture.factsAnchor.items };
    record = await service.synthesise(await scope("generate"), command());
    expect(record.payload.outputs!.status.manifesto).toBe("candidate");
    expect(record.payload.setTwoDraft).toBeNull();

    modelResponse = { sentence: fixture.outputs.anchors[0]!.sentence };
    record = await service.reviseAnchor(await scope("generate"), { ...command(), anchorKey: fixture.outputs.anchors[0]!.key, note: "Keep the synthetic source wording." });
    expect(record.payload.outputs!.anchorStatus[fixture.outputs.anchors[0]!.key]).toBe("candidate");
    modelResponse = { manifesto: fixture.outputs.manifesto };
    record = await service.reviseManifesto(await scope("generate"), { ...command(), note: "Keep the synthetic conviction intact." });
    expect(record.payload.outputs!.status.manifesto).toBe("candidate");
    modelResponse = { evidenceMatrix: fixture.outputs.evidenceMatrix, claimsBoundaryInputs: fixture.outputs.claimsBoundaryInputs };
    record = await service.reviseMatrix(await scope("generate"), { ...command(), note: "Keep evidence limits explicit." });
    expect(record.payload.outputs!.status.evidenceMatrix).toBe("candidate");

    modelResponse = m01SetTwo();
    record = await service.derive(await scope("generate"), command());
    expect(record.payload.setTwoDraft).toEqual(m01SetTwo());
    modelResponse = { sentence: fixture.outputs.anchors[0]!.sentence };
    record = await service.reviseAnchor(await scope("generate"), { ...command(), anchorKey: fixture.outputs.anchors[0]!.key, note: "Recheck after derivation." });
    expect(record.payload.setTwoDraft).toBeNull();
    modelResponse = m01SetTwo();
    record = await service.derive(await scope("generate"), command());

    const seal = () => ({ ...command(), reviewAnswers: m01ReviewAnswers(), derived: m01SetTwo(), source: m01SourceAuthority, notes: "Synthetic review only." });
    await expect(service.seal(await scope("approve"), seal())).rejects.toThrow("Every output confirmed");
    for (const part of ["factsAnchor", "evidenceMatrix", "languageBank", "manifesto", "anchors"])
      record = await service.confirm(await scope("approve"), { ...command(), part });
    expect(record.payload.outputs!.readinessConfirmed).toBe(false);
    expect(qualityGateReport(record.payload.outputs!).find((gate) => gate.id === "all-confirmed")!.result).toBe("pass");
    expect(qualityGateReport(record.payload.outputs!).filter((gate) => gate.kind === "review").every((gate) => gate.result === "pending")).toBe(true);
    denySource = true;
    await expect(service.seal(await scope("approve"), seal())).rejects.toThrow("Synthetic source declaration denied");
    denySource = false;
    record = await service.seal(await scope("approve"), seal());
    expect(validations).toEqual([m01SourceAuthority, m01SourceAuthority, m01SourceAuthority]);

    const historical = structuredClone(record);
    const version = await repo.getVersion(await scope("read"), record.payload.seal!.versionId);
    expect(version!.canonicalPayload).toBe(JSON.stringify(record.payload.outputs));
    expect(version!.sealHash).toBe(outputsHash(record.payload.outputs!));
    const docs = await repo.listDocuments(await scope("read"), record.id);
    expect(docs).toHaveLength(3);
    const document = await repo.getDocument(await scope("export"), docs.find((item) => item.kind === "founder-convictions")!.id);
    const handoff = record.payload.handoff!;
    expect(document!.content).toBe(renderPack(input.folder, record.payload.outputs!, m01SetTwo(), handoff.sourceAuthority, handoff.sealedAt, "Synthetic review only.", record.payload.transcript.length));
    await expect(service.note(await scope("edit"), { ...command(), note: "Overwrite history" })).rejects.toThrow("sealed");

    record = await service.successor(await scope("edit"), { ...command(), reason: "Synthetic fresh review." });
    expect(record.payload.seal).toBeNull();
    expect(record.payload.outputs!.status.manifesto).toBe("candidate");
    expect(await repo.getSession(await scope("read"), historical.id)).toEqual(historical);

    const racing = createM01Service({ repository: repo, validateSourceAuthority: async () => {}, model: {
      name: "synthetic-race-model", chat: async () => "", call: async () => {
        await service.note(await scope("edit"), { ...command(), note: "Synthetic concurrent human edit." });
        return m01Plan();
      },
    } });
    await expect(racing.prepare(await scope("generate"), command())).rejects.toThrow("revision conflict");
    record = (await repo.getSession<typeof record.payload>(await scope("read"), record.id))!;
    expect(record.payload.note).toBe("Synthetic concurrent human edit.");
    const changed = { ...input, eligible: false };
    await repo.setSource(await scope("manage"), { id: randomUUID(), slot: "m01-input", body: changed, hash: sourceHash(changed) });
    await expect(service.note(await scope("edit"), { ...command(), note: "Stale synthetic source." })).rejects.toThrow("source authority changed");
  } finally {
    await db.close();
  }
});
