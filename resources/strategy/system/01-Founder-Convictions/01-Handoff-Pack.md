---
id: 01-Handoff-Pack
title: Module 01 Handoff Pack
description: Carry exact decisionids, assumptionids, non-monetary implementationconsequenceids and the complete source fields
type: module-handoff
version: 2.6
last-updated: '2026-08-18'
status: active
depends-on:
- 01-Prompt
- 01-Quality-Gates
- FW_15-Upstream-Inputs-Hard-Gate
- FW_16-Discovery-vs-Translation-Modules
- FW_17-Cross-Module-Quality-Gates
- framework/00-Shared-Contracts
feeds-into:
- 02-Market-Reality-Check
- 03-Business-Commitments
- 05-Brand-Strategy
handoff_envelope:
  handoff_id: 01-Handoff-Pack
  business_id: '[TBC]'
  project_id: '[TBC]'
  run_id: '[TBC]'
  module_id: '01'
  module_version: '2.4'
  schema_version: '1.1'
  capability_profile: full
  status: draft
  authority:
    source_owner: Module 01 Workpack
    decision_owner: '[authorised human conviction source]'
    approver: '[authorised human conviction source]'
    approval_event: Source confirmation after Module 01 Quality Gate
    timestamp: '[YYYY-MM-DD]'
  upstream:
    handoff_ids: []
    typed_dependency_edges: []
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
  prior_material_assessment:
    state: '[prior_material_received / candidate_source_material / candidate_conviction_structure / pre_lock / contested / locked]'
    route: '[Skip / Light Pass / Constrained Run / Full Run]'
    current_confirmation_event: '[event ID or none]'
    equivalent_gate_evidence: '[gate-to-evidence mapping or none]'
    unresolved_limitations: []
    reliance_scope: '[none / questioning depth / pre-lock concession / locked handoff]'
  source_basis_records:
  - source_id: '[Entry Brief or M01 source ID]'
    statement_id: '[statement ID]'
    basis: '[governed Source Basis Record basis]'
    owner: '[owner]'
    source_date: '[date]'
    current_status: '[current / stale / superseded]'
    canonical_field_mapping: '[M01 field or none]'
  conflict_pairs:
  - conflict_id: '[conflict ID or none]'
    statement_a_id: '[ID]'
    statement_b_id: '[ID]'
    status: '[open / resolved / superseded / not_material]'
    decision_owner: '[owner]'
  shared_context:
    source_authority: '[factual role + source/version/owner/state/basis]'
  adaptive_interrogation_results:
  - rule_id: '[M01-AQ-01 / M01-AQ-02 / M01-AQ-03]'
    trigger_source: '[exact context/source ID]'
    finding_destination: '[existing canonical field]'
    accepted_finding: '[finding only; no runtime question]'
  evidence_and_claims: []
  risks_and_obligations: []
  gates:
  - gate_id: Module 01 Quality Gate
    rule_version: '1.0'
    result: pass
    evidence: See module Quality-Gates file
    reviewer: Authorised source / Facilitator
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



# Handoff Pack: Founder Convictions

## FW_32 accountability payload

Carry exact `decision_ids`, `assumption_ids`, non-monetary `implementation_consequence_ids` and all source fields required for the later Foundation Use Contract.

Preserve the evidence owner, implementation proof, attribution ceiling, review condition and invalidation trigger. Keep strategic, production, publication, budget and spend states separate. An intended result is not a promised outcome.

**Module 01 DeMode™**
_Locked Outputs for Downstream Modules_

---

## What This Document Does

Use this document to lock the finalised Module 01 outputs after all quality gates pass. Later modules build on these sealed outputs without revisiting or revising them.

**How to use:** Complete this document only after passing all criteria in `01-Quality-Gates.md`. Copy the accepted Locked Anchors, Output B Builder Manifesto and Output D Evidence Matrix from `01-Prompt.md` into the sections below. These become the authoritative inputs for Modules 03, 05, 07, and beyond.

**Reality check:** If you haven't passed all quality gates, do not complete this pack. Downstream modules will inherit any weaknesses in your foundation.

---

## Lockability Contract (per FW_15 + FW_16 + FW_17)

Module 01's Handoff Pack is the **only point in the framework where conviction enters the chain**. Each receiving module uses it in a defined way:

- Module 02 Step 0 quotes Core Belief + Hidden Truth + draft Claims Boundaries.
- Module 03 Step 0 quotes all five conviction elements.
- Module 05 (Brand Identity) supplies belief authority to all M06–M12 translation modules. Modules 06–12 receive it through Module 05, without reaching back directly to Module 01 (per `framework/00-Shared-Contracts.md`).

CMQG_01 Conviction Trace (per FW_17) traces every downstream output to the locked upstream artefact that owns it.

**Every output below must meet the lockability and verbatim-quotability obligation.**

| Obligation | What it means | How downstream uses it |
| -- | -- | -- |
| **Locked** | Committed to without further iteration once sealed. The builder may iterate during Module 01 (discovery mode), but seals at handoff. | A superseded version creates a new artefact; downstream outputs are marked stale. |
| **Verbatim-quotable** | The output is nailed-down text, not impressionistic phrasing, metaphor that needs decoding, or paraphrase. | Module 02 Step 0 / Module 03 Step 0 may quote the source verbatim. Modules 06–12 quote Module 05's locked translation, not Module 01 directly. |
| **Three-category Claims Boundaries (draft)** | Claims Boundaries populated in the canonical Can Claim / Must Qualify / Cannot Claim structure with no category empty. | Module 05 finalises the deployment claims set from these draft inputs plus M02 evidence. Downstream CMQG_02 checks resolve against Module 05's locked Claims Boundaries. |
| **Module 01 status visible** | Whether this Handoff is "Locked" or "Pre-lock draft" stated explicitly at the top. | Downstream Step 0s (per FW_15) treat pre-lock drafts under the concession path — Outcome A unavailable downstream until Module 01 locks. |

**Verbatim Test before sealing:** open this Handoff Pack alongside a hypothetical Module 02 Step 0 run. For each Locked Output below, can the Module 02 facilitator copy-paste the text directly into Step 0's verbatim quote block without rewriting? If not, return to Quality Gate 0 (Lockability + Verbatim Quotability) and strengthen the wording before sealing.

**Module 01 status declaration (state explicitly):**

- [ ] **Locked** — all five conviction elements below have passed Quality Gates 0–7; Handoff sealed; downstream modules authorised for Outcome A.
- [ ] **Pre-lock draft** — outputs drafted but not yet through Quality Gates 0–7; downstream modules may run *non-bindingly* per FW_15 concession path but cannot route to Outcome A.

The envelope `status` remains `draft` unless the **Locked** declaration is selected, the authorised conviction source confirms this exact version and every required gate records a pass. `locked` describes the sealed version; it does not turn testimony into external evidence or remove recorded reliance limits.

### Prior Material and Candidate State Record

Record the state transition without collapsing it:

| State | Required record | Permitted reliance |
| -- | -- | -- |
| `prior_material_received` | File/source receipt only | None |
| `candidate_source_material` | Source Basis Record with owner, date, currency and scope | Questioning context |
| `candidate_conviction_structure` | Canonical-field mapping and limitations | Candidate structure only |
| `pre_lock` | Exact output version plus missing confirmation/gates | FW_15 concession only |
| `contested` | Conflict Pair retaining both sides verbatim | None on affected fields |
| `locked` | Current source confirmation plus all gate evidence | Sealed Handoff reliance scope |

For Skip or Light Pass, also record current confirmation, evidence equivalent to each avoided gate, unresolved limitations and exact reliance scope. Stale, conflicted, unsupported, restricted or unconfirmed material cannot qualify. No prior-material state automatically becomes `locked`.

### Source Authority Declaration

Complete this before marking the Handoff Pack as Locked.

```text
Conviction source type:
[Single founder / Co-founders or leadership team / Practitioner-for-client]

Named conviction source(s):
[Name(s) and role(s)]

Source material used:
[Live conversation / recorded interview / separate co-founder conversations / other]

If multiple sources:
- Shared alignment that can lock:
  [What all conviction sources genuinely share]
- Divergence that remains:
  [Any unresolved belief, risk, priority, or non-negotiable split]
- Divergence verdict:
  [Resolved / Not resolved -- Handoff remains Pre-lock]

Authority verdict:
[Lockable / Pre-lock only]
```

**Rule:** unresolved disagreement between conviction sources blocks Locked status. A useful draft may still be produced, but later modules must treat it as pre-lock material until that disagreement is resolved.

---

## Locked Outputs

### Core Belief Statement

**Purpose:** The anchor for all downstream strategy.

**Output:**
"I believe that [Hidden Truth about the Broken Thing], and therefore I must [action the Legacy demands]."

**Finalized Text:**
[To be filled from the accepted `01-Prompt.md` conversation record]

---

### No Longer Belief

**Purpose:** Names the belief the builder and business no longer organise around. It is the FROM-side boundary carried into the Belief Shift and downstream rejection logic.

**Finalized Text:**
"We no longer believe that [old identity-level allegiance]."

**What this rules out in practice:**
[Specific choices, behaviours or compromises this belief can no longer authorise]

---

### Conviction Elements (Set 1)

**Purpose:** The raw material of your conviction, used in Module 03 for positioning.

**The Broken Thing:**
[To be filled from the accepted `01-Prompt.md` conversation record]

**The Hidden Truth:**
[To be filled from the accepted `01-Prompt.md` conversation record]

**Market-Deployable Hidden Truth (subordinate, investigable expression):**
[Concrete expression Module 02 can investigate without changing the Hidden Truth's meaning]

- Semantic-fidelity check: [pass / translation-failure]
- Not positioning, value proposition, marketing copy or audience claim: [confirmed]

**Public Record Readiness (usability signal, not validity gate):** [ready / not-yet-concrete / not-assessed]

- Evidence: [why strangers could or could not yet recognise and understand the conviction]
- Public audience or publishing history required: No

**The Non-Negotiable:**
[To be filled from the accepted `01-Prompt.md` conversation record]

**The Hard-Won Teaching:**
[To be filled from the accepted `01-Prompt.md` conversation record]

**The Legacy:**
[To be filled from the accepted `01-Prompt.md` conversation record]

---

### Identity Expression (Set 2) — First-pass draft only

**Purpose:** Optional conviction-derived starting material for Module 05 Brand Strategy.

**Note:** These are **draft** first-pass versions. They are **not** locked outputs. Module 05 will create the brand identity and final Belief Shift Journey from the locked conviction elements above. Delete or revise these fields when M05 begins.

**Purpose Statement:**
To [action], so that [benefit].
[To be filled from the accepted `01-Prompt.md` conversation record]

**Values (3–5):**

- Value 1: [Name]
- What it protects: [Detail]
- What it rejects: [Detail]
- When it was tested: [Detail]
- Value 2: [Name]
- What it protects: [Detail]
- What it rejects: [Detail]
- When it was tested: [Detail]
- Value 3: [Name]
- What it protects: [Detail]
- What it rejects: [Detail]
- When it was tested: [Detail]
 [To be filled from the accepted `01-Prompt.md` conversation record]

**Belief Shift Journey (draft):**

- FROM: "[Limiting belief they currently hold]"
- TO: "[Enabling belief you offer]"
- Evidence that the TO belief is true: [Detail]
- Example of someone who made this shift: [Detail]
 [To be filled from the accepted `01-Prompt.md` conversation record]

---

### Builder Manifesto

**Purpose:** The narrative form of your conviction, used across multiple modules for messaging.

**Finalized Text:**
[To be copied from `01-Prompt.md` Output B after completion]

---

### Evidence Matrix Summary

**Purpose:** Defines what you can claim, must qualify, and cannot claim. Finalised in Module 05 (Brand Identity) and applied by all downstream modules.

**Summary of Claims:**

- Can Claim: [Number of items]
- Must Qualify: [Number of items]
- Cannot Claim: [Number of items]

**Key Claims (Can Claim):**

- [Claim 1 with evidence summary]
- [Claim 2 with evidence summary]
 [To be copied from `01-Prompt.md` Output D after completion]

**Claims to Upgrade (Must Qualify/Cannot Claim):**

- [Claim 1 with evidence needed to upgrade]
- [Claim 2 with evidence needed to upgrade]
 [To be copied from `01-Prompt.md` Output D after completion]

---

## Downstream Module Inputs

| Module | Receives from Module 01 |
| -- | -- |
| **Module 02: Market Reality Check** | Core Belief, No Longer Belief, all five conviction elements, Market-Deployable Hidden Truth (as investigable expression), draft Claims Boundaries, Facts Anchor |
| **Module 03: Business Commitments** | Core Belief, No Longer Belief, Hidden Truth, Broken Thing, Non-Negotiable, Hard-Won Teaching, Legacy (locked here) |
| **Module 05: Brand Strategy** | Core Belief, No Longer Belief, all five conviction elements, draft Claims Boundaries, draft Belief Shift Journey -- finalised and locked in Module 05 for all downstream use |

---

## Confirmation

**Dual-validation boundary confirmed:** Module 01 records builder-side conviction evidence. Module 02 tests market-side evidence and may find no strategic gap without retrospectively invalidating the conviction.

**Quality Gates Passed:** [ ] Yes
**Date Completed:** [To be filled]
**Notes on Any Revisions Needed:** [To be filled if applicable]

**Warning:** Do not proceed to downstream modules until all quality gates are passed and this pack is finalized. Building on a weak foundation risks strategy collapse under pressure.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.

## Version Notes

### Version 2.4 — 24 July 2026

- Added explicit prior-material and candidate-state distinctions.
- Added Source Basis and Conflict Pair references without changing the conviction method.
- Made the machine-readable default a draft that becomes locked only after current source confirmation and all existing gates.
