---
id: 03-Quality-Gates
title: Module 03 Quality Gates
description: Client-language translation gate - Apply FW_27 before passing a client-facing output.
type: module-quality-gates
version: 3.0
last-updated: 2026-09-29
status: active
depends-on:
- 03-Prompt
- 03-Handoff-Pack
- 01-Handoff-Pack
- 02-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 03-Handoff-Pack
- 04-README
---

# Quality Gates: Business Commitments

> **Client-language translation gate:** Apply `FW_27` before passing a client-facing output. Fail if a client has to decode framework terminology to state the strategy, why it was chosen and what would change it.

> **Meaning Record gate:** Apply `FW_35`. Fail a material selected strategy when its grounded situation, trade-off, founder confirmation or return condition is missing.

> **Strategic judgement gate:** Fail a material recommendation when the client cannot see the credible alternatives, why one is recommended, confidence for the named decision, commercial consequences, reversal conditions, integrity result and direct professional call.

## FW_32 accountability gate

For every material accepted decision, require:

- an exact decision ID;
- complete Implementation Consequences;
- non-monetary Cost Drivers; and
- a Decision Measurement Contract covering intended effect, implementation proof, baseline requirement, evidence, attribution ceiling, evidence owner, review decisions, stop condition and narrowest return point.

Fail invented current-cycle quantities, monetary rates, promised effects or collapsed approval states.

**Module 03 DeMode™**
_Ensuring Your Positioning Is Defensible_

---

## What This Document Does

This document defines the pass/fail criteria for Module 03. Before proceeding to Module 04, your Business Commitments must meet these standards. Module 05 cannot lock until M03 is Validated and M04 has produced a full-standard RouteAuthorization.

**How to use:** Review each gate after completing `03-Prompt.md`. `03_01-Conviction-Frontier.md` is deprecated. If you fail any gate, go back and strengthen your strategy before proceeding.

**Reality check:** These gates ensure you're building defensible positioning, not just differentiation. Weak strategy collapses when competitors copy features or customers challenge claims.

### Commitment scope and adaptation gate

Pass only when:

- every material commitment names its authorised scope and decision owner;
- each deeper question cites `M03-AQ-01`, `M03-AQ-02` or `M03-AQ-03` and an explicit trigger; and
- the accepted finding is recorded in the existing Grid, Friction, Cost or Candidate Decision field.

Fail routing based on company size, free-form question generation, economic modelling inside M03, committee-synthesised belief or any runtime question passed downstream as authority.

### Strategic judgement completion check

Pass only when:

- two or more genuinely credible routes were assessed separately, or the document explains why only one lawful route remains;
- the recommendation is direct and its rationale distinguishes it from the strongest alternative;
- confidence is `high`, `moderate` or `low` and its basis is evidence-led rather than an invented numeric score;
- consequences cover `if it holds`, `if it does not` and `if no decision is made` without promising outcomes;
- reversal conditions are observable and return to a named owner;
- the integrity check confirms that belief, buyer, evidence, claims and operating boundaries were not softened for convenience; and
- the final professional call names the exact next work or return route.

Fail if the recommended option is made inevitable by straw alternatives, confidence is presented as probability of success, or commercial stakes are filled with unsupported financial claims.

## Gate Dependency Order

The gates are **sequential-conditional**: later ones only become meaningful once earlier ones pass. Work them in order:

1. Gate 1 (Belief Authority) — gates everything. No authorising belief, nothing else holds.
2. Gate 2 (Proof Match) — gates Gate 5; every Grid row needs a proof commitment.
3. Gate 4A (FROM-Reality) — gates 4B and 4C. Without an evidenced FROM, the rest of the shift is built in air.
4. Gate 4B (TO-Liberation) — gates 4C.
5. Gate 4C (Experiential Change).
6. Gate 3 (Friction) — depends on Gate 5; friction comes from the Grid's subtractive moves.
7. Gate 5 (Grid Completeness) — depends on Gates 1 and 2.
8. Gate 5.5 (Grid Coherence) — depends on Gate 5 and on Module 01 Core Belief being the single thread.
9. Gate 7 (Meaningful Divergence) — depends on Module 02 customer-importance evidence.
10. Gate 8 (Belief Spectrum Readiness) — depends on Gate 4A's customer evidence.
11. Gate 6 (Validation Standard) — synthesis gate; depends on all the above.

Resolve an earlier failure before working on the gates that depend on it. For example, do not work on Gate 5.5 while Gate 1 remains weak.

---

## Runtime Authority Check

This check controls reliance without changing the strategy gates:

- failed M01/M02 entry emits only a dependency notice and no strategy-shaped output;
- the exact current M01 belief remains the identity-level authority; M02 evidence may pressure-test it but may not rewrite it;
- the M02 outcome and `reliance_ceiling` cap every derived strategy state;
- a Provisional M02 Outcome A with `hypothesis_only` reliance permits provisional construction; an unauthorised lock request stops only the lock or validation claim, not the whole module;
- market evidence that conflicts with belief is recorded as friction or a named upstream return question, not silently absorbed or ignored;
- bounded output states name builder verification and external-validation status explicitly; `candidate` alone is insufficient when those facts are supplied;
- prior strategy must be current, source-mapped and either rerun through each applicable gate or carry equivalent gate evidence;
- competing candidates remain separate until a named founder decision event;
- `Provisional` has `reliance_scope: module_04_hypothesis_only`;
- `Validated` remains bounded to its recorded market, strategy version and evidence scope;
- Outcome X cannot create an authorised Module 03 Handoff;
- a version lock does not upgrade evidence, approval or reliance.

---

## Quality Gate 1: Belief Authority

**Criteria:** Your positioning derives from an owner-confirmed governing commitment, not contrarianism; relevant choices, evidence and unresolved tests remain explicit.

| Pass                                                                                                                         | Fail                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The current Module 01 source and applied conviction authorise this positioning; the decision owner, trade-off and challenge conditions are clear | Your positioning is "different because different," the source is inferred rather than confirmed, or contrary evidence and uncertainty are suppressed |

**Test:** Trace each material positioning choice to the current Module 01 source and applied conviction. Record past costly choices as evidence where they exist; if the commitment is prospective, state the trade-off and how enactment will be captured and reviewed. Market evidence tests market claims and fit, not ownership of the source.

**Action if Fail:** Return to Module 01 when the source, decision force or authority is unclear. If the source is clear but prospective, keep the applicable output provisional and preserve its test plan; do not invent historical proof.

---

## Quality Gate 2: Proof Match Test

**Criteria:** Every proposed claim is paired with evidence of a type, strength, provenance and inspectability proportionate to the claim and its consequence. A count of three may be recorded as a bounded triangulation heuristic; it does not pass the gate by itself.

| Pass                                                                                                             | Fail                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Each proposed claim names specific evidence, provenance, limitations and the sentence it earns; provisional gaps have a capture and review plan; relevant market-facing commitments name a substantive Named Framework / Diagnostic or equivalent deployable proof artefact | Proof is vague ("we care about quality"); company-owned material is treated as independent validation; a branded name has no substantive method; evidence strength does not match the public claim; no specific demonstration or capture plan exists |

**Test:** For each proof point, ask: "What would I show someone who challenged this, and through what artefact could they inspect or use it?" Distinguish discrete Proof-at-Cost from compounding public proof. If neither the evidence nor its visible form can be named, you fail.

**Action if Fail:** Narrow or withhold the claim. Define the missing evidence, its provenance and a capture and review plan. Use the relevant questions:

- **Product or process:** Which feature, limitation or delivery method enacts the belief?
- **Policy:** Which rule makes the commitment inspectable?
- **Adherence or outcome:** What shows that the rule held, or what happened when it met reality?
- **Independent corroboration:** What can someone outside the business verify?

---

## Quality Gate 3: Friction Assessment

**Criteria:** You've identified why competitors will find your positioning costly to copy.

| Pass                                                                                                                                                                 | Fail                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| You can name specific friction sources (belief contradiction, operational change, cultural shift, customer explanation, economic cost, accumulated proof and earned specialist authority where relevant); you've estimated how long friction buys you | You claim "they can't copy us" without explaining why; a named method is treated as a moat; you haven't considered the continuing cost of maintaining proof |

**Test:** Imagine your positioning succeeds. What would it cost Competitor X to follow you? If the answer is "they'd just add a feature," you fail.

**Action if Fail:** Study the Friction Principle in `03-Philosophy.md`. Identify what your competitors would need to change -- not just features, but beliefs, operations, culture. Quantify the cost.

---

## Quality Gate 4: Belief Shift Clarity (Three Sub-Checks)

**Criteria:** The Belief Shift FROM → TO makes three distinct claims. Each must pass its own test.

### 4A. FROM-Reality Test

**Criteria:** The FROM belief is what customers _actually_ hold, evidenced by Module 02's customer research -- not a strawman constructed to be easy to challenge.

| Pass | Fail |
| -- | -- |
| The FROM belief can be cited in customers' own language from Module 02 interviews, reviews, or forum posts; customers would recognise themselves in it | FROM is a caricature; no customer evidence supports it; the FROM belief sounds like what a marketer would say customers believe, not what customers actually say |

**Test:** Point to at least 3 specific customer artifacts (from Module 02) that express the FROM belief in the customer's own words. If you can't, you fail.

### 4B. TO-Liberation Test

**Criteria:** The TO belief is liberating, not just different. It removes a constraint the FROM belief imposed.

| Pass | Fail |
| -- | -- |
| The TO belief enables something the FROM belief prevented; customers moving FROM → TO gain capability, clarity, or freedom they didn't have | The TO is just the inverse of the FROM without liberation; swapping one constraint for another; TO sounds clever but doesn't free the customer |

**Test:** Complete the sentence: "Once a customer holds the TO belief, they can now [specific capability/outcome] which they could not when holding the FROM." If the completion is empty or trivial, you fail.

### 4C. Experiential Change Test (Tylenol Test)

**Criteria:** The shift produces measurably different customer outcomes, not cosmetic belief relabelling.

| Pass | Fail |
| -- | -- |
| You can describe what changes in the customer's actual experience, decisions, or results when they hold the TO instead of the FROM | Experience is identical; the shift is cosmetic; you're describing a marketing pivot, not a belief change |

**Test:** Apply the Tylenol test from `03-Philosophy.md`. Ask: "If a customer truly believed the TO instead of the FROM, what would be different in their actual experience?" If nothing meaningful changes, you fail.

**Action if Any 4A/4B/4C Fail:**

- 4A fail → the issue is usually upstream in Module 02 customer evidence. Return to Module 02 and gather customer language that reveals the actual FROM belief.
- 4B fail → reconsider whether the TO is a genuine liberation or just an inverse. A real TO belief opens a door, not just rearranges the room.
- 4C fail → the Belief Shift is cosmetic. Ask what the customer would _do_ differently, not just think differently.

### 4D. Discovery Mechanism Test

**Criteria:** The customer has a credible way to discover the FROM/TO distinction rather than only being told it.

**Test:** Name what a diagnostic, comparison, assessment, demonstration or structured question must reveal. If no mechanism is appropriate, name the observable experience that performs the same job. Module 07 may design the final conversation mechanic; Module 03 must define what it needs to reveal.

---

## Quality Gate 5: Conviction Grid Completeness (Asymmetric Weighting)

**Criteria:** Your four strategic actions (Question / Reject / Commit / Introduce) are all grounded in belief rationale and proof commitment — *with stronger evidence required on the subtractive moves (Question and Reject)*, per the Subtractive section in `03-Philosophy.md`.

| Pass | Fail |
| -- | -- |
| **Question and Reject** each carry: (a) belief rationale traced to the Core Belief; (b) proof commitment that demonstrates the refusal *at cost*; (c) named downstream lock; and (d) Public Specialisation Signal making the refusal externally observable. **Commit and Introduce** each carry belief rationale, specific proof commitment, a deployable proof artefact type and alignment with the subtractive moves they complete. | Question or Reject is invisible outside the strategy; a move has no documented cost; subtractive moves are rhetorical; or Commit/Introduce names no artefact through which the proof could become visible |

**Test:** For Question and Reject, ask: "What does the builder give up to honour this move, and where downstream is the refusal locked in?" If you can't name both the cost and the downstream lock, the subtractive move is weak. Under pressure, the strategy will revert to additive mode. For Commit and Introduce, the lighter test still applies: belief rationale plus proof commitment, present and specific.

**Action if Fail:** Weak Question/Reject usually means the builder isn't actually willing to pay the cost of the refusal. Return to Module 01's Non-Negotiable and the Four Signals — especially Sacrificial Signal — and test whether the Core Belief really authorises this rejection. Weak Commit/Introduce is usually a writing fix: add belief rationale and proof commitment using the Conviction Grid section in `03-Philosophy.md`.

### Market credibility condition

Record Strategic Lock and Market Credibility separately. Thin independent reference, specialty recognition, qualified inbound, framework reuse/citation, prospect recognition or builder association creates a `credibility-gap` with a named cause and review condition. It does not automatically reopen the Grid.

---

## Quality Gate 5.5: Grid Coherence

**Criteria:** The four Conviction Grid moves, read together, tell one positioning story authorised by a single Core Belief. They are not four independent strategies wearing the same label.

Individual moves can pass Gate 5 while the Grid as a whole remains fragmented. Module 01’s Quality Gate 2 tests whether its four conviction elements cohere; this gate applies the same principle to the four Grid moves.

| Pass | Fail |
| -- | -- |
| The Core Belief threads visibly through all four moves; a reader who saw only one move could guess the other three; the four moves together produce one positioning, not four | Each move traces to a different rationale; the four moves feel like separate strategies sharing a template; a reader can't recover the Core Belief from reading the grid |

**Test:** Read the four moves aloud in sequence. Write one sentence summarising the positioning they collectively define. If the sentence feels forced, if you find yourself needing "and also" to glue moves together, the grid is fragmented.

**Action if Fail:** Find the move whose rationale differs from the others. Revise it to follow from the Core Belief, or replace it with a move that does. All four moves must support one position.

---

## Quality Gate 6: Validation Standard

**Criteria:** You can make the complete validation statement with confidence.

| Pass                                                                                                                                                                                                                                                                                                                                                              | Fail                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| You can say: "We are positioned on the conviction that [belief]. We will prove this by [proof 1], [proof 2], and [proof 3]. Competitors would need to change [systemic element] to follow us, which is costly because [specific reason]. This creates a Belief Shift Journey FROM '[old belief]' TO '[new belief]' that [target customers] are ready to embrace." | Any element of the statement is missing, vague, or uncertain |

**Test:** Literally speak the validation statement out loud. If any part feels forced or incomplete, you fail.

**Action if Fail:** The specific part you can't complete tells you where to focus. Missing proof? Work on Gate 2. Unclear friction? Work on Gate 3. Vague Belief Shift? Work on Gate 4 (check which sub-gate). Fragmented grid? Work on Gate 5.5.

---

## Quality Gate 7: Meaningful Divergence

**Criteria:** Your positioning diverges from industry consensus on factors customers care about -- not on factors chosen to inflate a divergence score.

Previous framework iterations used a 70% Divergence Threshold as a numeric gate. That number carries no independent justification; it's a heuristic. This gate replaces the numeric threshold with the underlying question it was trying to answer.

| Pass | Fail |
| -- | -- |
| Where you diverge from consensus is where customers feel the pain identified in Module 02; divergence concentrates on customer-important dimensions | Divergence is spread across many low-importance dimensions; positioning differs in ways customers can't detect or don't value; divergence score is mathematically high but practically hollow |

**Test:** For each dimension where you diverge from consensus, ask: "Would a customer feeling the Module 02 pain notice this difference, and would noticing it matter to them?" If the answer is no on most dimensions, you fail.

**Regulated or Standardised Markets Note:** In industries where most factors are regulated (utilities, insurance, airlines) or standardised (commodity categories), the space for divergence is structurally constrained. Low divergence on many dimensions can still be genuine Business Commitments if divergence is concentrated on the few dimensions that remain open and that customers care about. Document the constraint explicitly rather than padding divergence artificially.

**Action if Fail:** Re-examine your Divergence Map. Rank dimensions by Module 02 customer-importance evidence. Concentrate positioning on the top-ranked dimensions where customers actually feel pain. Drop divergence on dimensions that don't touch customer experience.

---

## Quality Gate 8: Belief Spectrum Readiness

**Criteria:** A named target segment is *currently ready* to receive the Belief Shift. A coherent strategy becomes useful only when an audience is ready to hear it. Establish readiness here; do not defer it to marketing.

The Glossary's *Belief Spectrum Readiness* term is promoted to a gate by this check. Module 02's Belief-Ready Segment is the input. This gate confirms that segment is non-empty, evidenced, and reachable.

| Pass | Fail |
| -- | -- |
| You can name a specific segment (from Module 02's Belief-Ready Segment output) that already exhibits language, behaviour, or purchase signals consistent with the FROM belief being unstable for them; the segment is sized non-trivially relative to the unit-economics floor sketched for Module 04; you can describe how this segment is reachable (channel, gathering place, observable behaviour) | The segment is hypothetical or generic ("anyone frustrated with X"); no Module 02 evidence supports current readiness; the strategy assumes readiness can be manufactured by marketing rather than discovered in an existing population; the segment is too small to support unit economics regardless of conversion |

**Test:** Write one sentence: "The segment ready to hear our TO belief today is [specific segment], evidenced by [signal from Module 02], and we can reach them by [specific channel/method]." If you cannot complete the sentence with specifics, you fail.

**Worked examples:**

- **Pass:** "The segment ready to hear our TO belief today is UK independent EV installers serving fleet depots, evidenced by Module 02 review/interview signals that they are tired of vendor lock-in and multi-vendor maintenance, and reachable through trade associations, depot-owner referrals, and installation forums."
- **Fail:** "The segment ready to hear our TO belief today is anyone frustrated with EV software." That is a mood, not a segment. It has no specific evidence, no economic size, and no reachable gathering place.

**Action if Fail:** This usually traces upstream to Module 02. No Belief-Ready Segment there means the vacuum exists for builders who don't need to reach customers today — that's a different business model. Return to Module 02 and do one of two things: narrow scope to a segment where readiness is evidenced, or accept that the strategy needs a longer market-education runway and route to Module 04 with that runway costed in.

---

## Final Checkpoint

Module 03 produces one of two pass states, mirroring Module 02. Both are valid. The distinction governs which downstream commitments are authorised.

There is no third "Minimum Viable Module 03" pass state. A light Orientation Scan can review Gates 1, 2, 5, and 6 to decide whether deeper work is worth starting, but it cannot produce a Handoff Pack and cannot authorise Modules 04 or 05. **Provisional is the minimum authorising pass state.**

### Pass State A — Provisional: Strategy Defined, Builder-Verified

**Gates 1–7 + 5.5 + 8 all pass on internal review.** The strategy is internally complete: every belief has rationale and proof, every Grid move is coherent with the Core Belief, the Belief Shift is non-cosmetic, divergence is meaningful, and a ready segment exists. You can proceed to Module 04 (Viability Check) in hypothesis mode. **You can't yet lock Module 05** — the brand anchor that Modules 06–10 import from — because Module 05 is expensive to reverse and Provisional has not yet been pressure-tested by anyone outside the builder.

### Pass State B — Validated: Strategy Externally Pressure-Tested

**All conditions for Provisional pass, plus the three Validation Tests below:**

Apply FW_03 to the next decision and preserve the evidence status of each Grid row. A new practice may remain prospective while the strategic choice is Validated, provided it has an owner, portable rule, plausible mechanism, cost or trade-off, and capture/review plan. One historical Story Proof per action is not universally required.

Missing enactment still prevents claims of demonstrated adherence or outcomes. It also blocks any next decision that depends on that evidence. Keep those limits explicit in the handoff; the overall pass label cannot erase them.

- **Devil's-Advocate Test.** A good-faith defender of the Vulnerable Default — ideally someone with competitor-perspective experience; if unavailable, the builder writes the defender's strongest case in detail and rebuts it in writing — could not rebut your Conviction Grid with evidence. Their best arguments fail against your proof commitments.
- **Customer Falsification Test.** At least one round of customer-evidenced FROM/TO falsification (interviews, surveys, or behavioural observation in the Belief-Ready Segment) did not invalidate the Belief Shift. The point of the test is to *disprove* the shift, not confirm it. Confirming evidence collected without falsification design doesn't count.
- **Friction-Realism Cross-Check.** An outside operator — someone who would credibly have to execute the copy if a competitor asked them to — confirms the friction cost is real, not wishful. This catches the Friction Fantasy that internal review systematically misses. If no outside operator is available, the solo-operator fallback is a documented **Friction War-Game Substitute**: write the competitor's strongest practical copy plan, name the people/process/assets they would need to change, identify the easiest low-friction copy route, and answer why that route would still fail or weaken them. Mark the result as a solo substitute in the Handoff Pack. It is weaker than an outside read, but stronger than pretending the friction was tested.

**Validated is what unlocks Module 05 lock** and any resource commitment that's expensive to reverse.

### Outcome X — Strategy Cannot Be Locked (Upstream Refinement Required)

**Fires when Module 03's own checks reveal a fundamental upstream problem the Conviction Grid cannot survive.** This is not a failed gate. It is the framework working as designed — catching upstream thinness *before* downstream work locks against it.

Triggers (any one is sufficient):

- **Contrarian Trap flag inherited from Module 02 Step 9.** The vacuum claim was already flagged upstream as a probable Contrarian Trap (rejecting the Default for being common, contrarianism for its own sake, vacuum not grounded in evidenced pain, or rebuttal relying on opinion). Module 03 must not build a Conviction Grid on a flagged Hidden Truth.
- **Step 8b Advocate Challenge #1 fails.** The strongest case for the Industry Default is more defensible than the user's rebuttal — the Hidden Truth doesn't survive its own challenge.
- **Step 8b Advocate Challenge #3 fails.** The positioning is preference, not positioning — no customer value claim, only founder taste.
- **Friction Analysis lowest-friction check fails AND no real differentiation against the lowest-friction competitor.** Step 6's friction table shows the realistic copy-threat has low friction and the positioning has no separate defence against it.

**Output of Outcome X:** A structured return-to-upstream document, not a Business Commitments strategy. It contains:

- (a) Which upstream module to return to (01 or 02).
- (b) What specifically needs refining (Hidden Truth, Core Belief, Broken Thing, vacuum candidate, etc.).
- (c) The evidence Module 03's run produced that the upstream work needs.
- (d) Explicit instruction not to lock any Module 03 output for downstream consumption. Modules 04–10 must not import provisional Module 03 outputs from an Outcome X run.

**Routing:** Outcome X → Module 01 or Module 02 (per trigger). Re-run Module 03 only after the upstream refinement is locked. The work done in this Module 03 run is not wasted — it becomes the evidence base for the upstream refinement.

**Honest Position:** Outcome X saves the builder the 4–6 hours of grid construction on a suspect foundation, plus the much larger downstream cost of Modules 04–10 building on top. It mirrors Module 02's Outcome C — "Hidden Truth Not Evidenced" — at the Business Commitments level. Both are pass states of the framework, not failures of the builder.

### Pass State Not Reached

**Any internal gate failed:** Don't proceed. Address failed gates in the dependency order above, earliest first. Use the Upstream Iteration Map below to see whether the fix lives in Module 03 or upstream.

**Validation Test failed:** Downgrade to Provisional, fix what the test surfaced, then re-run the Validation Tests. A Validation Test failure is not a Module 03 failure. It's information — the strategy needs strengthening before downstream lock.

**Honest Position:** A failed gate or failed Validation Test is information, not failure. Provisional is a genuine pass state — it's the honest description of where confidence sits before external pressure-testing. Better to find gaps now than to find them when Module 05 has been locked and Modules 06–10 are inheriting weak positioning.

**All Gates Passed:** You are ready to proceed to Module 04 (Viability Check). Your Business Commitments is defensible and belief-grounded.

---

## Upstream Iteration Map

When a Module 03 gate fails, check whether the remedy belongs here or in an earlier module. Returning upstream is an expected part of resolving weak inputs.

| If this gate fails... | First check... | Likely upstream fix |
| -- | -- | -- |
| **Gate 1: Belief Authority** | Module 01 Core Belief | Return to Module 01; strengthen Core Belief via the Four Signals (Temporal / Sacrificial / Experiential / Psychological) |
| **Gate 2: Proof Match Test** | Module 01 Non-Negotiable | Check whether the commitment is prospective or enacted; match claims to available evidence and retain the declared capture/review plan |
| **Gate 3: Friction Assessment** | Module 02 Vulnerable Default | If the default isn't truly Vulnerable, copying will be cheap; return to Module 02 Gate 5 |
| **Gate 4A: FROM-Reality** | Module 02 customer evidence | Customer language is thin; return to Module 02 and gather interview/review evidence in customers' own words |
| **Gate 4B: TO-Liberation** | Module 01 Hidden Truth and Module 03 itself | If the Hidden Truth doesn't imply a liberation, the TO won't either; may require iteration in Module 01 |
| **Gate 4C: Experiential Change** | Module 03 itself | Usually within-module; sharpen the Belief Shift until the experiential difference is concrete |
| **Gate 5: Grid Completeness** | Module 03 itself | Within-module; add missing belief rationale or proof commitment |
| **Gate 5.5: Grid Coherence** | Module 01 Core Belief OR Module 03 itself | If the Core Belief isn't the single thread, the grid can't cohere; check Module 01 first |
| **Gate 7: Meaningful Divergence** | Module 02 customer pain evidence | Divergence needs to concentrate on customer-important dimensions; Module 02 evidence tells you which those are |
| **Gate 8: Belief Spectrum Readiness** | Module 02 Belief-Ready Segment | No evidenced ready segment in Module 02; either narrow scope to a segment where readiness is evidenced, or accept a longer market-education runway and route to Module 04 with the runway costed in |

Module 03 turns upstream conviction into positioning. When that fails, check the conviction and market evidence before revising the positioning itself.

---

## Version Notes

**Version 3.0 — 2026-09-29**

- Removed past costly enactment as a universal Gate 1 condition. M01 ownership, prospective trade-off and revision authority govern source readiness; Gate 2 continues to require claim-matched evidence and explicit capture plans.


**Version 2.6** — 27 July 2026

- Added explicit belief-authority, market-pressure, local reliance-ceiling and earned-state checks from the controlled Runtime Language Staged Screen.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
