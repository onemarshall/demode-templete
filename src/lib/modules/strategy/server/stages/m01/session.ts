import { z } from "zod";
const OutputState = z.enum(["candidate", "locked", "revision-requested"]);

const FactsItem = z.object({ fact: z.string(), detail: z.string() });

export const OutputsSchema = z.object({
  producedAt: z.string(),
  model: z.string(),
  status: z.object({
    anchors: OutputState,
    manifesto: OutputState,
    languageBank: OutputState,
    evidenceMatrix: OutputState,
  }),
  anchorStatus: z.record(z.string(), OutputState).default({}),
  anchorNotes: z.record(z.string(), z.string()).default({}),
  bankFlags: z.array(z.string()).default([]),
  publicRecordReadiness: z
    .object({ state: z.enum(["ready", "not-yet-concrete", "not-assessed"]), sentence: z.string() })
    .default({ state: "not-assessed", sentence: "" }),
  readinessConfirmed: z.boolean().default(false),
  factsAnchor: z
    .object({ status: OutputState, items: z.array(FactsItem) })
    .default({ status: "candidate", items: [] }),
  notes: z.object({
    anchors: z.string(),
    manifesto: z.string(),
    languageBank: z.string(),
    evidenceMatrix: z.string(),
  }),
  outputs: z.object({
    anchors: z.array(z.object({ key: z.string(), sentence: z.string() })),
    manifesto: z.string(),
    languageBank: z.array(z.object({ category: z.string(), phrases: z.array(z.string()) })),
    evidenceMatrix: z.array(
      z.object({
        claim: z.string(),
        zone: z.enum(["Fact", "Thesis", "Belief"]),
        evidence: z.array(z.object({ item: z.string(), category: z.string() })),
      }),
    ),
    claimsBoundaryInputs: z.object({
      canClaim: z.array(z.string()),
      mustQualify: z.array(z.string()),
      cannotClaim: z.array(z.string()),
    }),
  }),
});
export type M01Outputs = z.infer<typeof OutputsSchema>;

import { createHash, randomUUID } from "node:crypto";
import type { IntakePlan } from "./preparation";
import type { M01ChatLine, TranscriptLine } from "./conversation";
import type { HandoffRecord, SetTwo } from "./handoff";
export interface M01Input {
  eligible: boolean;
  folder: string;
  engagement?: string;
  /** Approved Entry/Engagement and intake evidence, published only by trusted server ingestion. */
  entry: unknown;
  parts: { file: string; text: string }[];
}
export interface M01Session {
  sessionId: string;
  folder: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  sourceHash: string;
  sources: M01Input;
  plan: (IntakePlan & { files: string[] }) | null;
  note: string;
  chat: M01ChatLine[];
  transcript: TranscriptLine[];
  outputs: M01Outputs | null;
  setTwoDraft: SetTwo | null;
  handoff: HandoffRecord | null;
  seal: { versionId: string; hash: string } | null;
  history: unknown[];
  parentSessionId?: string;
}
export const sourceHash = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
export function requireCurrent(s: M01Session, current: M01Input) {
  if (!current.eligible || sourceHash(current) !== s.sourceHash)
    throw new Error("M01 source authority changed; create a freshly checked successor.");
}
export function createM01(
  input: M01Input,
  plan: (IntakePlan & { files: string[] }) | null,
  id = randomUUID(),
): M01Session {
  if (!input.eligible) throw new Error("No eligible approved M01 input");
  const now = new Date().toISOString();
  return {
    sessionId: id,
    folder: input.folder,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    sourceHash: sourceHash(input),
    sources: input,
    plan,
    note: "",
    chat: [],
    transcript: [],
    outputs: null,
    setTwoDraft: null,
    handoff: null,
    seal: null,
    history: [],
  };
}
export function runStage(s: M01Session) {
  if (!s.plan) return null;
  if (s.handoff) return "sealed";
  if (s.outputs) return "review";
  if (s.chat.length || s.transcript.length) return "conversation";
  return "plan";
}
export function confirmOutput(outputs: M01Outputs, part: string, anchorKey?: string) {
  if (part === "anchor" && anchorKey) outputs.anchorStatus[anchorKey] = "locked";
  else if (part === "anchors")
    for (const a of outputs.outputs.anchors) outputs.anchorStatus[a.key] = "locked";
  else if (part === "manifesto" || part === "languageBank" || part === "evidenceMatrix")
    outputs.status[part] = "locked";
  else if (part === "factsAnchor") outputs.factsAnchor.status = "locked";
  else if (part === "readiness") outputs.readinessConfirmed = true;
  else if (part === "edit") {
    if (!anchorKey) throw new Error("Which anchor?");
  } else throw new Error(`Unknown part: ${part}`);
  outputs.status.anchors = outputs.outputs.anchors.every(
    (a) => outputs.anchorStatus[a.key] === "locked",
  )
    ? "locked"
    : "candidate";
  return outputs;
}
export function editAnchor(outputs: M01Outputs, key: string, sentence: string) {
  outputs.outputs.anchors = outputs.outputs.anchors.map((a) =>
    a.key === key ? { ...a, sentence } : a,
  );
  outputs.anchorStatus[key] = "candidate";
  outputs.status.anchors = "candidate";
  return outputs;
}
export function successorM01(previous: M01Session, input: M01Input, reason: string) {
  if (!reason.trim()) throw new Error("A revision reason is required");
  if (!previous.plan) throw new Error("No plan to carry into a successor");
  const s = createM01(input, structuredClone(previous.plan));
  s.parentSessionId = previous.sessionId;
  s.note = previous.note;
  s.chat = structuredClone(previous.chat);
  s.transcript = structuredClone(previous.transcript);
  if (previous.outputs) {
    s.outputs = structuredClone(previous.outputs);
    s.outputs.status = {
      anchors: "candidate",
      manifesto: "candidate",
      languageBank: "candidate",
      evidenceMatrix: "candidate",
    };
    s.outputs.anchorStatus = Object.fromEntries(
      s.outputs.outputs.anchors.map((a) => [a.key, "candidate"]),
    );
    s.outputs.factsAnchor.status = "candidate";
    s.outputs.readinessConfirmed = false;
  }
  s.history.push({
    action: "successor",
    parent: previous.sessionId,
    reason,
    at: new Date().toISOString(),
    invalidation: "All confirmations require fresh review; historical source is preserved.",
  });
  return s;
}
