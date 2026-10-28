---
id: 08-Strategy-Schema
title: Module 08 Strategy Schema (Locked Read-Contract)
description: The internal canonical state adds materialdecisions, assumptions, implementationconsequences, costdrivers and
type: module-doc
schema: m08-strategy
schema-version: 1.4
version: 1.7
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 08_13-Content-Handoff-Pack
- 08-Philosophy
- 08-Prompt
- 08-Quality-Gates
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
- 08-README
- 08-Quality-Gates
- 08B-Content-Generator
- 09-README
---


# Module 08 Strategy Schema

## Strategy-to-action starter plans

Apply `FW_41`. Keep the existing strategy fields and schema version; attach the separately versioned `strategy-to-action: 1.0` transport defined in `templates/strategy-to-action/plan.schema.json` through `starter-plan-refs` in the handoff/private manifest. A plan references existing decision, consequence and evidence records; ownership of those strategy fields stays with their source. Derive the recommended Starter Plan after source acceptance. Human adoption, production and release are separate decisions. Do not silently rewrite or automatically reapprove a previously locked strategy.

## FW_32 source-owned accountability records

The internal canonical state adds `material_decisions`, `assumptions`, `implementation_consequences`, `cost_drivers` and `decision_measurement_contracts` using the exact schemas in `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`. Client views may explain selected effects and implementation implications but do not expose raw governance schemas.

For each material decision, record at least one intended effect and a named rule for the next decision. Record each material implication for evidence, assets or publishing as a consequence. Give every estimable work unit a Cost Driver without a monetary rate. Keep evidence strength, content depth and publication state separate.

## Editorial read-contract — required

Include every editorial field in `FW_27`. Distinguish existing evidence from evidence still required, and include a concrete walkthrough from the first source to a decision. Give each planned piece one reader question and one evidence class. Keep publication permission separate, and place qualifications beside the claims they limit. Treat book material as a governed source; do not simply reproduce chapters. Keep traces of the method internal.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader comprehension remains `pending` until tested.

## Governed strategy outputs

The client-readable canonical authority and full strategy is `08-content-strategy.md`. When routed, emit `08-content-strategy-executive-view.md`, `08-content-strategy-presentation-view.md`, `08-content-strategy-strategic-snapshot.md` and, where production follows, `08-content-strategy-practitioner-brief.md`. The brief uses schema `1.2`, `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the common V3 spine and the Proof-and-Content-specific middle. Views and the brief inherit the canonical states and lock ID, and consume the canonical file plus transient view-source state. The former Comprehensive View is superseded by the canonical strategy.

**This contract defines the locked structure that downstream skills read.** Every downstream skill uses it to locate information in the M08 proof-strategy document. `08_13-Content-Handoff-Pack.md` defines *which* outputs carry downstream and *why*; this document defines *exactly where each one lives* so a skill can locate it reliably.

The Handoff Pack explains the outputs; this schema specifies their structure. It is the M08 equivalent of `05`/`06`/`07-Strategy-Schema.md` and follows the same conventions (numbered read-keys, token-match read-rule, alias map, graceful degradation).

**Schema version: 1.4.** Pin this in `dmode.config.md` (`m08-strategy: 1.4`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **What's load-bearing here is different.** M06/M07 are statement-based; M08 is **pillar + proof**. The source library a content skill adapts is the **Content Pillars** (`08_02`), and the evidence it deploys is the **Proof Hierarchy** (`08_03`). There is no fixed statement count — pillars are a variable-length list keyed `Pillar N`.

> **Audience note (why numbered headings).** `08-content-strategy.md` is the complete client working strategy and a stable read surface for skills. Each deliverable is keyed to its sub-module number (`08_NN`). Use plain descriptive labels with those keys so the client never has to decode the framework.

---

## Client output wrapper — required

Before `08_00`, emit the seven-part canonical opening in `FW_26`. Explain what proof exists, what is missing, which buyer doubts take priority and which assets come first. State which claims are allowed or prohibited, and distinguish fixed, flexible and unresolved decisions. Explain what the evidence permits before introducing internal proof-class labels. The client body must not contain internal controls; those remain in `08_13-Content-Handoff-Pack.md` or the manifest. `08_08` defines proof sequence; Module 11 owns publishing quantities and cadence.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Richer lifecycle states remain in the Handoff Pack or internal run manifest. Proof-gap run state must be reconciled with the current run manifest.

## Consultancy Decision Record — internal handoff only

Canonical fields: `decision_id`, `module`, `decision_area`, `situation`, `evidence_refs`, `evidence_status`, `confidence`, `diagnosis`, `options_considered`, `comparison_criteria`, `recommendation`, `rationale`, `accepted_trade_off`, `client_decision`, `conditions`, `owner`, `review_event`, `progression_condition`, `invalidation_triggers`, `downstream_authority`.


The client narrative performs the seven consultancy functions in `FW_25`. Store the machine record only in `08_13-Content-Handoff-Pack.md` with the full `Consultancy Decision Record`, plus `urgent_proof_gap`, `first_evidence`, `recommended_formats`, `publication_exclusions`, `evidence_needed_objections`, `premature_production` and `decision_closing_event`.

## Canonical output

**File:** `clients/[brand]/output/08-content-strategy.md` (one file per client). *(Flat path for v1.x; revisit if a `strategy/` subfolder is adopted in `dmode.config.md`.)*

**Heading convention:** `## 08_NN [Name]` for each deliverable; pillars addressed `Pillar N` within `08_02`; proof tiers by tier name within `08_03`. `###`/`####` = field within a deliverable. Imported brand + upstream layer sits in `## 08_00`.

```text
# Module 08: Proof Strategy — [Brand Name]
<frontmatter: schema: m08-strategy · schema-version: 1.4 · brand · archetype>

## 08_00 Brand + Upstream Layer (imported)
### RouteAuthorization          route, status, capability_profile, authorised_human_decision, decision_owner, closure_conditions, permitted_channels, permitted_offers, permitted_audiences, generation_permission (M04 04-Handoff-Pack)
### Belief Shift Journey        FROM / TO            (M05 05_03)
### Brand Voice                                      (M05 05_07)
### Copywriting Rules                                (M05 05_12)
### Claims Boundaries           Can / Must Qualify / Cannot   (M05 05_00, locked deployment Claims Boundaries)
### Marketing Statements        S1–S10               (M06)
### Sales Objections            Top 10               (M07 07_04)

## 08_01 Brand-Grounded Content Summary
## 08_02 Brand-Derived Pillars                  ← ANCHOR (the content source library)
### Pillar 1 [Name]            + "What This Pillar Proves"
### Pillar 2 [Name]            …
### Pillar N [Name]            (variable count)
### Public Specialisation Signal at least one pillar; what / for whom / problem / distinctive perspective or method; no unsupported exclusivity
## 08_03 Proof Hierarchy                        ← ANCHOR (what evidence to deploy)
### Tier 1 / Tier 2 / Tier 3   (foundation → expand → scale)
### Tier 1 Citation Readiness  referenceability / evidence / method / independent usefulness / limits / Claims Boundary; not an evidence upgrade
## 08_04 Proof Gap Analysis
### VOC Calibration            calibrated / evidence-pending / not-applicable; expression change; strategic-fidelity check
### Decision-Infrastructure View existing proof / weak or absent proof / unresolved objections / priority assets / client-facing state
## 08_05 Content-to-Objection Map               ← ANCHOR (which pillar answers which objection; include reverse mapping from proof gap to planned content)
## 08_06 Claims Boundaries for Content          ← ANCHOR (claims governance for this module; explicit separation of evidence claim vs content claim)
## 08_07 Proof Distribution Channels
## 08_08 Proof Production Priorities
## 08_09 Proof Metrics & Transfer Indicators
### Qualitative Belief-Transfer Sources conversations / questions / comments / replies / calls / objections / customer language; engagement alone insufficient
## 08_10 Production Process
## 08_11 Resources & Constraints
## 08_12 Claims Compliance Review
## 08_13 Content Handoff Pack                INTERNAL ONLY — emit to 08_13-Content-Handoff-Pack.md, not the client body
### Publication state table per content piece: release_class, required_review, checks_completed, permission_event, reviewer_role, publication_state
### Source capture and expiry for each proof asset
### Trace to Module 03 proof commitments (optional but recommended)
```

---

## The load-bearing fields

| What | Read-key | Role |
| --- | --- | --- |
| **Content Pillars** (variable list, each with "What This Pillar Proves") | `08_02 → Pillar N` | The source library — every content piece adapts one (or a defined few) pillar(s) |
| **Proof Hierarchy** (tiered) | `08_03 → Tier N` | The evidence a piece is allowed to deploy, strongest-available-first |
| **Content-to-Objection Map** | `08_05` | Which pillar answers which M07 objection — drives piece purpose |
| **Claims Boundaries for Content** | `08_06` | Module-level claims governance (cross-checks M05) |

**For schema validation:** `08_02` (Pillars) and `08_03` (Proof Hierarchy) **must be present and non-empty**. At least one pillar carries the Public Specialisation Signal. Every relevant Tier 1 asset carries Citation Readiness without upgrading its evidence state. `08_04` is required before substantive 08B generation and records VOC as `calibrated`, `evidence-pending` or `not-applicable`; missing VOC cannot be fabricated or used to rewrite strategy. `08_05` and `08_06` are anchor-grade. Belief-transfer measurement must name qualitative evidence sources when available and cannot pass on engagement alone. Module 08 may define sequence and readiness; Module 11 owns quantities, cadence and dates.

The imported **Belief Shift Journey** (`08_00`, from M05 `05_03`) is required. All proof must serve that journey.

---

## Read-contract for skills

1. **Locate deliverables by sub-module number, pillars by pillar number.** `## 08_NN`; `Pillar N` within `08_02`. The number is invariant; the label may be reworded.
2. **Numbered keys are canonical.** `08_03` not "the proof section"; `08_02 → Pillar 3` not "the third theme".
3. **Read the derived value, not the scaffolding.** The emitter wraps each deliverable in the FW_16 two-step structure (`### Upstream Anchors (verbatim — Step 1)` → `#### [Name] (derived from above — Step 2)` → Traceability). Read the **Step 2 / derived** block. If absent (clean output), read the section body.
4. **Tolerate aliases during transition** — resolve via the Alias Map.
5. **Pillars + Proof Hierarchy guaranteed, the rest optional.** `08_02`, `08_03`, plus `08_05`/`08_06`, guaranteed; degrade gracefully elsewhere.
6. **Proof discipline.** A content piece deploys the **strongest available** proof tier for its job and never claims proof not present in `08_03`. If a piece needs proof the hierarchy doesn't have, that's a Proof Gap (`08_04`) — surface it, don't fabricate.
7. **Version-check** the frontmatter `schema-version` against the skill's declared version.

**Cross-module read.** `08_00` holds imported copies for convenience. Read authoritative brand fields from M05 (`05-Strategy-Schema.md`), marketing statements from M06 (`06-Strategy-Schema.md`) and objection language from M07 (`07-Strategy-Schema.md`, `07_04`). A content piece requires all four modules.

**Scripture / textual claims (conditional).** When a content piece makes scriptural, historical, or other externally-verifiable textual claims (faith-based content, the books), the `os-content-piece` skill invokes `book-scripture-check` before declaring done. Not applicable to ordinary business clients (e.g. Langfell itself) — the integration is conditional on the content's subject, not always-on.

---

## Alias Map (current emission → canonical)

The client output (`clients/Langfell/output/08-content-strategy.md`) already heads deliverables with the `08_NN` token (`### Deliverable 08_NN: [Name]`) and pillars `**Pillar N: [Name]**`. The emitter (`08-Prompt.md`) heads deliverables `### 08_NN [Name]`.

**Read-rule (robust): match the `08_NN` token (deliverable) or `Pillar N` (pillar), not an exact heading string.** Find the token in the heading hierarchy, then read its Step-2 block or section body.

| Current heading | Read-key |
| --- | --- |
| `### Deliverable 08_NN: [Name]` (client file) | `08_NN` (token in heading) |
| `### 08_NN [Name]` (emitter) | `08_NN` |
| `**Pillar N: [Name]**` → "What This Pillar Proves" | `08_02 → Pillar N` |
| Tier headings within Proof Hierarchy (`Tier 1/2/3`) | `08_03 → Tier N` |
| `## Phase 1 / 2 …` groupings | dropped — deliverables stand on their own |

---

## Migration status

- [x] **Schema locked** (v1.1) — this document.
- [x] **Skills can read current output** — the `08_NN` + `Pillar N` token-match read-rule resolves both the client file and the emitter without a prompt-file change. The client file already carries `08_NN` tokens, so deliverable reads are direct.
- [ ] **Cosmetic emitter reformat (optional, non-blocking)** — opportunistic on the next real M08 run.
- [ ] **Final roll-out module** — apply the same lock to M10 (M05, M06, M07, M08 now done; M09 uses os-page-brief/os-page-copy).

---

## Validation: content-piece (the new consumer)

`.claude/skills/content-piece/SKILL.md` reads M08 against this schema. All reads resolve against `clients/Langfell/output/08-content-strategy.md`:

| content-piece input | Read-key |
| --- | --- |
| Content Pillars (the source library) | `08_02 → Pillar N` |
| Proof Hierarchy (evidence to deploy) | `08_03 → Tier N` |
| Content-to-Objection Map (piece purpose) | `08_05` |
| Claims Boundaries for Content | `08_06` |
| Proof Gaps (don't fabricate past these) | `08_04` |
| Belief Shift Journey (the spine) | `08_00 → ### Belief Shift Journey` (M05 `05_03`) |
| Marketing statements / sales objections (consistency) | M06 `S1`–`S10` / M07 `07_04` |

Brand-layer reads (Voice, Copywriting rules, Claims Boundaries, Core Values) resolve against `05-Strategy-Schema.md`.

---

## Version History

### 1.4 — 18 August 2026 (Market-calibrated referenceable proof)

- Added visible specialisation, Tier 1 Citation Readiness, VOC calibration, decision-infrastructure proof gaps and qualitative belief-transfer evidence to their canonical sections.
- Kept referenceability separate from evidence strength and customer language subordinate to approved strategy.

| Version | Date | Changes |
| --- | --- | --- |
| 1.6 | 2026-08-17 | Required Practitioner Brief V3 metadata, common spine and Proof-and-Content-specific middle for authorised production handoffs. |
| 1.1 | 2026-06-18 | Audit sync to current Module 05 taxonomy: renamed the imported `05_12` read label to Copywriting Rules, kept Voice as `05_07`, and clarified Claims Boundaries as Evidence Matrix / Filter-backed. |
| 1.0 | 2026-06-01 | Initial M08 schema lock. Pillar + proof model (not statement-based): `08_02` Content Pillars (variable `Pillar N` list) and `08_03` Proof Hierarchy (tiered) as the guaranteed load-bearing fields; `08_05` Content-to-Objection Map + `08_06` Claims Boundaries anchor-grade. `08_NN` / `Pillar N` token-match read-rule; Step-2-derived read discipline; proof-tier discipline (strongest available, never fabricate past `08_04`); conditional `scripture-check` integration note; Alias Map for the client file (already `08_NN`-tagged) and emitter; validated against the content-piece skill and the Langfell client file. Mirrors `07-Strategy-Schema.md`. |

---

*© Langfell 2026. All Rights Reserved.*

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
