---
id: 03-Handoff-Pack
title: Module 03 Handoff Pack
description: For each material accepted decision carry exact decisionids, assumptionids, implementationconsequenceids,
type: module-handoff
version: 1.7
last-updated: '2026-10-02'
status: active
depends-on:
- 03-Prompt
- 03-Quality-Gates
- 01-Handoff-Pack
- 02-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 04-README
handoff_envelope:
  handoff_id: 03-Handoff-Pack
  business_id: '[TBC]'
  project_id: '[TBC]'
  run_id: '[TBC]'
  module_id: '03'
  module_version: '1.4'
  schema_version: '1.1'
  capability_profile: none
  status: draft
  authority:
    source_owner: Module 03 Workpack
    decision_owner: '[authorised human decision owner]'
    approver: '[authorised human decision owner]'
    approval_event: Human strategy acceptance after Module 03 Quality Gate
    timestamp: '[YYYY-MM-DD]'
  upstream:
    handoff_ids:
    - 01-Handoff-Pack
    - 02-Handoff-Pack
    handoff_versions:
    - handoff_id: 01-Handoff-Pack
      version: '[exact version]'
      hash: '[exact hash]'
    - handoff_id: 02-Handoff-Pack
      version: '[exact version]'
      hash: '[exact hash]'
    typed_dependency_edges:
    - handoff_id: 01-Handoff-Pack
      edge_type: authority-hard
    - handoff_id: 02-Handoff-Pack
      edge_type: authority-hard
  route_authorization:
    source: M04 (awaiting)
    note: M04 has not yet run; this handoff predates RouteAuthorization
    fields:
    - selected_response_path
    - recommendation_and_authorised_human_decision
    - authorised_scope_and_prohibited_moves
    - assumptions_confidence_and_unresolved_evidence
    - commercial_constraints_and_obligations
    - override_state
    - review_trigger_or_date
    - downstream_capability_profile
    - closure_or_re_entry_rule
  payload: Module-specific outputs (see body of this handoff pack)
  module_state: constructing
  output_status:
    version_state: draft
    evidence_state: unknown
    approval_state: not_requested
    gate_state: not_run
    reliance_scope: none
  source_basis_records: []
  unknown_references: []
  conflict_pairs: []
  candidate_decision:
    candidate_ids: []
    selected_candidate_id: null
    authorised_human_decision_event: null
  commitment_scope:
    value: '[business / offer / business_unit / portfolio / parent_brand / sub_brand / initiative]'
    authority_source: '[ID/version]'
    affected_rights: []
  adaptive_interrogation_results:
  - rule_id: '[M03-AQ-01 / M03-AQ-02 / M03-AQ-03]'
    trigger_source: '[exact context or upstream ID/version]'
    finding_destination: '[existing canonical field]'
    accepted_finding: '[finding only; no runtime question]'
  authorised_consumers: []
  prohibited_uses:
  - Module 05 lock while Provisional
  - any strategy use after Outcome X or failed entry
  return_route: '[none / exact owning module and action]'
  expiry_or_review_trigger: '[date or event]'
  evidence_and_claims: []
  risks_and_obligations: []
  gates:
  - gate_id: Module 03 Quality Gate
    rule_version: '1.0'
    result: not_run
    evidence: []
    reviewer: null
  exceptions_and_overrides: []
  privacy_and_access:
    sensitivity: internal
    permissions:
    - facilitator
    - client
    retention: until superseded
  invalidation:
    superseded_by: null
    stale_reason: null
    affected_downstream_ids: []
  timestamps:
    created: '[YYYY-MM-DD]'
    updated: '[YYYY-MM-DD]'
---


# Handoff Pack: Business Commitments

## FW_32 accountability payload

For each material accepted decision carry exact `decision_ids`, `assumption_ids`, `implementation_consequence_ids`, `cost_driver_ids` and `decision_measurement_contract_ids`. Preserve the complete contract meaning, intended effect, implementation proof, baseline requirement, evidence owner, attribution ceiling, review decisions, stop condition, strategic return point, approval states and invalidation triggers.

**Module 03 DeMode™**
_Versioned Strategy Outputs with Explicit Reliance_

---

## What This Document Does

This document locks Module 03’s final outputs after all quality gates pass. It supplies them directly to Module 04 (Viability Check and Route). Module 04 then carries the strategy and route to Module 05 (Brand Identity), which governs their translation into Modules 06–10.

**How to use:** Complete this document only after passing all criteria in `03-Quality-Gates.md`. Copy the finalized elements from your Module 03 work into the sections below. These become the authoritative strategy inputs for Module 04 and Module 05.

**Reality check:** If you haven't passed all quality gates, do not complete this pack. Downstream modules will inherit weak positioning — and weak positioning cannot be fixed by strong execution.

---

## Pass State (Select One)

Module 03 produces one of two pass states. Both are valid. The distinction governs which downstream commitments are authorised.

- [ ] **Provisional — Strategy Defined, Builder-Verified.** Gates 1–7 + 5.5 + 8 all pass on internal review. Proceed to Module 04 in hypothesis mode. **Do not yet lock Module 05** — the brand anchor Modules 06–10 import from — because Provisional has not yet been pressure-tested by anyone outside the builder. Complete all Versioned Strategy Outputs sections below and mark the **Pass State** field as `Provisional`. Module 04 must route a Provisional strategy with reduced capability profile; M05 cannot lock until Validated.
- [ ] **Validated — Strategy Externally Pressure-Tested.** All conditions for Provisional are met, plus the three Validation Tests pass: Devil's-Advocate, Customer Falsification, Friction-Realism Cross-Check (see `03-Quality-Gates.md` Final Checkpoint for the full descriptions). Required before any resource commitment that's expensive to reverse. Complete all Versioned Strategy Outputs sections AND the Validation Evidence section below. Mark the **Pass State** field as `Validated`. M04 can route full-standard; M05 may lock after M04 authorisation.

Provisional records confidence before external pressure-testing. Validated records the stronger state required for Module 05 to lock.

An Orientation Scan is not a pass state. Do not complete this Handoff Pack from an Orientation Scan or any run that skipped internal gates.

---

## Runtime State and Reliance Ceiling

| State | Evidence | Reliance | Authorised consumer | Prohibited use |
| -- | -- | -- | -- | -- |
| `blocked_upstream` | invalid/missing dependency | `diagnostic_return_only` | owning upstream module | all strategy-shaped output |
| `orientation_only` | exploratory | `orientation_only` | internal operator | Grid, Belief Shift or handoff authority |
| `candidate` / `clarification_required` | working | `none` | internal review | selection without authorised human decision |
| `provisional` | provisional | `module_04_hypothesis_only` | Module 04 | Module 05 lock or final/public strategy claims |
| `validation_pending` | provisional | exact test scope | named validator | downstream lock |
| `validated` | validated | exact current strategic scope | Module 04; Business Foundation as bounded source | universal reuse outside recorded scope |
| `outcome_x` | return evidence | `return_route_only` | Module 01 or 02 | authorised strategy handoff |

Record `version_state`, `evidence_state`, `approval_state`, `gate_state` and `reliance_scope` separately. `version_locked` means only that the exact version is immutable.

If Step 0 fails, do not complete this pack. Emit only the shared dependency notice. If Outcome X fires after substantive work, retain its return record separately; do not populate or authorise the strategy sections below.

**Plain-language status:**

- Candidate: “This is a strategy option awaiting the authorised human decision owner.”
- Provisional: “This strategy is strong enough for economic testing, but not yet for brand lock.”
- Validated: “This strategy has passed its external pressure tests at the stated scope.”
- Blocked: “Strategy construction cannot continue because an upstream dependency has not passed.”
- Stale: “An upstream change means this strategy must be reviewed before reuse.”

## Source, Conflict and Candidate Control

| Strategy field/candidate | Source IDs | M01/M02 versions | Owner/date/currentness | Gate rerun or equivalent evidence | Conflict/unknown IDs | Limitations | Reliance |
| -- | -- | -- | -- | -- | -- | -- | -- |
| [field/candidate] | [IDs] | [versions] | [record] | [gate → evidence] | [IDs] | [limits] | [scope] |

Stale, conflicted or unconfirmed prior strategy cannot qualify for Skip. Competing candidates remain separate until a named authorised human decision event selects one exact version. In a founder-led context, that event may correctly be the founder's decision.

## Versioned Strategy Outputs

### Business Position Statement

**Purpose:** Record the concise business position developed or reconfirmed through upstream work. This is a strategic record, not public positioning copy.

Keep audience, offer, customer value, distinctive commitments and belief rationale traceable to their owning sources and evidence limits. Inherit constraints from M04 and current fact and economic authorities. The Business Foundation records the established position in its joined definition. M05 develops brand positioning from that approved basis without silently changing the business choices.

**Positioning Statement:**
[To be filled — "For [audience] who [problem/need], [brand] provides [solution] that [key differentiator] — because [belief rationale]."]

---

### Conviction Grid

**Purpose:** The four strategic actions that translate conviction into market positioning. Used in Module 05 for brand strategy derivation and referenced in Modules 06 and 07 for messaging and sales.

| Action | Vulnerable Default | Your Position | Trade-off | Proof Commitment | Proof Economy | Deployable Proof Artefact | Public Specialisation Signal | Operational Rule |
|---|---|---|---|---|---|---|---|---|
| **QUESTION** | [belief questioned] | [counter-position] | [cost] | [proof] | [discrete / compounding / both] | [form] | [visible refusal] | [rule] |
| **REJECT** | [belief rejected] | [alternative] | [cost] | [proof] | [discrete / compounding / both] | [form] | [visible refusal] | [rule] |
| **COMMIT** | [over-investment] | [rationale] | [cost] | [proof] | [discrete / compounding / both] | [form] | [if relevant] | [rule] |
| **INTRODUCE** | [new truth] | [market gap] | [cost] | [proof] | [discrete / compounding / both] | [form] | [if relevant] | [rule] |

**Grid Coherence Check (per Quality Gate 5.5):** Summarise the positioning the four moves collectively define in one sentence. If you can't, the grid is fragmented -- return to Module 01's Core Belief to find the thread.

---

### Divergence Map

**Purpose:** Maps how your positioning diverges from the Vulnerable Default on factors that matter to customers. The prior 70% numeric threshold has been retired; see Quality Gate 7 (Meaningful Divergence).

**Areas of meaningful divergence (customer-important factors per Module 02 evidence):**

1. [Area] — [Divergence direction] — [Customer-importance evidence]
2. [Area] — [Divergence direction] — [Customer-importance evidence]
3. [Area] — [Divergence direction] — [Customer-importance evidence]

**Areas where we consciously do NOT diverge (consensus is correct here):**

1. [Area] — [Why we align with consensus]
2. [Area] — [Why we align with consensus]

**Regulated/Standardised Market Note:** [If applicable, document structural constraints on divergence]

---

### Proof Commitments

**Purpose:** Specific commitments to demonstrate (not just claim) your conviction. Referenced in Module 08 (Content Strategy) and Module 11 (Execution Planning).

**Primary Proof Commitment:**
[To be filled — the most important thing you will do to prove your belief]

**Secondary Proof Commitment:**
[To be filled]

**Tertiary Proof Commitment:**
[To be filled]

**Evidence readiness:** [For each proposed claim: evidence type, provenance, inspectability, limitation, sentence earned, and any capture/review plan]

**Optional Proof Score:** [X] distinct enacted records. Inventory heuristic only; it does not grant public-use permission.

**Named Framework / Diagnostic Proof:** [substantive method, what belief it embodies, how another person can use or inspect it, current evidence/referenceability state]

---

### Belief Shift Journey (draft for Module 05)

**Purpose:** The customer's belief transformation, refined from Module 01 draft using market evidence from Module 02. This is a **draft** — finalised and locked in Module 05. Do not treat it as a deployment-ready Belief Shift Journey until M05 locks it.

**Customer discovery mechanism:** [what a diagnostic, assessment, comparison, demonstration or structured question must reveal; Module 07 owns final in-room design]

### Market Credibility Condition

- Strategic Lock state: [state]
- Market Credibility state: [credible / credibility-gap / not-yet-observable]
- Evidence: [independent reference / specialty recognition / qualified inbound / framework reuse or citation / prospect recognition / position-builder association]
- Diagnosed cause where gap exists: [time / proof / distribution / execution / recognition / possible strategic challenge]
- Review condition: [event/date]
- Grid unlock authorised: No — only existing re-decoding conditions may unlock it

**FROM:** "[Limiting belief customers currently hold]"
**TO:** "[Empowering belief your brand offers]"

**Evidence the TO belief works:**
[To be filled — specific evidence that the new belief produces real results]

**Experiential change (Tylenol test):**
[To be filled — what changes in the customer's actual experience when they shift FROM → TO]

---

### Proof Evidence Lineage

**Purpose:** For each Proof Commitment, record the evidence item that authorises it, its provenance, and its current evidence strength (`provisional` / `validated` / `independent` / `contradictory`).

| Proof Commitment | Evidence ID | Source | Date | Strength | Access / privacy |
| --- | --- | --- | --- | --- | --- |
| [Commitment 1] | [E-001] | [interview / public review / internal data / observation] | [date] | [provisional] | [public / internal / confidential] |

### Risk Obligations

**Purpose:** Structural risks and acknowledged obligations carried from Module 02 and surfaced during Module 03. Each risk must have an owner, routing, and review date.

- [Risk R1 / R2 / R3 / R4]: [risk statement] — Severity: [Manageable / Material / Critical] — Routing: [Module / external] — Owner: [name] — Review: [date]

### Friction Analysis

**Purpose:** Why competitors will find your positioning costly to copy. Used in Module 05 for differentiation and Module 06-07 for competitive messaging.

| Friction Source | Assessment |
|---|---|
| Belief contradiction | [Would they have to contradict past claims? Y/N + detail] |
| Operational change | [Would they need to restructure? Y/N + detail] |
| Cultural shift | [Would their team resist? Y/N + detail] |
| Customer explanation | [Would they need to explain a reversal? Y/N + detail] |

**Overall friction level:** [High / Medium / Low]

---

### Belief Spectrum Readiness (per Quality Gate 8)

**Purpose:** Confirms a specific, evidenced segment is currently ready to receive the Belief Shift. Required for any pass state.

**Ready Segment (from Module 02 Belief-Ready Segment):**
[To be filled — name a specific segment, not "anyone frustrated with X"]

**Evidence of current readiness:**
[To be filled — Module 02 signal: language, behaviour, purchase pattern indicating FROM belief is unstable for this segment today]

**Segment sizing relative to Module 04 unit-economics floor:**
[To be filled — sized non-trivially, or flagged as requiring market-education runway]

**Reachability:**
[To be filled — specific channel, gathering place, or observable behaviour that lets you find this segment]

---

## Validation Evidence (Validated only)

Complete this section only if Pass State is `Validated`. If Provisional, leave blank and proceed to Module 04 in hypothesis mode.

**Pass State:** Validated

**Devil's-Advocate Test:**

- Defender of the Vulnerable Default (who; if not an outsider, name the written self-defence attempt):
- Strongest case made for the Default against your Conviction Grid:
- Your rebuttal with evidence (not opinion):
- Result: [Strategy survived / Strategy did not survive — return to Provisional and address the failure]

**Customer Falsification Test:**

- Falsification method (interview / survey / behavioural observation):
- Sample / source within the Belief-Ready Segment (specific, dated):
- FROM/TO hypothesis tested (stated falsifiably):
- Evidence found:
- Result: [Belief Shift survived / did not survive — downgrade to Provisional or return to Module 02 for segment refinement]

**Friction-Realism Cross-Check:**

- Review route: [Outside operator / Friction War-Game Substitute]
- Outside operator who reviewed (someone who would credibly execute the copy if a competitor asked, if available):
- Friction sources they confirmed as real:
- Friction sources they flagged as wishful (Friction Fantasy):
- If solo substitute used: competitor's strongest practical copy plan, easiest low-friction copy route, and why that route still fails or weakens them:
- Result: [Friction realistic / Friction Fantasy present — return to Gate 3 and strengthen]

If any test result is "did not survive" or "Friction Fantasy present," downgrade Pass State to Provisional. Validated requires all three Validation Tests passed.

---

## Downstream Module Inputs

| Module | Receives from Module 03 | Pass State required |
|---|---|---|
| **Module 04: Viability Check** | Proof Commitments (to quantify cost), Business Position (to validate commercially) | Provisional sufficient |
| **Module 05: Brand Strategy** | Conviction Grid, Divergence Map, Belief Shift Journey (draft — finalised in 05), Positioning Statement, Friction Analysis, three-belief-layer structure, Belief Spectrum Readiness | Validated required before locking |

Module 05 translates the strategy into brand identity, which Modules 06–10 inherit. Because that identity is expensive to reverse, Module 05 cannot lock from a Provisional handoff; Validated is required.

---

## Confirmation

**Quality Gates Passed:** [ ] Yes
**Date Completed:** [To be filled]
**Notes on Any Revisions Needed:** [To be filled if applicable]

**Warning:** Do not proceed to Module 04 until all quality gates are passed and this pack is finalized. Economic validation of a vague strategy will produce meaningless numbers.

---

## Version Notes

### Version 1.4 — 24 July 2026

- Added conservative default metadata, exact upstream/source/conflict state and orthogonal strategic status.
- Limited Provisional to Module 04 hypothesis mode.
- Prohibited strategy-shaped output after failed entry and authorised handoff after Outcome X.
- Added prior-strategy equivalence and separate candidate/founder-decision controls.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
