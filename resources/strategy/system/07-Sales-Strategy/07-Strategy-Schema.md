---
id: 07-Strategy-Schema
title: Module 07 Strategy Schema (Locked Read-Contract)
description: The internal canonical state adds materialdecisions, assumptions, implementationconsequences, costdrivers and
type: module-doc
schema: m07-strategy
schema-version: 1.3
version: 1.7
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 07_08-Sales-Handoff-Pack
- 07-Philosophy
- 07-Prompt
- 07-Quality-Gates
- 06-Handoff-Pack
- 06-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- framework/FW_25-Consultancy-Judgement-Contract
- framework/FW_26-Strategy-Multi-View-Contract
feeds-into:
- 07-README
- 07-Quality-Gates
- 07B-Sales-Content-Generator
- 08-README
---


# Module 07 Strategy Schema

## Strategy-to-action starter plans

Apply `FW_41`. Keep the existing strategy fields and schema version; attach the separately versioned `strategy-to-action: 1.0` transport defined in `templates/strategy-to-action/plan.schema.json` through `starter-plan-refs` in the handoff/private manifest. A plan references existing decision, consequence and evidence records; ownership of those strategy fields stays with their source. Derive the recommended Starter Plan after source acceptance. Human adoption, production and release are separate decisions. Do not silently rewrite or automatically reapprove a previously locked strategy.

## FW_32 source-owned accountability records

The internal canonical state adds `material_decisions`, `assumptions`, `implementation_consequences`, `cost_drivers` and `decision_measurement_contracts` using the exact schemas in `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`. Client views may explain selected effects and implementation implications but do not expose raw governance schemas.

For each material decision, record at least one intended effect and a named rule for the next decision. Record each material enablement, data, privacy or production implication as a consequence. Give every estimable work unit a Cost Driver without a monetary rate. Omit outreach quantities.

## Editorial read-contract — required

Canonical outputs add every editorial field in `FW_27`. Explain diagnosis before proposing, the five paid-value components, qualification, the four legitimate fit-conversation outcomes, the full proposal threshold and stop conditions. Readers must be able to understand them without remembering the framework. The internal memory aid is `No live decision, no repeated incident, no founder authority, no supported route—no proposal.` It supports recall and never replaces the full criteria. Method-only trace stays internal.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader comprehension remains `pending` until tested.

## Governed strategy outputs

The client-readable canonical authority and full strategy is `07-sales-strategy.md`. When routed, emit `07-sales-strategy-executive-view.md`, `07-sales-strategy-presentation-view.md`, `07-sales-strategy-strategic-snapshot.md` and, where enablement follows, `07-sales-strategy-practitioner-brief.md`. The brief uses schema `1.2`, `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the common V3 spine and the Sales-specific middle. Views and the brief inherit the canonical states and lock ID, and consume the canonical file plus transient view-source state. The former Comprehensive View is superseded by the canonical strategy.

**This contract defines the locked structure that downstream skills read.** Every downstream skill uses it to locate information in the M07 invitation-strategy document. `07_08-Sales-Handoff-Pack.md` defines *which* outputs carry downstream and *why*; this document defines *exactly where each one lives* so a skill can locate it reliably.

The Handoff Pack explains the outputs; this schema specifies their structure. It is the M07 equivalent of `05-Strategy-Schema.md` / `06-Strategy-Schema.md` and follows the same conventions (numbered read-keys, token-match read-rule, alias map, graceful degradation).

**Schema version: 1.3.** Pin this in `dmode.config.md` (`m07-strategy: 1.3`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **Audience note (why numbered headings).** `07-sales-strategy.md` is the complete client working strategy and a stable read surface for skills. Each deliverable is keyed to its sub-module number (`07_NN`) and the eight statements keep their canonical numbers (`S1`–`S8`). Use plain descriptive labels with those keys so the client never has to decode the framework.

---

## Client output wrapper — required

Before `07_00`, emit the seven-part canonical opening in `FW_26`. Explain who qualifies, what the conversation decides, what earns a proposal and when to stop or refer a prospect elsewhere. State the evidence and pressure boundaries, and distinguish fixed, flexible and unresolved decisions. Use practical headings and explain specialist terms before naming them. The client body must not contain internal controls; those remain in `07_08-Sales-Handoff-Pack.md` or the manifest. `07_07` carries enablement requirements only; Module 11 owns prospecting quantities and cadence.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Keep richer lifecycle states in the Handoff Pack or internal run manifest.

## Consultancy Decision Record — internal handoff only

Canonical fields: `decision_id`, `module`, `decision_area`, `situation`, `evidence_refs`, `evidence_status`, `confidence`, `diagnosis`, `options_considered`, `comparison_criteria`, `recommendation`, `rationale`, `accepted_trade_off`, `client_decision`, `conditions`, `owner`, `review_event`, `progression_condition`, `invalidation_triggers`, `downstream_authority`.


The client narrative performs the seven consultancy functions in `FW_25`. Store the machine record only in `07_08-Sales-Handoff-Pack.md` with the full `Consultancy Decision Record`, plus `priority_buyer_situation`, `recommended_sales_motion`, `pre_offer_conditions`, `declined_opportunities`, `stage_proof`, `founder_led_boundary` and `model_change_condition`.

## Canonical output

**File:** `clients/[brand]/output/07-sales-strategy.md` (one file per client). *(Flat path for v1.x. If a `strategy/` subfolder is adopted when `dmode.config.md` is drafted, update the path here and bump the schema version.)*

**Heading convention:** `## 07_NN [Name]` for each deliverable; the eight statements are addressed by statement number (`S1`–`S8`). `###` = field within a deliverable. The imported M05 brand layer + M06 positioning sit in `## 07_00`.

```text
# Module 07: Invitation Strategy — [Brand Name]
<frontmatter: schema: m07-strategy · schema-version: 1.3 · brand · archetype>

## 07_00 Brand + Positioning Layer (imported)
### RouteAuthorization          route, status, capability_profile, authorised_human_decision, decision_owner, closure_conditions, permitted_channels, permitted_offers, permitted_audiences, generation_permission (M04 04-Handoff-Pack)
### Belief Shift Journey        FROM / TO            (M05 05_03)
### Brand Voice                                      (M05 05_07)
### Copywriting Rules                                (M05 05_12)
### Claims Boundaries           Can / Must Qualify / Cannot   (M05 05_00, locked deployment Claims Boundaries)
### X-Factor                                         (M05 05_08)
### Marketing Positioning       S8 Positioning / S9 X-Factor / S10 Value   (M06 06_04)
### What, For Whom              S8.1 subordinate proposition                (M06 06_04)
### M06 Expression Statements   applicable S1–S7 (M06 06_05)
### M04 Commercial Constraints  Pricing Calibration / Offer Architecture Feasibility / Demand Creation Bridge

## 07_01 Sales Foundation — the 8 Sales Statements
### S1  Sales Context Statement          (deployable)
### S1 Self-Qualification                applicable / not-applicable / evidence-pending; prospect fit test; seller-qualification boundary
### S2  Transfer Moment — Before         (DIAGNOSTIC ANCHOR — belief state read off the prospect)
### S2 Named Diagnostic                  applicable / weakness-flagged / not-applicable; reveals; S4 evidence link; no invented method
### S3  Transfer Moment — After          (DIAGNOSTIC ANCHOR)
### S4  Belief Shift Proof Statement     (deployable)
### S5  Disqualification Statement       (deployable)
### S6  Urgency Frame Statement          (deployable)
### S7  Value Statement                  (deployable)
### S7 Pricing Conversation Architecture M04 boundary / introduction / context / qualification / stop rule
### S8  Invitation Statement             (deployable)
### S8 Invitation Vehicle                applicable / not-applicable / unsupported; M03/M04/M06 derivation; next decision

## 07_02 Belief Spectrum Readiness Qualification     ← ANCHOR (qualification logic)
### Belief-Ready / Belief-Curious / Belief-Locked
### Assessment Questions
### Disqualification Protocol            (derived from S5)
### Independent check                    (prevents circular classification)
### Outcome calibration                  (evidence for each label, not self-referential)

## 07_10 Gap Research Output (optional; required for Precision Outreach)
### Binary gap
### Columbo question
### Source, date, confidence, researcher

## 07_11 Brand Mirror Integration (optional)
### Entitlement rule / versioned API
### Clean fallback if Brand Mirror unavailable

## 07_12 Prospect Evidence & Privacy
### Source capture
### Privacy / access rules
### Do-not-contact list
### Challenge / correction rights
### Consent / expiry

## 07_03 Sales Narrative — Five Movements
### Movement Mechanics                   one participation/discovery/decision mechanic per Movement; no pressure device
## 07_04 Objection Diagnosis — Top 10 Objection Responses   ← ANCHOR (deployable objection language)
### Buyer Uncertainty Register            anticipated / observed / established pattern; concern / inference or evidence / decision state / response direction
### M08 Proof Question Handoff            uncertainty / state / proof question / available proof / gap / priority / boundary
## 07_05 Claims Boundaries for Sales
## 07_06 Transfer Metrics                (Belief / Proof / Result)
## 07_07 Sales Activation Requirements
## 07_08 Sales Handoff Pack                  INTERNAL ONLY — emit to 07_08-Sales-Handoff-Pack.md, not the client body
## 07_09 Commercial Summary
```

---

## The load-bearing fields

The eight Sales Statements are M07’s core output. M06 distinguishes anchors from expressions; M07 groups its statements by **function** (see `07-Philosophy.md` *The Eight Sales Statements*):

| Function | Statements | What they are | Read-key |
| --- | --- | --- | --- |
| **Deployable language** | S1, S4, S5, S6, S7, S8 | What the seller speaks or writes — the raw material every sales asset adapts | `S1` / `S4`…`S8` |
| **Diagnostic anchors** | S2, S3 | The Transfer Moment before/after — belief states the seller *reads off* the prospect, not lines they say | `S2` / `S3` |

**For schema validation:** the six **deployable** statements (S1, S4–S8) **must be present and written**. S2/S3 are required for qualification logic but are diagnostic, not spoken. S1 Self-Qualification and S2 Named Diagnostic must carry an explicit applicability/evidence state; absence may be an honest weakness rather than an invented mechanic. S7 must inherit Module 04's pricing boundary, including `not-yet-estimable`; it cannot manufacture a price. S8's Invitation Vehicle must be feasible under M04 or be `unsupported`. Each completed Movement has a mechanic, and each objection has the four-part mechanics map. Statements 4 and 7 under `reduced` capability_profile must be tagged `reduced-evidence` and cannot be treated as fully evidenced. Two more deliverables serve as required anchors because sales assets routinely import them:

- **`07_02` Qualification** — which belief state the asset is for (drives statement selection and tone).
- **`07_04` Objection Responses** — the deployable objection language (Top 10).

`07_10` Gap Research and `07_11` Brand Mirror Integration are optional unless required by `RouteAuthorization` or the `os-sales-asset` request. `07_04` may contain anticipated uncertainties before live evidence exists, but must distinguish them from observed evidence and supply M08 proof questions.

Consumers must tolerate missing metrics, implementation and commercial summaries. If the Five Movements are emitted, their mechanics are required. If objections are emitted, their concern/mechanic mapping is required.

The **Belief Shift Journey** (`07_00 → ### Belief Shift Journey`, from M05 `05_03`) and the **M06 Marketing Positioning** (`07_00 → ### Marketing Positioning`, M06 `06_04`) are required imports — sales language must not contradict the broadcast positioning it follows.

---

## Read-contract for skills

1. **Locate statements by number, deliverables by sub-module number** — `S1`…`S8`; `## 07_NN`. The number is invariant; the label may be reworded.
2. **Numbered keys are canonical.** `S8` not "the invitation statement"; `07_04` not "the objections section".
3. **Read the derived value, not the scaffolding.** The emitter wraps each statement/deliverable in the FW_16 two-step structure (`### Upstream Anchors (verbatim — Step 1)` → `### [Name] (derived from above — Step 2)` → Traceability). Read the **Step 2 / derived** block. If absent (clean output), read the section body.
4. **Tolerate aliases during transition** — resolve via the Alias Map.
5. **Deployable statements guaranteed, the rest optional.** S1/S4–S8, plus `07_02` and `07_04`, guaranteed; degrade gracefully elsewhere.
6. **Version-check** the frontmatter `schema-version` against the skill's declared version.

**Cross-module read.** `07_00` holds imported copies for convenience. Read authoritative values from their source modules. The authoritative brand fields are read from M05 against `05-Strategy-Schema.md`; the marketing positioning is read from M06 against `06-Strategy-Schema.md` (`S8`/`S9`/`S10` in `06_04`). A sales asset reads all three.

---

## Alias Map (current emission → canonical)

The client output (`clients/Langfell/output/07-sales-strategy.md`) already heads deliverables with the `07_NN` token (`### Deliverable 07_NN: [Name]`) and statements with `Statement N:` → `#### [Name] (derived from above — Step 2)`. The emitter (`07-Prompt.md`) heads statements `## N. [Name]` and deliverables `### 07_NN [Name]`.

**Read-rule (robust): match the statement number or the `07_NN` token, not an exact heading string.** Find `Statement N` / `S N` anywhere in the heading chain and read its Step-2 block; find `07_NN` (or the deliverable name) for a deliverable.

| Current heading | Read-key |
| --- | --- |
| `### Deliverable 07_NN: [Name]` (client file) | `07_NN` (token in heading) |
| `### 07_NN [Name]` (emitter) | `07_NN` |
| `### Statement N: [Name]` → `#### [Name] (derived… Step 2)` | `S N` |
| `## N. [Name]` → `### Sales Statement (derived… Step 2)` (emitter) | `S N` |
| `#### Disqualification Protocol (derived from Statement 5)` | `07_02 → Disqualification Protocol` |
| `## Phase 1 / 2 …` groupings | dropped — deliverables stand on their own |

---

## Migration status

- [x] **Schema locked** (v1.1) — this document.
- [x] **Skills can read current output** — the statement-number + `07_NN` token-match read-rule resolves both the client file and the emitter format without a prompt-file change. The client file already carries `07_NN` tokens, so deliverable reads are direct.
- [ ] **Cosmetic emitter reformat (optional, non-blocking)** — normalise `07-Prompt.md` statement headings to `### S N [Name]` for tidiness. Best done against a real M07 run.
- [ ] **Continue roll-out** — apply the same lock to M08, M10 (M05, M06, M07 now done).

---

## Validation: sales-asset (the new consumer)

`.claude/skills/sales-asset/SKILL.md` reads M07 against this schema. All reads resolve against `clients/Langfell/output/07-sales-strategy.md`:

| sales-asset input | Read-key |
| --- | --- |
| The 8 sales statements (the source library) | `S1`…`S8` |
| Deployable statements (the spoken/written material) | `S1` / `S4`…`S8` (`07_01`) |
| Diagnostic anchors (read the prospect's belief state) | `S2` / `S3` (`07_01`) |
| Qualification — which belief state the asset targets | `07_02` |
| Objection responses (Top 10) | `07_04` |
| Sales narrative / five movements | `07_03` |
| Sales claims boundaries | `07_05` |
| Belief Shift Journey (the spine) | `07_00 → ### Belief Shift Journey` (M05 `05_03`) |
| Marketing positioning (must not contradict) | `07_00 → ### Marketing Positioning` (M06 `06_04`) |

Brand-layer reads (Voice, Copywriting rules, Claims Boundaries, Core Values, X-Factor) resolve against `05-Strategy-Schema.md`.

---

## Version History

### 1.3 — 18 August 2026 (Subordinate sales mechanics)

- Added conditional self-qualification and diagnostic records, M04-bounded pricing conversation, invitation vehicle, Movement mechanics and objection mechanics to their canonical sections.
- Preserved the eight statements, Five Movements, disqualification and pressure boundaries.

| Version | Date | Changes |
| --- | --- | --- |
| 1.5 | 2026-08-17 | Required Practitioner Brief V3 metadata, common spine and Sales-specific middle for authorised enablement handoffs. |
| 1.1 | 2026-06-18 | Audit sync to current Module 05 taxonomy: renamed the imported `05_12` read label to Copywriting Rules, kept Voice as `05_07`, and clarified Claims Boundaries as Evidence Matrix / Filter-backed. |
| 1.0 | 2026-06-01 | Initial M07 schema lock. Numbered `07_NN` deliverable keys + `S1`–`S8` statement keys; deployable-vs-diagnostic statement split (S1,4–8 deployable / S2,3 diagnostic anchors); `07_02` Qualification + `07_04` Objection Responses as anchor-grade deliverables; statement-number/`07_NN` token-match read-rule; Step-2-derived read discipline; Alias Map for the client file (already `07_NN`-tagged) and the emitter; validated against the sales-asset skill and the Langfell client file. Mirrors `06-Strategy-Schema.md`. |

---

*© Langfell 2026. All Rights Reserved.*

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
