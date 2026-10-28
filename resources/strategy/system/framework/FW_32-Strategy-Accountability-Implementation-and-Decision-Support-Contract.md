---
id: FW_32
title: Strategy Accountability, Implementation and Decision Support Contract
description: Langfell uses one distributed accountability architecture, not a thirteenth numbered module.
type: framework-contract
status: approved
version: 1.4
date: 2026-10-04
approved-by: founder implementation instruction
approval-source-hash: 45dc70bfcc65d603e23eda0fc0a3ca354fdecf18940107829b8e8ddb421d030e
scope: material decisions, implementation consequences, cost drivers, measurement, evidence, review, investment and executive translation
depends-on:
- FW_05-Evidence-Validation.md
- FW_06-Framework-Architecture.md
- FW_23-Client-Output-Contract.md
- FW_24-Commercial-Direction-Contract.md
- FW_31-Reasoning-Communication-Production-Architecture.md
feeds-into:
- 00-Shared-Contracts.md
- ../templates/Commercial-Direction-Generator-Prompt.md
- ../11-Execution-Planning/11-Prompt.md
- ../12-Work-Coordination/12-Prompt.md
- ../templates/Evidence-and-Use-Record-Template.md
- ../templates/Indicative-Investment-Register-Template.md
- ../templates/Executive-Direction-Package-Generator-Prompt.md
---

# FW_32 — Strategy Accountability, Implementation and Decision Support Contract

## 1. Governing decision

Langfell uses one distributed accountability architecture, not a thirteenth numbered module.

> The owning authority creates a strategic decision and records its implementation consequences and measurement obligations. Planning makes those obligations operational; execution creates traceable evidence. Formal review prepares the next leadership decision. Executive outputs translate this chain without inventing missing information.

The governed sequence is:

```text
source
  → decision
  → implementation consequence
  → cost driver
  → implementation
  → evidence
  → review
  → next decision
```

The cost and measurement branches remain linked to the same source decision. Neither may invent strategic meaning.

### 1.1 Strategic judgement layer

Every material client recommendation must expose the professional judgement that connects evidence to a decision. Do not make the client infer the recommendation from analysis or mistake a well-described option for the recommended route.

Use this sequence:

```text
evidence
  → interpretation
  → credible options
  → assessment
  → recommendation
  → confidence for the named decision
  → commercial consequences
  → reversal conditions
  → client decision
```

For each material recommendation, record:

- the credible options considered, including continuation or no-action where it is genuinely credible;
- why the selected option is preferred and why the strongest alternatives were not selected now;
- recommendation confidence as `high`, `moderate` or `low`, explained by the supporting evidence, counterevidence, unknowns, reversibility and consequence—never by an invented score;
- what is likely to become possible if the recommendation holds, what is exposed if it does not, and what delay or no decision would mean;
- the exact evidence, event or operating condition that would weaken, reverse or reopen the recommendation;
- an integrity check asking whether conviction, evidence, claim limits, buyer scope or operating truth was softened merely to make the recommendation easier to build or sell; and
- one direct professional call: proceed, proceed conditionally, gather evidence, return or do not proceed.

Confidence describes the strength of the decision at its exact scope. It is not probability of success and must not imply demand, viability, financial return or outcome certainty. Options must be real enough that a responsible decision-maker could have chosen them; do not fabricate weak alternatives to make the recommendation appear inevitable.

Client outputs explain this judgement in ordinary business language. Internal option records, evidence links, confidence basis and reversal triggers remain traceable to their source owners.

## 2. Responsibility and field ownership

| Responsibility | Owner | May not do |
|---|---|---|
| Strategic meaning and decision | Owning source module or business authority | Transfer authority to a summary or later plan |
| Implementation consequence | Module whose decision causes the work | Set monetary rates |
| Intended effect and strategic measurement logic | Owning source module | Promise the intended effect |
| Current-cycle quantity, operational definition, baseline requirement, threshold, capacity and review condition | Module 11 | Redefine source meaning or invent an observed baseline |
| Schedule, evidence-capture task, missing-data handling and review preparation | Module 12 | Invent scope, measure, threshold or return point |
| Monetary conversion | Indicative Investment Register | Create missing work units or approve spend |
| Observed baseline and observation | Named evidence owner, supplying the Strategy Accountability and Evidence Record | Invent missing data or upgrade public claims automatically |
| Baseline, observation and formal review persistence | Strategy Accountability and Evidence Record | Replace the source or decision owner |
| Public claims | Claims Evidence Register plus required review | Treat one observation as validation |
| Executive translation | Transient validated Executive Signal set | Become a new source authority |

Strategic, production, publication, budget and spend approval are separate states. One never implies another.

## Starter plans and joined execution

Apply `FW_41`. Recommended Starter Plans arrange existing consequences, evidence obligations and specialist requirements without creating new strategy, Cost Drivers, quantities or monetary authority. Commercial Direction selects the joined portfolio; M11 records cross-functional action dispositions, human adoption, resource/dependency resolution and exact commitments; M12 integrates and schedules accepted choices. Preserve source IDs and hashes, recommendation class, separate human lifecycle, evidence limits and affected-only invalidation in the existing accountability transport.

## 3. Create once, inherit thereafter

Every material fact, decision, assumption, implementation consequence, cost driver, intended effect, baseline, observation and review decision is created once by its field owner.

Downstream work may inherit, select, quantify within its authority, schedule, observe, review, translate or render. It may not silently redefine.

Every dependant records the exact source ID, version or hash. A material source change creates a new version and marks affected contracts, plans, estimates, interpretations, signals and views stale. Historical records remain immutable.

## 4. Materiality and active-contract limit

A Decision Measurement Contract is required when a recommendation:

- changes public meaning, buyer movement, operational behaviour or delivery behaviour;
- authorises, defers or prohibits material work;
- commits significant time or expenditure;
- creates a claim leadership may later want to make;
- contains a stop, progression or return condition; or
- is necessary to judge the value of the engagement.

Do not create one contract per paragraph. Commercial Direction selects approximately five to twelve active contracts for the joined route. A different number requires a recorded complexity justification.

### 4.1 Proportional decision-materiality classification

Where Module 04 must determine economic-interrogation depth, it records the smallest useful classification in the Shared Context Envelope:

- `low`: bounded consequence, readily reversible, limited existing value exposed and no material legal, regulatory, contractual or cross-team dependency;
- `material`: meaningful capital, revenue, customer, capability, stakeholder or implementation exposure that warrants explicit consequence and evidence analysis; or
- `high_structural`: severe downside, difficult reversibility, major contractual or regulatory exposure, portfolio-wide effect, long implementation horizon or extensive organisational dependency.

The classification names the applicable indicators, evidence and uncertainty. It is not a numeric score and is not derived from company size. Unknown or conflicting materiality inputs require clarification or conservative depth; they must not be silently scored.

## 5. Required governed objects

### 5.1 Material decision

```yaml
decision:
  id:
  statement:
  source-authority:
  owner:
  state: accepted | assumed | conditional | deferred | unresolved | rejected | superseded | stale
  version:
  approval-event:
  dependencies: []
  assumption-ids: []
  implementation-consequence-ids: []
  decision-measurement-contract-ids: []
  review-triggers: []
  invalidation-triggers: []
  supersedes:
  affected-output-ids: []
  authorities:
    strategic:
    production:
    publication:
    budget:
    spend:
```

### 5.2 Assumption

```yaml
assumption:
  id:
  statement:
  category: commercial | activity | capacity | production | delivery | financial | evidence | review | measurement
  source-authority:
  owner:
  created-at:
  basis:
  evidence-state:
  confidence:
  test-or-decision:
  threshold-or-condition:
  expires-at:
  review-trigger:
  affected-output-ids: []
  state: proposed | controlled | tested | confirmed | rejected | stale | superseded
  supersedes:
```

Repetition does not upgrade an assumption to fact. Record whether `confirmed` means a successful named test or owner acceptance for a bounded planning use. Owner acceptance does not empirically confirm the assumption; preserve actual evidence state and the remaining test. Every planning number retains an assumption ID.

### 5.3 Implementation Consequence

```yaml
implementation-consequence:
  id:
  source-decision-id:
  source-authority:
  statement:
  necessity: required | optional | conditional | deferred | out-of-scope
  scope-state: defined | bounded | unresolved | prohibited
  implementation-owner:
  likely-role-types: []
  deliverable-or-work-type:
  production-standard:
  dependencies: []
  recurring-obligation:
    state:
    description:
  approval-boundaries:
    strategic:
    production:
    publication:
    budget:
    spend:
  implementation-proof:
  completion-evidence:
  review-trigger:
  invalidation-trigger:
```

### 5.4 Cost Driver

```yaml
cost-driver:
  id:
  consequence-id:
  driver-type:
  role-type:
  unit:
  low-units:
  high-units:
  complexity:
  delivery-model:
  frequency:
  quantity-source:
  confidence:
  estimate-permission: derivable | planning-allowance-only | not-yet-estimable | deferred
  missing-input:
  owner:
  review-trigger:
```

Source modules create work units, not money. Module 11 may attach current-cycle quantity or cadence. Module 12 may schedule work but cannot create scope or units. An unresolved production standard forces `not-yet-estimable`. Missing scope is never zero cost.

### 5.5 Decision Measurement Contract

```yaml
decision-measurement-contract:
  id:
  version:
  decision-id:
  decision-statement:
  owning-authority:
  decision-state:
  problem-addressed:
  diagnosis-evidence-refs: []
  diagnosis-contradiction:
  expected-effect:
    effect-type:
    statement:
    intended-beneficiaries: []
    earliest-reasonable-horizon:
    should-remain-unchanged:
    cannot-be-promised:
  implementation:
    consequence-ids: []
    required-actions: []
    owner:
    dependencies: []
    implementation-proof: []
  measurement-design:
    baseline-requirement:
    candidate-leading-indicators: []
    candidate-progression-indicators: []
    candidate-lagging-indicators: []
    qualitative-evidence-needed: []
    quantitative-evidence-needed: []
  attribution:
    maximum-claim-level:
    external-factors: []
    implementation-factors: []
    stronger-claim-evidence:
  review:
    evidence-owner:
    earliest-review:
    minimum-evidence-condition:
    strong-signal-decision:
    partial-signal-decision:
    weak-or-contradictory-decision:
    stop-condition:
    strategic-return-point:
  confidence:
  state: candidate | active | review-due | stale | superseded | closed
  invalidation-triggers: []
```

Expected effects must be observable but need not be numerical. Implementation proof tests fidelity, not outcome. Indicators must support a named decision. No baseline may be invented. Direct attribution is optional and normally unavailable.

## 6. Module-specific minimums

- **M00:** record provisional observations only; it creates no material decision or Decision Measurement Contract.
- **M01:** supply source-owned requirements and evidence for the later Foundation Use Contract, including faithful explanation and inheritance, practical decision use, owner reconstruction and contradictory briefing. M01 does not consume a future approved Foundation record or gain approval from it.
- **M02:** preserve diagnosis, counter-evidence and contradiction language as candidate baseline evidence; it does not treat market evidence as a realised business effect.
- **M03:** create contracts for material strategic choices and their return conditions.
- **M04:** bind economic assumptions, viability conditions and tripwires to named decisions; do not infer realised ROI.
- **Business Foundation:** create one Foundation Use Contract without reopening approved business-definition fields.
- **M05–M10:** create Implementation Consequences, Cost Drivers and Decision Measurement Contracts for material decisions in their owned domains.

## 7. Commercial Direction, Module 11 and Module 12

Commercial Direction inherits current consequences and contracts, selects a proportionate active set (approximately five to twelve as the working range in Section 4, with a different number justified by complexity), preserves their meaning and attribution ceilings, and classifies each as Active / First Phase, Next, Later, Conditional, Excluded / Not Now or Not Required. It records first-phase eligibility and creates only one joined-route contract for its own decision. It selects and explains a directional horizon and controlled-cycle horizon from the decision context; 90-day, six-month, twelve-month and 12–24 month horizons are useful only where proportionate. It does not invent domain measures, implementation scope, drivers, estimates or source return points.

Module 11 produces the **Strategic Accountability Plan** for only the Commercial Direction's Active / First Phase consequences. It owns current-cycle quantities, metric definitions, baseline requirements, thresholds, capacity assumptions, ownership commitments, external-factor fields and review conditions. Every quantitative measure records:

- exact event;
- numerator and denominator where the measure is a ratio; otherwise its applicable count, unit or quantity definition;
- inclusion and exclusion rules;
- source and period;
- frequency and owner;
- baseline state;
- minimum sample or period;
- threshold basis;
- missing-data rule;
- interpretation limit; and
- decision use.

Module 12 produces the **Measurement and Review Rhythm**. It schedules and tracks only authorised work, preserves exact M11 quantities, ownership commitments, route, proof actions and thresholds, captures missing or incomparable data, keeps observation separate from interpretation and prepares governed reviews. It never invents or changes measures, quantities, owners, routes, proof actions, thresholds, costs or strategic return points.

## 8. Baseline, observation and evidence rules

Supported baseline states are:

`measured`, `documented-qualitative`, `zero`, `not-applicable`, `unavailable`, `not-comparable`, `collection-pending`, `stale`.

`unavailable` blocks uplift and ROI claims but does not block prospective observation.

Every observation records contract, indicator, layer, event date, period, context, source, owner, exact material language, numerator and denominator where a ratio is relevant, or the applicable quantity definition, permission, confidence, interpretation limit, external factors and claim eligibility.

One extended Evidence and Use Record stores active contracts, baselines, implementation proof, observations, external factors, permissions, attribution, formal reviews, value categories and next decisions. Do not create separate baseline, observation or review registers.

## 9. Attribution and claims

Use this ladder:

1. hypothesis;
2. observation;
3. association;
4. contribution; and
5. direct attribution.

Each level requires stronger evidence. Contribution wording names other plausible factors. Direct attribution requires a suitable causal design. `validated-for-this-context` is bounded to the exact context, period, implementation and scope. One case does not establish scale.

Live evidence never upgrades a public claim automatically. The Claims Evidence Register and its required review remain the public-claim authority.

## 10. Fidelity before strategy judgement: review sequence and horizons

Before judging strategy:

1. check data definition and quality;
2. check implementation fidelity;
3. check minimum evidence sufficiency;
4. check context and external factors;
5. diagnose the progression layer;
6. test a local correction where warranted and permitted; and
7. return to the narrowest owning source when the evidence or governing condition requires it.

Decisive contrary evidence, a safety concern or a permission breach may require immediate return or stop. Do not delay that action to complete a local correction sequence.

Select review horizons and operating rhythms under FW_24 from the decision and evidence context. These calendar examples describe possible uses, not universal review dates:

| Horizon | Primary use |
|---|---|
| Weekly | fidelity, blockers, capture quality, capacity, claims, permissions and safety |
| 30 days | comprehension, early response, adoption, targeting, journey friction and implementation correction |
| 90 days | qualified progression, proposals, paid starts, early delivery, route contribution, capacity and permissions |
| Six months | completed delivery, client use, repeated handoffs, operational effects, fit-to-delivery and mature contribution evidence |
| Twelve months | commercial viability, repeated delivery quality, evidence strength, actual investment and value, capacity and next business-model decision |

A date alone does not make evidence sufficient.

## 11. Decision rules

- Strong signal with faithful implementation: recommend bounded continuation only where the recorded thresholds, conditions and current permission support it.
- Strong early signal with weak progression: review the transition, offer, qualification or next action.
- Weak signal with incomplete implementation: assess a permitted implementation correction, unless decisive contrary evidence or a stop/return condition takes precedence.
- Weak signal with faithful implementation and sufficient evidence: return to the narrowest owning strategy.
- Mixed evidence: preserve supported and contrary findings, then select an appropriate bounded test or correction. Change one variable where that design is useful; it is not compulsory for every mixed result.
- Outcome movement with unclear mechanism: record association.
- Claims, permission or safety breach: stop the affected activity immediately.

## 12. Investment and value

The Indicative Investment Register alone converts current Cost Drivers into money. Each entry retains consequence IDs, driver IDs, Decision Measurement Contract IDs, calculation, benchmark, confidence, exclusions, recurring element, approval state and review conditions.

Permitted value categories include commercial progression, operational return, risk reduction, decision quality, avoided rework, capability created, evidence created and strategic option value.

Financial ROI is calculated only when the baseline, included investment, financial benefit, period, comparison, attribution treatment, confidence and exclusions are credible. Otherwise state the supported non-financial value and the financial evidence still required.

## 13. Executive Signals

Executive Signals are transient validated conversion objects, not a permanent strategy register. Each signal records:

```yaml
executive-signal:
  id:
  executive-question:
  direct-answer:
  why-it-matters:
  source-decision-ids: []
  source-authority:
  accepted-state:
  evidence-state:
  confidence:
  implementation-consequence-ids: []
  decision-measurement-contract-ids: []
  investment-entry-ids: []
  implementation-state:
  baseline-state:
  current-signal:
  attribution-level:
  value-created:
  included-or-separate:
  owner:
  action-permitted-now:
  decision-required:
  review-trigger:
  return-condition:
  cannot-claim: []
  executive-destinations: []
  generated-from-hash:
  validation-state:
```

Persist only source IDs, hashes, destination, validation result and staleness conditions. A material conflict blocks the affected signal.

Generation order:

1. validated Executive Signal set;
2. Executive Strategic Overview;
3. Executive Strategic Report;
4. Markdown Executive Strategic Presentation from the passed Report and identical signal set;
5. Executive Accountability View only after a valid formal review.

## 14. Fail-closed conditions

When a material source is missing, stale, contradictory or outside the generator's authority:

- identify the conflict and field owner;
- mark affected dependants stale or incomplete;
- block unsupported estimation, interpretation or rendering; and
- require the correct owner decision.

Never select a source because it is newest, longest, most polished or easiest to narrate.

## 15. Validation requirements

An affected output fails when any of these are missing or invalid:

- source authority and exact version;
- decision consistency;
- assumption owner, basis, confidence, test and expiry;
- implementation consequence for material work;
- measure-to-effect and measure-to-decision link;
- quantitative event definition;
- explicit baseline state;
- fidelity check before strategy judgement;
- evidence sufficiency;
- attribution language;
- cost-driver and price-input derivation;
- separated approval states;
- evidence and review owner;
- stale propagation;
- one current Executive Signal set across executive outputs; or
- report-to-presentation identity.

Failure returns the issue to its owning source and blocks only the affected output or action unless the dependency is system-wide.

## Version notes

**Version 1.4 — 2026-10-04**

- Separated baseline requirements from observed evidence and owner-accepted assumptions from empirical confirmation.
- Removed the circular M01/Foundation dependency and reconciled proportional active sets, selected review horizons and ratio definitions.
- Made continuation and local correction conditional on evidence and permission, preserving immediate safety and upstream returns. Historical approval provenance remains unchanged.
