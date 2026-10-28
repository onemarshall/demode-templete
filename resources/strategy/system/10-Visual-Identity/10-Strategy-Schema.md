---
id: 10-Strategy-Schema
title: Module 10 Strategy Schema (Locked Read-Contract)
description: The internal canonical state adds materialdecisions, assumptions, implementationconsequences, costdrivers and
type: module-doc
schema: m10-strategy
schema-version: 1.3
version: 1.9
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 10-Prompt
- 10-Quality-Gates
- 10-Visual-Style-Framework
- 10-Visual-Practitioner-Brief-Prompt
- 10-Visual-Exploration-Pack-Prompt
- 09-Handoff-Pack
- 09-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- framework/FW_25-Consultancy-Judgement-Contract
- framework/FW_26-Strategy-Multi-View-Contract
- 10-Philosophy
feeds-into:
- 10-README
- 10-Quality-Gates
- 10B-Visual-Asset-Generator
- 11-README
---

# Module 10 Strategy Schema

## Strategy-to-action starter plans

Apply `FW_41`. Keep the existing strategy fields and schema version; attach the separately versioned `strategy-to-action: 1.0` transport defined in `templates/strategy-to-action/plan.schema.json` through `starter-plan-refs` in the handoff/private manifest. A plan references the existing decision, consequence and evidence records. Those records retain authority over strategy fields. The corresponding recommended Starter Plan is a derived output after source acceptance. Human adoption, production and release remain separate. No legacy locked strategy is silently rewritten or automatically reapproved.

## FW_32 source-owned accountability records

The internal canonical state adds `material_decisions`, `assumptions`, `implementation_consequences`, `cost_drivers` and `decision_measurement_contracts` using the exact schemas in `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`. Client views may explain selected effects and implementation implications but do not expose raw governance schemas.

For every material concept, system, application and production decision, record the intended effect, consequence and rule for the next decision. Cost Drivers contain units, complexity, delivery model and production standard but no rates. Unresolved concept, application set or standard forces `not-yet-estimable`.

## Editorial read-contract — required

Canonical outputs add every editorial field in `FW_27`. Explain the practical visual meaning before naming `Restrained Clarity`, and the visible relationship before naming `Source Trace`. The application contract requires unlabelled recognisability, meaningful rather than compulsory Source Trace, website/document/publishing proof, non-colour evidence-state cues and a human-led consultancy character distinct from a creator brand. Creative tensions carry use/avoid guidance. Seven-layer method trace is checked transiently and is not a default document output.

Structural checks may pass the language, framework-purpose, redundancy, terminology and qualification fields. Cold-reader and designer comprehension remain `pending` until tested.

## Governed strategy outputs

The client-readable **Visual Strategy** and canonical authority is `10-visual-strategy.md`. Before client decision, explain that acceptance will generate the four standard views—Executive View (`10-visual-strategy-executive-view.md`), Strategic Snapshot (`10-visual-strategy-strategic-snapshot.md`), Presentation View (`10-visual-strategy-presentation-view.md`) and Practitioner Brief (`10-visual-strategy-practitioner-brief.md`)—plus the **Visual Exploration Pack**, `<brand-or-project>-visual-exploration-pack.md`. Do not emit them as approved derivatives until the Canonical Strategy is accepted and locked. Every output inherits the same canonical states, source, version, lock ID and approval event. Generate each from the primary file and transient view-source state. Generate the Practitioner Brief through `10-Visual-Practitioner-Brief-Prompt.md` using schema `1.2`, `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the common V3 spine and the complete Visual-specific middle. Generate the Visual Exploration Pack through `10-Visual-Exploration-Pack-Prompt.md`. The pack has schema `visual-exploration-pack` version `1.0`, `view-type: creative-exploration`, `production-state: approved-for-exploration` and is not one of the four standard strategy views. It may generate images only after an explicit user request. The Canonical Strategy replaces the former Comprehensive View.

**This contract defines the locked structure that downstream skills read.** `10-Handoff-Pack.md` specifies which outputs pass downstream and why. This schema specifies where skills can find each output in the M10 visual-identity document.

The client document uses practical headings. The seven-layer derivation chain is assembled and checked in transient runtime state. Downstream skills read the canonical fields and reconstruct the internal mapping only when required.

**Schema version: 1.3.** Pin this in `dmode.config.md` (`m10-strategy: 1.3`). Skills declare the schema version they were built against; a mismatch is a compatibility check, not a silent failure.

> **M10 is principle-level direction, not design execution.** M10 produces a defensible *visual logic* (axes, spatial rules, operating model) traceable to M05 verbatim — not fonts, palettes or logos. Design execution is the designer's job; 10B generates the *briefs* that hand that logic to them. Keep that line (see arch §6.1, "Level 2 not Level 3").

> **Audience note.** `10-visual-strategy.md` is the complete client working strategy. Its primary headings follow the Visual Strategy client contract in `FW_26`; internal layer mapping is not emitted by default. The role-specific Visual Designer Brief is the direct execution surface.

---

## Client output wrapper — required

Begin with the creative idea, immediately translate it into plain language, then give a one-sentence designer brief and intended experience before explaining derivation. Every characteristic uses `Characteristic`, `Intended feeling`, `Brand-specific meaning`, `Think` and `Not this`. Describe visual behaviours through what the identity must make visible or understandable, leaving the choice of device open. Follow with tensions/anti-territories, creative freedom and practitioner handoff. The primary client body must not contain internal controls, moodboards, references, concept routes or technical specification; keep layer names and machine controls transient and record only compact source/state results in the manifest. `creative-direction-locked` and `visual-system-locked` remain separate production states.

Required client-file metadata fields: `document-state`, `client-decision-state`, `evidence-state`, `source-authority-state`, `production-state`. Legacy status fields are prohibited in client-rendered files. Keep richer lifecycle states transient and persist only their compact result in the run manifest. A recommended creative direction must not be described as accepted or locked in the client body.

## Consultancy Decision Record — internal handoff only

Canonical fields: `decision_id`, `module`, `decision_area`, `situation`, `evidence_refs`, `evidence_status`, `confidence`, `diagnosis`, `options_considered`, `comparison_criteria`, `recommendation`, `rationale`, `accepted_trade_off`, `client_decision`, `conditions`, `owner`, `review_event`, `progression_condition`, `invalidation_triggers`, `downstream_authority`.


The client narrative performs the seven consultancy functions in `FW_25`. Hold the full machine record transiently. Persist only the accepted decision, state axes, priority application, selected option, evaluation result and invalidation trigger in `RUN-MANIFEST.md`.

## Canonical output

**File:** `clients/[brand]/output/10-visual-strategy.md` (one file per client). *(Flat path for v1.x.)*

**Heading convention:** the client body uses the exact plain-language headings in `FW_26`. The **Visual Signature Label** remains a top-level field after its practical meaning has been explained. Runtime derivation maps each client section to `Layer 1`–`Layer 7`; no appendix is emitted by default.

```text
# Visual Strategy — [Brand Name]
<frontmatter: schema: m10-strategy · schema-version: 1.3 · brand · visual-signature>

## Creative idea
## Plain-language translation
## One-sentence designer brief
## Intended experience
## Why this follows from the Brand
## Visual characteristics
### [Characteristic]            intended feeling, brand-specific meaning, think, not-this
## Visual behaviours
## Creative tensions and anti-territories
## Creative freedom
## Practitioner handoff
## What is fixed, flexible and unresolved
## How the direction adapts across applications
## How concepts will be evaluated
## What still needs to be designed and approved
### Founder visual cues          imagery, motion, m05_source, applicability, reason
### Visual Catalyst record      reference_or_not_used, useful_quality, m01_m05_trace, rederived_decision
### Custom style specification  composition, colour, typography, imagery, motion, constraints, examples, application_rules
### Visual referenceability     decision, strategic_source, visible_behaviour, pass_fail
## How concepts will be briefed and evaluated
## What still needs to be designed and approved
```

---

## The six Resonance axes (canonical names)

| Axis (framework / Layer 3 canonical) | Note |
| --- | --- |
| Warm / Cool | |
| Restrained / Expressive | |
| **Spacious / Dense** | **Framework axis = `Spacious/Dense`.** The client-facing Visual Contract UI + outputs use **`Spacious/Full`** — a *deliberate* split ("Full" is the more choosable client word), recorded in `Products/visual-contract/.../module-10-mapping.md` and `system-summary.md`. **Do not "align" these** — read `Spacious/Dense` from the framework file; expect `Spacious/Full` in VC outputs. |
| Clean / Raw | |
| Calm / Energetic | |
| Focused / Layered | |

The Visual Contract's six pairs **are** Layer 3 — "not analogous to, the same axes" (`module-10-mapping.md`).

---

## The load-bearing fields

| What | Read-key | Role |
| --- | --- | --- |
| **Visual Signature Label** | top-level `**Visual Signature Label:**` | The 2–4 word owned descriptor every asset must express |
| **Layout and hierarchy** | client section | Containment, breathing and first-read behaviour |
| **Visual characteristics** | client section | Six commitments translated into feeling, Brand-specific meaning, Think and Not this |
| **Visual behaviours** | client section | Repeated reader experience and information jobs, without prescribed devices |
| **How the visual system should operate** | client section | Controlled vs Expressive state, explained in practical terms first |
| **Designer brief and production requirements** | client section | Principles, tokens/implementation boundary, RouteAuthorization, accessibility and required applications |

**For schema validation:** the Visual Signature Label, Layer 2, Layer 3, Layer 6, and Layer 7 **must be present** — 10B / `os-visual-asset-brief` cannot produce coherent output without a locked Layer 7 source and the operating model. Layers 1, 4, 5 are supporting (provenance + ranges); degrade gracefully but prefer them present. Layer 1 (inherited M05 conviction) is the spine. Founder visual cues require an applicability state; `not-applicable` is valid. A Visual Catalyst record may be `not-used`; when used it requires M01/M05 trace and a rederived decision. The custom style and material referenceability records must be executable and testable.

---

## Read-contract for skills

1. **Locate the practical client section.** The client body provides the usable decision; source and validation hashes in the manifest provide change control.
2. **Read the derived value from that section.** Reconstruct source quotations or internal mappings from the canonical authorities only when the task requires them.
3. **Respect the Operating Model.** `os-visual-asset-brief` must read Layer 6 first: **Controlled** → use only explicitly approved Layer 7 values verbatim; **Expressive** → respect principles + locked axes, interpreting free axes per-asset within the authorised Layer 4 behaviours and Layer 5 contextual guidance.
4. **Never confuse specification with finished design execution.** A Controlled, human-approved Module 10 route may lock exact palette, type, spacing and token values; an Expressive route preserves principles and authorised ranges. Skills may carry those approved values into briefs/specifications. Neither route produces a finished logo, composed page, complete identity system or other final visual artefact without separate production authority.
5. **Anchors guaranteed, the rest optional.** Signature + Layers 2/3/6/7 guaranteed; degrade gracefully on Layers 1/4/5.
6. **Version-check** the frontmatter `schema-version` against the skill's declared version.

**Cross-module read.** Layer 1 is inherited from M05; the authoritative conviction/brand fields read from M05 against `05-Strategy-Schema.md`. Each Layer 3 axis cites a quoted M05 word. Preserve that traceability as part of the framework’s intellectual property.

**Visual Contract outputs.** The Brief (designer-facing) + The Evaluation Companion (client-facing) are **canonical M10 deliverables**, generated by the visual-agent (`07-visual-agent.md`) from the locked Layer 3 positions, and live in the Visual Contract product format (`Products/visual-contract/`). They are a **sibling deliverable** to `10-visual-strategy.md` — `os-visual-asset-brief` *reads* Layer 3 but does not regenerate the VC outputs.

---

## Alias Map (current emission → canonical)

The client output uses plain-language headings. Runtime derivation uses `Layer N` tokens during generation; default outputs do not retain them.

**Read-rule (robust): match the `Layer N` token, not an exact heading string.** Find `Layer N` anywhere in the heading and read its Output / Step-2 block.

| Current heading | Read-key |
| --- | --- |
| Plain-language client heading | corresponding runtime `Layer N` |
| `**Visual Signature Label:** …` (or `## Visual Signature Label`) | Signature |
| Layer 3 axis table (`\| Axis \| Commitment \| Quoted M05 word \|`) | `Layer 3 → axis table` |
| `RUN-MANIFEST.md` source/state entry | change-control reference when the full canonical file is unavailable |

---

## Migration status

- [x] **Schema locked** (v1.0) — this document.
- [x] **Skills can read current output** — practical client sections are the stable read surface.
- [x] **Client emitter reformatted** — practical headings are primary; derivation is transient by default.
- [ ] **Roll-out complete after M10** — M05–M08 + M10 locked; M09 uses os-page-brief/os-page-copy. All five B-generators now have skills.

---

## Validation: visual-asset-brief (the new consumer) + the Langfell client gap

`.claude/skills/visual-asset-brief/SKILL.md` reads M10 against this schema:

| visual-asset-brief input | Read-key |
| --- | --- |
| Visual Signature Label | top-level Signature |
| Spatial Logic | `Layer 2 → Output` |
| Resonance Position (six axes + quoted M05 words) | `Layer 3 → Output` |
| Operating Model (lock vs interpret) | `Layer 6 → Output` |
| Output Artefact (Style System / Operating Constitution) + Image-Prompt Modifier Library + Derivation Chain | `Layer 7 → Output` |

**⚠ Langfell client gap (noted, not auto-fixed).** `clients/Langfell/output/10-visual-strategy.md` currently contains only **Layers 1, 2, 3, 6** — it predates the full seven-layer reconciliation (no Layer 4 ranges, Layer 5 narrowing, or Layer 7 artefact). The five **load-bearing** reads that exist (Signature, L2, L3, L6) resolve; **Layer 7 is absent**, so `visual-asset-brief` would hit its gate check ("Layer 7 not locked → return to 10-Prompt") for this client. Resolution: re-run M10 for the Langfell client to emit the full seven layers (it's the founder's own brand and the visual-agent is now on v3.0). Not a schema/skill defect — a client-file completeness gap, the M10 analogue of the M05 legacy-format finding.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.3 | 2026-08-21 | Made Canonical Strategy translation explicit: creative idea, tangible experience, characteristic interpretation, visual behaviours, anti-territories, creative freedom and practitioner handoff. |
| 1.2 | 2026-08-18 | Made conditional founder cues, rederived catalyst use, executable custom-style specification and visual-referenceability records native to the designer/production section. |
| 1.7 | 2026-08-17 | Required Practitioner Brief V3 metadata, common spine and complete Visual-specific middle for authorised concept and production handoffs. |
| 1.0 | 2026-06-01 | Initial M10 schema lock. **Layer-keyed** (not `10_NN`): seven-layer derivation chain; Visual Signature Label + Layers 2/3/6/7 as guaranteed load-bearing fields; six canonical Resonance axes with the deliberate `Spacious/Dense` (framework) vs `Spacious/Full` (client-facing VC) split preserved; Operating Model lock-vs-interpret read discipline; Visual Contract outputs documented as canonical sibling deliverables (read, not regenerated by the per-asset skill); `Layer N` token-match read-rule; validated against visual-asset-brief. Flagged the Langfell client's pre-reconciliation Layers-1/2/3/6-only file (Layer 7 absent → needs M10 re-run). Mirrors the schema family; completes the M05–M08+M10 roll-out. |

---

*© Langfell 2026. All Rights Reserved.*

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
