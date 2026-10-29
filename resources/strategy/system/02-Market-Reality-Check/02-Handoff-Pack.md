---
id: 02-Handoff-Pack
title: Module 02 Handoff Pack
description: Carry exact diagnosis and counter-evidence IDs, contradiction language, cohort, period, access limits, assumptionids,
type: module-handoff
version: 1.8
last-updated: 2026-08-18
status: active
depends-on:
- 02-Prompt
- 02-Quality-Gates
- 01-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 03-Business-Commitments
- 06-Marketing-Strategy
handoff_envelope:
  handoff_id: 02-Handoff-Pack
  business_id: '[TBC]'
  project_id: '[TBC]'
  run_id: '[TBC]'
  module_id: '02'
  module_version: '1.6'
  schema_version: '1.2'
  capability_profile: none
  status: draft
  authority:
    source_owner: Module 02 Workpack
    decision_owner: '[authorised human decision owner]'
    approver: '[authorised human decision owner]'
    approval_event: Human acceptance after Module 02 Quality Gate
    timestamp: '[YYYY-MM-DD]'
  upstream:
    handoff_ids:
    - 01-Handoff-Pack
    handoff_versions:
    - handoff_id: 01-Handoff-Pack
      version: '[exact version]'
      hash: '[exact hash]'
    typed_dependency_edges:
    - handoff_id: 01-Handoff-Pack
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
  module_state: collecting
  output_status:
    version_state: draft
    evidence_state: unknown
    approval_state: not_requested
    gate_state: not_run
    reliance_scope: none
  research_collection:
    collection_id: '[ID]'
    state: not_started
    opened: '[timestamp]'
    updated: '[timestamp]'
    market_scope: '[cohort / geography / period]'
    incomplete_reason: null
    review_or_expiry_trigger: '[date or event]'
  proportional_evidence_depth:
    trigger: '[decision materiality / market opacity / regulation / reversibility / none]'
    source: '[exact context or authority ID/version]'
    additional_evidence_required: []
    stopping_condition: '[condition]'
    unresolved_limit: '[limit or none]'
  source_basis_records: []
  unknown_references: []
  conflict_pairs: []
  authorised_consumers: []
  prohibited_uses:
  - Module 03 construction until Outcome A reliance is recorded
  - Module 05 lock
  return_route: '[none / exact owning module and action]'
  expiry_or_review_trigger: '[date or event]'
  evidence_and_claims: []
  risks_and_obligations: []
  gates:
  - gate_id: Module 02 Quality Gate
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


# Handoff Pack: Market Reality Check

## FW_32 accountability payload

Carry the exact diagnosis and counter-evidence IDs, contradiction language, cohort, period and access limits. Include `assumption_ids` and any source-owned `implementation_consequence_ids` and `cost_driver_ids`. Preserve relevance to candidate baselines, but do not present market evidence as a realised effect or attribution.

**Module 02 DeMode™**
_Versioned Market Outputs with Explicit Evidence and Reliance State_

---

## What This Document Does

This document locks the final outputs from Module 02 after all quality gates pass. It supplies market inputs directly to Module 03 (Business Commitments). Module 05 receives the findings through Modules 03 and 04 and remains the runtime authority for Brand Strategy.

Module 06 may read the Audience Access Evidence below directly, with its typed evidence lineage. It may not use that evidence to reopen the audience or position established by Module 05.

**How to use:** Complete this document only after passing all criteria in `02-Quality-Gates.md`. Copy the finalized elements from your Module 02 work into the sections below. These become the authoritative market inputs for Module 03 and beyond.

**Reality check:** If you haven't passed all quality gates, do not complete this pack. Module 03 positioning built on weak market evidence will collapse under competitor scrutiny.

---

## Module 02 Outcome (Select One)

Module 02 has four valid outcomes: Provisional A, Validated A, B and C. Select one before completing the sections below, then record all five output-status dimensions separately.

- [ ] **Outcome A — Provisional: Vacuum Identified, Builder-Verified.** Builder Preconditions confirmed (operational capability, standing, conviction alignment); all five Vacuum Gates pass on internal review (Gates 1–7 in `02-Quality-Gates.md`); Gates 2, 3, and 6a each rest on distinct artefact sources. Proceed to Module 03 in hypothesis mode. Complete all Versioned Market Outputs sections below, and mark the **Validation Status** field as `Provisional`. Downstream commitments should treat the vacuum as testable, not settled, until validated. Module 05 cannot lock on a Provisional A outcome.
- [ ] **Outcome A — Validated: Vacuum Identified, Externally Pressure-Tested.** All conditions for Provisional A plus the three Validation Tests pass: Devil's-Advocate, Customer Falsification, and Hidden-Truth Trace (see `02-Quality-Gates.md` Final Checkpoint). Required before locking strategy that is expensive to reverse. Complete all Versioned Market Outputs sections and the Validation Evidence section, and mark the **Validation Status** field as `Validated`. M03 and M04 still route before M05 can lock.
- [ ] **Outcome B — No Vacuum in This Market.** The Descriptive Default is not Vulnerable; customer pain is mild or tolerable; no credible alternative. Do not proceed to Module 03. Complete the No-Vacuum Statement section only and return to Module 01 (to reassess conviction) or market selection (to find a market where this conviction does meet a Vulnerable Default).
- [ ] **Outcome C — Hidden Truth Not Evidenced.** Market artifacts do not evidence the Hidden Truth from Module 01. Do not proceed to Module 03. Complete the Hidden-Truth-Not-Evidenced Statement only and return to Module 01 to refine the Hidden Truth.

Both Outcome A states permit progression to Module 03. Validated is required before Module 04 commitments. Provisional A is a pass with a clear limit: the finding has not yet been externally pressure-tested.

Outcomes B and C are valid findings. They prevent later modules from building on unsupported conclusions.

---

## Runtime State and Reliance Ceiling

| Outcome | Module state | Evidence state | Reliance scope | Authorised consumer | Prohibited use |
| -- | -- | -- | -- | -- | -- |
| Provisional A | `provisional_a` | `provisional` | `module_03_hypothesis_only` | Module 03 | M05 lock, public/final market claims, universal reuse |
| Validated A | `validated_a` | `validated` | exact validated market scope | Modules 03 and 04 at named scope | Direct M05 lock; use outside cohort/geography/date scope |
| Outcome B | `outcome_b` | recorded negative finding | `return_route_only` | named return owner | Module 03 construction or strategy handoff |
| Outcome C | `outcome_c` | contradictory/not evidenced | `return_route_only` | Module 01 | Module 03 construction or strategy handoff |

For every outcome also record `version_state`, `approval_state` and `gate_state`. A `version_locked` record preserves the exact finding; it does not upgrade evidence or authorise a new consumer.

Outcomes B and C use this file only as a bounded finding/return record. They must not emit or be presented as a normal Module 03 Handoff Pack.

**Plain-language status:**

- Provisional: “This is a working market hypothesis, not a settled market fact.”
- Validated: “This market finding has been pressure-tested at the stated scope and date.”
- Conflicted: “These sources disagree. The system has not selected between them.”
- Stale: “This evidence needs review before it can support a current decision.”
- Blocked: “This stage cannot continue because the required market evidence has not passed.”

## Research Collection and Source State

**Collection state:** [not_started / in_progress / partial / interrupted / completed / incomplete_access / incomplete_timeout / resumed / superseded]

Only `completed` may support Outcome A. Record each load-bearing source:

| Statement/output | Source ID | Basis | Evidence ID | Author/speaker | Observed/retrieved date | Cohort/geography/period | Currentness | Confidence | Contrary/conflict IDs | Access/use permission | Limitations | Reliance scope | Review/expiry trigger |
| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| [Industry Default / pain / WTP / access / conclusion] | [ID] | [direct_statement / documented_fact / external_evidence / working_inference / unknown / conflicted / unsupported_assertion / not_observed / absence_evidence / restricted / stale] | [ID] | [owner] | [dates] | [scope] | [current/stale] | [level] | [IDs] | [rule] | [limits] | [scope] | [trigger] |

Founder testimony remains `direct_statement`. It may support a hypothesis but cannot independently satisfy a market-evidence gate. Contrary evidence remains linked; unavailable access remains unknown.

## Versioned Market Outputs

### Industry Default Belief

**Purpose:** The market assumption your conviction challenges. Used in Module 03 for the Belief Challenge and Conviction Grid.

**The Industry Default:**
[To be filled — one clear sentence: "This industry believes that [X]"]

**Where this belief is encoded:**

- [Artefact 1 — e.g., pricing pages, procurement systems]
- [Artefact 2 — e.g., industry benchmarks, platform structures]
- [Artefact 3 — e.g., standard contract terms]

**Why this default persists:**
[To be filled — brief explanation of why this belief is pervasive]

---

### Belief Gap Analysis

**Purpose:** The gap between what the market believes and what your conviction reveals. This becomes the foundation for Module 03 positioning.

**The Gap:**
[To be filled — describe the specific gap between Industry Default and your Core Belief]

**Gap Size:**
[To be filled — market size, segment size, growth indicators]

**Gap Evidence:**

- [Evidence 1 — specific data point or trend]
- [Evidence 2 — specific data point or trend]
- [Evidence 3 — specific data point or trend]

---

### Belief-Ready Segment

**Purpose:** The people already questioning the Industry Default. These become Module 05's primary target audience.

**Who's questioning:**

- [Segment 1 — description, approximate size]
- [Segment 2 — description, approximate size]
- [Segment 3 — description, approximate size]

**Signs of readiness:**
[To be filled — what behaviours or language indicate someone is questioning the default]

---

### Audience Access Evidence

**Purpose:** Give Module 06 evidence about where the Belief-Ready Segment participates and may be reachable. This is evidence, not a channel recommendation.

| Segment | Channel class | Platform, surface or route | Observed behaviour and usage mindset | Commercial reachability | Evidence reference, date and market scope | Confidence |
|---|---|---|---|---|---|---|
| [Exact segment] | [Access / owned / publishing / search / paid / partnership-community-event / conversion] | [Specific surface] | [What they demonstrably do and why they are there] | [Open / permissioned / paid / partner-mediated / restricted / unknown] | [Source, date, geography/cohort] | [High / Medium / Low / Unknown + reason] |

**Evidence distinctions:**

- Evidence-capture sources: [where research artefacts were found]
- Audience-participation evidence: [what shows the segment meaningfully uses each surface]
- Commercial-access evidence: [what shows the brand can credibly reach or move the segment there]
- Unknowns and missing evidence: [what Module 06 must refresh or test]

**Expiry note:** Platform behaviour and audience data are time-sensitive. Module 06 must refresh stale or materially incomplete evidence before recommending a channel portfolio.

**Boundary:** A platform appearing as an evidence source is not authorisation to use it. Module 06 compares the full credible landscape and owns the recommendation.

---

### Competitor Belief Map

**Purpose:** What each major competitor believes, evidenced by artefacts. Used in Module 03 for friction analysis and differentiation.

| Competitor Type | Their Belief | Evidence (Artefact) | Vulnerability |
|---|---|---|---|
| [Type 1] | [Belief] | [Artefact] | [Where conviction challenges them] |
| [Type 2] | [Belief] | [Artefact] | [Where conviction challenges them] |
| [Type 3] | [Belief] | [Artefact] | [Where conviction challenges them] |
| [Type 4] | [Belief] | [Artefact] | [Where conviction challenges them] |

---

### Customer Pain Profile

**Purpose:** How the Industry Default creates specific customer pain. Used in Module 03 and translated through Module 05 for Modules 06 and 07.

**Primary pain:**
[To be filled — the most acute pain caused by the Industry Default]

**Secondary pain:**
[To be filled — related pain point]

**Tertiary pain:**
[To be filled — downstream consequence]

**Pain evidence:**

For each evidence item, record provenance and access:

- Source 1: [URL / platform / owned system / interview / survey]
  - Date: [date]
  - Capture method: [public review / owned export / interview / observation]
  - Public or private: [public / internal / confidential]
  - Consent / access: [consent covers strategy / anonymised / do not quote outside business]
  - Quote or summary: [text]
- Source 2: [same fields]
- Source 3: [same fields]

---

### Viability Estimate

**Purpose:** Confirms the market gap is large enough to build on. Prevents conviction-driven positioning in a market too small to sustain it.

| Criterion | Assessment | Evidence |
|---|---|---|
| Market size | [Sufficient / Marginal / Insufficient] | [Data] |
| Pain evidence | [Documented / Assumed / Missing] | [Source] |
| Belief-readiness | [Growing / Stable / Declining] | [Indicator] |
| Conviction alignment | [Strong / Moderate / Weak] | [Explanation] |

---

### Testable Hypotheses

**Purpose:** Structured hypotheses for Module 03 to validate through positioning design.

**Hypothesis 1:**
> "The industry believes [X], evidenced by [artefacts]. This causes customers to experience [pain]. We see a vacuum for a brand that believes [Y]. Validation status: [Provisional / Validated]."

**Hypothesis 2:**
> [Same format]

**Hypothesis 3:**
> [Same format]

---

### Condition Gate Risk Routing

For every material risk, carry the response question rather than only a label.

| Risk ID and statement | Why it matters | Downstream owner | Required question or constraint | Acknowledgment | Review trigger |
|---|---|---|---|---|---|
| [R1–R4 / other] | [consequence] | [M03 / M04 / M11 / external] | [what that owner must decide, test or constrain] | [verbatim] | [event/date] |

Module 02 identifies and routes the risk. It does not solve it or let the risk determine whether the market gap exists.

---

## Validation Evidence (Outcome A — Validated only)

If Outcome A — Validated applies, complete this section in addition to all Versioned Market Outputs above.

**Validation Status:** Validated

**Devil's-Advocate Test:**

- Review route: [Outside defender / Default Defender Brief solo substitute]
- Defender of the Default (who; if not an outsider, name solo substitute):
- Strongest case made for the Default (if solo substitute, include why the Default exists, where it serves customers, what your vacuum may be misreading, what would disprove your claim, and strongest competitor counter-move):
- Rebuttal with evidence (not opinion):
- Result: [Vacuum survived / Vacuum did not survive — return to Provisional or B]

**Customer Falsification Test:**

- Falsification method (interviews / survey / behavioural data):
- Sample / source (specific, dated):
- Hypothesis tested (the vacuum claim, stated falsifiably):
- Explicit rejection criteria:
- Evidence deliberately searched:
- Contradictory evidence found:
- Interpretation of contradictions:
- Evidence found:
- Result: [Vacuum survived / Vacuum did not survive — return to Provisional or B]

**Hidden-Truth Trace Test:**

- Restated Hidden Truth (from Module 01):
- Restated vacuum (criterion-by-criterion):
- Explicit trace: how does this vacuum specifically derive from this Hidden Truth, not from an adjacent insight?
- Result: [Trace confirmed / Trace breaks — return to Module 01 or to Outcome C]

**Hidden Truth evidence boundary:** Market artefacts support or contradict the stated implication. They do not independently prove or manufacture the builder's conviction.

If any test result is "did not survive" or "breaks," downgrade to Provisional A or route to Outcome B / C as appropriate. Validated status requires all three tests passed.

---

## No-Vacuum Statement (Outcome B only)

If Outcome B applies, complete this section in place of the Versioned Market Outputs above.

**Descriptive Default identified:**
[The belief competitors share, with evidence]

**Why it is not Vulnerable:**
[Customer pain mild / customers accept the trade-off / no credible alternative we can deliver]

**Evidence for non-vulnerability:**

- [Customer evidence showing tolerance or satisfaction]
- [Attempted-alternative-failure evidence if available]

**Recommended next action:**

- [ ] Reassess market selection (this conviction may belong in a different market)
- [ ] Return to Module 01 and reassess conviction (the Hidden Truth may be correct but not matter in any accessible market)

---

## Hidden-Truth-Not-Evidenced Statement (Outcome C only)

If Outcome C applies, complete this section in place of the Versioned Market Outputs above.

**Module 01 Hidden Truth:**
[As stated in Module 01 Handoff Pack]

**Market evidence sought:**

- [Artifacts examined]
- [Customer evidence examined]
- [Systemic evidence examined]

**Why evidence could not be established:**
[Hidden Truth may operate below artifact surface / may be incorrect as stated / may hold only in a narrower segment than the current scope]

**Recommended next action:**

- [ ] Return to Module 01 and refine the Hidden Truth
- [ ] Narrow Module 02's scope to the specific segment where the Hidden Truth is evidenced, then re-run

---

## Downstream Module Inputs

| Module | Receives from Module 02 (Outcome A — Provisional or Validated) | Validation status required |
|---|---|---|
| **Module 03: Business Commitments** | Vulnerable Default, Belief Gap, Competitor Map, Customer Pain, Testable Hypotheses, Hidden Truth market evidence, evidence provenance, privacy/access notes | Provisional sufficient |

Module 03 may route to M04 and then M05; Module 05 is the runtime authority for translation into Modules 06-10.

## Upstream inputs

This Handoff depends on `01-Handoff-Pack.md` (Module 01 Founder Convictions) and must carry the exact upstream version IDs. If the Module 01 outputs are superseded, this Handoff becomes stale and must be re-evaluated.

---

## Confirmation

**Quality Gates Passed:** [ ] Yes
**Date Completed:** [To be filled]
**Notes on Any Revisions Needed:** [To be filled if applicable]

**Warning:** Do not proceed to Module 03 until all quality gates are passed and this pack is finalized. Positioning built on assumed market gaps will not survive competitor scrutiny.

---

## Version Notes

### Version 1.6 — 24 July 2026

- Added conservative default metadata, collection/source/conflict state and orthogonal output status.
- Separated version lock from evidence strength and reliance.
- Limited Provisional A to Module 03 hypothesis work and prohibited B/C strategy handoffs.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
