import {
  Context,
  ConvictionCost,
  MarketReadiness,
  HumanLoad,
  FinancialGrounding,
  Awareness,
  Recommendation,
  Decision,
  type M04Session,
} from "./contracts";
import { calculateM04 } from "./calculations";
const clean = (s: string) =>
  s
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(
      /\bM0[1-5]\b/g,
      (id) =>
        ({
          M01: "Founder Convictions",
          M02: "Market Reality",
          M03: "Business Commitments",
          M04: "Viability Check",
          M05: "Brand Strategy",
        })[id] ?? id,
    )
    .replace(/\b[a-f0-9]{64}\b/gi, "[private reference]")
    .trim();
export function renderM04(s: M04Session) {
  const c = Context.parse(s.data.context),
    cost = ConvictionCost.parse(s.data.convictionCost),
    market = MarketReadiness.parse(s.data.marketReadiness),
    human = HumanLoad.parse(s.data.humanLoad),
    f = FinancialGrounding.parse(s.data.financialGrounding),
    a = Awareness.parse(s.data.awareness),
    r = Recommendation.parse(s.data.recommendation),
    d = Decision.parse(s.data.decision);
  const list = (xs: string[]) =>
    xs.length ? xs.map((x) => `- ${clean(x)}`).join("\n") : "None recorded.";
  const p = String(s.routeAuthorization?.response_path ?? d.path);
  return `---
title: Viability Check
---
# Viability Check

Document details
: Part of | Business Groundwork
: Role | Informed viability decision
: Prepared for | ${clean(c.businessForm)}
: Issued | ${new Date().toISOString().slice(0, 10)}
: Version | ${s.revision}
: Status | Decision recorded; evidence remains provisional
: Decision | ${p}

> **Boundary:** This document records the costs considered and the chosen path. It does not predict commercial success or authorise subsequent strategy, production or spending.

## What this work establishes
---

${clean(c.currentOffer)}

${clean(c.buyer)} buys ${clean(c.receives)} in ${clean(c.geography)}. ${clean(c.customerOutcome)}

The decision concerns ${clean(c.plannedOffer)}. It was considered by ${clean(c.decisionOwner)} with ${clean(c.resources)}. Existing value at risk: ${clean(c.existingValueAtRisk)}. Reversibility: ${clean(c.reversibility)}.

## The current finding
---

### Recommendation
${clean(r.recommendation)}

${clean(r.rationale)}

Confidence: ${r.confidence}. ${clean(r.confidenceBasis)}

### The decision
**${p}.** ${clean(d.rationale)}

${d.response === "override" ? "The decision differs from the recommendation; its stated risks and limitations remain." : ""}
${s.routeAuthorization?.contested ? "The decision proceeds against the risk tilt without three complete switching findings. The limitation remains visible: " + clean(d.inabilityReason) : ""}

### Alternatives considered
${r.routes
  .map(
    (x) =>
      `**${x.description}.** Conviction: ${x.conviction} Market support: ${x.marketSupport} Capacity: ${x.capacity} Economics: ${x.economics} Human load: ${x.humanLoad} Reversibility: ${x.reversibility} Risk: ${x.risk}`,
  )
  .map(clean)
  .join("\n\n")}

${clean(r.unavailableAlternatives)}

## What supports it
---

### Commitment and full cost
${cost.rows.map((x) => `**${clean(x.requirement)}:** ${clean(x.costFinding)} (${x.costType}). ${clean(x.customerEffect)}`).join("\n\n")}

${clean(cost.profitOnlyComparison)} ${clean(cost.comparisonBasis)}

### Market readiness
${clean(market.inheritedFinding)}

${clean(market.interpretation)} Education period: ${clean(market.educationPeriod)}. Reachable segment: ${clean(market.segmentSize)}; ${clean(market.reachability)}; ${clean(market.growth)}.

### Human and organisational sustainability
${human.principals.map((x) => `**${clean(x.name)}.** ${clean(x.timeToRevenue)}; ${clean(x.gapReason)}. Energy: ${clean(x.energySource)}; ${clean(x.energySustainability)}. Emotional load: ${clean(x.emotionalReadiness)}. Relationships: ${clean(x.relationshipImpact)}. Opportunity cost: ${clean(x.opportunityCost)}. Simpler route: ${clean(x.simplerPath)}. Why this route: ${clean(x.whyThisPath)}. Capacity: ${clean(x.capacity)}. What breaks first: ${clean(x.breaksFirst)}.`).join("\n\n")}

${clean(human.organisationalLoad)}

### Financial grounding
${f.inputs
  .map((raw) => {
    const x = raw as {
      name: string;
      input_type: string;
      value_or_range: unknown;
      unit: string;
      period: string;
      source_ref: string;
    };
    return `- ${clean(x.name)}: ${x.input_type === "unknown" ? "unknown" : JSON.stringify(x.value_or_range)} ${clean(x.unit)} per ${clean(x.period)} (${x.input_type}).`;
  })
  .join("\n")}

${calculateM04(f)
  .map((x) => {
    const v = x.result as { status: string; value?: unknown; limitations?: string[] };
    return `- ${clean(x.kind)}: ${v.status}${v.value !== undefined ? "; " + JSON.stringify(v.value) : ""}. ${(v.limitations ?? []).join(" ")} Basis: ${clean(x.declaredFormula ?? "Not estimable")}. ${clean(x.assumptions ?? "")}`;
  })
  .join("\n")}

Economic floor: ${clean(f.economicFloor)}. Protected commitment floor: ${clean(f.convictionFloor)}.

Largest assumption: ${clean(f.biggestAssumption)}. Evidence: ${clean(f.evidence)}. If wrong: ${clean(f.ifWrong)}. ${clean(f.investmentLimit)}

### Consideration
${clean(a.fullPicture)} ${clean(a.proportionality)}

${clean(a.weighingAccount)}

${a.markers
  .map((x) => `${clean(x.finding)} ${clean(x.consequence)} Further work: ${clean(x.moreToDo)}`)
  .filter((x, i, all) => all.indexOf(x) === i)
  .join("\n\n")}

## Boundaries and open questions
---

${list(r.unresolvedEvidence)}

Assumptions:
${list(r.assumptions)}

If the recommendation holds: ${clean(r.ifHolds)}. If it fails: ${clean(r.ifFails)}. If no decision is taken: ${clean(r.ifNoDecision)}.

Pricing: ${clean(f.pricing.finding)}. ${clean(f.pricing.conditions)} ${clean(f.pricing.claimsBoundary)}

${f.offers.map((x) => `${clean(x.suppliedOffer)}: ${x.feasibility}. ${clean(x.conditions)} ${clean(x.exclusions)}`).join("\n\n")}

${f.bridge.applicable ? `A bridge needs to ${clean(f.bridge.job)}. Resources: ${clean(f.bridge.resources)}. Evidence of movement: ${clean(f.bridge.evidenceEvent)}. ${clean(f.bridge.limits)}` : ""}

## What moves forward
---

First: ${clean(r.first)}. Second: ${clean(r.second)}. Deferred: ${clean(r.deferred)}.

${clean(r.professionalCall)}

${p === "Adjust the Path" ? `The changed premise must be reconciled upstream before this work resumes: ${clean(d.changedPremise)}.` : p === "Wait" ? `Work remains waiting until ${clean(d.reEntryTrigger)}.` : p === "Walk Away" ? "This route is closed. A different proposal needs a new decision." : p === "Accept the Constraint" ? `Only the named non-commercial form is in scope: ${clean(d.reducedName)}.` : "Only evidence-bounded hypothesis work is supported by the present findings."}

Allowed preparation:
${list(((s.routeAuthorization?.allowed_outputs as string[]) ?? []).map((x) => (x.startsWith("reduced-") ? "Preparation for the named non-commercial form" : x)))}

Review: ${clean(d.reviewDate)}. Reconsider when: ${clean(r.reversalConditions)}. Re-entry: ${clean(d.reEntryTrigger)}. Closure: ${clean(d.closureCondition)}.

The separate Business Foundation assessment and approval remain to be completed before brand work can rely on these findings.
`;
}
