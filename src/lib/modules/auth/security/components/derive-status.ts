import type { IncidentCounts, RecommendedActionItem } from "./triage";

export type StatusLevel = "safe" | "watch" | "act_now" | "unknown";

export interface SecurityStatus {
  level: StatusLevel;
  headline: string;
  detail: string;
}

interface DeriveStatusInput {
  counts: IncidentCounts;
  actions: RecommendedActionItem[];
  monitoring?: { available: boolean; observedEvents: number; detail?: string };
}

export function deriveSecurityStatus({
  counts,
  actions,
  monitoring,
}: DeriveStatusInput): SecurityStatus {
  // Acknowledgement records review, not resolution of the underlying signal.
  const unresolved = actions.filter((action) => action.status !== "resolved");
  const coverage = !monitoring?.available
    ? "Monitoring is unavailable; the current picture may be incomplete."
    : monitoring.observedEvents === 0
      ? "No recorded events are available to assess activity."
      : (monitoring.detail ??
        "Based on the available recorded events; this is not a guarantee of safety.");
  const critical = unresolved.filter((action) => action.severity === "critical").length;

  if (critical > 0) {
    return {
      level: "act_now",
      headline: `${pluralise(critical, "critical signal needs", "critical signals need")} review.`,
      detail: `${buildDetail(unresolved)} ${coverage}`,
    };
  }
  if (unresolved.length > 0) {
    return {
      level: "watch",
      headline: `${pluralise(unresolved.length, "security check needs", "security checks need")} review.`,
      detail: `${buildDetail(unresolved)} ${coverage}`,
    };
  }
  if (!monitoring?.available || monitoring.observedEvents === 0) {
    return {
      level: "unknown",
      headline: monitoring?.available
        ? "No activity data to assess yet."
        : "Monitoring coverage needs checking.",
      detail: coverage,
    };
  }
  return {
    level: "safe",
    headline: "No prioritised checks in the available records.",
    detail: `${counts.newLast15m > 0 ? `${counts.newLast15m} recent signals recorded. ` : ""}${coverage}`,
  };
}

function pluralise(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function buildDetail(actions: RecommendedActionItem[]): string {
  const top = actions.slice(0, 2).map((action) => action.title.replace(/\.$/, ""));
  const remainder = actions.length - top.length;
  return top.join(" · ") + (remainder > 0 ? ` · +${remainder} more` : "") + ".";
}
