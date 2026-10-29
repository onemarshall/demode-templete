import {
  type Decision,
  type Evidence,
  type Exclusions,
  type Horizon,
  type Inheritance,
  type CDSession,
  type Moves,
  type Portfolio,
  type Recommendation,
  type Route,
  type Sequence,
} from "./contracts";

const clean = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\bM0[1-9]\b|\bM1[0-2]\b/g, "the earlier work")
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();

const label = (value: string) => value.replaceAll("-", " ");

/** FW_24 client-output rule: no direction ids, move ids, machine permissions or lifecycle field
 * names in the record body. The client reads the decision, not the plumbing. */
export function renderCD(session: CDSession): string {
  const inheritance = session.data.inheritance as Inheritance | undefined;
  if (!inheritance) return "# Commercial Direction\n\nNo confirmed inheritance yet.\n";
  const horizon = session.data.horizon as Horizon | undefined;
  const recommendation = session.data.recommendation as Recommendation | undefined;
  const route = session.data.route as Route | undefined;
  const moves = session.data.moves as Moves | undefined;
  const sequence = session.data.sequence as Sequence | undefined;
  const portfolio = session.data.portfolio as Portfolio | undefined;
  const exclusions = session.data.exclusions as Exclusions | undefined;
  const evidence = session.data.evidence as Evidence | undefined;
  const decision = session.data.decision as Decision | undefined;

  const sections: string[] = ["# Commercial Direction"];

  sections.push(`## What this record is

The commercial direction this business should hold over the selected horizon, the work it authorises,
and the conditions under which it should be revisited.

**Document state:** ${decision ? "complete" : "in production"}

**Decision state:** ${decision ? (decision.decisionState === "client-approved" || decision.decisionState === "client-overridden" ? "accepted" : label(decision.decisionState)) : "not yet decided"}

**Evidence state:** ${evidence ? label(evidence.dimensions[0]?.state ?? "absent") : "not yet recorded"}

**What this decision authorises:** ${decision ? clean(decision.authorisedWork) : "nothing yet — no decision has been recorded"}
`);

  if (horizon)
    sections.push(`## Scope and horizon

**Directional horizon:** ${clean(horizon.directionalHorizon)}

**Why this horizon:** ${clean(horizon.horizonRationale)}

**Controlled cycle:** ${clean(horizon.cycleHorizon)}

**Evidence cut-off:** ${clean(horizon.evidenceCutoff)}

**Why this is proportionate:** ${clean(horizon.proportionality)}
${horizon.longerTermAmbition ? `\n**Longer-term ambition:** ${clean(horizon.longerTermAmbition)}\n` : ""}`);

  if (recommendation)
    sections.push(`## The recommendation

**Outcome:** ${clean(recommendation.outcome)}

**Priority audience:** ${clean(recommendation.priorityAudience)}

**Buying situation:** ${clean(recommendation.buyingSituation)}

**Required commercial movement:** ${clean(recommendation.requiredMovement)}
`);

  if (route)
    sections.push(`## Route and trade-off

**Recommended route:** ${clean(route.strategicRoute)}

**Credible alternative:** ${clean(route.credibleAlternative)}

**Trade-off accepted:** ${clean(route.tradeoff)}
`);

  if (moves)
    sections.push(`## Strategic moves

${moves.moves.map((move, index) => `${index + 1}. **${clean(move.name)}** — ${clean(move.job)} *(${label(move.evidenceState)})*`).join("\n")}
`);

  if (sequence)
    sections.push(`## Sequence and gates

${sequence.phases
  .map(
    (phase) =>
      `### ${clean(phase.phase)} (${clean(phase.horizon)})\n\n${phase.work.map((item) => `- ${clean(item)}`).join("\n")}\n\n**Progression gate:** ${clean(phase.progressionGate)}`,
  )
  .join("\n\n")}

**First phase:** ${clean(sequence.firstPhaseObjective)}

**Progression condition:** ${clean(sequence.progressionCondition)}

**First evidence event:** ${clean(sequence.firstEvidenceEvent)}

**Review event:** ${clean(sequence.reviewEvent)}
`);

  if (portfolio)
    sections.push(`## Implementation portfolio

${portfolio.consequences
  .map((entry) => `- **${clean(entry.commercialJob)}** — ${label(entry.classification)}. ${clean(entry.reason)} (owner: ${clean(entry.owner)})`)
  .join("\n")}
`);

  if (exclusions)
    sections.push(`## Exclusions and deferred alternatives

**Excluded**

${exclusions.exclusions.map((item) => `- ${clean(item)}`).join("\n")}

**Deferred**

${exclusions.deferredAlternatives.map((item) => `- ${clean(item)}`).join("\n")}
`);

  if (evidence)
    sections.push(`## Evidence and risk

${evidence.dimensions.map((dimension) => `- **${clean(dimension.dimension)}** — ${label(dimension.state)}${dimension.note ? `: ${clean(dimension.note)}` : ""}`).join("\n")}

**Core assumption:** ${clean(evidence.coreAssumption)}
${evidence.preCycleTest.required ? `\n**Pre-cycle test required:** ${clean(evidence.preCycleTest.effect || "required")}${evidence.preCycleTest.resolved ? ` — resolved: ${clean(evidence.preCycleTest.resolved)}` : " — not yet resolved"}\n` : ""}`);

  if (exclusions)
    sections.push(`## What would reopen this decision

${exclusions.invalidationTriggers.map((trigger) => `- ${clean(trigger)}`).join("\n")}
`);

  if (decision)
    sections.push(`## Decision

**Decided by:** ${clean(decision.owner.name)} (${clean(decision.owner.role)})

**The decision:** ${clean(decision.exactDecision)}

**Next review trigger:** ${clean(decision.nextReviewTrigger)}
`);

  return sections.join("\n");
}

export const CD_DOCUMENT_KIND = "commercial-direction";
export const CD_RECEIPT_KIND = "receipt";
export const CD_HANDOFF_KIND = "handoff";
