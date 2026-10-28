/** M01 confirmations remain independent; there is no later-stage sequential gate policy. */
export const M01_GATES = [
  "anchors",
  "manifesto",
  "languageBank",
  "evidenceMatrix",
  "readiness",
  "factsAnchor",
  "seal",
] as const;
export function checkpointEvent(sessionId: string, stage: string, revision: number) {
  return { kind: "m01.checkpoint", payload: { sessionId, stage, revision } };
}
