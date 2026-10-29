import { ADVOCATE_CHALLENGES, FRICTION_SOURCES, type Commitments, type GridAction } from "./session";
import { ACTION_LABEL, FRICTION_LABEL } from "./rules";

/** Deterministic client document. Two shapes: the business position (Outcome A) and the
 * structured return (Outcome X). No model text is generated here — only the confirmed record. */
export function renderM03ClientDoc(commitments: Commitments): string {
  const date = commitments.updatedAt.slice(0, 10);
  const findings = commitments.upstream.m02Findings;

  if (commitments.outcome.outcome === "x" && commitments.outcome.returnDoc) {
    const returnDoc = commitments.outcome.returnDoc;
    return `# Business Commitments — return to upstream work

**Finding recorded ${date}.** This run did not produce a business position. That is a valid outcome: the checks caught upstream thinness before downstream work locked against it.

## What this work established

${commitments.outcome.statement}

## Where it returns

The work goes back to **${returnDoc.module === "01" ? "Founder Conviction Foundation" : "Market Reality Check"}**.

**What needs refining:** ${returnDoc.refineWhat}

**What this run produced that helps that work:** ${returnDoc.evidenceProduced}

## Instruction

Do not lock any Business Commitments output from this run for downstream use. Re-run this module after the upstream refinement lands.
${commitments.riskFlags.length ? `\n## What surfaced along the way\n\n${commitments.riskFlags.map((flag) => `- ${flag}`).join("\n")}\n` : ""}`;
  }

  const judgement = commitments.judgement;
  const riskRows = commitments.upstream.carriedForward.acknowledgedRisks
    .filter((risk) => risk.state === "present")
    .map(
      (risk) =>
        `- ${risk.label} — severity ${risk.severity ?? "unrecorded"} — routed to ${risk.routing === "m03" ? "this module" : (risk.routing ?? "unrouted")}${risk.landedIn ? ` (landed: ${risk.landedIn})` : ""}`,
    );

  return `# Business Commitments

**Status: Provisional** — builder-verified, not externally pressure-tested. Recorded ${date}; confirmed at each step by the named operator. Authorises viability-check work in hypothesis mode only — brand lock waits for external validation.

## What this work establishes

The market check found a real vacuum: ${findings.descriptiveDefault} This module turns that finding into the business position below — what we challenge, what we commit to proving, and what it costs competitors to follow.

## The challenge

**What the market believes:** ${commitments.beliefChallenge.industryDefault}

**What we believe:** ${commitments.beliefChallenge.coreBelief}

**Where they collide:**

${commitments.beliefChallenge.contradictions.map((contradiction) => `- ${contradiction}`).join("\n")}

**Genuine difference or contrarianism:** ${commitments.beliefChallenge.genuineVsContrarian}

## The shift we're asking customers to make

**FROM** "${commitments.journey.from}" **TO** "${commitments.journey.to}"

**What actually changes for them:** ${commitments.journey.experientialChange}

**How they discover the gap themselves:** ${commitments.journey.discoveryMechanism}

## The four moves

| Move | What we're doing | Why the belief requires it | How we'll prove it | The rule someone else can apply |
| --- | --- | --- | --- | --- |
${commitments.grid.map((row) => `| **${ACTION_LABEL[row.action]}** | ${row.move} | ${row.beliefRationale} | ${row.proofCommitment} | ${row.operationalRule} |`).join("\n")}

${commitments.grid
  .filter((row) => row.specialisationSignal || row.proofArtefactType)
  .map(
    (row) =>
      `- **${ACTION_LABEL[row.action]}** becomes visible through: ${row.specialisationSignal || row.proofArtefactType}`,
  )
  .join("\n")}

## The proof we carry

${commitments.proof
  .map(
    (row) => `### ${ACTION_LABEL[row.action]}

${[row.product && `**Product:** ${row.product}`, row.policy && `**Policy:** ${row.policy}`, row.story && `**Story:** ${row.story}`, row.framework && `**Framework:** ${row.framework}`].filter(Boolean).join("\n\n")}

*${row.proofEconomy?.replace(/-/g, " ") ?? "unrecorded"} · evidence ${row.evidenceStatus ?? "unrecorded"}*${row.capturePlan ? ` — capture plan: ${row.capturePlan}` : ""}
`,
  )
  .join("\n")}

## What it costs competitors to follow

${commitments.friction.rows
  .map(
    (row) => `### ${ACTION_LABEL[row.action]}

${FRICTION_SOURCES.map((source) => `- **${FRICTION_LABEL[source]}** — ${row.sources[source]?.level ?? "?"}: ${row.sources[source]?.note || "—"}`).join("\n")}
`,
  )
  .join("\n")}

**The real copy threat** is the competitor with the least to change: **${commitments.friction.lowestFrictionCompetitor}** — ${commitments.friction.lowestFrictionBasis}

${commitments.friction.threatAssessment}

## Where the position stands in the market

${commitments.credibility.referenceEvidence || "No independent reference evidence recorded yet."}

${commitments.credibility.state === "credible" ? "Market credibility is evidenced." : `Recorded as ${(commitments.credibility.state ?? "unrecorded").replace(/-/g, " ")}${commitments.credibility.cause ? ` — likely cause: ${commitments.credibility.cause}` : ""}${commitments.credibility.reviewCondition ? `. Review when: ${commitments.credibility.reviewCondition}` : ""}.`}

## What we've had to confront

${commitments.confrontations.pastAudit.length ? `**The last 12–24 months, audited against the belief:**\n\n${commitments.confrontations.pastAudit.map((row) => `- ${row.item} — belief says ${row.beliefSays ?? "?"}${row.decision ? `, decided: ${row.decision}` : ""}${row.note ? ` (${row.note})` : ""}`).join("\n")}` : "No past-behaviour contradictions were recorded."}

${commitments.confrontations.futureConfrontations.length ? `**Where we have to say no going forward:**\n\n${commitments.confrontations.futureConfrontations.map((item) => `- ${item}`).join("\n")}` : ""}

## What this commitment costs

${commitments.costOfCommitment.costs.map((cost) => `- ${cost}`).join("\n")}

## The hard questions, answered

${commitments.advocate.challenges
  .map(
    (challenge) =>
      `- **${ADVOCATE_CHALLENGES.find((entry) => entry.id === challenge.id)?.prompt}** — ${challenge.case}\n  Verdict: ${challenge.verdict === "survives" ? "the position survives this" : "the position does not survive this"}${challenge.note ? `. ${challenge.note}` : ""}`,
  )
  .join("\n")}

## The judgement

**Options considered:**
${judgement.optionsConsidered.map((option) => `- ${option}`).join("\n")}

**Recommendation:** ${judgement.recommendation}

**Confidence: ${judgement.confidence ?? "unrecorded"}** — ${judgement.confidenceBasis}

**What happens commercially:**
- If the commitment holds: ${judgement.commercialConsequences.ifHolds}
- If it doesn't: ${judgement.commercialConsequences.ifNot}
- If no decision is made: ${judgement.commercialConsequences.ifNoDecision}

**What would change this advice:** ${judgement.reversalConditions}

**Integrity check:** ${judgement.integrityCheck}

**The call:** ${(judgement.professionalCall ?? "").replace(/_/g, " ")} — ${judgement.nextWork}

## Boundaries and open questions

- The market evidence underneath is ${commitments.upstream.m02Outcome === "validated_a" ? "validated" : "provisional"}-grade (${commitments.upstream.m02RelianceScope || "as scoped upstream"}). This strategy inherits that ceiling — it authorises hypothesis-mode work downstream, not locked claims.
- The conviction this builds on is ${commitments.upstream.m01.lockState === "locked" ? "locked verbatim from the sealed Founder Conviction Foundation" : commitments.upstream.m01.lockState === "stale" ? "carried verbatim, but the upstream seal went stale — this position is non-binding until it re-seals" : "unverifiable upstream"}.
${commitments.riskFlags.length ? commitments.riskFlags.map((flag) => `- ${flag}`).join("\n") : "- No risk flags recorded."}
${riskRows.length ? `\n## Obligations carried forward\n\n${riskRows.join("\n")}` : ""}

## What moves forward

The viability check picks this up in hypothesis mode: the grid's operational rules, the proof commitments, the friction read and the journey draft. Nothing here is deployment-ready public positioning — proof points marked prospective or thin carry their capture plans with them.
`;
}

export const M03_DOCUMENT_KIND_A = "business-commitments";
export const M03_DOCUMENT_KIND_X = "business-commitments-return";

export function m03DocumentKind(outcome: "a" | "x"): string {
  return outcome === "a" ? M03_DOCUMENT_KIND_A : M03_DOCUMENT_KIND_X;
}

export function m03DocumentFilename(outcome: "a" | "x"): string {
  return outcome === "a" ? "03-business-commitments.md" : "03-outcome-x-return.md";
}

export type { GridAction };
