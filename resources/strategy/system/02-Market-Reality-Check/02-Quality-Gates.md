---
id: 02-Quality-Gates
title: Module 02 Quality Gates
description: Client-language translation gate - Apply FW_27 before passing a client-facing output.
type: module-quality-gates
version: 3.3
last-updated: 2026-08-29
status: active
depends-on:
- 02-Prompt
- 02-Handoff-Pack
- 01-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 02-Handoff-Pack
- 03-Business-Commitments
---

# Quality Gates: Market Reality Check

> **Client-language translation gate:** Apply `FW_27` before passing a client-facing output. Fail if a client cannot state what was observed, what it means, what remains uncertain and what would change the finding.

> **Meaning Record gate:** Apply `FW_35`. Fail a load-bearing conclusion if the record hides its evidence, counter-evidence, concrete market situation or uncertainty; untested meaning remains provisional.

> **Decision-clarity gate:** Fail the client-facing document if the client must reconstruct the report to understand the verdict, commercial significance, confidence, unproved matters, current approval or next step. Practical meaning comes before internal classification.

> **Named-progression gate:** Fail the client-facing document if it uses a numeric module label for any visible source, stage, decision or next step. It must name Founder Conviction Foundation, Market Reality Check and Business Commitments directly; numeric identifiers belong only in internal traceability.

## FW_32 accountability gate

Pass only when:

- diagnosis, counter-evidence, contradiction, cohort, period and access limits retain their source labels;
- material assumptions record owner/basis/test/confidence/expiry; and
- research or evidence work caused by the decision records a non-monetary consequence and driver where material.

Fail if market evidence is presented as a realised business effect, baseline uplift, attribution or monetary estimate.

**Module 02 DeMode™**
_Ensuring Your Market Analysis Is Complete_

---

## What This Document Does

This document defines the pass/fail criteria for Module 02. Before proceeding to Module 03 or locking outputs, your Market Reality Check must meet these standards.

**How to use:** Review each gate after completing `02-Prompt.md`. `02_01-Market-Reconnaissance.md` is deprecated. If you fail any gate, go back and strengthen your analysis before proceeding.

**Reality check:** These gates ensure you're not building strategy on incomplete market understanding. Weak reconnaissance produces weak positioning hypotheses.

## Client Decision Clarity Check

Before delivery, a founder reading only the client document must be able to answer, without decoding framework terminology:

1. What did you find in my market?
2. What evidence supports it?
3. What evidence pushes against it?
4. How confident should I be, and for which decision?
5. What has not been proved?
6. Why does this matter commercially?
7. What am I approving now?
8. What happens next?

The Executive Overview must state the proceed/stop/return verdict, commercial significance and exact permission for the next step. It must also state that progression does not validate the business model. The final section must contain a one-line ruling and separate Evidence and Progression judgements. Pass only when all these elements are present.

Run the Concrete Clarity & Translation Audit and retain its flags for human judgement. Do not automatically rewrite a passage merely because it was flagged. Fail if an internal label such as `Validated Outcome A`, `structural-positive`, `claim ceiling` or `contrarian-trap result` appears before its practical meaning or is required to understand the decision.

---

## Quality Gate 0: Module 01 Inputs Loaded (Module-Start Precondition)

**Criteria:** Module 02 cannot begin until Module 01 outputs are present. This gate is a precondition to running the module at all, not a completion check.

| Pass | Fail |
| -- | -- |
| Core Belief, all five conviction elements (Broken Thing, Hidden Truth, Non-Negotiable, Hard-Won Teaching, Legacy) and draft Claims Boundary Inputs are all loaded from Module 01 and explicitly referenced at the start of the Reconnaissance Log | Any of those inputs is missing, paraphrased from memory, or substituted with the founder's stated positioning; or Claims Boundary Inputs are treated as locked deployment Claims Boundaries |

**Test:** Open the Reconnaissance Log. Within the first section, can you quote each Module 01 conviction element verbatim and confirm the Claims Boundary Inputs are marked as draft? If any answer is no, you fail.

**Why this gate exists:** A founder’s stated positioning can silently replace a tested Hidden Truth. Familiar claims such as "we do proper craft," "we’re not cowboys" or "we put customers first" make a Reconnaissance Log look complete. They cannot pass Gate 7 (Hidden Truth Evidenced + Vacuum Traces to Hidden Truth): conventional language does not establish a distinctive truth, and the vacuum has no tested conviction to trace back to.

**Action if Fail:** Halt Module 02. Return to Module 01 and complete the Core Belief, all five conviction elements and draft Claims Boundary Inputs. Do not run Module 02 in a "provisional" or "illustrative" mode without them — that defeats the gate, produces output that gets treated as real downstream, and wastes the reconnaissance effort.

**Concession:** If Module 01 is in progress but not yet locked, Module 02 may be drafted *non-bindingly* against the in-progress Hidden Truth, marked clearly as "pre-lock draft — re-run after Module 01 locks." It cannot route to Outcome A (Provisional or Validated) until Module 01 is locked.

---

## Runtime Eligibility Check

This check governs whether an outcome may be written; it does not change any market gate.

- Research collection must be `completed` for the load-bearing scope. `partial`, `interrupted`, `incomplete_access` and `incomplete_timeout` route to `evidence_partial` or `clarification_required`, not Outcome A.
- Every load-bearing conclusion must cite its Source Basis Record and Evidence Item, including observed/retrieved dates, geography/cohort, currentness and review trigger.
- Founder testimony may support a hypothesis but cannot independently pass Artifact Evidence, Customer Pain, Willingness to Pay or Hidden Truth market-evidence requirements.
- Contrary evidence and unknown access remain visible. Stale evidence cannot be treated as current without review.
- Outcome A records version, evidence, approval, gate and reliance state separately.

If this check fails, do not complete an Outcome A Handoff. Record the incomplete state and smallest evidence action.

### Proportional evidence-depth check

Pass only when:

- an explicit trigger justifies the evidence depth: decision materiality, market opacity, regulatory exposure or reversibility;
- the additional evidence needed and the stopping condition are recorded; and
- the work remains focused reconnaissance.

Fail arbitrary sample rules based on company size, expansion into generic market research, or a shallow research default based on missing context.

---

## Quality Gate 1: Artifact Evidence

**Criteria:** Every decoded belief and claimed customer consequence must point to the correct kind of observable artifact.

| Pass | Fail |
| -- | -- |
| Each competitor belief is supported by industry/competitor artifacts; each customer consequence is supported by distinct customer artifacts such as reviews, interviews, calls, tickets, cancellations, search language, requests, complaints or community discussion | Beliefs are stated without evidence; customer pain is inferred from competitor behaviour; one artifact is used to perform both sides of the claim |

**Test:** Pick any belief you claim a competitor holds. Ask: "What would I show someone who challenged this?" If you can't point to a specific artifact, you fail.

**Action if Fail:** Return to `02-Prompt.md` and gather artifacts for every belief claim. Use the Artifact Principle table in `02-Philosophy.md` to guide collection.

---

## Quality Gate 2: Descriptive Default Identification

**Criteria:** You must clearly identify the Descriptive Default (the belief most competitors share) and evidence why it's pervasive. This gate is empirical -- it asks _what_ the default is, not _whether_ it's wrong. Gate 5 handles the wrongness question.

| Pass | Fail |
| -- | -- |
| The Descriptive Default is named in one sentence; you can explain why most competitors share it; you've identified the specific artifacts that reveal it across 3+ competitors (or, in concentrated markets, satisfied the concentrated-market exception below); the cohort under test is named if defaults are plural | The default is vague or generic; you haven't distinguished between "what everyone does" and "what everyone believes"; you've conflated identification with judgement |

**Test:** Ask: "Could I explain this default to someone outside the industry, and would they understand why it's rarely questioned?" If not, you fail.

**Concentrated-market exception:** If fewer than 3 meaningful competitors exist—an effective monopoly, duopoly or consolidated market—replace the 3-competitor standard with all three of these sources:

1. The dominant player’s artifacts
2. Customer-side artifacts showing that the Default operates as a market-wide assumption regardless of competitor count
3. One adjacent-market analogue where the same Default operates

Name the concentration in the Reconnaissance Log so downstream modules understand that the competitor evidence is narrow.

**Action if Fail:** Re-examine competitor artifacts. Look for patterns that are so common they're invisible. Ask "What do all competitors assume is true without stating it?" If the market is concentrated, apply the exception above.

---

## Quality Gate 3: Customer Pain Connection

**Criteria:** You've connected the Industry Default to specific customer pain.

| Pass | Fail |
| -- | -- |
| You can name specific ways the Industry Default creates pain for customers; this pain is evidenced by customer-side artifacts distinct from the competitor evidence used to decode the Default | The default is identified but not linked to consequences; pain is assumed or inferred solely from competitor behaviour |

**Test:** Ask: "If the Industry Default disappeared tomorrow, what would change for customers? How would they notice?" If you can't answer concretely, you fail.

**Action if Fail:** Gather customer evidence. For each evidence item, record provenance (source, date, capture method) and access (public / internal / confidential, consent). Find where customers express frustration that traces back to the Industry Default. Do not use private data as if it were public.

---

## Quality Gate 3b: Audience Access Evidence Integrity

**Criteria:** Module 02 records usable evidence about where each Belief-Ready Segment participates and may be reachable without pretending to have selected the marketing channels.

| Pass | Fail |
| -- | -- |
| Evidence-capture source, audience participation and commercial reachability are separated; each material record has a date, market scope and confidence; `Unknown` is used where evidence is missing | A platform is recommended because research happened to find a quote there; generic platform stereotypes replace segment evidence; undated usage claims are presented as current; or Module 02 selects the final channel portfolio |

**Test:** Pick any named platform or route. Can you show separate evidence that the segment uses it meaningfully and that the brand may credibly reach or move them there? If either is absent, is the field marked `Unknown` rather than inferred? If not, fail.

**Action if Fail:** Reclassify research-source observations, gather missing participation or access evidence, or mark the uncertainty for Module 06. Do not manufacture a recommendation to make the handoff look complete.

---

## Quality Gate 4: Vacuum Viability

**Criteria:** Builder Preconditions hold, and the five Vacuum Gates (partially sequential) are met as defined in the Vacuum Concept. The Condition Gate (Gate 5 — Structural Strategic Risk) is checked separately in Quality Gate 8 because it flags rather than fail-routes.

| Pass | Fail |
| -- | -- |
| Builder Preconditions confirmed: P1 operational capability, P2 standing to be believed, P3 conviction alignment. AND all five Vacuum Gates met: (1) Descriptive Default identified and artifact-evidenced, with cohort named if plural Defaults exist, (2) Default is Vulnerable not merely common, (3) customer pain evidenced and traceable to the Default, (4) willingness to pay at a sustainable price, (6) Hidden Truth evidenced in market artifacts. Gates 2, 3, and 6a are supported by **distinct artifact sources**, not the same artifact viewed three ways. | Missing a Precondition (Module 02 isn't the right module yet); or one or more Vacuum Gates lack evidence; or Gates 2/3/6a rely on a single overlapping artifact rather than three distinct reads of the market |

**Test:** Confirm Preconditions, then review the five Vacuum Gates in `02-Philosophy.md` ("The Five Vacuum Gates"). Check each Gate with specific evidence. For Gates 2, 3, and 6a, list the artifact source for each separately and confirm they are not the same evidence repackaged. Failures in Gates 1–3 cascade forward (resolve the earliest first). Failures in Gate 4 route to Outcome B; failures in Gate 6 route to Outcome C. **Gate 5 (Structural Strategic Risk) does not fail-route** — it surfaces structural risks and requires acknowledgment; see Quality Gate 8.

**Action if Fail:** If a Precondition fails, return to Module 01 or to market selection — Module 02 is premature. If a Vacuum Gate fails, gather evidence for the earliest failing Gate in the 1 → 2 → 3 chain first, then re-test 4 and 6 independently. If 2/3/6a share artifact sources, the test is weaker than it looks — go gather distinct evidence before claiming a pass. Record evidence provenance and privacy/access for each new source.

**Note on Preconditions vs Gates:** Operational capability, standing and conviction alignment are practically near-1.0 by the time builders reach Module 02. They were formerly criteria 5 and 6 of a seven-criterion test, but added little discrimination because builders without them do not open this module. Concentrate effort on the five Vacuum Gates and the Condition Gate, where the evidence distinguishes outcomes.

---

## Quality Gate 5: Vulnerable Default Test (Contrarian Trap Avoidance)

**Criteria:** The Descriptive Default identified in Gate 2 is _also_ a Vulnerable Default -- one whose failure is evidenced, not assumed. You are not rejecting a default just because it's common.

| Pass | Fail |
| -- | -- |
| You can articulate conditions under which the Descriptive Default would be correct; your challenge is based on evidenced failure (Gate 3 pain), not contrarianism; your alternative belief is credibly better, not merely different | Your positioning is "different because different"; you assume common = wrong without testing; you can't name when the default would be right |

**Test:** Ask: "Under what circumstances would the Descriptive Default actually be correct?" If you can't answer, or if your answer is dismissive, you fail.

**Also test:** "If a competitor with genuine good faith defended the default, what would they say, and can I rebut it with evidence rather than opinion?" If not, you fail.

**Action if Fail:** Study the Patagonia example in `02-Philosophy.md`. The default wasn't wrong because it was common -- it was wrong because it created genuine environmental harm that customers cared about enough to pay for an alternative. Your Vulnerable Default test must meet the same bar: evidenced failure, evidenced alternative, evidenced customer care.

---

## Quality Gate 6: Hypothesis Clarity

**Criteria:** You've generated clear, testable hypotheses for Module 03.

| Pass | Fail |
| -- | -- |
| Each hypothesis states: what you believe, why it challenges the default, what would prove it right/wrong, how it connects to your conviction | Hypotheses are vague or untestable; connection to conviction is unclear |

**Test:** Review the Output Standard in `02-Philosophy.md`. Can you make one of the three Finding statements (A, B, or C) with confidence? If any element is missing or weak, you fail.

**Action if Fail:** Reframe hypotheses using the Finding A template: "The industry believes [X], evidenced by [specific artifacts]. This belief is Vulnerable because [pain]. We see potential for a brand believing [Y]. Validation: [status]." If the Finding B or C template fits better, use that -- both are valid pass conditions for this module.

---

## Quality Gate 7: Hidden Truth Implication Supported in Market (Two Sub-Tests: 6a + 6b)

**Criteria:** The market implication of Module 01's Hidden Truth is supported by market artifacts (6a) AND the specific vacuum candidate from Gates 1–4 derives logically from that Hidden Truth (6b). Both sub-tests must pass. Market evidence supports the connection; it does not manufacture or independently prove the builder's conviction.

Module 01 tests the Hidden Truth for coherence and honesty. This gate tests it for market correctness AND for vacuum-trace specificity. The two sub-tests are distinct: a Hidden Truth can be evidenced in market (6a passes) without the vacuum candidate actually deriving from it (6b fails); and a vacuum can be real (Gates 1–4 pass) without tracing to your stated conviction (6b fails) — which means you've found a different opportunity than the one your conviction authorises.

### Sub-Test 6a: Market implication supported

| Pass | Fail |
| -- | -- |
| You can state what the Hidden Truth logically implies about the Challengeable Belief and customer consequence, then point to a distinct market artifact supporting that implication | The conviction is described as empirically proved; the implication is unstated; or the same artifact already supports Gate 2 or Gate 3 |

**Test 6a:** Complete this sentence: "Our Hidden Truth [X] logically implies [Challengeable Belief and consequence], and that implication is supported by [specific artifact distinct from Gates 2 and 3]."

### Sub-Test 6b: Vacuum Traces to Hidden Truth

| Pass | Fail |
| -- | -- |
| You can articulate, in one sentence, the specific causal link between the Hidden Truth and the vacuum: "The reason this vacuum exists is the same reason our Hidden Truth is true." The link is specific, not generic | The vacuum exists for reasons independent of (or only loosely related to) the stated Hidden Truth; the trace is hand-waved or describes an adjacent insight |

**Test 6b:** Write the trace sentence and ask: would removing the Hidden Truth from the explanation still leave the vacuum standing? If yes, the trace is not load-bearing — 6b fails.

**Action if Fail (6a or 6b):** Four options.

- (a) If 6a fails because the implication operates below the visible surface, narrow Module 02's scope to where the implication can be tested.
- (b) If 6a fails because the claimed implication has no observable support, return to Module 01 or narrow the market claim. **Route: Outcome C.** Do not retrospectively declare the builder's conviction false.
- (c) If 6b fails — vacuum is real but doesn't trace to *this* Hidden Truth — either refine the Hidden Truth to match the vacuum you actually found, or accept that this is a different opportunity than the one your conviction authorises and route to Outcome C.
- (d) If both 6a and 6b fail, the Hidden Truth doesn't belong here. Route to Outcome C and return to Module 01.

---

## Quality Gate 8: Structural Strategic Risk Acknowledged (Condition Gate)

**Criteria:** Every Present pattern surfaced by Vacuum Gate 5 (Structural Strategic Risk) has a named severity, a named mitigation routing, and a signed Acknowledgment line in the Reconnaissance Log.

**This gate is a Condition Gate, not a Vacuum Gate.** It cannot fail-route to Outcome B or C. Its job is to ensure structural risks are made legible and handed forward to the modules that will address them. The framework flags; the builder owns the bet.

| Pass | Fail |
| -- | -- |
| Each of the four structural risk patterns (R1 revenue concentration, R2 TAM trajectory, R3 demand-source fragility, R4 founder-as-business) has been assessed Present / Absent / Unclear with evidence. For each Present pattern, the Reconnaissance Log contains: (a) a one-sentence risk statement, (b) severity rated Manageable / Material / Critical with justification, (c) a named mitigation routing (Module 03 / 04 / 11 / external), and (d) the builder's verbatim Acknowledgment line. | One or more Present patterns have no severity, no routing, or no Acknowledgment. Or all four patterns are recorded as "Absent" without supporting evidence — Gate 5 is being skipped, not run. |

**Test:** For each of R1–R4, can you point to the line in the Reconnaissance Log that names the pattern's status with evidence? For each Present pattern, can you point to the four required lines (risk, severity, routing, Acknowledgment)? If any element is missing, you fail.

**Action if Fail:** Return to the Reconnaissance Log and complete the missing elements. If the builder declines to acknowledge a Present pattern, record the dispute in the log alongside the flag and proceed — Module 02 does not adjudicate. Downstream modules inherit the unresolved flag and treat it as a known unknown.

**Why this gate cannot fail-route:** the runs that surfaced this gate (Oakline, Voltway, AdvisorLoop) showed that structural risk and vacuum presence are orthogonal. A real vacuum can sit inside a structurally risky business; a structurally clean business can sit on no vacuum at all. The framework's job is to keep the two questions separate, surface both honestly, and let the builder make the call with both pieces of information on the table.

---

## Final Checkpoint

Four valid outcomes from Module 02 (Outcome A splits into Provisional and Validated):

**Outcome A — Provisional: Vacuum Identified, Builder-Verified (Quality Gates 0–8 all pass on internal review).** Builder Preconditions are confirmed; the five Vacuum Gates are met from desk research and artifact decoding, with distinct artifact sources behind Gates 2, 3, and 6a; and any Present patterns surfaced by Gate 5 (Structural Strategic Risk) have been acknowledged in writing. You may proceed to Module 03 in hypothesis mode. Treat the vacuum as testable, not settled — downstream commitments (Module 04 economic validation, Modules 05–10 build) should respect this status until the vacuum is Validated. Acknowledged Structural Risks are carried forward as binding inputs to Modules 03/04/11.

**Outcome A — Validated: Vacuum Identified, Externally Pressure-Tested (Gates 1–7 pass AND the three Validation Tests below pass).** Required before locking strategy that is expensive to reverse. The three Validation Tests are:

- *Devil's-Advocate Test* — a good-faith defender of the Industry Default, given the same artifacts, tests seven alternatives: the belief is not shared; it is shared but not harmful; pain has another cause; builder conviction is biasing interpretation; the gap is already occupied; customers do not care enough; or the evidence is a niche anomaly. Record the strongest case, evidence used, response and disposition. Run with a thoughtful outsider where possible. If no outsider is available, use a **Default Defender Brief** covering the same seven alternatives. AI may help frame challenges but cannot substitute for evidence.
- *Customer Falsification Test* — a structured attempt to *disprove* the vacuum using customer evidence. Run to disprove, not to confirm. The moment you find yourself persuading prospects rather than listening, the test is already invalid. Minimum specification:

    - **Sample:** at least 5 belief-ready prospects — people who currently feel the pain Gate 3 identified. Not friends. Not warm advocates. Not existing customers who already agree with you.
    - **Method:** one of three. Problem interviews where you present the vacuum claim and invite the prospect to disagree. A falsification survey with at least two questions designed to surface disconfirming evidence. Behavioural-signal analysis (purchase data, churn, search) where you catalogue disconfirming patterns *before* the confirming ones.
    - **Required record:** explicit rejection criteria; evidence deliberately searched; contradictory evidence found; interpretation of each contradiction; final disposition. Absence of contradiction is not automatic proof.
    - **Evidence standard:** the vacuum survives if no more than 1 of 5 prospects provides material disconfirming evidence, *and* the disconfirming evidence doesn't name a structural reason the vacuum fails. One edge case is tolerable. A recurring reason is not.
    - **Stop condition:** end the test when one of three honest statements can be made — *vacuum survived*, *vacuum did not survive*, or *evidence ambiguous, more cases needed*.
- *Hidden-Truth Trace Test* — confirmation that the vacuum specifically traces to the stated Hidden Truth, not to an adjacent or different insight. Re-run Gate 7 with this question explicit.

This outcome exists because builders with strong conviction are structurally poor judges of their own vacuum claims. Provisional → Validated is the gap where confident wrongness lives.

**Outcome B — No Vacuum in This Market (Gates 1–3 pass, Gate 4 fails cleanly).** You've done the work and discovered this market's Descriptive Default is not Vulnerable — customers tolerate it, or no credible alternative exists. This is not failure. It is the Contrarian Trap avoided. Document the finding and either reassess the market or return to Module 01 to reassess which market your conviction belongs in.

**Outcome C — Hidden Truth Not Evidenced (Gate 7 fails).** Module 02 could not evidence the Hidden Truth against market artifacts. Return to Module 01 to refine the Hidden Truth, or narrow Module 02's scope to the segment where it is evidenced. This is the expected iteration path; Module 01 explicitly defers market-correctness testing to Module 02.

**Gates Failed Without Clean Outcome:** If one or more gates fail but the failure doesn't map cleanly to B or C, the reconnaissance is incomplete. Address the failed gates using the specified actions, working from earliest failing criterion forward (later criteria are conditional on earlier ones).

**Honest Position:** A failed gate is information, not failure. Better to discover gaps now than to build strategy on incomplete market understanding. Outcomes B and C are genuine pass states — they indicate the module did its job and surfaced a real constraint rather than manufacturing a vacuum to fit the template. Provisional A is also a genuine pass state — it is *not* a softer version of Validated A; it is the honest description of where confidence sits before external pressure-testing.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
