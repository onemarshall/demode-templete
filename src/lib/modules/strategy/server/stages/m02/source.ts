import { createHash } from "node:crypto";
import { z } from "zod";
import type { SourceRecord } from "../../data/repository";
export type M02Upstream = {
  sessionId: string;
  sealedAt: string;
  outputsHash: string;
  inputs: {
    sessionId: string; sealedAt: string; coreBelief: string; brokenThing: string; hiddenTruth: string;
    marketDeployableHiddenTruth: string; nonNegotiable: string; hardWonTeaching: string; legacy: string;
    claimsBoundaryInputs: { canClaim: string[]; mustQualify: string[]; cannotClaim: string[] };
  };
};

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const SourceBody = z.object({
  sessionId: z.string().uuid(),
  sealedAt: z.string().min(1),
  outputsHash: z.string().regex(/^[a-f0-9]{64}$/),
  inputs: z.object({
    sessionId: z.string().uuid(), sealedAt: z.string().min(1),
    coreBelief: z.string().min(1), brokenThing: z.string().min(1), hiddenTruth: z.string().min(1),
    marketDeployableHiddenTruth: z.string().min(1), nonNegotiable: z.string().min(1),
    hardWonTeaching: z.string().min(1), legacy: z.string().min(1),
    claimsBoundaryInputs: z.object({ canClaim: z.array(z.string()).min(1), mustQualify: z.array(z.string()).min(1), cannotClaim: z.array(z.string()).min(1) }),
  }),
  originVersionId: z.string().uuid(),
  originRevision: z.number().int().positive(),
  originCanonicalPayload: z.string().min(1),
  originApproval: z.unknown(),
}).passthrough();
const ANCHORS = {
  "The Broken Thing": "brokenThing", "The Hidden Truth": "hiddenTruth",
  "Market-Deployable Hidden Truth": "marketDeployableHiddenTruth", "The Non-Negotiable": "nonNegotiable",
  "The Hard-Won Teaching": "hardWonTeaching", "The Legacy": "legacy", "Core Belief": "coreBelief",
} as const;

/** Validate the host-published M01 seal wrapper and its verbatim extraction. */
export function validateM02Source(record: SourceRecord): M02Upstream {
  if (record.slot !== "m02-m01") throw new Error("Unexpected M02 upstream source slot");
  if (sha256(JSON.stringify(record.body)) !== record.hash) throw new Error("M02 upstream source hash does not match its body");
  const body = SourceBody.parse(record.body);
  if (body.inputs.sessionId !== body.sessionId || body.inputs.sealedAt !== body.sealedAt)
    throw new Error("M01 source identity does not match its inputs");
  const outputs = JSON.parse(body.originCanonicalPayload) as { outputs?: { anchors?: { key: string; sentence: string }[]; claimsBoundaryInputs?: { canClaim: string[]; mustQualify: string[]; cannotClaim: string[] } } };
  if (sha256(body.originCanonicalPayload) !== body.outputsHash) throw new Error("M01 sealed outputs hash is invalid");
  const anchors = new Map((outputs.outputs?.anchors ?? []).map((row) => [row.key, row.sentence]));
  for (const [key, field] of Object.entries(ANCHORS))
    if (anchors.get(key) !== body.inputs[field]) throw new Error(`M01 ${key} was not inherited verbatim`);
  const boundaries = outputs.outputs?.claimsBoundaryInputs;
  if (JSON.stringify(boundaries) !== JSON.stringify(body.inputs.claimsBoundaryInputs))
    throw new Error("M01 Claims Boundary Inputs were not inherited verbatim");
  const approval = body.originApproval;
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) throw new Error("M01 source approval is missing");
  return body as M02Upstream;
}
