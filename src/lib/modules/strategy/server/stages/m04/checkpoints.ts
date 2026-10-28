export const M04_WAITPOINT_ORDER = [
  "context",
  "conviction-cost",
  "market-readiness",
  "human-load",
  "financial-grounding",
  "awareness-and-weighing",
  "recommendation",
  "human-decision",
  "checks",
  "sealed",
] as const;
export type M04WaitpointStage = (typeof M04_WAITPOINT_ORDER)[number];

export function revisedCheckpointState<T>(
  checkpoints: Record<string, T>,
  restartFrom: M04WaitpointStage,
): Record<string, T> {
  const index = M04_WAITPOINT_ORDER.indexOf(restartFrom);
  return Object.fromEntries(
    Object.entries(checkpoints).filter(
      ([stage]) => M04_WAITPOINT_ORDER.indexOf(stage as M04WaitpointStage) < index,
    ),
  ) as Record<string, T>;
}

export function pendingM04Stage(state: {
  tokens: Record<string, string>;
  checkpoints: Record<string, unknown>;
}): M04WaitpointStage | undefined {
  return M04_WAITPOINT_ORDER.find((stage) => state.tokens[stage] && !state.checkpoints[stage]);
}

/** Persist this event with the authoritative revision; delivery happens after commit. */
export function checkpointEvent(sessionId: string, stage: string, revision: number) {
  return { kind: "m04.checkpoint", payload: { sessionId, stage, revision } };
}
