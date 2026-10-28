---
id: 11-Strategy-Schema
title: Module 11 Commercial Activation Schema (Locked Read-Contract)
description: Client outputs add every editorial field in FW_27.
type: module-doc
schema: m11-strategy
schema-version: 1.8
version: "1.10"
last-updated: 2026-10-04
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 11-Prompt
- 11-Quality-Gates
- 11-Handoff-Pack
- templates/Commercial-Record-Template.md
- framework/FW_24-Commercial-Direction-Contract
- framework/FW_25-Consultancy-Judgement-Contract
- 10-Handoff-Pack
- 10-Strategy-Schema
- 09-Handoff-Pack
- 09-Strategy-Schema
- 06-Handoff-Pack
- 06-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 11-README
- 11-Quality-Gates
- 12-README
- 12-Quality-Gates
---

# Module 11 Commercial Activation Schema

## Selected-cycle and entry interpretation — required

Apply current FW_15, FW_24 and Shared Contracts before the detailed instructions below. Preserve stable numbered read keys and legacy technical enum values such as `controlled-90-day`; the enum is a permission class, not a duration mandate. Render headings, dates, quantities and review events for the exact selected cycle. Retained 90-day calendars and three-action scaffolds are illustrative shapes only; adapt their repeated rows to every adopted action and actual selected period, never truncate accepted work or invent actions to fill the sample. Action count follows the accepted Direction, capacity, economic basis and decision thresholds. Required cycle-close review remains mandatory at the selected endpoint, with earlier binding review/stop conditions preserved.

A failed required entry emits only the shared dependency notice. A pre-lock or Wait preview exists only at its exact expressly permitted diagnostic scope with all other conditions satisfied; it cannot create normal strategy/coordination, a lock or a handoff. Source lock, client adoption, execution and release are separate. An override never waives Shared Contracts non-overridable boundaries.


## Strategy-to-action starter plans

Apply `FW_41`. Load every relevant current Starter Plan and its source-owned FW_32 consequences alongside accepted Commercial Direction. List all material proposals, including rejected, blocked, withheld and non-applicable choices. Within Direction's Active / First Phase scope, reconcile duplicate work, shared assets, priorities, dependencies, cycles, ownership and known resource conflicts. Record selected/deferred/excluded/evidence-needed/upstream-return dispositions and their reasons in the existing Commercial Cycle 01 decision. Return broader strategic changes to the owning Direction/module. Required/Recommended class does not activate an action. Before commitment, require explicit human adoption of the exact current action version and satisfaction of the existing Initiative Authority/route gates. Do not declare feasibility when resources are unknown.

Add `starter-plan-refs`, `action-dispositions`, `action-adoption-events`, `shared-dependency-resolution` and `capacity-conflict-resolution` to the existing private `11_09`/accountability payload using the separately versioned `strategy-to-action: 1.0` adapter. Keep numbered sections, schema pin and all existing commercial/measurement fields. Map each chosen action to exact source decisions/consequences and the M11 quantities, ownership commitments, capacities, periods, thresholds, permission and review. This is an additive extension; no new action-decision file or source authority is created.

## Editorial read-contract — required

Client outputs add every editorial field in `FW_27`. The objective, owner, action, planning quantity, pre-set decision rule, evidence boundary, proof actions and capacity ceiling precede background. Targets are not forecasts. Do not move thresholds after seeing results. New experiments need an explicit decision; publication and spend each require separate approval. Strategy references appear only where they govern a current action or return path. The full Commercial Direction is not restated section by section.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader comprehension remains `pending` until tested.

**The locked, skill-facing structure of the Module 11 output.** Every downstream skill reads the M11 execution-planning document against this contract. `11-Handoff-Pack.md` defines *which* outputs carry downstream and *why*; this document defines *exactly where each one lives* so a skill can locate it reliably.

**Schema version: 1.7.** Pin this in `dmode.config.md` (`m11-strategy: 1.7`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **M11 is a single-runner module.** `11-Prompt.md` is the only executable runner. The older numbered component files are retained as migration references and are not the read-contract. M11 must not accept an activation plan without a current client decision-maker decision and a clear statement of what that decision authorises in the governing Commercial Direction.

## Client output wrapper — required

The client body begins with `## The commercial cycle decision` and uses descriptive headings only. It must not contain numbered schema keys, an activation handoff, governance, source-map, invalidation, re-entry or lock section. Keep `11_00`–`11_09` only in `11-Handoff-Pack.md` or the generation manifest.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Richer lifecycle states remain in the Handoff Pack or internal run manifest.

## Consultancy Decision Record — internal handoff only

Canonical fields: `decision_id`, `module`, `decision_area`, `situation`, `evidence_refs`, `evidence_status`, `confidence`, `diagnosis`, `options_considered`, `comparison_criteria`, `recommendation`, `rationale`, `accepted_trade_off`, `client_decision`, `conditions`, `owner`, `review_event`, `progression_condition`, `invalidation_triggers`, `downstream_authority`.


The client narrative performs the seven consultancy functions in `FW_25`. Store the machine record only in `11-Handoff-Pack.md` with the full `Consultancy Decision Record`, plus `direction_id`, `direction_version`, `strategic_move_id`, `quantities`, `sample`, `thresholds`, `capacity`, `dates`, `owners` and `stop_rules`. Any recommendation that changes the inherited strategy is invalid and must return upstream.

## Strategic Accountability Plan — internal operating authority

Store one current `11-accountability-plan` in `11-Handoff-Pack.md` or the run manifest. It is required for Module 12 and follows `FW_32`.

```yaml
11-accountability-plan:
  active-contracts: []
  planning-assumption-ids: []
  baselines: []
  indicators: []
  implementation-fidelity-checks: []
  driver-bindings: []
  evidence-owners: []
  external-factors: []
  attribution-boundaries: []
  capacity-model:
  review-schedule:
  decision-rules: []
  unresolved-measurement-inputs: []
```

Every quantitative indicator includes `indicator_id`, `contract_id`, `exact_event`, `definition`, `numerator`, `denominator`, `inclusions`, `exclusions`, `source`, `baseline_state`, `period`, `frequency`, `owner`, `minimum_sample_or_period`, `threshold_basis`, `missing_data_rule`, `interpretation_limit` and `decision_use`.

The event catalogue distinguishes each event: messages sent, connections accepted, replies, meaningful replies, conversations booked, conversations completed, qualified conversations, proposals, paid starts, started engagements, completed engagements, contracted value, invoices, cash received and completed-and-paid revenue.

---

## Canonical output

**File:** Resolve the selected client’s current `Output/01-decision-pack/commercial-cycle.md` under the entry/folder convention; internal approval and handoff records remain attached to the run. The former flat filename is historical.

**Heading convention:** `## 11_NN [Name]` for each deliverable; `###`/`####` = field within a deliverable.

```text
# Commercial Cycle 01 — [Brand Name]
<frontmatter: schema: m11-strategy · schema-version: 1.7 · brand>

## 11_00 Upstream Layer (imported)
### Commercial Direction       direction_id, version, directional_horizon, horizon_rationale, longer_term_ambition_context, priority_buying_situation, strategic_route, strategic_move_id, first_phase_objective, active_first_phase_consequence_ids, exclusions, progression_condition, decision_state, execution_permission

The exact Commercial Direction ID and version must be recorded in `11_00` and carried unchanged through the handoff.
### RouteAuthorization          route ceiling, status, capability_profile, permitted channels/offers/audiences and generation permission (M04 04-Handoff-Pack)
### Evidence Entry Condition   first evidence event; optional pre-cycle test ID/effect only when explicitly required; resulting M11 permission
### Current inherited strategic inputs brand, belief shift, primary audience, offer, invitation, proof posture, claims boundary from supporting strategy documents
### Inherited Channel Portfolio Module 06 version, evidence cut-off, Primary/Supporting/Experimental/Deferred/Rejected classifications, channel jobs and change conditions
### Current operating constraints founder-led delivery, high-consideration price, limited public case studies, clear founder network, website status, claims discipline
### Operating topology          solo_operator, single_team or multiple_coordinated_teams; decision owner; delegated rights; cross-team dependency interfaces where applicable

## 11_01 Immediate Commercial Objective  ← ANCHOR
### Inherited first-phase objective direction objective and strategic-move job
### Quantified controlled-cycle commitment   commercial_result, primary_metric, target, controlled_cycle_horizon, horizon_rationale, cycle_purpose, decision_uncertainty, evidence_to_gather, revenue_link, non_goal, numerical_rationale, evidence_limit
### Secondary learning evidence     observations kept distinct from the primary commercial result and its threshold
### Stretch objective              optional stretch targets
### Primary metric                 observable result definition
### Revenue link                   connection to current offer and revenue route
### Immediate non-goals            deliberately excluded activities

## 11_02 Priority Buyer  ← ANCHOR
### Inherited priority buying situation audience subset, buyer_role, business_state, trigger_event, belief_state
### Required operating conditions  active customers, team, market-facing surfaces, operating history, authority
### Priority trigger events         specific decision or pressure creating timing
### Belief state                   belief-readiness condition from Modules 05–07
### Qualification conditions       conditions before founder invests time
### Exclusions                     buyers not pursued during this cycle

## 11_03 Acquisition Mechanism  ← ANCHOR
### Mechanism statement           how market activity becomes conversation or sale
### Mechanism stages              first_contact, desired_initial_response, qualification_step, conversation_step, offer_step, follow_up_step, conversion_metric
### Why this mechanism fits       alignment with current offer and proof state

## 11_04 Recommended Route  ← ANCHOR
### Inherited strategic route   exact direction route and exclusions
### First-quarter activation selection one Primary element plus only required Supporting or specifically authorised Experimental elements from the Module 06 portfolio
### Channel-specific jobs       defined only for the selected portfolio elements
### Route-specific thresholds    evaluation criteria, decision logic, rationale and evidence limit

## 11_05 Buyer Response Path  ← ANCHOR
### Response states             no response, recognition/curiosity, referral introduction, qualified fit, not ready now, not a fit, fit conversation completed, proposal-ready, won/lost
### State-specific handling     next action, timing, asset, scorecard update, stop point for each state

## 11_06 Proof Actions  ← ANCHOR
### Proof action schema         action_id, activity, priority_buyer, buyer_stage, quantity_and_cadence, required_asset_ids, generator_role, channel_or_location, desired_response, mechanism_link, leading_metric, success_threshold, adjust_threshold, stop_threshold, threshold_rationale, evidence_limit, owner, claims_checkpoint, applicable_bounded_record
### Workshop/diagnostic record  applicability, approved_diagnostic, buyer_evidence_sought, observation, decision_use
### Revenue mechanism record    applicability, buyer_action, commercial_mechanism, revenue_evidence
### Public thinking record      applicability, upstream_authority, belief, audience, surface, observable_response, learning_use
### Referral/network record     applicability, upstream_authority, priority_relationship, approved_invitation, next_step, observable_response
### PA1 — [first derived proof action]
### PA2 — [second derived proof action]
### PA3 — [third derived proof action]
### Enabling asset              minimum credibility and fit surface

## 11_07 Commercial Maths and Planning Assumptions  ← ANCHOR
### Planned activity volume    90-day planned volumes by activity type
### Planning funnel             working execution model with ratios; rationale; what the model can and cannot show
### Indicator definitions       exact event, numerator, denominator, source, period, missing-data rule, interpretation limit and decision use
### Baseline states             measured, documented-qualitative, zero, not-applicable, unavailable, not-comparable, collection-pending or stale
### Capacity model              target selection, outreach, conversations, proposals, follow-up, evidence capture, review, delivery, administration and non-client overhead
### Capacity rule               work priority order; concurrency ceiling derived or explicitly low-confidence

## 11_08 Continue, Adjust, Pivot and Escalate  ← ANCHOR
### Continue conditions         when to persist unchanged
### Adjust conditions           when to modify action, asset or targeting
### Return to route decision    when to revisit Sections 11_01–11_05
### Escalate upstream           when to revisit M07, M08, M09, M04, M05
### Next decision event         review date or evidence event; confirmed / strengthened / qualified / adapted downstream / returned upstream / stopped
### AI pressure-test record     optional alternatives, contradictions, miscalibration_risk, authorised_human_decision

## 11_09 Activation Handoff Pack for Module 12  ← ANCHOR · INTERNAL ONLY — emit to 11-Handoff-Pack.md, not the client body
### Governing direction         direction_id, version, strategic_move_id, first_phase_objective, route, audience, exclusions, progression_condition
### Locked execution decisions  quantified objective, mechanism, supporting surfaces, buyer response path, proof actions, primary metric, targets
### Strategic Accountability Plan active contracts, assumptions, baselines, indicators, fidelity checks, driver bindings, evidence owners, external factors, attribution boundaries, capacity, reviews and decision rules
### Active / First Phase consequence trace exact inherited consequence IDs, required assets and production routes; no locally created consequence
### Operating context           operating_topology, decision_owner, delegated_decision_rights, bounded ownership map and cross-team dependency interfaces
### Module 12 instruction       operationalisation constraints
```

---

## The load-bearing fields

| What | Read-key | Role |
| --- | --- | --- |
| **Immediate Commercial Objective** | `11_01` | Inherits the first-phase objective and sets a responsible first-quarter metric, target, revenue link and non-goals |
| **Priority Buyer** | `11_02` | Turns the inherited priority buying situation into execution criteria without selecting a different audience |
| **Acquisition Mechanism** | `11_03` | Shows how first activity can become a conversation, offer and sale |
| **Recommended Route** | `11_04` | Preserves the strategic route and selects only the first-quarter mechanism and supporting surfaces inside it |
| **Buyer Response Path** | `11_05` | Defines the next action for every material buyer response state |
| **Proof Actions** | `11_06` | Locks the adopted action portfolio with buyer, cadence, asset, response, metric, thresholds, owner and claims check |
| **Commercial Maths** | `11_07` | Records planned volumes, working funnel assumptions and capacity order |
| **Decision Rules** | `11_08` | Defines continue, adjust, route-return and upstream-escalation conditions |
| **Activation Handoff** | `11_09` | Passes the complete locked first-phase decision and authorised asset requirements to Module 12 |

**For schema validation:** `11_01`–`11_09` must all be present and non-empty. The activity list must not appear before `11_01`–`11_05` are complete. `11_09` must reproduce the locked values without changing them. Bounded Proof Action records are conditional, must trace to the locked route and cannot substitute activity for observable evidence. Public-thinking and referral/network records require explicit upstream authority. AI pressure-testing is optional and ends in an authorised human decision.

---

## Read-contract for skills

1. **Locate deliverables by sub-module number.** `## 11_NN`.
2. **Numbered keys are canonical.** `11_03` not "the 90-day plan".
3. **Read the derived value, not the scaffolding.** The emitter wraps each deliverable in the derivation method (Step anchor → Step derived). Read the **derived** block.
4. **Commercial Direction gate.** Refuse an accepted run unless `11_00` contains a current direction version, client decision-maker decision and authorised scope.
5. **Evidence entry condition.** Require the Commercial Direction's first evidence event and resulting permission. Require a separate pre-cycle test only when the record explicitly names it; Module 11 does not invent or rescore one.
6. **Route and channel constraints.** `11_00` must contain `RouteAuthorization` and the current Module 06 Channel Portfolio. `11_04` and `11_06` must preserve the Commercial Direction and stay inside permitted channels, offers and audiences. Activating a Deferred or Rejected element, or introducing a new channel, returns to Module 06.
7. **Activation decision integrity.** `11_01`–`11_06` and `11_09` must agree with the direction on objective, audience, route, strategic move, Active / First Phase consequence IDs, exclusions and progression condition, and agree internally on mechanism, response path, quantities and thresholds. A requirement absent from the selected consequences returns upstream.
8. **Tolerate aliases during transition** — resolve via the Alias Map.
9. **Version-check** the frontmatter `schema-version` against the skill's declared version.
10. **Accountability integrity.** Refuse M12 handoff when an active contract lacks an operational definition, explicit baseline state, evidence owner, fidelity check, evidence condition or decision use.
11. **Topology integrity.** Require one of the three governed `operating_topology` values. Multiple-team records add only bounded workstream ownership, dependency interfaces and escalation ownership; they must not create departmental strategy or a general project-management layer.

**Cross-module read.** `11_00` is an imported convenience copy. Authoritative fields read from M04 (`04-Handoff-Pack`), M05 (`05-Strategy-Schema`), M06 (`06-Strategy-Schema`), M07 (`07-Strategy-Schema`), M08 (`08-Strategy-Schema`), M09 (`09-Strategy-Schema`), and M10 (`10-Strategy-Schema`).

---

## Alias Map (current emission → canonical)

| Current heading | Read-key |
| --- | --- |
| `### Deliverable 11_NN: [Name]` (client file) | `11_NN` (token in heading) |
| `### 11_NN [Name]` (emitter) | `11_NN` |
| `## Phase 1 / 2 …` groupings | dropped — deliverables stand on their own |

---

## Migration status

- [x] **Schema created** (v1.0) — this document.
- [ ] **Skills can read current output** — pending per-module number-key adoption.
- [ ] **Emitter reformat (optional, non-blocking)** — opportunistic on the next real M11 run.

## Version notes

**Consumer clarification — 2026-10-04**

- Propagated reviewed framework source/evidence, exact entry permission and selected-cycle interpretation at the affected consumer points; stable schema keys and historical notes remain.


### 1.7 — 18 August 2026 (Bounded Proof Action Types)

- Made workshop/diagnostic, revenue-mechanism, public-thinking and referral/network records conditional native fields of `11_06`.
- Added an optional AI pressure-test record to `11_08` while preserving the authorised human decision.

### 1.6 — 18 August 2026 (Operating Topology)

- Added the three governed operating-topology values and role-neutral decision authority.
- Added bounded cross-team ownership and dependency interfaces for Module 12 without expanding Module 11 into departmental strategy.
- Clarified that `11_01`–`11_09` are current schema section keys, not authority granted to deprecated component files.

### 1.5 — 25 July 2026 (Strategy Accountability)

- Added the internal Strategic Accountability Plan required by FW_32.
- Added exact event, numerator, denominator, baseline, missing-data, interpretation and decision-use fields.
- Separated the first-cycle commercial events and expanded the phase-weighted founder capacity model.
- Required unresolved owner decisions to remain blocked rather than becoming planning defaults.

### 1.4 — 16 July 2026 (Dynamic Channel Portfolio Activation)

- Added the Module 06 Channel Portfolio as a required inherited input with version, evidence cut-off, classifications, jobs and change conditions.
- Removed LinkedIn and the three Langfell-specific proof-action names from the generic schema.
- Limited Module 11 to activating authorised portfolio elements; new, Deferred or Rejected channels return to Module 06.

### 1.3 — 14 July 2026 (Client Rendering and Threshold Rationale)

- Added client-facing document, decision and evidence state fields.
- Required a practical rationale and evidence limit for every material number and threshold.

### 1.2 — 14 July 2026 (Commercial Direction Migration)

- Added the exact Commercial Direction version, strategic move, first-phase objective, exclusions and progression gate to `11_00` and `11_09`.
- Changed M11 from horizon-strategy owner to first-quarter execution authority.
- Required evidence entry condition and execution permission separately from confidence; removed the universal Pilot dependency.
- Kept mechanism, quantities, capacity, thresholds and operational commitments inside M11.

### 1.1 — 13 July 2026 (Market Activation Patch)

- Restructured to enforce five activation decisions before proof actions: immediate objective, priority buyer, acquisition mechanism, recommended route, and buyer response path.
- Renamed `11_01` from "Conviction and Revenue Anchoring" to "Immediate Commercial Objective".
- Renamed `11_02` from "Proof Action Derivation" to "Priority Buyer".
- Added new sections: `11_03 Acquisition Mechanism`, `11_04 Recommended Route`, `11_05 Buyer Response Path`, `11_07 Commercial Maths and Planning Assumptions`.
- Moved proof actions to `11_06` with expanded schema including action_id, thresholds, and claims checkpoints.
- Renamed `11_08` from "Reflection Protocol" to "Continue, Adjust, Pivot and Escalate".
- Renamed `11_09` from "Execution Handoff Pack" to "Activation Handoff Pack for Module 12".
- Replaced the former universal Pilot precondition with a Direction-owned evidence entry condition.
- Updated the load-bearing table and read-contract to match `11_01`–`11_09`.
- Added the mandatory Client Interpretation and Handoff and Governance wrappers.
