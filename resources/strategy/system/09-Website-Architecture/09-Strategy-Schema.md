---
id: 09-Strategy-Schema
title: Module 09 Strategy Schema (Locked Read-Contract)
description: The internal canonical state adds materialdecisions, assumptions, implementationconsequences, costdrivers and
type: module-doc
schema: m09-strategy
schema-version: 1.3
version: 1.7
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 09-Prompt
- 09-Quality-Gates
- 09-Handoff-Pack
- 08_13-Content-Handoff-Pack
- 08-Strategy-Schema
- 07_08-Sales-Handoff-Pack
- 07-Strategy-Schema
- 06-Handoff-Pack
- 06-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- framework/FW_25-Consultancy-Judgement-Contract
- framework/FW_26-Strategy-Multi-View-Contract
feeds-into:
- 09-README
- 09-Quality-Gates
- 09B-Website-Content-Generator
- 10-README
---


# Module 09 Strategy Schema

## Strategy-to-action starter plans

Apply `FW_41`. Keep the existing strategy fields and schema version; attach the separately versioned `strategy-to-action: 1.0` transport defined in `templates/strategy-to-action/plan.schema.json` through `starter-plan-refs` in the handoff/private manifest. A plan references the existing decision, consequence and evidence records. Those records retain authority over strategy fields. The corresponding recommended Starter Plan is a derived output after source acceptance. Human adoption, production and release remain separate. No legacy locked strategy is silently rewritten or automatically reapproved.

## FW_32 source-owned accountability records

The internal canonical state adds `material_decisions`, `assumptions`, `implementation_consequences`, `cost_drivers` and `decision_measurement_contracts` using the exact schemas in `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`. Client views may explain selected effects and implementation implications but do not expose raw governance schemas.

For every material surface, page, workspace and technical decision, record the intended effect, consequence and rule for the next decision. Cost Drivers contain units, complexity, delivery model and production standard but no rates. Unresolved architecture, scope or standard forces `not-yet-estimable`.

## Editorial read-contract — required

Canonical outputs add every editorial field in `FW_27`. Explain the site’s commercial purpose and the buyer’s decision path before introducing architecture terms. Candidate page sequences express decision logic rather than mandatory length. Home does not carry the whole system; Direct Consulting stays explicit; Evidence remains client-readable; Contact stays human; publishing and the authenticated workspace remain separate. Architecture, copy, design, build, launch and live validation remain separate decisions. Method-only trace stays internal.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader comprehension remains `pending` until tested.

## Governed strategy outputs

The client-readable canonical authority and full strategy is `09-digital-strategy.md`. When routed, emit `09-digital-strategy-executive-view.md`, `09-digital-strategy-presentation-view.md`, `09-digital-strategy-strategic-snapshot.md` and, where delivery follows, `09-digital-strategy-practitioner-brief.md`. The brief uses schema `1.3`, `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the common V3 spine and the Digital-Direction-specific middle. Views and the brief inherit the canonical states and lock ID, and consume the canonical file plus transient view-source state. The former Comprehensive View is superseded by the canonical strategy.

**This contract defines the locked structure that downstream skills read.** `09-Handoff-Pack.md` specifies which outputs pass downstream and why. This schema specifies where skills can find each output in the M09 digital-architecture document.

It follows the conventions of `05`/`06`/`07`/`08-Strategy-Schema.md`: numbered read-keys, token matching, aliases and defined handling of missing inputs.

**Schema version: 1.3.** Pin this in `dmode.config.md` (`m09-strategy: 1.3`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **What's load-bearing here is different.** M09 is **surface + page graph**. The site architecture is a directed graph of surfaces, pages, and states; the page brief is the per-page function contract. There is no fixed page count — pages are a variable-length list keyed `09_NN` or by URL/path.

Assess the digital ecosystem and establish the jobs it must perform before designing the architecture. Every candidate destination records user need, content type, relationship, authority/evidence, maintenance, visitor decision, material uncertainty, proof requirement, next route and reason. Every approved permanent destination passes the Separate-Destination Test and records merge/separation triggers.

## Digital Direction fields — required

Use these fields rather than duplicate equivalents already carried by shared contracts:

```yaml
digital_direction: {role, estate_type, starting_state, stable_elements, adaptive_elements}
digital_jobs: [{job, source_authority, visitor_decision, material_uncertainty, journey}]
digital_ecosystem: [{surface, role, owned_or_external, state, decision}]
visitor_journeys: [{visitor_state, jobs, decisions, progressive_depth, valid_exit}]
visitor_decisions: [{decision, uncertainty, source_authority, proof_requirement}]
operating_gates:
  capacity: {state, owner, constraint}
  maintenance: {state, owner, constraint}
  accessibility: {state, baseline, constraint}
  privacy_data: {state, obligations, constraint}
  content_readiness: {state, authority, constraint}
  production_competence: {state, route, constraint}
architecture_candidates: [{name, decision, uncertainty, job, proof, next_routes, readiness, maintenance}]
separate_destination_tests: [{candidate, distinct_decision, material_uncertainty, separation_value, merge_loss, maintenance_justification, result}]
architecture_comparison: {smallest_credible, strongest_expanded, criteria, recommendation, rationale}
comparison_evidence_state: [professional_judgement, controlled, buyer, practitioner, analytics, content_readiness]
recommended_minimum_architecture: [{destination, state, job, decision, relationship}]
architecture_confidence: {state, reasons, unresolved_uncertainty}
human_decision_owner: {name, authority}
human_architecture_decision: {state, rationale, date}
page_briefs: [{destination, job, visitor_state, primary_decision, uncertainty, inherited_sources, minimum_information, minimum_proof, claims_boundary, next_routes, valid_exits, must_not_do, maintenance_owner, content_authority, review_condition, merge_condition}]
merge_conditions: [{destination, trigger, action}]
expansion_conditions: [{candidate, evidence_required, owner, review}]
adaptation_authority: {level_1, level_2, level_3}
return_conditions: [{trigger, owner, state}]
production_authority_state: {state, authority, limitation}
```

Candidate section sequences express decision logic, not mandatory content blocks or fixed page length.

---

## Client output wrapper — required

Before `09_00`, emit the seven-part canonical opening in `FW_26`. Explain the surface’s current purpose, minimum journey, conversion and valid non-conversion paths. State which decisions are fixed, flexible or unresolved, what production work remains and what approval authorises. Explain specialist terms before naming them. The client body must not contain internal controls; those remain in `09-Handoff-Pack.md` or the manifest. Architecture, copy, design, build and live validation stay separate.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Keep richer lifecycle states in the Handoff Pack or internal run manifest. A recommended architecture must remain recommended in every client-visible table.

## Consultancy Decision Record — internal handoff only

Canonical fields: `decision_id`, `module`, `decision_area`, `situation`, `evidence_refs`, `evidence_status`, `confidence`, `diagnosis`, `options_considered`, `comparison_criteria`, `recommendation`, `rationale`, `accepted_trade_off`, `client_decision`, `conditions`, `owner`, `review_event`, `progression_condition`, `invalidation_triggers`, `downstream_authority`.


The client narrative performs the seven consultancy functions in `FW_25`. Store the machine record only in `09-Handoff-Pack.md` with the full `Consultancy Decision Record`, plus `necessary_surface`, `manual_until`, `premature_pages_or_functions`, `user_decision`, `expansion_evidence`, `real_user_test` and `sufficient_production_state`.

## Canonical output

**File:** `clients/[brand]/output/09-digital-strategy.md` (one file per client). *(Flat path for v1.x; revisit if a `strategy/` subfolder is adopted in `dmode.config.md`.)*

**Heading convention:** `## 09_NN [Name]` for each deliverable; `###`/`####` = field within a deliverable. Imported upstream layer sits in `## 09_00`.

```text
# Module 09: Digital Direction — [Brand Name]
<frontmatter: schema: m09-strategy · schema-version: 1.3 · brand · digital-estate-type>

## Digital decision in plain language
## Why this direction and authority state
## 09_00 Upstream Layer (imported)
### RouteAuthorization          route, status, capability_profile, authorised_human_decision, decision_owner, closure_conditions, permitted_channels, permitted_offers, permitted_audiences, generation_permission (M04 04-Handoff-Pack)
### Brand Identity              values, voice, copywriting rules, claims boundaries, belief shift journey (M05 05_00–05_14)
### Marketing Statements        S1–S10, belief stage mapping, channel strategy (M06 06_00–06_07)
### Sales Statements            8 statements, objection responses, five movements, qualification language (M07 07_00–07_11)
### Proof Strategy              content pillars, proof hierarchy, content-to-objection map, publication states (M08 08_00–08_13)

## 09_01 Digital Direction and Ecosystem Assessment       ← ANCHOR
### Destination [Name]          user need, content type, why destination, relationship, authority/evidence, maintenance, decision, reason
### Pillar/Tier 1 placement     m08_id, surface, job, destination, decision, reason
## Digital jobs, visitor decisions and progressive depth
## Operating gates
## 09_02 Candidate Destinations and Separate-Destination Tests     ← ANCHOR
## 09_03 Architecture Comparison and Recommended Minimum Architecture ← ANCHOR
### Destination [path/surface]   visitor decision, uncertainty, separate-destination result, job, proof, route branch, status
## 09_04 Strategic Page / Destination Briefs ← ANCHOR
### Destination [path/surface]   job, visitor state/decision, uncertainty, inherited sources, minimum information/proof, claims, routes/exits, must-not-do, owner, review, merge condition
## 09_05 Search, AI Discovery and Owned-Thinking Posture
## 09_06 Adaptation, Evolution and Return Rules
## 09_07 Existing-State / Migration Implications
## What is fixed, open and authorised
## Decision required
## 09_09 Digital Architecture Handoff Pack    INTERNAL ONLY — emit to 09-Handoff-Pack.md, not the client body
```

---

## The load-bearing fields

| What | Read-key | Role |
| --- | --- | --- |
| **Digital Ecosystem Assessment** | `09_01` | Relevant destinations assessed by need, relationship, authority, maintenance, decision and reason |
| **Site Architecture** | `09_02` | Smallest defensible graph with one visitor decision and uncertainty per page |
| **Page Briefs** | `09_03` | Decision-led contracts with provisional sequence, proof, relationships, split/merge, validation and destination test |
| **Publishing and Content Destinations** | `09_05` | Canonical homes, relationships, owners, review rules and deferrals |
| **Migration / Launch States** | `09_07` | The publication lifecycle of each page: draft, staging, published, redirected, retired |

**For schema validation:** `09_01`, `09_02`, `09_03`, `09_05` and `09_07` must be present and non-empty. Page count follows ecosystem assessment; pages require decisions and briefs; content destinations require ownership; launch requires states. Every selected Module 08 pillar or Tier 1 asset requires a placed, deferred or excluded decision. Every substantive Proof or Explanation primitive requires an M02/M06/M08 evidence source and citation-readiness state; `evidence-pending` is valid and citation-readiness never upgrades evidence. Founder voice is required only where Module 05 authorises it and the surface is founder-led; otherwise record `not-applicable` with reason.

---

## Read-contract for skills

1. **Locate deliverables by sub-module number.** `## 09_NN`; pages within `09_02` are keyed by path/URL.
2. **Numbered keys are canonical.** `09_02` not "the sitemap section"; page path is the stable read-key.
3. **Read the derived value, not the scaffolding.** The emitter wraps each deliverable in the FW_16 two-step structure (`### Upstream Anchors (verbatim — Step 1)` → `#### [Name] (derived from above — Step 2)` → Traceability). Read the **Step 2 / derived** block. If absent (clean output), read the section body.
4. **Route-enforced page graph.** Every page in `09_02` must declare a route branch (`permitted_*` match). A page outside the approved route cannot be published.
5. **Migration states are mandatory for launch.** Every page in `09_07` must have a `state` field and a `published` state requires `RouteAuthorization.generation_permission: publish-ready`.
6. **Tolerate aliases during transition** — resolve via the Alias Map.
7. **Version-check** the frontmatter `schema-version` against the skill's declared version.

**Cross-module read.** `09_00` is an imported convenience copy. Authoritative fields read from M04 (`04-Handoff-Pack`), M05 (`05-Strategy-Schema`), M06 (`06-Strategy-Schema`), M07 (`07-Strategy-Schema`), and M08 (`08-Strategy-Schema`).

---

## Alias Map (current emission → canonical)

| Current heading | Read-key |
| --- | --- |
| `### Deliverable 09_NN: [Name]` (client file) | `09_NN` (token in heading) |
| `### 09_NN [Name]` (emitter) | `09_NN` |
| `### Page [path]` (site architecture / page briefs) | path/URL |
| `### Surface [Name]` (surface inventory) | surface name |
| `## Phase 1 / 2 …` groupings | dropped — deliverables stand on their own |

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.3 | 2026-08-21 | Added Digital Direction before architecture: jobs, decisions, discrete operating gates, candidates, separate-destination tests, comparison, decision ownership and adaptive authority. |
| 1.2 | 2026-08-18 | Made evidence/citation, founder-voice applicability and Module 08 surface-placement records native to the relevant architecture and page-brief outputs. |
| 1.5 | 2026-08-17 | Required Practitioner Brief V3 metadata, common spine and Website-and-Digital-specific middle for authorised delivery handoffs. |
| 1.0 | 2026-06-01 | Initial M09 schema lock. |

---

## Migration status

- [x] **Schema created** (v1.0) — this document.
- [ ] **Skills can read current output** — pending per-page path-key adoption.
- [ ] **Emitter reformat (optional, non-blocking)** — opportunistic on the next real M09 run.
