---
id: 12-Strategy-Schema
title: Module 12 Strategy Schema (Locked Read-Contract)
description: Client outputs add every editorial field in FW_27.
type: module-doc
schema: m12-strategy
schema-version: 1.5
version: "1.7"
last-updated: 2026-10-04
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 12-Prompt
- 12-Quality-Gates
- 12-README
- 12_01-Module-Dependency-Map
- 11-Handoff-Pack
- 11-Strategy-Schema
- templates/Commercial-Record-Template.md
- framework/FW_24-Commercial-Direction-Contract
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
feeds-into:
- 12-README
- 12-Quality-Gates
- templates/Integrated-Executive-Report-Generator-Prompt.md
- templates/Consultancy-Delivery-Pack-Generator-Prompt.md
---

# Module 12 Strategy Schema

## Selected-cycle and entry interpretation — required

Apply current FW_15, FW_24 and Shared Contracts before the detailed instructions below. Preserve stable numbered read keys and legacy technical enum values such as `controlled-90-day`; the enum is a permission class, not a duration mandate. Render headings, dates, quantities and review events for the exact selected cycle. Retained 90-day calendars and three-action scaffolds are illustrative shapes only; adapt their repeated rows to every adopted action and actual selected period, never truncate accepted work or invent actions to fill the sample. Action count follows the accepted Direction, capacity, economic basis and decision thresholds. Required cycle-close review remains mandatory at the selected endpoint, with earlier binding review/stop conditions preserved.

A failed required entry emits only the shared dependency notice. A pre-lock or Wait preview exists only at its exact expressly permitted diagnostic scope with all other conditions satisfied; it cannot create normal strategy/coordination, a lock or a handoff. Source lock, client adoption, execution and release are separate. An override never waives Shared Contracts non-overridable boundaries.


## Strategy-to-action starter plans

Apply `FW_41`. Bring the current Starter Plan references and M11's exact accepted selections, adoption events and dispositions into the existing Working Cycle 01. This remains the single integrated first operating plan; it creates no second plan authority. Use `12_01` for shared assets, `12_03` for cross-functional sequence/dependency conditions, `12_05` for evidence, `12_06` for return conditions and `12_08` for transition. Preserve M11 commitments and all applicable response, rhythm, checklist and measurement sections. Block work that is unadopted, withheld, unresolved, stale, caught in circular dependencies or in conflict with capacity. Do not invent resources or approval to unblock it. Use the selected cycle for immediate and 30/60/90-day views. For later phases, inherit Direction’s selected horizon conditionally with decreasing detail. Adapt horizons under FW_24; do not create precise later dates, activity counts or budgets.

The existing `12_00` imports `starter-plan-refs`, current action/adoption IDs and M11 resolution/dispositions through `strategy-to-action: 1.0`. Each `12_03` work item retains its action/consequence/decision/evidence lineage, dependencies and exact M11 commitment. For an enabling or non-commercial item, buyer/quantity/response may be explicitly not-applicable only when the inherited M11 reason is recorded. Missing commercial fields still fail. Link existing Practitioner Briefs and new Starter Plans in the asset/handoff registry. Keep the current numbered schema pin and all existing completeness/acceptance gates; the adapter creates no new plan authority.

## Editorial read-contract — required

Client outputs add every editorial field in `FW_27`. The current objective, next action, owner, response rule, quantity and decision threshold are visible before background. Commercial Cycle 01 decides the cycle; Working Cycle 01 runs it. Friday questions produce practical decisions. Exact market language and route decisions are recorded separately from interpretation. Weekly instructions must use brief source references and be usable without reopening the full pack. Keep their scope proportionate to the commercial test.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader comprehension remains `pending` until tested.

**The locked, skill-facing structure of the Module 12 output.** Every downstream skill reads the M12 work-coordination document against this contract. `12_01-Module-Dependency-Map.md` is the graphical navigation aid; this document defines exactly where each locked output lives so a skill can locate it reliably.

**Schema version: 1.5.** Pin this in `dmode.config.md` (`m12-strategy: 1.5`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **M12 is a single-runner module.** `12-Prompt.md` is the only executable runner. `12_01-Module-Dependency-Map.md` is a reference map, not an executable prompt. M12 must not create coordination work for a non-locked Module 11 plan.

## Measurement and Review Rhythm — internal operating authority

Store one current `12-measurement-review-rhythm` in the internal Handoff State or run manifest. It consumes the passed M11 Strategic Accountability Plan and may not introduce a new measure, quantity, threshold, Cost Driver, monetary range or strategic return point.

```yaml
12-measurement-review-rhythm:
  active-contract-ids: []
  work-items:
    - action-id:
      decision-id:
      contract-id:
      implementation-consequence-id:
      cost-driver-id:
      indicator-id:
      owner:
      dependencies: []
      cadence:
      baseline-task:
      evidence-task:
      permission:
      production-state:
      publication-state:
      budget-state:
      spend-state:
      completion-evidence:
      return-trigger:
  missing-data-rules: []
  review-preparation:
    weekly:
    30-day:
    90-day:
    six-month:
    twelve-month:
```

## Client output wrapper — required

The client body begins with `## The working plan` and uses descriptive headings only. It must not contain numbered schema keys, handoff, governance, source-map, invalidation, re-entry or lock sections. Keep `12_00`–`12_08` only in the internal Handoff Pack or generation manifest.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Keep richer lifecycle states in the Handoff Pack or internal run manifest.

---

## Canonical output

**File:** Resolve the selected client’s current `Output/01-decision-pack/working-cycle.md` under the entry/folder convention; internal control records remain attached to the run. The former flat filename is historical.

**Heading convention:** `## 12_00 [Name]` through `## 12_07 [Name]`; `###`/`####` = field within an output.

```text
# Module 12: Work Coordination — [Brand Name]
<frontmatter: schema: m12-strategy · schema-version: 1.5 · brand>

## 12_00 Inherited Activation Decision (imported)
### Commercial Direction         direction_id, version, strategic_move_id, first_phase_objective, progression_condition, invalidation_state
### Active / First Phase consequences exact inherited IDs from M11 11_09
### 90-day objective             from M11 11_01
### Priority buyer               from M11 11_02
### Primary route                from M11 11_04
### Supporting route             from M11 11_04
### Excluded route               from M11 11_04
### Primary metric               from M11 11_01
### Proof actions                PA1, PA2, PA3 from M11 11_06
### Operating topology           solo_operator / single_team / multiple_coordinated_teams from M11
### Decision authority           authorised human decision owner + any exact delegated operating rights
### Operating rule               operator does not need to interpret supporting strategy documents
### Claims rule                  no action may promise guaranteed outcomes

## 12_01 Asset and Production Registry  ← ANCHOR
### Asset registry table        asset_id, asset_name, job, client_workflow, upstream_source, used_in, initial_state, re_generate_when
### Topology fields             workstream_owner, decision_right_interface, cross_team_handoff, escalation_point when route requires them
### Internal workflow binding note functional workflow roles and repository bindings; do not render exact bindings for the client
### Minimum assets before full activity begins

## 12_02 Weekly Operating Rhythm  ← ANCHOR
### Monday — select and prepare  time budget, 5-step process
### Tuesday — open access        time budget, 4-step process
### Wednesday — complete new contact and respond  time budget, 4-step process
### Thursday — conversations and offers  time budget, 4-step process
### Friday — follow up and review  time budget, 5-step process
### Capacity priority           work order when time is limited
### Personal Workflow Ritual   applicability, reason, weekly_trigger, behaviour, cycle_threshold_evidence, owner
### Public Thinking signal     applicability, m11_authority, coordination_status, response_evidence

## 12_03 Twelve-Week Operating Plan  ← ANCHOR
### Week 1 — Prepare the route and begin lightly
### Week 2 — Start the full rhythm
### Week 3 — Complete the first conversations
### Week 4 — Review the first usable sample
### Week 5 — Use evidence to sharpen proof
### Week 6 — Check whether recognition becomes conversation
### Week 7 — Strengthen the proposal handoff
### Week 8 — Mid-cycle route review
### Week 9 — Reactivate qualified not-now buyers
### Week 10 — Convert learning into a stronger proof asset
### Week 11 — Resolve open commercial decisions
### Week 12 — Complete the cycle and set the next route
### Horizon adaptation          keep read-key 12_03; use all selected-cycle weeks, with all applicable weeks for a justified 90-day view. Do not extend a shorter accepted cycle by copying the default calendar.
### Weekly fields               week_objective, new_actions, follow_up_actions, priority_buyer, asset_ids, client_workflow, channel_or_location, response_to_watch, response_instruction, metric_to_update, decision_rule, time_budget, owner, dependencies, workstream_owner/cross_team_handoff/escalation_point when applicable

## 12_04 Response and Follow-Up Playbook  ← ANCHOR
### A. Founder replies with recognition or curiosity
### B. Trusted contact makes an introduction
### C. Buyer says "not now"
### D. Buyer does not reply
### E. Buyer is not a fit
### F. Fit conversation is completed
### G. Proposal is open

## 12_05 Simple Scorecard  ← ANCHOR
### Weekly counts             messages sent, connections accepted, replies, meaningful replies, conversations booked, conversations completed, qualified conversations, proposals, paid starts, engagements started, engagements completed, contracted value, invoices, cash received and completed-and-paid revenue
### Calculated ratios         only ratios whose numerator, denominator, period and inclusion/exclusion rules are inherited exactly from M11
### Evidence state            explicit missing, incomparable, unavailable and collection-pending handling
### Evidence roll-up          source definition, workstream evidence owner and consolidation cadence for multiple coordinated teams
### Friday review questions   6 questions for weekly review
### Bottom-Up Conviction Signals supporting, contradicting, ambiguous evidence, source, escalation_or_decision_use

## 12_06 Continue, Adjust and Stop Rules  ← ANCHOR
### Continue unchanged when  threshold conditions
### Adjust one stage when    specific failure conditions
### Return to Module 11 when  evidence requires route reconsideration
### Stop an action immediately when  boundary conditions
### What not to do            prohibited responses to weak results
### Expanded Conviction Trace milestone, proof_action, actual_belief, success_evidence, miscalibrated_execution, claims_boundary, contradicting_or_ambiguous_evidence

## 12_07 First-Week Beginner Checklist  ← ANCHOR
### 10-step checklist        sequential actions for Week 1

## 12_08 Cycle Transition Protocol  ← support
### Persist/Adjust/Pivot route/Escalate upstream logic
### Alignment Artefact Refresh applicability, reason, artefact, owner, trigger, smallest_sufficient_update
### 12B boundary notes        future Implementation Companion scope
```

---

## The load-bearing fields

| What | Read-key | Role |
| --- | --- | --- |
| **Inherited Activation Decision** | `12_00` | Copies the locked M11 objective, buyer, route, metric, proof actions, cycle horizon and review event |
| **Asset and Production Registry** | `12_01` | Binds every required asset to its commercial job, source and production route or manual template |
| **Weekly Operating Rhythm** | `12_02` | Gives the operator a repeatable Monday-to-Friday sequence and capacity order |
| **Twelve-Week Operating Plan** | `12_03` | States exact weekly actions, quantities, assets, responses, next steps, measures and time |
| **Response and Follow-Up Playbook** | `12_04` | Defines what happens for every material buyer response state |
| **Simple Scorecard** | `12_05` | Tracks mechanism counts and ratios without substituting vanity metrics |
| **Continue, Adjust and Stop Rules** | `12_06` | Applies M11 thresholds and routes material change back to M11 |
| **First-Week Beginner Checklist** | `12_07` | Lets a novice founder begin without interpreting upstream modules |
| **Cycle Transition Protocol** | `12_08` | Closes the cycle and routes persist, adjust, pivot or escalate decisions |

**For schema validation:** `12_00`–`12_07` must be present and non-empty. `12_08` is required before cycle close. No weekly action may omit buyer, quantity, asset, response, next step, metric, owner and time budget. The `multiple_coordinated_teams` route additionally requires workstream ownership, decision-right interfaces, cross-team handoffs, escalation points, evidence roll-up and an exact upstream change-control return.

## Read-contract for skills

1. **Locate outputs by sub-module number.** `## 12_NN`.
2. **Numbered keys are canonical.** `12_03` not "the weekly plan".
3. **Read the derived value, not the scaffolding.** The emitter wraps each output in the derivation method (Step anchor → Step derived). Read the **derived** block.
4. **Mandatory upstream lock.** Refuse a locked run unless `12_00` shows a current Commercial Direction version, the Module 11 activation decision is locked and RouteAuthorization is `Approved` or `Overridden`.
5. **No reconstruction required.** A novice founder must be able to execute Commercial Cycle 01 without opening the supporting strategy documents.
6. **Operator usability.** Reject any weekly plan that uses channel or module shorthand without stating exact action, buyer, response sought, and next step.
7. **Market path integrity.** `12_00`–`12_03` must preserve the direction ID, strategic move, progression condition, objective, priority buyer, primary route, supporting route, excluded route and buyer response path. M12 may sequence these decisions and organise their execution; it may not replace them.
8. **Asset and workflow binding.** `12_01` must show functional workflow names to the client while binding exact repository identifiers only in internal data or approved manual templates.
9. **Claims boundary respect.** No action, asset, or response instruction may require a claim outside the locked claims boundaries.
10. **Tolerate aliases during transition** — resolve via the Alias Map.
11. **Commitment preservation.** M12 may schedule and track M11 commitments but must not set or change quantities, owners, routes, proof actions, investment priorities or thresholds.
12. **Version-check** the frontmatter `schema-version` against the skill's declared version.
12. **Measurement inheritance.** Every scheduled evidence item resolves to an active M11 contract, indicator, owner, baseline task and return trigger.
13. **Fidelity before strategy.** A review cannot return to strategy until data definition, fidelity, sufficiency, external factors, progression layer and local correction have been checked.
14. **Topology is explicit.** Read `operating_topology` from M11. Do not infer it from headcount. Unknown or conflicting topology prevents lock.
15. **Multi-team restraint.** Topology fields preserve one accepted decision across teams. They may not create portfolio governance, alter an M11 lock or replace the client's project-management environment.

**Cross-module read.** `12_00` is an imported convenience copy. Authoritative fields read from M11 (`11-Strategy-Schema`) and M05 (`05-Strategy-Schema`).

---

## Alias Map (current emission → canonical)

| Current heading | Read-key |
| --- | --- |
| `### Deliverable 12_NN: [Name]` (client file) | `12_NN` (token in heading) |
| `### 12_NN [Name]` (emitter) | `12_NN` |
| `## Phase 1 / 2 / 3` groupings | dropped — outputs stand on their own |

---

## Migration status

- [x] **Schema created** (v1.0) — this document.
- [ ] **Dependency map regenerated** — `12_01-Module-Dependency-Map.md`.
- [ ] **Skills can read current output** — pending per-module number-key adoption.

## Version notes

**Consumer clarification — 2026-10-04**

- Propagated reviewed framework source/evidence, exact entry permission and selected-cycle interpretation at the affected consumer points; stable schema keys and historical notes remain.


### 1.5 — 18 August 2026 (Conditional Coordination Signals)

- Made the Personal Workflow Ritual, Public Thinking signal, Bottom-Up Conviction Signals, expanded Conviction Trace and Alignment Artefact Refresh native to their owning operating sections.
- Preserved conditional applicability for individual rituals, shared artefacts and upstream-authorised public thinking.

### 1.4 — 18 August 2026 (Bounded operating topology)

- Added explicit solo-operator, single-team and multiple-coordinated-teams routes.
- Added workstream ownership, decision-right interfaces, cross-team handoffs, escalation and evidence-roll-up fields only for the multi-team route.
- Preserved the existing `12_00`–`12_08` output contract and prohibited strategy reinterpretation or enterprise PM expansion.

### 1.3 — 25 July 2026 (Measurement and Review Rhythm)

- Added exact Decision Measurement Contract, consequence, driver and indicator inheritance.
- Replaced conflated scorecard events with the FW_32 event catalogue.
- Added explicit missing and incomparable data handling and governed weekly-to-twelve-month review preparation.
- Required implementation fidelity and evidence sufficiency before strategy judgement.

### 1.1 — 13 July 2026 (Market Activation Patch)

- Renamed `12_00` from "Upstream Layer" to "Inherited Activation Decision" to reflect M11 market activation structure.
- Renamed `12_01` from "Module Dependency Map" to "Asset and Generator Registry" with expanded asset schema.
- Renamed `12_02` from "Proof Action Breakdown" to "Weekly Operating Rhythm" with daily cadence and capacity priority.
- Renamed `12_03` from "Progress Tracking System" to "Twelve-Week Operating Plan" with exact weekly fields.
- Renamed `12_04` from "Resource Balancing Framework" to "Response and Follow-Up Playbook" with beginner-usable state instructions.
- Renamed `12_05` from "Integrated Review Cadence" to "Simple Scorecard" with weekly counts and calculated ratios.
- Renamed `12_06` from "Cycle Transition Protocol" to "Continue, Adjust and Stop Rules" with threshold-based logic.
- Added new section: `12_07 First-Week Beginner Checklist` for novice-founder usability.
- Added new section: `12_08 Cycle Transition Protocol` as support section.
- Updated the load-bearing fields and read-contract to match `12_00`–`12_08`.
- Removed 180-Day Direction and 365-Day Target as strategy authorities. The current Commercial Direction version, strategic move and progression condition are imported instead; Reflection Protocol remains an M11 execution control.
- Made the inherited activation decision, asset registry, weekly rhythm, twelve-week plan, response playbook and first-week checklist mandatory.
- Added the Client Interpretation and Handoff and Governance wrappers.
