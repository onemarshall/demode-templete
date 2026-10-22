import { describe, expect, it } from "vitest";
import {
  deriveRecommendedActions,
  deriveIncidentCounts,
  buildSummaryCards,
} from "../triage/derive";
import { deriveSecurityStatus } from "../derive-status";

const now = 1_800_000_000_000;
const counts = { critical: 0, high: 0, medium: 0, low: 0, newLast15m: 0 };
const monitoring = { available: true, observedEvents: 10 };

function criticalAction() {
  return deriveRecommendedActions({
    threatFeed: [
      { id: "risk-1", timestamp: now, severity: "critical", title: "Review suspicious activity" },
    ],
    now,
  })[0];
}

describe("security status integrity", () => {
  it("keeps acknowledged critical signals actionable", () => {
    const status = deriveSecurityStatus({
      counts,
      actions: [{ ...criticalAction(), status: "acknowledged" }],
      monitoring,
    });
    expect(status.level).toBe("act_now");
    expect(status.headline).toContain("1 critical signal needs review");
  });

  it("distinguishes unavailable monitoring from an empty event sample", () => {
    expect(
      deriveSecurityStatus({
        counts,
        actions: [],
        monitoring: { available: false, observedEvents: 0 },
      }).headline,
    ).toContain("coverage");
    expect(
      deriveSecurityStatus({
        counts,
        actions: [],
        monitoring: { available: true, observedEvents: 0 },
      }).headline,
    ).toContain("No activity data");
    expect(deriveSecurityStatus({ counts, actions: [] }).level).toBe("unknown");
  });

  it("retains urgent findings and explains missing monitoring", () => {
    const status = deriveSecurityStatus({
      counts,
      actions: [criticalAction()],
      monitoring: { available: false, observedEvents: 0 },
    });
    expect(status.level).toBe("act_now");
    expect(status.detail).toContain("Monitoring is unavailable");
  });

  it("bounds a clear status to the records actually observed", () => {
    const status = deriveSecurityStatus({ counts, actions: [], monitoring });
    expect(status.headline).toBe("No prioritised checks in the available records.");
    expect(status.detail).toContain("not a guarantee of safety");
  });
});

describe("security triage source contracts", () => {
  it("derives IP pressure from the actual rate-limit payload", () => {
    const actions = deriveRecommendedActions({
      rateLimitStats: {
        totalBlocked: 45,
        topRateLimitedIPs: [{ ip: "192.0.2.1", blockedCount: 45, lastBlocked: now - 1000 }],
      },
      now,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: "rate-limit:192.0.2.1",
      severity: "critical",
      detectedAt: now - 1000,
    });
    expect(actions[0].reason).toContain("45 recorded rate-limit blocks");
  });

  it("derives global pressure when no individual address reaches threshold", () => {
    const actions = deriveRecommendedActions({
      rateLimitStats: {
        totalBlocked: 25,
        topRateLimitedIPs: [{ ip: "192.0.2.1", blockedCount: 10 }],
      },
      now,
    });
    expect(actions[0]?.id).toBe("rate-limit:global-pressure");
  });

  it("uses core risk boundaries and severity-sorts before capping the feed", () => {
    expect(
      deriveIncidentCounts({
        sessions: [{ riskScore: 80 }, { riskScore: 60 }, { riskScore: 40 }],
        now,
      }),
    ).toMatchObject({ critical: 1, high: 1, medium: 1 });
    const threatFeed = [
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `low-${index}`,
        severity: "low",
        timestamp: now,
      })),
      {
        id: "critical",
        severity: "critical",
        timestamp: now,
        description: "Actual recorded explanation",
      },
    ];
    expect(deriveRecommendedActions({ threatFeed, now })[0]).toMatchObject({
      id: "tf:critical",
      title: "Actual recorded explanation",
    });
  });

  it("counts shared observations only once across feed and flagged sessions", () => {
    const input = {
      threatFeed: [{ id: "same-event", severity: "critical", timestamp: now }],
      sessions: [
        {
          sourceEventId: "same-event",
          sessionId: "session-1",
          riskLevel: "critical" as const,
          flaggedAt: now,
        },
      ],
      now,
    };
    expect(deriveIncidentCounts(input)).toMatchObject({ critical: 1, newLast15m: 1 });
    expect(deriveRecommendedActions(input)).toHaveLength(1);
  });

  it("does not let unprioritised sessions hide a later critical record", () => {
    const sessions = [
      ...Array.from({ length: 6 }, (_, index) => ({ sessionId: `medium-${index}`, riskScore: 40 })),
      { sessionId: "urgent", riskScore: 80 },
    ];
    expect(deriveRecommendedActions({ sessions, now })[0]).toMatchObject({
      entityId: "urgent",
      severity: "critical",
    });
  });

  it("excludes resolved checks from every summary group", () => {
    const cards = buildSummaryCards({
      counts: { ...counts, critical: 99 },
      items: [{ ...criticalAction(), status: "resolved" }],
    });
    expect(cards.map((card) => card.count)).toEqual([0, 0, 0]);
  });
});
