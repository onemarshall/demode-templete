---
id: 08-Prompt
title: Module 08 Main Prompt
description: Apply framework/FW_38-Executive-Summary-Completion-Contract.
type: module-doc
version: 3.7
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- framework/FW_23-Client-Output-Contract
- framework/FW_24-Commercial-Direction-Contract
- framework/FW_25-Consultancy-Judgement-Contract
- framework/FW_26-Strategy-Multi-View-Contract
- 08-Strategy-Schema
- 08-Quality-Gates
- 07_08-Sales-Handoff-Pack
- 07-Strategy-Schema
- 06-Handoff-Pack
- 06-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- FW_15-Upstream-Inputs-Hard-Gate
- FW_16-Discovery-vs-Translation-Modules
- FW_17-Cross-Module-Quality-Gates
feeds-into:
- 08_13-Content-Handoff-Pack
- 08-README
- 08-Quality-Gates
- 08B-Content-Generator
- 09-README
- templates/Commercial-Direction-Generator-Prompt.md
---


# Module 08: Proof Strategy Prompt

## Strategy-to-action starter plans

Apply `framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md`. After the strategy is explicitly accepted, derive its recommended Starter Plan with `templates/strategy-to-action/Starter-Plan-Generator-Prompt.md`, retaining the current Foundation, route, exact strategy/consequence/evidence sources and Practitioner Brief. Candidate strategy is not sufficient. Issue the plan as recommended implementation, not accepted commitment; include the exact opening, eleven sections, separate class/lifecycle and specialist freedom. Emit the existing named plan in `07-specialist-briefs`, keep structured provenance/events private, and pass it into the existing Commercial Direction/M11 handoff. A material strategy change invalidates the affected plan. Preserve every existing full-run output, review and continuation requirement.

> **Client paths:** Before reading inputs or writing outputs, resolve the selected client using `../templates/00-Entry-Brief-Folder-Convention.md`. Its Input, Output, collection, asset and private run destinations override legacy flat output examples. Keep existing authority and approval gates unchanged.


## Required-action completion gate

Apply `framework/FW_38-Executive-Summary-Completion-Contract.md` before candidate status. Do not compress away a required decision job from the Executive Summary.

Apply `framework/FW_39-Instruction-Fidelity-and-Whole-Document-Completion-Contract.md` before candidate status. Map every applicable instruction to exact client or internal evidence and verify the complete rendered document.

Apply `framework/FW_37-Required-Action-Completion-Contract.md`. Do not label a Content Strategy or derived output a candidate until its Required Action Register records evidence for every required upstream, proof, claims, recognition-continuity, synthesis and review action.

## Client-language translation gate

Before rendering any client-facing Content Strategy, apply the `FW_27` Client-language translation gate. Preserve evidence classes, claims boundaries and review conditions, but express them as what can be shown, what still needs proving, what the reader needs to understand and what would change the work. Keep internal labels and derivation mechanics out of the client body.

## FW_32 accountability requirements — required

Apply `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`.

For each material accepted Proof and Content decision, record its exact decision ID, intended observable effect, Implementation Consequences, non-monetary Cost Drivers and one compact Decision Measurement Contract. Cover buyer question, proof class, asset and evidence requirement, comprehension and proof interaction, assisted progression, permission, claims effect, production drivers and publication state where material.

Keep reach, engagement, comprehension, trust and commercial progression distinct. Each contract must state implementation proof, smallest useful baseline requirement, candidate evidence, attribution ceiling, evidence owner, review condition, strong/partial/weak evidence decisions, stop condition and narrowest strategic return point. Do not upgrade evidence by producing content, set current-cycle quantities or monetary rates, or collapse production, publication, budget and spend approval.

## Editorial Readability Contract — Required

Apply `framework/FW_27-Editorial-Readability-and-Purposeful-Framework-Contract.md`. Begin with the evidence that exists and the evidence still required. Explain each evidence class through the question it can answer. State the governing proof qualification once, then repeat it only when a detached claim or release decision creates new risk.

Separate proof strategy from content volume. Keep the hierarchy visible only where it helps someone select, label or release an asset.

In the first walkthrough, show the source and how it supports the decision. Keep the evidence process proportionate to the content task. Every planned piece must answer one reader question and use one evidence class. Keep publication permission separate from participation, production and proof status. Treat book material as a governed source to select and transform for a proof job, never as chapters to dump into the publishing plan.

## Runtime Evidence Boundaries — Required

Preserve each supplied evidence item's exact class, source and statement. Content production cannot upgrade evidence strength or turn association, testimony or an operational record into causal proof. For a bounded brief, classify the evidence, state what it can and cannot support, and produce only the requested brief in the accepted voice with source and claims traceability.

If a proposed claim has no supporting evidence or is `Cannot Claim`, record the exact proof gap, refuse publication and do not fabricate a case study. Name the smallest evidence-production action that could test the gap, clearly labelled as future evidence work rather than current proof. Founder testimony remains founder testimony: retain the founder's exact words and attribution, and do not convert `seem`, an observation or an impression into validated customer evidence, frequency, certainty or a stronger customer outcome.

## Strategy Multi-View Output — Required

Apply `framework/FW_36-Client-Package-Reference-Structure-Contract.md`. The final 01 Langfell package is the exact client-output form reference for Content Strategy and every derived view.

Generate `08-content-strategy.md` with the visible title **Content Strategy**. Open in this order: the shared Document details block and Decision brief; the short discipline-specific reader lead required by `FW_23`; the `## Executive Summary` required by `FW_23` and `FW_26`; and the standard `About this document` orientation. Then explain how the strategy was derived. Make clear that acceptance generates an Executive View, Strategy Summary, Presentation View and Practitioner Brief from this authority; do not embed them or imply separate strategies. Use the standard pre-decision interface wording. Only after acceptance, lock and approval-event recording, assemble transient view-source state and render all four authorised derivatives, including `08-content-strategy-practitioner-brief.md` when proof production follows, with their standard orientations and identical source/version/lock/approval metadata. Use the standard post-acceptance and derived-document wording and do not request a second strategy approval unless a view exposes a genuine contradiction, omission or unresolved decision. A Strategy change makes affected derivatives stale and requires regeneration.

The Practitioner Brief must state the buyer objection, proof job, evidence class and source, permitted claim and qualification, format, channel, permissions, release checklist and success signal. Never render one derived view from another, present content activity as proof or upgrade evidence strength.

Render the Proof and Content Practitioner Brief through `templates/Strategy-Practitioner-Brief-Renderer-Prompt.md` in the shared V3 format: `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the exact common spine and a domain-specific middle covering the proof and claim system, permissions, formats, channels, release checks and success signals. Do not substitute a content calendar or PRD.

Read the exact approved Engagement Brief, client `business-foundation.md` named in the Module 05 Handoff Pack and canonical Module 05 strategy. The Engagement Brief supplies confirmed engagement facts. The Business Foundation governs what the business is, and its Business Manifesto governs the worldview. Module 05 governs Brand Strategy. Proof and content make that worldview inspectable at the strength current evidence supports. They may not reinterpret the commissioning situation, requested scope or client identity, treat declaration as evidence, contradict the manifesto or create a second manifesto. A missing, stale or mismatched authority blocks Module 08 and returns to the owning upstream source; do not repair it here.

## Routing Level Awareness

This prompt supports four routing levels determined by the Entry Brief (`INPUT_ROOT/00-Entry-Brief.md`):

**Routing Levels:**
- **Skip** - Material is already complete or module doesn't apply. Do not generate.
- **Light Pass** - Back-fill/structure existing material. No live elicitation needed.
- **Constrained Run** - Full module, but downstream sub-outputs that touch pre-locked inputs defer to the locks rather than re-generate.
- **Full Run** - Module runs at full rigour as the framework specifies.

**Execution vs Delivery Mode:**
- **Execution mode** (internal): Include Upstream Anchors (verbatim quotes from Module 07), Traceability lines showing derivation, and strict translation discipline. This records how each output derives from its sources.
- **Delivery mode** (client-facing): Remove internal Upstream Anchors blocks, Traceability lines, derivation evidence and lifecycle controls. Preserve every substantive decision, explanation, example, table, content brief and application rule. Delivery cleaning is not summarisation.

**Routing Level Implementation:**
- **Skip:** Do not generate any output.
- **Light Pass:** Generate simplified output focusing on structure only. Skip detailed derivations and optional sub-sections.
- **Constrained Run:** Generate full output but respect pre-locked inputs without re-derivation. Mark constrained sections in output.
- **Full Run:** Complete every required section at full semantic depth in execution mode, then remove only the internal scaffolding for delivery. Do not collapse the result into an executive summary.

## Client Output Contract — Required

Apply `framework/FW_23-Client-Output-Contract.md` and the canonical opening in `FW_26`. Before `08_00`, use a domain-specific decision-led opening: proof that exists, proof still missing, priority buyer doubts, first assets, claims allowed and prohibited, fixed/flexible/unresolved decisions and what approval authorises. Explain the practical evidence consequence before naming internal proof classes.

Module 08 may define proof sequence and distribution roles. It must not set exact weekly publishing commitments or a competing calendar. Keep internal handoff, source, lifecycle, invalidation and lock material transient; persist only compact control state in `RUN-MANIFEST.md` and never append `08_13 Content Handoff Pack` or `## Handoff and Governance` to the client document.

Use the five explicit client-file metadata fields in `FW_23` and no legacy status names. Reconcile the Proof Gap Analysis against the current run manifest at generation time. When the current source-driven package has been completed, record it as completed controlled output; the next evidence need is an inspectable walkthrough, independent comprehension, client use or commercial evidence. Never carry a previous run's `in progress` state into a new package.

**Full Run completeness:** the client document must retain the complete pillar system; proof hierarchy; evidence inventory and gaps; content-to-objection map; claims rules; channel jobs; prioritised proof pieces with usable briefs; production requirements; constraints; measures; and compliance review. It must distinguish evidence that exists from evidence still to be created and must never use planned content as proof that a claim is already supported.

## Consultancy Judgement Sequence — Required

Run the six internal stages in order: **evidence assembly → diagnostic analysis → comparative judgement → recommendation selection → recommendation writing → handoff generation**. The client document must perform all seven consultancy functions defined by `FW_25`; keep structured decision working transient and record only the final decision state and return trigger in `RUN-MANIFEST.md`.

The proof recommendation must identify the most urgent proof gap, evidence to create first, useful formats, material not yet safe to publish, objections requiring evidence, premature production and the decision-closing event. Planned content is never treated as present proof.

## Commercial Direction Contribution — Required

Populate the internal contribution in `08_13-Content-Handoff-Pack.md` with evidence classes, claim-use constraints, buyer proof questions, available proof/content roles, commercially relevant proof gaps and invalidation triggers. Do not create a publishing calendar or treat planned content as proof. Commercial Direction selects the proof gap that matters during the horizon.

**Langfell™**
_Build the Proof Library_

---

## Strategy vs Generation

**This module (08) produces content strategy.** It defines what content to create and why.

**Module 08B generates actual content.** After completing this module, use 08B to produce blog posts, articles, case studies, guides, and other content from your strategy.

| This Module (08)  | Module 08B         |
| ----------------- | ------------------ |
| What to create    | Write this piece   |
| Why it matters    | Produce the draft  |
| Proof hierarchy   | Enforce tier depth |
| Claims boundaries | Check every claim  |

**Complete this module first, then use 08B to generate content on-demand.**

---

## How to Use This Document

This prompt contains 13 deliverables organised across 8 phases. Execute them in sequence, extracting anchors between phases to maintain context.

**Recommended Execution:**

- **Phase 1-2:** Run together (Proof Foundation + Architecture)
- **Phase 3:** Run together (Sales Integration)
- **Phase 4-5:** Run together (Distribution + Measurement)
- **Phase 6-7:** Run together (Operations + Governance)
- **Phase 8:** Final consolidation

**Token Management:** Each phase combination fits within a single session. Extract phase anchors before moving to the next combination.

---

## Critique Loop

Module 08 produces content strategy and proof hierarchy that will generate customer-facing content. After generating each content pillar or proof deliverable, run a **Statement Self-Critique** or route to a human reviewer. No `critique-agent.md` exists; do not invoke a non-existent agent.

**Critique lenses for M08:**
- **Accessibility lens:** Will the target audience (founders of founder-led companies, growing organisations, or established enterprises seeking a coherent, evidence-derived strategy) understand this immediately? Is jargon contextualised?
- **Claims lens:** Does this stay within Evidence Matrix boundaries? Are proof claims defensible?

**Flow:**
1. Generate content pillar/proof deliverable → Self-critique using the two lenses
2. If it passes → Move to next deliverable
3. If it fails → Revise → Re-critique (up to 3 rounds)
4. Repeat for all content pillars and proof deliverables
5. If deadlock after 3 rounds → Human review event; record reviewer, decision, and rationale

**Record content state in the Handoff Pack:** `draft` → `self-critique-passed` → `human-review-passed` (if required) → `confirmed` → `scheduled` → `published` → `paused` / `retired`.

## Risk-Based Release Review

A second human is not a universal publication dependency. Classify the asset before release:

| Release class | Required review |
| --- | --- |
| Standard low-risk asset | Automated claims-boundary, coherence and provenance checks. An authorised owner may publish after the checks pass. |
| Material commercial claim | Client decision-maker or authorised commercial owner approval. |
| Attributed client material | Recorded permission from the client or evidence owner before publication. |
| High-risk causal or outcome claim | Independent review by an authorised reviewer who was not the sole author or claim owner. |

Human review remains available after a three-round critique deadlock, but it is not required for every low-risk asset. Record the release class, required reviewer role, checks completed, permission event and rationale in the Handoff Pack.

---

## Single Source of Truth

**Module 05 (Brand Identity) is the runtime authority for all content strategy.**

This module does NOT reference raw Core Belief from Module 01. It imports the brand as already translated into strategy, voice, and positioning by Module 05. Module 01 references are **lineage only**. Module 04 `RouteAuthorization` is required to set scope, capability_profile, and publication permissions.

**Critical Rule:** After Module 05, we don't work with "the belief." We work with "the brand." The brand IS the belief, translated.

---

## Prerequisites: Anchor Imports

Before executing any deliverable, import these anchors from Module 05 (Brand Identity):

```text
PROOF STRATEGY ANCHOR IMPORTS:

From Module 05 (Brand Identity) SINGLE SOURCE OF TRUTH:

- Brand Strategy statement: [The brand's belief as market-positioned strategy]
- Voice (`05_07`): [How the brand sounds]
- Copywriting rules (`05_12`): [How to write as the brand]
- Belief Shift Journey (`05_03`): [FROM → TO belief movement]
- Values: [What the brand stands for]
- Tagline: [Crystallized brand belief]
- Filter: [Who the brand is for / not for]
- Claims Boundaries / Evidence Matrix:
- Can Claim: [What's fully proven]
- Must Qualify: [What needs softening]
- Cannot Claim: [Internal belief only]

From Module 04 (RouteAuthorization):

```text
ROUTEAUTHORIZATION:
- route: [name]
- status: [Approved / Draft / Overridden / etc.]
- capability_profile: [full / reduced]
- authorised_human_decision: [verbatim]
- decision_owner: [name + role]
- closure_conditions: [text]
- permitted_channels: [list]
- permitted_offers: [list]
- permitted_audiences: [list]
- generation_permission: [draft-only / publish-ready]
```

Do not generate publishable content for a deferred route, audience, proof path, or offer. If `generation_permission` is `draft-only`, output draft-only internal options. If `status` is not `Approved` or `Overridden`, halt and request route approval.

From Module 06 (Belief Shift Strategy):

- Audience Segments: [Who is belief-ready, curious, locked]
- 10 Marketing Positioning Statements: [S1–S10]
- Channel Strategy Summary: [Primary channels]
- Applicable Expression Statements: [which S1–S7 passed applicability gate]

From Module 07 (Invitation Strategy):

- Top Objections by Category:
- Belief Objections: [List]
- Evidence Objections: [List]
- Commitment Objections: [List]
- Fit Objections: [List]
- Proof Gaps Identified by Sales: [What evidence is missing]
```
**Do NOT import from Module 01.** All brand expression comes through Module 05.

---

## Step 0: Upstream Inputs Hard Gate

Run the Upstream Inputs Hard Gate per `framework/FW_15-Upstream-Inputs-Hard-Gate.md`.

**For Module 08, the gate checks:**

- **Module 05 (Brand Identity):** **Locked Module 05 Handoff Pack** required: Belief Layer, Claims Boundaries, Anchor Elements, Expression Elements, and Brand Strategy synthesis (`05_14`). Specifically: Brand Strategy (`05_14`), Belief Shift Journey (`05_03`), Voice (`05_07`), Copywriting rules (`05_12`), Values / Brand Beliefs (`05_03`), Tagline (`05_10`), Filter (`05_09`), and Claims Boundaries / Evidence Matrix — all quoted verbatim where used. Pre-lock concession permits non-binding draft only; the Proof Strategy cannot lock and 08B Generator content cannot be published.
- **Module 06 (Belief Shift Strategy / Marketing):** Gate 6 passed; 10 Marketing Statements stable; Belief-Ready Segment and Audience Stage Mapping required verbatim. Each Marketing Statement defines a claim Module 08's content must prove.
- **Module 07 (Invitation Strategy / Sales):** the Buyer Uncertainty Register and M08 Proof Question Handoff are required. Records may be anticipated, observed or established pattern. Anticipated records are valid provisional inputs when their inference, proof gap, claims boundary and review condition are explicit; they must not be rendered as customer quotations or frequency claims.
- **Module 04 (Viability Check) — Response Path + approved route:** **Apply the Module 04 Response Path + Strategic Recommendation Mapping per FW_15 §"Module 04 Response Path + Strategic Recommendation Mapping — Canonical".** For Module 08 specifically, the *"lighter version"* under Accept the Constraint = pillars derived from Module 05 directly, Tier 1 foundation pieces only (skip Tier 3 distribution scale-up), skip the full 08B Generator (or scope 08B to non-commercial community/ministry content). Adjust the Path bakes adjusted scope and approved route into pillar count and tier mix. Wait and Walk Away halt Module 08. If the Strategic Recommendation Memo is Draft, Compare Alternatives, or Return Upstream, the Proof Strategy cannot lock and 08B Generator content cannot be published.
- **Module 03 (Business Commitments):** Outcome A required. **If Outcome X or Contrarian Trap halt, halt** — Module 08 cannot build a proof library on a strategy Module 03 refused to lock.
- **Module 02 (Market Reality Check):** Outcome A required. No R-pattern Acknowledgments routed directly to Module 08 (per FW_17 CMQG_03 = —); any inherited Acknowledgments pass through to Handoff Pack Risk Flags.
- **Module 01 (Founder Convictions):** the five conviction elements + Claims Boundaries inherited via Module 05's Pass-Through; required for the Claims Boundaries cross-check in every published piece (08_06) and for Pillar derivation (08_02).
- **"Proceed-Informed contested" flag** (if carried from Module 04 via Module 05/06/07) — Module 08 surfaces the flag in Risk Flags and marks the Proof Strategy "Proceed-Informed contested" in the Handoff Pack to Module 09.

**If the gate halts, do not proceed to Phase 1 or any subsequent Phase.**

This is a **translation module** per `framework/FW_16-Discovery-vs-Translation-Modules.md` — Module 05's locked Handoff Pack + Module 06's 10 Marketing Statements + Module 07's Objection Responses are the source material; Module 08 translates them into proof library form. All 13 deliverables must derive from verbatim upstream outputs. Do not invent or rediscover the strategy.

---

## Translation Discipline for All Module 08 Deliverables (per FW_16)

Module 08 is a **translation module** per `framework/FW_16-Discovery-vs-Translation-Modules.md` — every Content Pillar, Proof Tier definition, Proof Gap, Content-to-Objection mapping, and Claims-Boundary application is a translation of locked Module 05 + Module 06 + Module 07 anchors into content-strategy form. **No Pillar, Tier definition, or proof piece may be written as an invention.** Each deliverable's prompt must start by quoting its specific upstream anchor(s) verbatim from the Module 05, 06, and 07 Handoff Packs, then produce the content-strategy artefact *derived from* the quoted source material.

**Per-deliverable source-anchor mapping (quote verbatim before producing each deliverable):**

| Deliverable | Upstream source to quote verbatim *before* producing output |
| -- | -- |
| **08_01 Brand-Grounded Content Summary** | Module 05 **Brand Strategy** (verbatim) + Module 05 **Belief Shift Journey** (verbatim) + Module 07 **Top 10 Objection Categories** (verbatim). Proof Mission must trace to Brand Strategy; Belief Transfer Arc must trace to the Belief Shift Journey; Primary Proof Needs must trace to Module 07 objection patterns. |
| **08_02 Brand-Derived Pillars** | Module 05 **Brand Strategy** (verbatim) + Module 03 **Conviction Grid + Proof Commitments** (verbatim, carried via Module 05) + Module 01 **Claims Boundaries** (verbatim, carried via Module 05). Each Pillar is one Proof Commitment from Module 03 translated into a content category. Each Pillar must cover at least one Can Claim row from the Claims Boundaries. Competitor Test (Pillar Distinctiveness) is derived from Module 03 Competitor Friction Summary. |
| **08_03 Proof Hierarchy (Tier 1/2/3)** | Module 05 **Brand Strategy** (verbatim) + Module 04 **Response Path and approved route** (verbatim, per FW_15 mapping). Tier definitions narrow per Response Path; Accept the Constraint mode collapses to Tier 1 only. |
| **08_04 Proof Gap Analysis** | Module 07 **Top 10 Objection Categories + Responses** (verbatim) + Module 03 **Proof Commitments** (verbatim) + existing content inventory. Each Gap is a Module 07 objection without a matching proof asset, or a Module 03 Proof Commitment without published evidence. |
| **08_05 Content-to-Objection Map** | Module 07 **Top 10 Objection Responses** (verbatim, all four categories: Belief / Evidence / Commitment / Fit). Each row in the Map quotes one Module 07 objection and maps it to a content piece in one of the Pillars. |
| **08_06 Claims Boundaries for Content** | Module 01 / Module 05 **Claims Boundaries** (verbatim — Can Claim / Must Qualify / Cannot Claim rows). No content piece may be locked until its claims have been mapped to a row from the upstream Boundaries; the Module 05 Evidence Matrix is the binding source. |
| **08_07 Proof Distribution Channels** | Module 05 **Voice + Personality + Tone** (verbatim) + Module 06 **Channel Strategy** (verbatim) + Module 06 **Belief-Ready Segment** (verbatim). Channels pass through *two* filters from the upstream chain (voice fit from Module 05; audience presence from Module 06); a channel passing audience but failing voice is rejected. |
| **08_08 Proof Production Priorities** | Module 04 **Response Path and approved route** (verbatim — constrains production ambition) + Module 08_04 Proof Gaps + Module 08_11 Resources & Constraints. Rank proof assets and readiness; do not set cadence. |
| **08_09 Metrics & Transfer Indicators** | Module 05 **Brand Strategy** (verbatim) + Module 07 **Top 10 Objections** (verbatim, for Objection Resolution Rate metric). Belief Transfer Indicators trace to Module 05 Belief Shift Journey FROM/TO language; the Indicator's Language Echo signal requires the verbatim TO language as the comparison point. |
| **08_10–08_12 Operations / Resources / Compliance** | Module 05 **Claims Boundaries** (verbatim) + Module 05 **Brand Voice** (verbatim). Every production-process check and pre-publication review references the upstream Boundaries and Voice; no new claim or voice standard is invented in Module 08. |
| **08_13 Handoff Pack** | All locked outputs from 08_01–08_12, summarised; trace lines back to Module 05/06/07 sources preserved so Module 09 can read them. |

**Rule:** before any Deliverable is written, the System Prompt must open with the verbatim upstream quotation(s) from the table above. The Deliverable then operates on the quoted source material.

**Test (per FW_16):** if a Deliverable could plausibly be written by someone who has not read the Module 05, 06, and 07 Handoff Packs, the prompt slipped into discovery mode. Push the source quotation back in and rewrite.

**Claims Boundaries cross-check:** every Pillar, Proof Tier piece, and proof asset must additionally verify against Module 01 / Module 05 Claims Boundaries before publication (08_06 owns the check). A pillar that reads well but cannot map every published piece to a Can Claim / Must Qualify row fails the translation test.

---

# PHASE 1: PROOF FOUNDATION

---

## 08_01 Brand-Grounded Content Summary

### Identity & Purpose

You set the foundation for a proof-driven content library. This summary ties content directly to the Brand Strategy and names what the content has to prove.

### System Prompt — Two-Step Translation Process (per FW_16)

The Proof Mission must restate the brand’s locked conviction. **Step 1 produces nothing but verbatim upstream quotations.** Step 2 derives the Proof Mission, Belief Transfer Arc and Primary Proof Needs from those quotations. Every phrase of the Proof Mission must trace to the Module 05 Brand Strategy. If it cannot, return to the source and rewrite.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable with the verbatim quotations named in the Translation Discipline table above for 08_01: Module 05 Brand Strategy (full statement), Module 05 Belief Shift Journey (FROM → TO), and Module 07 Top 10 Objection Categories (all four categories with the specific objection wording). Copy the exact wording. If a required upstream artefact is missing, halt and report the gap; do not write a substitute.

**Step 2 — Translate Each Quote into Content Summary.** With the verbatim quotes in place, write: the Proof Mission (derived from the Brand Strategy quote), the Belief Transfer Arc stage descriptions (derived from the Belief Shift Journey FROM → TO quote, with each stage description traceable to either FROM or TO language), the Primary Proof Needs table (each row derived from a specific Module 07 objection category). Proof Objectives and Success Criteria translate from the same source set.

**Test (per FW_16):** if the Proof Mission could plausibly be written by someone who has not read the Module 05 and Module 07 Handoff Packs, the prompt slipped into discovery mode. Push the source quotation back in and rewrite.

### Core Principle

**Proof-First, Not Audience-First**

Content exists to prove what the brand believes. Every strategic decision traces back to Brand Strategy (Module 05). Audience preferences shape format and distribution — never message or meaning.

**The brand IS the validated, translated belief. Content proves the brand, not raw conviction.**

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                                          |
| ---------- | ----------------------------------------------------------------------- |
| **Belief** | Summary explicitly states what content must prove about the brand       |
| **Proof**  | Defines proof objectives and success criteria                           |
| **Result** | Connects content to Belief Shift Journey (from Module 05's Belief Layer) |

### Inputs Required

- Brand Strategy statement (Module 05)
- Brand Voice summary (Module 05)
- Belief Shift Journey FROM → TO (Module 05 `05_03`)
- Audience Segments (Module 06)
- Sales objection patterns (Module 07)

### Steps

1. **State the Proof Mission** In one paragraph, define what this content strategy exists to prove. Connect directly to Brand Strategy from Module 05.

2. **Define Proof Objectives** List 3-5 specific proof objectives (what evidence to create), not generic content goals.

3. **Map the Belief Transfer Arc** Using the Belief Shift Journey from Module 05's Belief Layer, show how content will move audience through the stages:

- Recognition ' Disruption ' Alternative ' Proof ' Adoption

4. **Identify Primary Proof Needs** Based on sales objections and messaging gaps, what proof is most urgently needed?

5. **Set Proof Success Criteria** Define what "enough proof" looks like. Include both proof metrics and traditional metrics.

### Output Format

```text
## Brand-Grounded Content Summary

---

### Upstream Anchors (verbatim — Step 1)

From Module 05 Brand Strategy: "[verbatim quote — full statement]"
From Module 05 Belief Shift Journey — FROM: "[verbatim quote]"
From Module 05 Belief Shift Journey — TO: "[verbatim quote]"
From Module 07 Top 10 Objection Categories — Belief Objections: "[verbatim quotes]"
From Module 07 Top 10 Objection Categories — Evidence Objections: "[verbatim quotes]"
From Module 07 Top 10 Objection Categories — Commitment Objections: "[verbatim quotes]"
From Module 07 Top 10 Objection Categories — Fit Objections: "[verbatim quotes]"

---

### Proof Mission (derived from above — Step 2)

[One paragraph derived from the Brand Strategy quote above. The Mission states what this library exists to prove about the brand — every phrase traceable to a phrase in the quoted Brand Strategy.]

**Brand Strategy Statement (verbatim from Module 05):** [Restated]

**What Content Must Prove (derived from Brand Strategy + objection patterns):**

- [Proof need 1]
- [Proof need 2]
- [Proof need 3]

### Traceability

[Name the specific quote element(s) that produced each phrase of the Proof Mission and each Proof Need]

---

### Proof Objectives

| Objective     | What It Proves About the Brand | Success Indicator      | Priority     |
| ------------- | ------------------------------ | ---------------------- | ------------ |
| [Objective 1] | [Connection to Brand Strategy] | [Measurable indicator] | HIGH/MED/LOW |
| [Objective 2] | [Connection to Brand Strategy] | [Measurable indicator] | HIGH/MED/LOW |
| [Objective 3] | [Connection to Brand Strategy] | [Measurable indicator] | HIGH/MED/LOW |

---

### Belief Transfer Arc in Content (derived from Module 05 Belief Shift Journey — Step 2)

**Belief Shift Journey (verbatim from Module 05 Belief Layer — re-stated from Upstream Anchors above):**

- FROM: [Limiting belief — verbatim]
- TO: [Empowering belief — verbatim]

Each Stage description below must trace to either the FROM or the TO language above.

**Stage 1 Recognition Content**

- Purpose: Help audience see their current limiting belief
- Content approach: [How we'll do this]

**Stage 2 Disruption Content**

- Purpose: Show why the limiting belief costs them
- Content approach: [How we'll do this]

**Stage 3 Alternative Content**

- Purpose: Present the brand's empowering belief
- Content approach: [How we'll do this]

**Stage 4 Proof Content**

- Purpose: Demonstrate the brand's belief works
- Content approach: [How we'll do this]

**Stage 5 Adoption Content**

- Purpose: Show how to act on the brand's belief
- Content approach: [How we'll do this]

---

### Primary Proof Needs (derived from Module 07 verbatim objections — Step 2)

Each row below derives from the verbatim Module 07 objection quotes captured in Upstream Anchors. "Proof Needed" is the content-side translation of what the verbatim objection demands.

| Objection Category    | Verbatim Objection (from Upstream Anchors) | Proof Needed (derived) | Current Coverage | Gap Priority |
| --------------------- | ------------------------------------------ | ---------------------- | ---------------- | ------------ |
| Belief Objections     | "[verbatim]"                               | [What would address]   | [Existing]       | HIGH/MED/LOW |
| Evidence Objections   | "[verbatim]"                               | [What would address]   | [Existing]       | HIGH/MED/LOW |
| Commitment Objections | "[verbatim]"                               | [What would address]   | [Existing]       | HIGH/MED/LOW |
| Fit Objections        | "[verbatim]"                               | [What would address]   | [Existing]       | HIGH/MED/LOW |

---

### Proof Success Criteria

**Proof Metrics (Primary):**

- Proof Coverage Target: [X% of proof needs addressed]
- Sales Utilisation Target: [X% of content used in sales]
- Belief Indicator Target: [Qualitative measure]

**Traditional Metrics (Secondary):**

- [Metric 1]: [Target]
- [Metric 2]: [Target]
- [Metric 3]: [Target]

---

### Constraints & Boundaries

**Claims Boundaries Apply (from Module 05):**

- Can Claim in Content: [Summary]
- Must Qualify: [Summary]
- Cannot Claim: [Summary]

**Resource Constraints:**

- [Key constraints that affect content scope]
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors block populated with verbatim quotes (Brand Strategy, Belief Shift Journey FROM → TO, all four Module 07 Objection Categories)
- [ ] No Step 1 quote paraphrased or summarised
- [ ] Proof Mission traceable phrase-by-phrase to the Brand Strategy quote
- [ ] Belief Transfer Arc stages each trace to either FROM or TO language
- [ ] Primary Proof Needs table includes the verbatim objection wording in column 2
- [ ] Traceability block present and names the specific quote element(s) each derived item came from
- [ ] Proof Objectives define evidence to create (not engagement goals)
- [ ] Claims Boundaries from Module 05 explicitly stated
- [ ] Success criteria include proof metrics, not just traffic
- [ ] FW_16 test passes: a reader without the Module 05 + 07 Handoff Packs could not have produced this Summary

**If met:** Proceed to 08_02
**If missing:** Complete before proceeding
**If Step 1 quotes missing:** Halt — return to Module 05 / 07 Handoff Packs; do not paraphrase
**If Module 05 incomplete:** Return to Module 05 first

### Honest Position

**What this deliverable does:**

- Connects content strategy to brand
- Defines what the proof library must prove
- Establishes proof-first success criteria

**What this deliverable does not do:**

- Create the content itself
- Define detailed production plans
- Replace audience research (informs format, not message)

---

## 08_02 Brand-Derived Pillars

### Identity & Purpose

You define 3-5 content pillars derived from Brand Strategy (Module 05). These pillars organise the proof library by what it proves — not by topics or keywords.

### System Prompt — Two-Step Translation Process (per FW_16)

Derive content pillars from the locked Proof Commitments and Claims Boundaries. A list of topics that sounds appropriate for the brand is insufficient. The Competitor Test checks distinctiveness; the two-step process establishes the source. **Step 1 produces nothing but verbatim upstream quotations.** Step 2 derives each Pillar from a specific Module 03 Proof Commitment and shows which Module 01 Can Claim row it substantiates.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable with the verbatim quotations named in the Translation Discipline table above for 08_02: Module 05 Brand Strategy (full), Module 03 Conviction Grid + each Proof Commitment (verbatim, as carried via Module 05), Module 01 Claims Boundaries (verbatim Can Claim / Must Qualify rows, as carried via Module 05), and Module 03 Competitor Friction Summary (verbatim). If any required upstream artefact is missing, halt — do not invent a Pillar to "fill the slot."

**Step 2 — Translate Each Quote into Pillar.** Each Pillar must be one Proof Commitment from Module 03 translated into a content category. Each Pillar must cover at least one Can Claim row from the Claims Boundaries — if a Pillar maps to no Can Claim row, it has no proof to carry and fails the translation test. The Competitor Test (Pillar Distinctiveness) derives from the Module 03 Competitor Friction Summary — name the specific friction point the competitor cannot authentically address.

**Claims Boundary Cross-Check (Pillar-level):** before any Pillar locks, verify it maps to ≥1 Can Claim row from the verbatim Claims Boundaries. A Pillar that reads well but cannot map every planned piece in it to a Can Claim or Must Qualify row fails the cross-check — revise the Pillar or reduce its scope, do not weaken the Boundaries.

**Test (per FW_16):** if a Pillar could plausibly be named by someone who has not read Module 03's Proof Commitments and Module 01's Claims Boundaries, the prompt slipped into discovery mode. Push the source quotation back in and re-derive.

### Core Principle

**Derive from Brand, Don't Select from Topics**

Traditional pillars are topic categories anyone could use. Brand-derived pillars are belief expressions that only you can authentically own. The test: Could a competitor with opposite beliefs use this pillar?

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                        |
| ---------- | ----------------------------------------------------- |
| **Belief** | Every pillar must trace to Brand Strategy (Module 05) |
| **Proof**  | Each pillar has specific proof responsibility         |
| **Result** | Pillars map to Belief Shift Journey stages            |

### Inputs Required

- Brand-Grounded Content Summary (08_01)
- Brand Strategy statement (Module 05)
- Belief Shift Journey (Module 05 `05_03`)
- Sales objection categories (Module 07)

### Steps

1. **Review the Five Pillar Types** Consider which are essential for your proof needs:

- Disruption: Why the current belief is wrong
- Vision: What the brand's belief makes possible
- Method: How to apply the brand's belief
- Evidence: Who has adopted it and results
- Defence: Objections and responses

2. **Select 3-5 Pillars** Choose based on proof gaps and sales needs. Not all businesses need all five.

3. **Name Each Pillar** Create brand-specific names (not generic topics).

4. **Define Proof Responsibility** What does each pillar prove about the brand? What evidence belongs here?

5. **Map to Belief Shift Journey Stage** Using the Belief Shift Journey from Module 05, where in the transfer arc does each pillar operate?

6. **Apply Competitor Test** Could a competitor with opposite beliefs use this pillar? If yes, revise.

### Output Format

```text
## Brand-Derived Content Pillars

---

### Upstream Anchors (verbatim — Step 1)

From Module 05 Brand Strategy: "[verbatim quote — full statement]"
From Module 03 Conviction Grid (Question / Reject / Commit / Introduce, verbatim): "[verbatim]"
From Module 03 Proof Commitments (verbatim, list all): "[verbatim Commitment 1]"; "[verbatim Commitment 2]"; …
From Module 01 / Module 05 Claims Boundaries — Can Claim rows (verbatim, all): "[verbatim Can Claim 1]"; "[verbatim Can Claim 2]"; …
From Module 01 / Module 05 Claims Boundaries — Must Qualify rows (verbatim): "[verbatim]"
From Module 03 Competitor Friction Summary (verbatim — the specific friction this brand cannot avoid that competitors with opposite beliefs cannot resolve): "[verbatim]"

If any of the above is missing from upstream Handoff Packs, halt — do not proceed to Step 2.

---

### Pillar Selection Rationale (derived from above — Step 2)

[Brief explanation tying the selected pillars to the Proof Commitments quoted above. Each selected Pillar must correspond to one Proof Commitment.]

**Brand Strategy (verbatim from Module 05 — re-stated from Upstream Anchors):** [Restated]

---

### Pillar 1: [Brand-Specific Name]

**Derived from Proof Commitment (verbatim from Upstream Anchors):** "[paste the specific Module 03 Proof Commitment this Pillar translates]"

**Substantiates Can Claim rows (verbatim from Upstream Anchors):** "[Can Claim 1 this Pillar will prove]"; "[Can Claim 2 if applicable]"

**Pillar Type:** [Disruption / Vision / Method / Evidence / Defence]

**What This Pillar Proves About the Brand:**
[Specific aspect of the Brand Strategy this pillar demonstrates — traceable to the Brand Strategy quote in Upstream Anchors]

**Belief Shift Journey Stage:** [Recognition / Disruption / Alternative / Proof / Adoption]

**Content in This Pillar Answers:**

- [Key question 1]
- [Key question 2]
- [Key question 3]

**Example Topics:**

- [Topic 1]
- [Topic 2]
- [Topic 3]

**Competitor Test (derived from Module 03 Competitor Friction Summary):** A competitor with opposite beliefs could NOT authentically create this content because [reason, traced to the verbatim Competitor Friction quote above].

**Traceability:** This Pillar derives from [name the specific Proof Commitment quote] and substantiates [name the specific Can Claim row(s)]. If either trace is empty, the Pillar fails the cross-check.

---

### Pillar 2: [Brand-Specific Name]

**Pillar Type:** [Disruption / Vision / Method / Evidence / Defence]

**What This Pillar Proves About the Brand:**
[Specific aspect of the Brand Strategy this pillar demonstrates]

**Belief Shift Journey Stage:** [Recognition / Disruption / Alternative / Proof / Adoption]

**Content in This Pillar Answers:**

- [Key question 1]
- [Key question 2]
- [Key question 3]

**Example Topics:**

- [Topic 1]
- [Topic 2]
- [Topic 3]

**Competitor Test:** A competitor with opposite beliefs could NOT authentically create this content because [reason].

---

### Pillar 3: [Brand-Specific Name]

[Same structure]

---

### Pillar 4: [Brand-Specific Name] _(if applicable)_

[Same structure]

---

### Pillar 5: [Brand-Specific Name] _(if applicable)_

[Same structure]

---

### Pillar Summary

| Pillar | Type | Proves About Brand | Belief Stage | Public Specialisation Signal | Priority |
| --- | --- | --- | --- | --- | --- |
| [Pillar 1] | [Type] | [What it proves] | [Stage] | [what / for whom / problem / distinctive method or perspective] | HIGH/MED/LOW |
| [Pillar 2] | [Type] | [What it proves] | [Stage] | [signal or no] | HIGH/MED/LOW |
| [continue] | | | | | |

---

### Coverage Check

| Belief Shift Journey Stage | Pillar(s) Serving It | Gap?   |
| -------------------------- | -------------------- | ------ |
| Recognition                | [Pillar]             | Yes/No |
| Disruption                 | [Pillar]             | Yes/No |
| Alternative                | [Pillar]             | Yes/No |
| Proof                      | [Pillar]             | Yes/No |
| Adoption                   | [Pillar]             | Yes/No |
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors populated with verbatim Brand Strategy, all Module 03 Proof Commitments, all Module 01/05 Can Claim rows, and Module 03 Competitor Friction Summary
- [ ] No Step 1 quote paraphrased
- [ ] 3-5 pillars defined (not more, not fewer)
- [ ] **Each pillar names the specific verbatim Proof Commitment it derives from**
- [ ] **Each pillar maps to ≥1 verbatim Can Claim row (Claims Boundary cross-check)**
- [ ] Each pillar has a brand-specific name (not generic topic)
- [ ] Competitor Test rationale traces to the verbatim Competitor Friction quote
- [ ] All five Belief Shift Journey stages have pillar coverage
- [ ] Pillars address primary sales objection categories
- [ ] At least one pillar functions as a recognisable Public Specialisation Signal without claiming unsupported exclusivity
- [ ] Traceability block present on every Pillar
- [ ] FW_16 test passes: a reader without Module 03 Proof Commitments + Module 01/05 Claims Boundaries could not have named these Pillars

**If met:** Proceed to Phase 2
**If missing:** Revise pillars from the source quotations, not from intuition
**If a Pillar has no Can Claim mapping:** the Pillar has no proof to carry — drop it or revise to map to a real Can Claim
**If pillars feel generic:** Step 1 quotes are missing or thin — return to Module 03 / 05 Handoff Packs

### Honest Position

**What this deliverable does:**

- Creates unique content categories derived from brand
- Organises proof library by what it proves
- Ensures full Belief Shift Journey coverage

**What this deliverable does not do:**

- Create the content itself
- Define SEO keywords (that comes from pillars, not the reverse)
- Guarantee audience interest (proof attracts; entertainment may not)

---

# PHASE 2: PROOF ARCHITECTURE

---

## 08_03 Proof Hierarchy (Tier 1/2/3)

### Identity & Purpose

You define the three-tier structure for the content library. The hierarchy makes sure foundation proof exists before distribution content scales.

### Core Principle

**Foundation-First Production**

Never distribute what you can't demonstrate. Tier 1 proof anchors everything else. Tier 3 distribution without Tier 1 foundation creates claims without evidence.

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It               |
| ---------- | -------------------------------------------- |
| **Belief** | Hierarchy prevents unanchored claims         |
| **Proof**  | Tier 1 is the proof; Tiers 2-3 distribute it |
| **Result** | Each tier serves different transfer moments  |

### Inputs Required

- Brand-Derived Pillars (08_02)
- Brand-Grounded Content Summary (08_01)
- Existing content inventory (if any)

### Steps

1. **Define Tier Criteria** Establish what qualifies as Tier 1, 2, and 3 for your context.

2. **Audit Existing Content** Classify current content by tier and pillar.

3. **Identify Foundation Gaps** Where do you lack Tier 1 proof?

4. **Map Tier to Purpose** Define what each tier accomplishes in the proof library.

5. **Set Production Sequence** Establish the order: foundation before distribution.

### Output Format

```text
## Proof Hierarchy Structure

---

### Tier Definitions

#### Tier 1: Foundation Proof

**Purpose:** Definitive evidence that the brand's belief is true. Referenced by all other content.

**Characteristics:**

- Depth: [Word count / length for your context]
- Type: Original research, flagship case studies, methodology deep-dives
- Lifespan: Evergreen (updated annually at most)
- Production: High investment, low frequency

**Examples for this brand:**

- [Example 1]
- [Example 2]
- [Example 3]

**Citation Readiness (for each relevant Tier 1 asset):**

- Asset state: [referenceable / development-needed / not-applicable with reason]
- Specificity and independent usefulness: [assessment]
- Evidence, methodology and source traceability: [assessment]
- Original insight and transparent limitations: [assessment]
- Claims Boundaries: [Can / Must Qualify / Cannot]
- Boundary: citation readiness means the asset is useful enough to reference; it does not independently verify every claim or upgrade evidence strength.

---

#### Tier 2: Supporting Proof

**Purpose:** Extends and applies Tier 1 proof to specific contexts, segments, or questions.

**Characteristics:**

- Depth: [Word count / length for your context]
- Type: How-to guides, customer interviews, framework applications
- Lifespan: Semi-evergreen (updated quarterly)
- Production: Medium investment, moderate frequency

**Examples for this brand:**

- [Example 1]
- [Example 2]
- [Example 3]

---

#### Tier 3: Distribution Proof

**Purpose:** Channel-optimised content that drives traffic back to Tier 1/2 proof.

**Characteristics:**

- Depth: [Word count / length for your context]
- Type: Social posts, email content, short videos, threads
- Lifespan: Timely (weekly/monthly refresh)
- Production: Low investment, high frequency

**Examples for this brand:**

- [Example 1]
- [Example 2]
- [Example 3]

---

### Current Content Audit

| Content Piece | Pillar   | Current Tier | Notes        |
| ------------- | -------- | ------------ | ------------ |
| [Piece 1]     | [Pillar] | Tier [1/2/3] | [Assessment] |
| [Piece 2]     | [Pillar] | Tier [1/2/3] | [Assessment] |
| [Piece 3]     | [Pillar] | Tier [1/2/3] | [Assessment] |

---

### Tier Coverage by Pillar

| Pillar     | Tier 1 Pieces | Tier 2 Pieces | Tier 3 Pieces | Foundation Gap? |
| ---------- | ------------- | ------------- | ------------- | --------------- |
| [Pillar 1] | [Count]       | [Count]       | [Count]       | Yes/No          |
| [Pillar 2] | [Count]       | [Count]       | [Count]       | Yes/No          |
| [Pillar 3] | [Count]       | [Count]       | [Count]       | Yes/No          |
| [Pillar 4] | [Count]       | [Count]       | [Count]       | Yes/No          |
| [Pillar 5] | [Count]       | [Count]       | [Count]       | Yes/No          |

---

### Production Sequence Principle

**Rule:** No pillar scales Tier 3 until it has at least one Tier 1 piece.

**Current Sequence Priority:**

1. [Pillar with biggest foundation gap] Create Tier 1 first
2. [Next pillar] Create Tier 1
3. [Continue...]

---

### Tier Relationship Map
```
Tier 1 (Foundation)
"' " extends into
Tier 2 (Supporting)
"' " distributes via
Tier 3 (Distribution)
"' " drives traffic back to
Tier 1 (Foundation)

```text
Each Tier 3 piece must link to Tier 1 or 2 proof.
```
### Vital Check Gate

- [ ] All three tiers defined with clear criteria
- [ ] Existing content audited and classified
- [ ] Foundation gaps identified by pillar
- [ ] Production sequence prioritises Tier 1 gaps
- [ ] Tier relationship clear (distribution points back to foundation)

**If met:** Proceed to 08_04
**If missing:** Complete audit and gap identification
**If no existing content:** Focus on foundation priorities

---

## 08_04 Proof Gap Analysis

### Identity & Purpose

You find the specific evidence missing from the proof library. The analysis prioritises what to create based on proof needs — not trending topics.

### System Prompt — Two-Step Translation Process (per FW_16)

A Gap must be either a Module 07 objection without a matching proof asset or a Module 03 Proof Commitment without published evidence. Other ideas are topic suggestions. **Step 1 produces nothing but verbatim upstream quotations.** Step 2 derives each Gap from a named upstream source.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable with the verbatim quotations named in the Translation Discipline table above for 08_04: Module 07 Top 10 Objection Categories + Responses (all four categories, verbatim), Module 03 Proof Commitments (verbatim, all), and the existing content inventory (file list with tier classification). If Module 07's verbatim objections or Module 03's Proof Commitments are missing, halt — do not generate "proof gaps" from intuition.

**Step 2 — Translate Each Quote into Gap.** Each Gap entry must declare its source: either (a) "Module 07 Objection — [verbatim]" with no matching proof asset in the inventory, or (b) "Module 03 Proof Commitment — [verbatim]" with no published evidence. Sales-Reported Proof Gaps trace to the Module 07 objection rows. Competitor Proof Assessment may be added but is *not* a Gap source on its own — competitor presence does not create a Gap unless the corresponding Module 03 Proof Commitment or Module 07 objection exists.

**Story Proof discipline (per Module 03 Step 5):** if a Module 03 Proof Commitment relies on Story Proof that is pre-launch / positioning-not-yet-public / strategy-not-yet-enacted, the corresponding Gap is marked **"Story Proof pending — content piece can BE the Story Proof when produced"** rather than "missing evidence." Do not mark such Gaps "CRITICAL — invent case study." The content piece itself, when produced, becomes the Story Proof.

**Test (per FW_16):** if a Gap could plausibly have been named by someone who has not read Module 07's Objections and Module 03's Proof Commitments, the prompt slipped into discovery mode. Push the verbatim source back in and re-derive.

### Core Principle

**Proof Gaps, Not Content Gaps**

Traditional content audits find "topics we haven't covered." This analysis finds "evidence we haven't provided about the brand." The difference is brand-alignment.

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                    |
| ---------- | ------------------------------------------------- |
| **Belief** | Gaps defined by what's not proven about the brand |
| **Proof**  | Prioritises evidence creation                     |
| **Result** | Closes gaps that block belief transfer            |

### Inputs Required

- Proof Hierarchy (08_03)
- Sales objection categories (Module 07)
- Brand-Derived Pillars (08_02)

### Steps

1. **List All Proof Needs** What evidence would fully prove the brand's belief?

2. **Assess Current Coverage** For each proof need, what exists? What's missing?

3. **Incorporate Sales Intelligence** What proof does sales report needing most?

4. **Assess Competitor Proof** What proof do competitors have that you lack?

5. **Prioritise Gaps** Rank by impact on sales and belief transfer.

### Output Format

```text
## Proof Gap Analysis

---

### Upstream Anchors (verbatim — Step 1)

From Module 07 Top 10 Objection Categories — Belief Objections (verbatim, all): "[verbatim 1]"; "[verbatim 2]"; …
From Module 07 — Evidence Objections (verbatim, all): "[…]"
From Module 07 — Commitment Objections (verbatim, all): "[…]"
From Module 07 — Fit Objections (verbatim, all): "[…]"
From Module 07 Responses (verbatim — what sales is currently saying for each objection): "[…]"
From Module 03 Proof Commitments (verbatim, all): "[verbatim Commitment 1]"; "[verbatim Commitment 2]"; …
From Module 03 Step 5 Story Proof flavour (verbatim — whether pre-launch / positioning-not-yet-public / strategy-not-yet-enacted): "[verbatim]"
Existing content inventory (file list with tier classification): "[list]"

Halt if any of the above is missing.

---

### Complete Proof Needs Inventory (derived from Module 03 Proof Commitments — Step 2)

Each row below derives from a specific Module 03 Proof Commitment quoted in Upstream Anchors.

| Proof Need (derived) | Source — Verbatim Proof Commitment | Category                                 | Why It Matters              |
| -------------------- | ---------------------------------- | ---------------------------------------- | --------------------------- |
| [Proof need 1]       | "[verbatim Commitment]"            | Demonstration / Explanation / Validation | [Impact on belief transfer] |
| [Proof need 2]       | "[verbatim Commitment]"            | Demonstration / Explanation / Validation | [Impact on belief transfer] |
| [Continue...]        |                                    |                                          |                             |

---

### Gap Assessment by Proof Need

#### Proof Need: [Name]

**Current Coverage:**

- Existing content: [List or "None"]
- Tier level: [1/2/3 or "None"]
- Quality assessment: [Strong / Adequate / Weak / Missing]

**Gap Status:** -- CRITICAL / MODERATE / COVERED

**What's Missing:**
[Specific evidence not yet created]

**Impact of Gap:**
[How this gap affects sales, belief transfer, or credibility]

---

#### Proof Need: [Name]

[Same structure for each proof need]

---

### Sales-Reported Proof Gaps (derived from Module 07 verbatim — Step 2)

Each row below quotes one Module 07 objection from Upstream Anchors and maps it to current proof coverage. A row with no matching proof asset is a confirmed Gap.

| Objection Category    | Verbatim Objection (from Upstream Anchors) | Proof Sales Needs (derived) | Current Coverage | Gap Status |
| --------------------- | ------------------------------------------ | --------------------------- | ---------------- | ---------- |
| Belief Objections     | "[verbatim]"                               | [Evidence needed]           | [Asset or None]  | GAP / OK   |
| Evidence Objections   | "[verbatim]"                               | [Evidence needed]           | [Asset or None]  | GAP / OK   |
| Commitment Objections | "[verbatim]"                               | [Evidence needed]           | [Asset or None]  | GAP / OK   |
| Fit Objections        | "[verbatim]"                               | [Evidence needed]           | [Asset or None]  | GAP / OK   |

---

### Story-Proof-Pending Gaps (derived from Module 03 Step 5 flavour — Step 2)

For each Module 03 Proof Commitment whose Story Proof is **pre-launch / positioning-not-yet-public / strategy-not-yet-enacted**, the Gap is marked **"Story Proof pending — the content piece can BE the Story Proof when produced."** Do not invent a case study to fill these rows.

| Proof Commitment (verbatim) | Story Proof Flavour | Pending Treatment |
| --------------------------- | ------------------- | ----------------- |
| "[verbatim Commitment]"     | [flavour]           | Content piece IS the Story Proof on publication; mark "in development" until published |

---

### Competitor Proof Assessment

| Competitor     | Proof They Have  | Proof We Lack | Opportunity            |
| -------------- | ---------------- | ------------- | ---------------------- |
| [Competitor 1] | [Their evidence] | [Our gap]     | [How to differentiate] |
| [Competitor 2] | [Their evidence] | [Our gap]     | [How to differentiate] |

---

### Gap Priority Matrix

| GAP           | Impact on Sales | Impact on Belief transfer | Difficulty to Close | Priority |
| ------------- | --------------- | ------------------------- | ------------------- | -------- |
| [Gap 1]       | HIGH/MED/LOW    | HIGH/MED/LOW              | HIGH/MED/LOW        | 1        |
| [Gap 2]       | HIGH/MED/LOW    | HIGH/MED/LOW              | HIGH/MED/LOW        | 2        |
| [Gap 3]       | HIGH/MED/LOW    | HIGH/MED/LOW              | HIGH/MED/LOW        | 3        |
| [Continue...] |                 |                           |                     |          |

### VOC Calibration Record

- Evidence state: [calibrated / evidence-pending / not-applicable with reason]
- Intended audience evidence: [Module 02 quotes, objections, conversations or other approved sources]
- Demand-side problem, concern or desired outcome confirmed: [finding]
- Expression adjustment: [wording/framing change or no change]
- Strategic-fidelity check: [confirm VOC did not determine the underlying belief or Pillar]

### Decision-Infrastructure View

- Client-facing: [yes / no + reason]
- Proof that exists: [assets and evidence state]
- Proof that is weak or absent: [gaps]
- Unresolved objections and beliefs requiring movement: [list]
- Priority assets and the decision each should enable: [list]

---

### Top 5 Priority Gaps to Close

1. **[Gap Name]**

- Pillar: [Which pillar]
- Tier needed: [1/2/3]
- Content type: [Specific format]
- Estimated effort: [Time/resources]

2. **[Gap Name]**
   [Same structure]

3. **[Gap Name]**
   [Same structure]

4. **[Gap Name]**
   [Same structure]

5. **[Gap Name]**
   [Same structure]
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors populated with verbatim Module 07 objections (all four categories), Module 07 Responses, all Module 03 Proof Commitments, and Module 03 Step 5 Story Proof flavour
- [ ] No Step 1 quote paraphrased
- [ ] Every Gap declares its source: a verbatim Module 07 objection OR a verbatim Module 03 Proof Commitment
- [ ] No "invented" Gaps that lack an upstream source
- [ ] Sales-Reported Proof Gaps table includes verbatim objection wording in column 2
- [ ] Story-Proof-Pending Gaps separated and marked "in development" — not "CRITICAL"
- [ ] Competitor proof noted but not used as standalone Gap source
- [ ] Top 5 priority gaps each trace to a specific upstream quote
- [ ] FW_16 test passes

**If met:** Proceed to Phase 3
**If missing:** Complete gap assessment from verbatim sources
**If a Gap has no upstream source:** drop it — it's a topic suggestion, not a Gap
**If no sales data:** halt for that row; do not invent objections

---

# PHASE 3: SALES INTEGRATION

---

## 08_05 Content-to-Objection Map

### Identity & Purpose

You connect content pieces directly to the sales objections they answer. This is how the proof library shows up in real deals instead of sitting on a shelf.

### System Prompt — Two-Step Translation Process (per FW_16)

Preserve the exact Module 07 objections when mapping them to content. Paraphrasing to fit a table cell can change what the library needs to answer. **Step 1 produces nothing but verbatim Module 07 objections.** Step 2 maps each objection to a content piece in one of the Pillars from 08_02.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable by copying the full Top 10 Objection Responses from Module 07 verbatim — all four categories (Belief / Evidence / Commitment / Fit), each objection in its original wording, each Response in its original wording. If Module 07 has not produced verbatim objection text for a row, halt that row — mark "verbatim missing — return to Module 07" rather than inventing example wording.

**Step 2 — Translate Each Quote into Content Mapping.** For each verbatim objection: identify the existing content piece (if any) that addresses it, identify the Pillar (from 08_02) the piece sits in, mark Gap status (COVERED / PARTIAL / GAP), and define content needed for GAP rows. The content-needed entry must be derivable from the verbatim objection — not from intuition.

**Test (per FW_16):** if any row's objection wording reads as a clean paraphrase rather than the rough, real-world phrasing prospects use, it slipped into discovery mode. Push the verbatim Module 07 quote back in.

### Core Principle

**Content Serves Sales**

Every piece of proof content should help sales close deals. If it doesn't answer a real objection or carry the belief-transfer conversation forward, it isn't priority.

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It               |
| ---------- | -------------------------------------------- |
| **Belief** | Content purpose tied to specific objection   |
| **Proof**  | Content provides evidence for sales claims   |
| **Result** | Content accelerates belief transfer in deals |

### Inputs Required

- Invitation Strategy outputs (Module 07)
- Proof Gap Analysis (08_04)
- Existing content inventory

### Steps

1. **Import Objection Categories** Bring in the four objection types from Module 07.

2. **List Top Objections** Within each category, what are the specific objections sales hears?

3. **Map Existing Content** What content currently addresses each objection?

4. **Identify Content Gaps** Where do objections lack supporting content?

5. **Define Content Needs** For each gap, what content would resolve the objection?

### Output Format

```text
## Content-to-Objection Map

---

### Upstream Anchors (verbatim — Step 1)

From Module 07 Top 10 Objection Responses (verbatim, all four categories):

**Belief Objections (verbatim):**
- Objection: "[verbatim]" — Response: "[verbatim]"
- Objection: "[verbatim]" — Response: "[verbatim]"
- …

**Evidence Objections (verbatim):**
- Objection: "[verbatim]" — Response: "[verbatim]"
- …

**Commitment Objections (verbatim):**
- Objection: "[verbatim]" — Response: "[verbatim]"
- …

**Fit Objections (verbatim):**
- Objection: "[verbatim]" — Response: "[verbatim]"
- …

Halt if Module 07 has not produced verbatim text for any row.

---

### Belief Objections (derived from above — Step 2)

_Category cue: "I don't think that's really the problem"_

| Verbatim Objection (from Upstream Anchors) | Pillar (from 08_02) | Content That Addresses It | Gap Status | Content Needed  |
| ------------------------------------------ | ------------------- | ------------------------- | ---------- | --------------- |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | COVERED    |                 |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | PARTIAL    | [What's needed] |
| "[verbatim]"                               | [Pillar]            | None                      | GAP        | [What's needed] |

**Priority content for Belief Objections:**

1. [Content to create]
2. [Content to create]

---

### Evidence Objections (derived from above — Step 2)

_Category cue: "How do I know this works?"_

| Verbatim Objection (from Upstream Anchors) | Pillar (from 08_02) | Content That Addresses It | Gap Status | Content Needed  |
| ------------------------------------------ | ------------------- | ------------------------- | ---------- | --------------- |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | COVERED    |                 |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | PARTIAL    | [What's needed] |
| "[verbatim]"                               | [Pillar]            | None                      | GAP        | [What's needed] |

**Priority content for Evidence Objections:**

1. [Content to create]
2. [Content to create]

---

### Commitment Objections (derived from above — Step 2)

_Category cue: "I need to think about it"_

| Verbatim Objection (from Upstream Anchors) | Pillar (from 08_02) | Content That Addresses It | Gap Status | Content Needed  |
| ------------------------------------------ | ------------------- | ------------------------- | ---------- | --------------- |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | COVERED    |                 |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | PARTIAL    | [What's needed] |
| "[verbatim]"                               | [Pillar]            | None                      | GAP        | [What's needed] |

**Priority content for Commitment Objections:**

1. [Content to create]
2. [Content to create]

---

### Fit Objections (derived from above — Step 2)

_Category cue: "This isn't for someone like me"_

| Verbatim Objection (from Upstream Anchors) | Pillar (from 08_02) | Content That Addresses It | Gap Status | Content Needed  |
| ------------------------------------------ | ------------------- | ------------------------- | ---------- | --------------- |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | COVERED    |                 |
| "[verbatim]"                               | [Pillar]            | [Content piece(s)]        | PARTIAL    | [What's needed] |
| "[verbatim]"                               | [Pillar]            | None                      | GAP        | [What's needed] |

---

### Traceability

For every "Content Needed" entry, name the specific verbatim Module 07 objection it derives from. If no such trace exists, the entry is invented — drop it.

**Priority content for Fit Objections:**

1. [Content to create]
2. [Content to create]

---

### Coverage Summary

| Objection Category | Total Objections | COVERED | PARTIAL | GAP     |
| ------------------ | ---------------- | ------- | ------- | ------- |
| Belief             | [Count]          | [Count] | [Count] | [Count] |
| Evidence           | [Count]          | [Count] | [Count] | [Count] |
| Commitment         | [Count]          | [Count] | [Count] | [Count] |
| Fit                | [Count]          | [Count] | [Count] | [Count] |
| **TOTAL**          | [Count]          | [Count] | [Count] | [Count] |

---

### Sales Content Library (Quick Reference)

For sales team use content organised by when to use it:

**When prospect questions the problem:**

- [Content 1] [One-line description]
- [Content 2] [One-line description]

**When prospect wants proof:**

- [Content 1] [One-line description]
- [Content 2] [One-line description]

**When prospect hesitates on commitment:**

- [Content 1] [One-line description]
- [Content 2] [One-line description]

**When prospect questions fit:**

- [Content 1] [One-line description]
- [Content 2] [One-line description]
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors populated with verbatim Module 07 Top 10 Objection Responses (all four categories, both Objection and Response wording)
- [ ] No Step 1 quote paraphrased
- [ ] Every row in every category table uses the verbatim objection wording in column 1
- [ ] Each objection mapped to a Pillar from 08_02
- [ ] Gaps clearly identified (COVERED / PARTIAL / GAP)
- [ ] Every "Content Needed" entry traces to a verbatim Module 07 objection
- [ ] Sales quick reference created
- [ ] FW_16 test passes

**If met:** Proceed to 08_06
**If missing:** Complete mapping from verbatim sources
**If no sales objection data:** Return to Module 07; do not invent objections

---

## 08_06 Claims Boundaries for Content

### Identity & Purpose

You apply the Evidence Matrix (from Module 05) to content creation. Nothing gets published that exceeds what the evidence supports.

### System Prompt — Two-Step Translation Process (per FW_16)

Every published piece must map to a verbatim row in the upstream Claims Boundaries. Do not invent qualification language to make a Cannot Claim publishable. **Step 1 produces nothing but verbatim Claims Boundaries rows.** Step 2 applies them to each Pillar.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable by copying the full Module 01 / Module 05 Claims Boundaries verbatim — every Can Claim row (with evidence source), every Must Qualify row (with the upstream qualification language), every Cannot Claim row (with the reason). If any row is missing its evidence source or qualification language upstream, halt — do not invent the missing source to "complete" the row.

**Step 2 — Apply Boundaries to Each Pillar.** For each Pillar from 08_02, list the claims the Pillar will need to make and map each to a verbatim Boundary row. A claim that cannot map to a verbatim Can Claim or Must Qualify row is a Cannot Claim — it does not get a softened version invented for it. The Qualification Language Guide must use the *verbatim* qualification language from the upstream Must Qualify rows, not new softeners invented to fit content tone.

**Test (per FW_16):** if any "Must Qualify" softening language reads more permissive than the upstream qualification, the prompt slipped into discovery mode. Pull the verbatim qualification text back in.

### Core Principle

**What You Publish Is Permanent**

Every claim in content creates expectation. Claims that exceed evidence create credibility debt. Claims Boundaries protect the brand from overclaiming.

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                         |
| ---------- | ------------------------------------------------------ |
| **Belief** | Boundaries keep claims aligned with brand              |
| **Proof**  | Only anchored claims get published                     |
| **Result** | Credibility enables transfer; overclaiming destroys it |

### Inputs Required

- Evidence Matrix / Claims Boundaries (Module 05)
- Content pillars (08_02)
- Proof needs inventory (08_04)

### Steps

1. **Import Evidence Matrix** Bring in the Can Claim / Must Qualify / Cannot Claim categories from Module 05.

2. **Apply to Each Pillar** What claims can be made in each pillar?

3. **Define Qualification Language** For "Must Qualify" claims, provide specific softening phrases.

4. **List Forbidden Claims** What can NEVER appear in content?

5. **Create Review Checklist** How will content be checked for compliance?

### Output Format

```text
## Claims Boundaries for Content

---

### Upstream Anchors (verbatim — Step 1)

**Can Claim rows (verbatim from Module 01 / Module 05 Claims Boundaries — all rows):**

- "[verbatim claim]" — Evidence (verbatim source): "[verbatim]"
- "[verbatim claim]" — Evidence (verbatim source): "[verbatim]"
- …

**Must Qualify rows (verbatim — all rows):**

- "[verbatim claim]" — Verbatim qualification language: "[verbatim — use this exact softener, do not invent a new one]"
- "[verbatim claim]" — Verbatim qualification language: "[verbatim]"
- …

**Cannot Claim rows (verbatim — all rows):**

- "[verbatim claim]" — Verbatim reason: "[verbatim]"
- "[verbatim claim]" — Verbatim reason: "[verbatim]"
- …

Halt if any row is missing its evidence source, qualification language, or reason upstream.

---

### Evidence Matrix Summary (derived from Upstream Anchors — Step 2)

A re-presentation of the verbatim rows above, organised for content-creation use. No new rows added here; if a claim is needed but no row exists, return to Module 05 and add the row at source.

---

### Claims by Pillar (derived from Upstream Anchors — Step 2)

For each Pillar, every claim must map to a verbatim row above. If it cannot, it is a Cannot Claim by default — no invented softener saves it.

#### Pillar: [Name]

| Claim Pillar Needs | Verbatim Row It Maps To (from Upstream Anchors) | Status       | How to State (verbatim from upstream where Must Qualify) |
| ------------------ | ----------------------------------------------- | ------------ | -------------------------------------------------------- |
| [Claim 1]          | "[verbatim Can Claim row]"                      | Can Claim    | State directly                                           |
| [Claim 2]          | "[verbatim Must Qualify row]"                   | Must Qualify | Use the verbatim qualification: "[verbatim softener]"    |
| [Claim 3]          | "[verbatim Cannot Claim row]"                   | Cannot Claim | DO NOT USE                                               |
| [Claim 4]          | No matching row upstream                        | Cannot Claim | DO NOT USE — return to Module 05 to add the row if it should exist |

---

#### Pillar: [Name]

[Same structure for each pillar]

---

### Qualification Language Guide (verbatim from upstream Must Qualify rows — Step 2)

**Binding rule:** the qualification phrases used in published content are the verbatim qualification language from the Module 05 Must Qualify rows quoted in Upstream Anchors above. The list below is a *reference set of common patterns* that may appear in upstream qualification language; it is NOT a menu to pick from independently. If a needed qualification phrase is not in the upstream rows, return to Module 05 and add it at source.

When a claim must be qualified, use the verbatim phrase from upstream. Common patterns include:

**For experience-based claims:**

- "We've found that..."
- "In our experience..."
- "Our clients often see..."

**For directional claims:**

- "Designed to..."
- "Intended to help..."
- "Aims to..."

**For belief-based claims:**

- "We believe..."
- "Our perspective is..."
- "We've come to understand..."

**NEVER use:**

- "Guaranteed to..."
- "Always..."
- "Will definitely..."
- "[Specific number]% improvement" (unless data exists)

---

### Forbidden Claims List

These claims can NEVER appear in content:

1. **[Claim]** Reason: [Why it exceeds evidence]
2. **[Claim]** Reason: [Why it exceeds evidence]
3. **[Claim]** Reason: [Why it exceeds evidence]

---

### Content Review Checklist

Before publishing ANY content, verify:

- [ ] All "Can Claim" statements have evidence source noted
- [ ] All "Must Qualify" statements use appropriate softening
- [ ] No "Cannot Claim" statements appear
- [ ] No forbidden claims present
- [ ] Headline claims match body evidence
- [ ] Customer quotes are verified and permission-granted
- [ ] Statistics have sources cited

---

### Escalation Process

If content contains a claim not on the matrix:

1. **Stop** Do not publish
2. **Classify** Is there evidence? How strong?
3. **Decide** Can Claim / Must Qualify / Cannot Claim
4. **Update** Add to Evidence Matrix
5. **Proceed** Publish with appropriate treatment
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors populated with all verbatim Can Claim, Must Qualify, and Cannot Claim rows (including evidence source / qualification language / reason for each)
- [ ] No Step 1 quote paraphrased
- [ ] Every claim in every Pillar's Claims-by-Pillar table maps to a specific verbatim row from Upstream Anchors
- [ ] No invented softener language present — every Must Qualify uses the verbatim upstream qualification
- [ ] Claims with no upstream row are marked Cannot Claim (not "Must Qualify with new softener")
- [ ] Forbidden claims explicitly listed from verbatim Cannot Claim rows
- [ ] Review checklist created
- [ ] Escalation process defined (and routes back to Module 05 to add rows at source, not invent them in 08)
- [ ] FW_16 test passes

**If met:** Proceed to Phase 4
**If missing:** Complete claims mapping from verbatim rows
**If a needed claim has no upstream row:** return to Module 05 — do not invent a Must Qualify softener in 08
**If Evidence Matrix doesn't exist in Module 05:** Return to Module 05

---

# PHASE 4: DISTRIBUTION STRATEGY

---

## 08_07 Proof Distribution Channels

### Identity & Purpose

You match content tiers to the right channels. Proof has to reach belief-ready audiences **in a voice that fits the brand**.

Channel selection must pass two filters:

1. **Audience Filter:** Where do belief-ready audiences consume content?
2. **Brand Voice Filter:** Does this channel suit how the brand sounds?

A channel that reaches the right audience but conflicts with brand voice is **not suitable**.

### Core Principle

**Channel Serves Brand, Not Reverse**

Traditional strategy asks "What content works on this channel?" This module asks:

- "Where do belief-ready audiences consume proof?"
- "Does this channel allow the brand to sound like itself?"

If a channel forces the brand to adopt a voice that conflicts with Module 05, **reject the channel** even if the audience is there.

### Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                                       |
| ---------- | -------------------------------------------------------------------- |
| **Belief** | Channels selected for brand-voice fit, not just reach                |
| **Proof**  | Each channel serves specific proof tiers appropriately               |
| **Result** | Channels reach belief-ready audiences in the brand's authentic voice |

### Inputs Required

**From Module 05 (Brand Identity):**

- Brand Voice characteristics (formal/casual, technical/accessible, etc.)
- Brand Personality
- Tone guidelines (do/don't)

**From Module 06 (Belief Shift Strategy):**

- Audience Segments with Belief Spectrum Readiness
- Channel Strategy (where audience is)

**From Module 08:**

- Proof Hierarchy (08_03)
- Content Pillars (08_02)

### Steps

**Step 1: Import Brand Voice Profile (Module 05)**

Extract the key voice characteristics that will filter channel selection.

**Step 2: Import Audience Channel Data (Module 06)**

Record the exact Module 06 Channel Portfolio version and evidence cut-off. Only Primary, Supporting and specifically authorised Experimental elements may proceed. Deferred and Rejected candidates remain unavailable unless Module 06 issues a new portfolio version.

**Step 3: Assess Channel-Voice Fit**

For each authorised portfolio element, check whether the channel supports the brand’s voice. Apply the approved portfolio; do not select channels again. If a load-bearing channel fails voice fit, return the conflict to Module 06; do not silently replace it.

**Current Channel Voice-Fit Record:**

| Authorised element | M06 classification and job | Current observed format/conventions + dated evidence | Voice fit | Required adaptation | Result |
| --- | --- | --- | --- | --- | --- |
| [Imported candidate] | [Primary/Supporting/Experimental + job] | [Observed, not stereotyped] | [Strong/Conditional/Weak/Unknown] | [How the brand remains itself] | [Use / bounded test / return to M06] |

**Step 4: Apply Brand Voice Filter**

For each channel, answer:

1. Can the brand sound like itself here?
2. Will the brand have to compromise its voice to fit?
3. Does the format support the brand's content depth?

**Step 5: Rate Channel-Voice Fit**

| Fit Rating     | Meaning                                        |
| -------------- | ---------------------------------------------- |
| ... STRONG FIT | Brand voice naturally suits this channel       |
| " " ACCEPTABLE | Brand voice can work with minor adaptation     |
| POOR FIT       | Brand would have to fundamentally change voice |

**Step 6: Make Channel Decisions**

| Decision         | Criteria                                 |
| ---------------- | ---------------------------------------- |
| **PRIMARY**      | Audience present + Strong voice fit      |
| **SECONDARY**    | Audience present + Acceptable voice fit  |
| **REJECT**       | Poor voice fit (regardless of audience)  |
| **DEPRIORITISE** | Acceptable fit but low audience presence |

### Output Format

```text
## Proof Distribution Channels

---

### Brand Voice Profile (from Module 05)

**Voice Summary:**

- Formality: [Formal / Professional / Conversational / Casual]
- Tone: [Authoritative / Warm / Technical / Playful / Serious]
- Depth: [Deep/detailed / Accessible / Quick/scannable]
- Style: [Long-form / Short-form / Visual / Text-heavy]

**Voice Do's:**

- [Do 1]
- [Do 2]
- [Do 3]

**Voice Don'ts:**

- [Don't 1]
- [Don't 2]
- [Don't 3]

---

### Channel-Voice Fit Assessment

#### [Channel Name]

**Channel characteristics:** [Native voice, depth, format]

**Brand voice fit:** [... STRONG FIT / " " ACCEPTABLE / POOR FIT]

**Rationale:** [Why this channel does/doesn't suit the brand voice]

**Audience presence:** [High / Medium / Low] (from Module 06)

**Decision:** [PRIMARY / SECONDARY / REJECT / DEPRIORITISE]

---

[Repeat for each potential channel]

---

### Channel Decision Summary

#### Primary Channels (Audience + Strong Voice Fit)

| Channel   | Voice Fit  | Audience | Tier Suitability | Primary Use        |
| --------- | ---------- | -------- | ---------------- | ------------------ |
| [Channel] | ... Strong | High     | Tier [1/2/3]     | [How we'll use it] |

---

#### Secondary Channels (Audience + Acceptable Voice Fit)

| Channel   | Voice Fit      | Audience | Tier Suitability | Primary Use        |
| --------- | -------------- | -------- | ---------------- | ------------------ |
| [Channel] | " " Acceptable | Medium   | Tier [1/2/3]     | [How we'll use it] |

**Voice Adaptation Notes:**

- [How brand voice will be slightly adapted for this channel]
- [What we WON'T do even on this channel]

---

#### Rejected Channels (Poor Voice Fit)

| Channel   | Voice Fit | Audience | Rejection Rationale                               |
| --------- | --------- | -------- | ------------------------------------------------- |
| [Channel] | Poor      | [Level]  | [Why brand voice cannot authentically exist here] |

**Example Rejection Rationales:**

- "Instagram rejected: Brand voice is formal and text-heavy; Instagram's visual-first, casual environment would force voice compromise."
- "TikTok rejected: Brand voice is measured and authoritative; TikTok's entertainment-first culture conflicts with brand positioning."

---

#### Deprioritised Channels (Acceptable Fit, Low Audience)

| Channel   | Voice Fit      | Audience | Rationale                          |
| --------- | -------------- | -------- | ---------------------------------- |
| [Channel] | " " Acceptable | Low      | [Why we're not investing here now] |

---

### Channel-Tier Matrix

| Channel       | Tier 1 (Foundation) | Tier 2 (Supporting) | Tier 3 (Distribution) |
| ------------- | ------------------- | ------------------- | --------------------- |
| [Primary 1]   | "" /                | "" /                | "" /                  |
| [Primary 2]   | "" /                | "" /                | "" /                  |
| [Secondary 1] | "" /                | "" /                | "" /                  |

---

### Channel Profiles (Primary Channels Only)

#### [Primary Channel Name]

**Why this channel (Voice + Audience):**
[Explanation of why this channel suits both brand voice and audience]

**Content approach:**

- Tier 1: [How foundation proof appears here]
- Tier 2: [How supporting proof appears here]
- Tier 3: [How distribution content appears here]

**Voice execution:**

- Do: [How brand voice manifests on this channel]
- Don't: [What we avoid even though the channel allows it]

**Proof-to-Distribution Rule:**
[How Tier 3 on this channel links back to Tier 1/2]

---

### Distribution Flow
```
Tier 1 (Foundation Proof)
hosted on: [Owned channels blog, website]

Tier 2 (Supporting Proof)
hosted on: [Owned + Primary channels]
links to: Tier 1

Tier 3 (Distribution)
distributed via: [Primary + Secondary channels]
drives traffic to: Tier 1 and 2

REJECTED CHANNELS: [List]
reason: Voice conflict

```text
---

### SEO Considerations (Brief)

**Tier 1 Content SEO:**
- Target queries: [Informational, high-intent]
- Keyword approach: [Brand-aligned terms]
- Technical requirements: [Schema, structure]

**Tier 2 Content SEO:**
- Target queries: [Application, how-to]
- Internal linking: [To Tier 1]

**Tier 3 Content:**
- Not SEO-primary (distribution role)
- Link back to SEO-optimised Tier 1/2

---

### Voice Consistency Across Channels

**Non-Negotiable Voice Elements (same everywhere):**
- [Element 1 that never changes]
- [Element 2 that never changes]

**Acceptable Channel Adaptations:**
- [What can flex slightly by channel]

**Never Compromise:**
- [Voice element that would be compromised on rejected channels]
```
### Vital Check Gate

- [ ] Brand Voice Profile imported from Module 05
- [ ] All potential channels assessed for voice fit
- [ ] Each channel rated: Strong Fit / Acceptable / Poor Fit
- [ ] Primary channels have both audience presence AND strong voice fit
- [ ] Rejected channels listed with clear voice-based rationale
- [ ] Channel-Tier matrix defined
- [ ] Distribution flow shows rejected channels explicitly
- [ ] Voice consistency guidelines documented

**If met:** Proceed to 08_08
**If missing:** Complete voice fit assessment
**If Module 05 Brand Voice unclear:** Return to Module 05

### Honest Position

**What this deliverable does:**

- Filters channels through brand voice, not just audience presence
- Explicitly rejects channels that conflict with brand
- Ensures proof reaches audience in authentic brand voice

**What this deliverable does not do:**

- Create channel-specific content
- Define detailed platform tactics
- Guarantee reach (that depends on execution)
- Override audience data (still need audience presence)

---

## 08_08 Proof Production Priorities

### Identity & Purpose

You rank the proof assets that should be produced when a commercial route needs them. Module 08 decides proof priority, not publishing cadence.

### Core Principle

**Proof Gaps, Not Content Slots**

Do not fill a calendar. Name which proof gap should be closed first, what asset could close it, what evidence it needs and what must be true before publication.

### Inputs Required

- Proof Gap Analysis (08_04)
- Proof Hierarchy (08_03)
- Resources & constraints
- Content-to-Objection Map (08_05)

### Output Format

```text
## Proof Production Priorities

---

### Production Constraints

- Evidence available: [Description]
- Permission required: [Description]
- Production resources: [Description]
- Review and claims approval: [Description]

---

### Proof Gap Priority Sequence

Based on 08_04 Proof Gap Analysis, content creation follows this priority:

| Priority | Content Piece | Pillar | Tier | Gap It Closes | Evidence needed | Ready? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Content] | [Pillar] | [Tier] | [Gap] | [source/permission] | [Y/N] |
| 2 | [Content] | [Pillar] | [Tier] | [Gap] | [source/permission] | [Y/N] |
| 3 | [Content] | [Pillar] | [Tier] | [Gap] | [source/permission] | [Y/N] |

---

### Tier Balance Rules

**Rule 1:** No Tier 3 scaling for a pillar until Tier 1 exists
**Rule 2:** Tier 2 supports existing Tier 1 (not standalone)
**Rule 3:** Tier 3 always links to Tier 1 or 2

---

### Production Principles

1. **Proof before promotion** Create foundation before distribution campaigns
2. **Sales gaps first** Content addressing sales objections takes priority
3. **Quality over frequency** Miss a slot before publishing weak proof
4. **Evergreen before timely** Tier 1 before trend-chasing Tier 3
5. **Review before publish** Claims compliance on every piece
```
Module 11 decides which priority enters the active cycle and sets quantity, cadence, dates, targets and thresholds. Module 12 schedules the work.

### Vital Check Gate

- [ ] Priority sequence based on proof gaps
- [ ] Tier balance rules established
- [ ] Evidence and permission requirements documented
- [ ] No publishing cadence or calendar created

**If met:** Proceed to Phase 5

---

# PHASE 5: MEASUREMENT

---

## 08_09 Proof Metrics & Transfer Indicators

### Identity & Purpose

You define metrics that track proof effectiveness and belief transfer — not just engagement. These metrics keep content tied to the brand.

### System Prompt — Two-Step Translation Process (per FW_16)

Ground Language Echo and Perspective Shift in the verbatim TO language from Module 05. That gives each comparison a defined reference instead of relying on a general impression of alignment. **Step 1 produces nothing but verbatim upstream quotations.** Step 2 derives each Indicator using the verbatim TO language as the comparison string.

**Step 1 — Quote Upstream Anchors Verbatim.** Open the deliverable with: Module 05 Brand Strategy (verbatim, full), Module 05 Belief Shift Journey FROM (verbatim), Module 05 Belief Shift Journey TO (verbatim — this is the comparison string for the Language Echo Indicator), and Module 07 Top 10 Objections (verbatim, all four categories — these are the comparison set for the Objection Resolution Rate metric).

**Step 2 — Translate Each Quote into Metric / Indicator.** The Objection Resolution Rate metric counts categories from the verbatim Module 07 list. The Brand Consistency metric uses the verbatim Brand Strategy as the comparison string. The Language Echo Indicator names the **verbatim TO language** as the phrase set to listen for in audience output. Perspective Shift Indicator pairs the verbatim FROM and TO as the "I used to think [FROM], now I think [TO]" pattern.

**Test (per FW_16):** if an Indicator describes "what to look for" without naming the verbatim upstream phrase as the signal, it slipped into discovery mode.

### Core Principle

**Measure Transfer, Not Just Traffic**

Traditional metrics measure consumption. Proof metrics measure brand impact. Both matter but proof metrics are primary.

### Inputs Required

- Proof objectives (08_01)
- Content-to-Objection Map (08_05)
- Sales metrics context (Module 07)

### Output Format

```text
## Proof Metrics & Transfer Indicators

---

### Upstream Anchors (verbatim — Step 1)

From Module 05 Brand Strategy: "[verbatim quote — full statement; comparison string for Brand Consistency metric]"
From Module 05 Belief Shift Journey — FROM: "[verbatim]"
From Module 05 Belief Shift Journey — TO: "[verbatim — comparison string for Language Echo Indicator]"
From Module 07 Top 10 Objections (verbatim, all four categories — comparison set for Objection Resolution Rate): "[…]"

Halt if any of the above is missing.

---

### Proof Metrics (Primary — derived from above, Step 2)

#### 1. Proof Coverage

**Definition:** Percentage of identified proof needs with published content

**Calculation:** (Proof needs with Tier 1/2 content) / (Total proof needs identified) × 100

**Current:** [X%]
**Target:** [X%]
**Measurement Method:** Quarterly audit against 08_04 Proof Gap Analysis

---

#### 2. Sales Utilisation

**Definition:** Percentage of proof content actively used by sales in deals

**Current:** [X%]
**Target:** [X%]
**Measurement Method:** CRM tracking, sales team survey

---

#### 3. Objection Resolution Rate (derived from Module 07 verbatim — Step 2)

**Definition:** Percentage of verbatim Module 07 objection rows with effective content (a content piece marked COVERED in 08_05).

**Comparison set:** the verbatim Module 07 objection list quoted in Upstream Anchors.

**Current:** [X%]
**Target:** [X%]
**Measurement Method:** 08_05 Content-to-Objection Map review — count COVERED rows over total Module 07 rows.

---

#### 4. Claims Compliance

**Definition:** Percentage of content passing Claims Boundaries review

**Current:** [X%]
**Target:** 100%
**Measurement Method:** Pre-publication checklist completion

---

#### 5. Brand Consistency (derived from verbatim Brand Strategy — Step 2)

**Definition:** Percentage of content whose Pillar mapping and claim set trace cleanly to the verbatim Brand Strategy quoted in Upstream Anchors.

**Comparison string:** the verbatim Module 05 Brand Strategy.

**Current:** [X%]
**Target:** 100%
**Measurement Method:** Quarterly content audit — each piece must surface its Pillar (from 08_02) and Claims trace (from 08_06); audit fails any piece that cannot.

---

### Belief transfer Indicators

These are qualitative signals that belief transfer is occurring:

#### Indicator 1: Language Echo (derived from Upstream Anchors — Step 2)

**Comparison string (verbatim TO from Module 05):** "[verbatim TO]"
**What to Look For:** Audience output that echoes the verbatim TO phrase set above — substring matches, near-phrase variants, or the TO restated in the audience's own words.
**Where to Find:** Comments, testimonials, support conversations, sales calls
**Signal Strength:** Strong indicator of transfer
**Traceability:** Every reported instance must quote the audience verbatim and name which TO phrase it echoes.

Also inspect prospect questions, replies, discovery calls, objection language and customer conversations where available. These qualitative signals can indicate movement; reach, likes or traffic alone cannot.

---

#### Indicator 2: Perspective Shift Statements (derived from Upstream Anchors — Step 2)

**Comparison pattern (verbatim FROM → TO from Module 05):** "I used to think [verbatim FROM], now I think [verbatim TO]"
**What to Look For:** Audience expressions that follow the FROM → TO pattern, with FROM-shaped language giving way to TO-shaped language.
**Where to Find:** Testimonials, reviews, feedback forms
**Signal Strength:** Strong indicator of transfer
**Traceability:** Every reported instance must quote the audience verbatim and pair it to the verbatim FROM and TO.

---

### Traditional Metrics (Secondary)

Retain these for tactical optimisation:

| Metric                | Purpose                    | Target   |
| --------------------- | -------------------------- | -------- |
| Website traffic       | Reach measurement          | [Target] |
| Time on page (Tier 1) | Engagement depth           | [Target] |
| Social shares         | Distribution effectiveness | [Target] |

---

### Measurement Cadence

| Metric Type         | Review Frequency |
| ------------------- | ---------------- |
| Proof metrics       | Monthly          |
| Transfer indicators | Quarterly        |
| Traditional metrics | Weekly           |
```
### Vital Check Gate

- [ ] Step 1 Upstream Anchors populated with verbatim Brand Strategy, verbatim FROM, verbatim TO, and verbatim Module 07 objections
- [ ] No Step 1 quote paraphrased
- [ ] Language Echo Indicator names the verbatim TO as the comparison string
- [ ] Perspective Shift Indicator names the verbatim FROM → TO pattern
- [ ] Objection Resolution Rate uses the verbatim Module 07 list as the comparison set
- [ ] Brand Consistency uses the verbatim Brand Strategy as the comparison string
- [ ] At least 5 proof metrics defined
- [ ] At least 2 belief transfer indicators defined
- [ ] Traditional metrics retained as secondary
- [ ] Targets set for all metrics
- [ ] Review cadence established
- [ ] FW_16 test passes

**If met:** Proceed to Phase 6

---

# PHASE 6: OPERATIONS (Compressed)

---

## 08_10 Production Process (Brand-Aligned)

### Identity & Purpose

You set up a production process that keeps content brand-aligned. Every piece traces back to Module 05 outputs and stays within Claims Boundaries.

### Output Format

```text
## Brand-Aligned Production Process

---

### Content Brief Requirements

Every content piece begins with a brief containing:

- [ ] **Proof Purpose:** What does this piece prove about the brand?
- [ ] **Pillar:** Which brand-derived pillar?
- [ ] **Tier:** Foundation / Supporting / Distribution?
- [ ] **Belief Shift Journey Stage:** Where in the arc does this sit?
- [ ] **Objection Addressed:** Which sales objection (if any)?
- [ ] **Claims Check:** Pre-identified claims with Evidence Matrix status (from Module 05)
- [ ] **Brand Voice Check:** Aligned with Module 05 voice guidelines?
- [ ] **Tier 1 Link:** What foundation proof does this connect to?

---

### Production Stages

**Stage 1: Brief Approval**

- Brief reviewed against proof purpose
- Claims pre-cleared against Evidence Matrix (Module 05)
- Pillar and tier confirmed

**Stage 2: Draft Creation**

- Writer/creator produces draft
- Self-check against brief requirements
- Brand Voice check against Module 05

**Stage 3: Brand Review**

- Does it prove what it claims?
- Does it express the brand consistently?
- Is voice consistent with Module 05?

**Stage 4: Claims Compliance Review**

- All claims checked against Evidence Matrix (Module 05)
- Qualification language applied where needed
- Forbidden claims removed

**Stage 5: Final Approval**

- Quality gate checklist completed
- Tier 3 links to Tier 1/2 verified
- Ready for publication

---

### Brand Review Checklist

Before any content publishes:

- [ ] Traces to Brand Strategy (Module 05)
- [ ] Serves identified pillar
- [ ] Appropriate tier classification
- [ ] All claims within boundaries (Module 05 Evidence Matrix)
- [ ] Voice consistent with Module 05
- [ ] Links to foundation proof (if Tier 2/3)
- [ ] Sales objection connection clear (if applicable)
```
### Vital Check Gate

- [ ] Content brief template created
- [ ] Production stages defined
- [ ] Brand review checklist created
- [ ] All checks reference Module 05 outputs

**If met:** Proceed to 08_11

---

## 08_11 Resources & Constraints

### Identity & Purpose

You document the constraints that affect content production. This is what makes the conviction cadence realistic instead of aspirational.

### Output Format

```text
## Resources & Constraints

---

### Team Capacity

| Role     | Availability | Content Capacity |
| -------- | ------------ | ---------------- |
| [Role 1] | [Hours/week] | [Pieces/month]   |
| [Role 2] | [Hours/week] | [Pieces/month]   |

**Total Monthly Capacity:** [X Tier 1, Y Tier 2, Z Tier 3]

---

### Capability Gaps

| Capability Needed | Current State | Impact                 |
| ----------------- | ------------- | ---------------------- |
| [Capability 1]    | Have / Gap    | [Effect on production] |
| [Capability 2]    | Have / Gap    | [Effect on production] |

---

### Budget Constraints

**Available Budget:** [Amount/period]

**Allocation:**

- Content creation: [%]
- Tools: [%]
- Promotion: [%]

---

### Production Capacity Boundary

Given current constraints, state which proof tiers the team can produce, what limits production, and what must be commissioned externally. Do not convert capacity into a publishing quota; Module 11 sets cycle quantities.

| Tier | Available capability | Constraint | External help needed? |
| --- | --- | --- | --- |
| Tier 1 | [capability] | [constraint] | [Y/N] |
| Tier 2 | [capability] | [constraint] | [Y/N] |
| Tier 3 | [capability] | [constraint] | [Y/N] |
```
### Vital Check Gate

- [ ] Team capacity documented
- [ ] Capability gaps identified
- [ ] Realistic cadence defined

**If met:** Proceed to Phase 7

---

# PHASE 7: GOVERNANCE (Compressed)

---

## 08_12 Claims Compliance & Review

### Identity & Purpose

You define how claims will be reviewed as evidence changes, so the proof library remains credible after publication.

### Output Format

```text
## Claims Compliance & Review

---

### Pre-Publication Review

**Required for all Tier 1 content:**

- [ ] Claims compliance review against Module 05 Evidence Matrix
- [ ] Brand voice check against Module 05
- [ ] Legal review (if regulated claims)
- [ ] Builder/CEO sign-off

**Required for all Tier 2 content:**

- [ ] Claims checklist completed
- [ ] Brand voice check
- [ ] Editor sign-off

**Required for all Tier 3 content:**

- [ ] Self-review checklist
- [ ] Link verification
- [ ] Brand voice spot-check

---

### Quarterly Compliance Audit

**Scope:** All content published in quarter

**Audit Questions:**

1. Are all claims still within boundaries (Module 05)?
2. Has evidence changed (strengthened or weakened)?
3. Is brand consistency maintained (Module 05)?
4. Are any pieces now overclaiming?

**Audit Output:** Compliance report with action items

---

### Evidence Matrix Updates

**Trigger Events:**

- New evidence becomes available
- Existing evidence invalidated
- Customer outcome data updated

**Update Process:**

1. Identify trigger
2. Update Evidence Matrix in Module 05
3. Review affected content
4. Revise or retire as needed

---

### Content Retirement

**Retire Content When:**

- Claims no longer supported
- Information outdated
- Brand has evolved (Module 05 updated)
- Better proof now exists

**Retirement Process:**

1. Remove from active distribution
2. Archive with retirement reason
3. Redirect traffic to updated content
```
### Vital Check Gate

- [ ] Pre-publication review defined by tier
- [ ] Quarterly audit process established
- [ ] Evidence Matrix update triggers defined
- [ ] All processes reference Module 05

**If met:** Proceed to Phase 8

---

# PHASE 8: Handoff Pack

---

## 08_13 Content Handoff Pack

### Identity & Purpose

You consolidate Proof Strategy outputs into a format downstream modules can use.

### System Prompt — Two-Step Translation Process (per FW_16)

The Handoff Pack must preserve the links to Module 05 / 06 / 07 sources so Module 09 can apply the same translation discipline. **Step 1 produces nothing but verbatim quotations from the locked 08_01–08_12 outputs.** Step 2 consolidates them into the Handoff Pack with trace lines preserved. Do not remove those links when summarising.

**Step 1 — Quote Locked Outputs Verbatim.** For each section of the Handoff Pack, copy the relevant locked output from 08_01–08_12 verbatim, including the Upstream Anchors block where it exists. Do not re-derive — re-use.

**Step 2 — Consolidate with Traceability Preserved.** Every Pillar row, every Claims Boundaries row, every Proof Library Status entry must carry a trace line naming the Module 05 / 06 / 07 source it originally derived from, so Module 09 can read upstream without re-opening Module 08.

**Test (per FW_16):** if Module 09 reading only this Handoff Pack cannot tell which Module 05 / 06 / 07 quotes the Module 08 outputs derived from, traceability has been lost in summarisation. Re-add the trace lines.

### Output Format

```text
## Proof Strategy Handoff Pack

---

### Single Source of Truth Reference

All content strategy anchored to: **Module 05 (Brand Identity)**

---

### Proof Mission

[One-sentence statement of what content proves about the brand]

---

### Content Pillars (with traceability preserved)

| Pillar     | Type   | Proves About Brand | Source — Verbatim Proof Commitment (Module 03) | Substantiates (Module 01/05 Can Claim row) | Priority Gaps    |
| ---------- | ------ | ------------------ | ---------------------------------------------- | ------------------------------------------ | ---------------- |
| [Pillar 1] | [Type] | [Proof focus]      | "[verbatim]"                                   | "[verbatim Can Claim]"                     | [Gaps remaining] |
| [Pillar 2] | [Type] | [Proof focus]      | "[verbatim]"                                   | "[verbatim Can Claim]"                     | [Gaps remaining] |
| [Pillar 3] | [Type] | [Proof focus]      | "[verbatim]"                                   | "[verbatim Can Claim]"                     | [Gaps remaining] |

---

### Proof Library Status

| Tier   | Pieces  | Coverage | Foundation Gaps |
| ------ | ------- | -------- | --------------- |
| Tier 1 | [Count] | [%]      | [List]          |
| Tier 2 | [Count] | [%]      | [List]          |
| Tier 3 | [Count] | [%]      | N/A             |

---

### Sales Integration

**Objection Coverage:**

- Belief Objections: [Status]
- Evidence Objections: [Status]
- Commitment Objections: [Status]
- Fit Objections: [Status]

**Top Proof Assets for Sales:**

1. [Asset] [What it addresses]
2. [Asset] [What it addresses]
3. [Asset] [What it addresses]

---

### Distribution Summary

**Primary Channels:**

1. [Channel] [Purpose]
2. [Channel] [Purpose]
3. [Channel] [Purpose]

**Proof Production Priorities:**

1. [Asset + proof gap + readiness]
2. [Asset + proof gap + readiness]
3. [Asset + proof gap + readiness]

---

### Claims Boundaries Summary (verbatim from Module 05 — re-stated, not re-derived)

**Can Claim (verbatim rows + verbatim evidence source):** [list]
**Must Qualify (verbatim rows + verbatim qualification language):** [list]
**Cannot Claim (verbatim rows + verbatim reason):** [list]

Module 09 must read these as binding. No row may be paraphrased or softened in transit.

---

### Key Metrics

**Proof Metrics:**

- Proof Coverage: [Current] ' [Target]
- Sales Utilisation: [Current] ' [Target]
- Claims Compliance: [Current] ' [Target]
- Brand Consistency: [Current] ' [Target]

---

### Downstream Dependencies

**For Module 09 (Digital Architecture):**

- Content pillars inform site structure
- Proof hierarchy informs page types
- SEO priorities inform URL structure

**For Module 04 (Viability Check):**

- Content performance validates audience interest
- Sales utilisation validates proof value
- Resource constraints inform economic model

---

### Anchors Locked

The following are locked after this module:

- Content pillars (do not change without full re-run)
- Proof hierarchy definitions
- Claims Boundaries for content (sourced from Module 05)
- Primary distribution channels

---

**Last Updated:** [Date]
**Owner:** [Name]
**Single Source of Truth:** Module 05 (Brand Identity)
```
### Vital Check Gate

- [ ] Single Source of Truth (Module 05) referenced
- [ ] Proof mission stated and traces verbatim to Module 05 Brand Strategy
- [ ] **Every Pillar row carries a trace line to its verbatim Module 03 Proof Commitment and verbatim Module 01/05 Can Claim row**
- [ ] Sales integration status includes verbatim Module 07 objection coverage
- [ ] **Claims Boundaries summary uses the verbatim Module 05 rows (no paraphrase)**
- [ ] Key metrics included with their verbatim comparison strings (TO language for Language Echo; Brand Strategy for Brand Consistency)
- [ ] Downstream dependencies noted
- [ ] Locked anchors identified
- [ ] FW_16 test passes: Module 09 reading only this Handoff Pack can identify the Module 05/06/07 sources behind every Module 08 output

**If met:** Module 08 complete

---

# EXECUTION QUICK REFERENCE

---

## Phase Execution Guide

| Phase     | Deliverables    | Run Together? | Estimated Time  |
| --------- | --------------- | ------------- | --------------- |
| Phase 1   | 08_01, 08_02    | Yes           | 2-3 hours       |
| Phase 2   | 08_03, 08_04    | Yes           | 2-3 hours       |
| Phase 3   | 08_05, 08_06    | Yes           | 2 hours         |
| Phase 4   | 08_07, 08_08    | Yes           | 1.5-2 hours     |
| Phase 5   | 08_09           | Standalone    | 1-1.5 hours     |
| Phase 6   | 08_10, 08_11    | Yes           | 1 hour          |
| Phase 7   | 08_12           | Standalone    | 45 min          |
| Phase 8   | 08_13           | Standalone    | 30 min          |
| **Total** | 13 deliverables |               | **10–14 hours** |

---

## Critical Governance Reminder

**Module 05 (Brand Identity) is the single source of truth.**

- Do NOT reference Module 01 (Core Belief) directly
- Do NOT re-interpret the belief — use the brand as translated
- All claims check against Module 05 Evidence Matrix
- All voice checks against Module 05 Brand Voice
- The brand IS the belief, translated

---

## Module Complete Checklist

- [ ] All 13 deliverables completed
- [ ] All anchors imported from Module 05 (not Module 01)
- [ ] Vital Checks passed for each phase
- [ ] Brand consistency verified throughout
- [ ] Handoff Pack compiled
- [ ] Downstream dependencies noted

---

## Next Step: Module 08B

After completing this module, you have the strategy. Now generate content:

**Use Module 08B (Content Generator) to produce:**

- Blog posts
- Long-form articles
- Case studies
- Thought leadership
- How-to guides
- Newsletter content
- Social posts

**When using 08B, specify:**

- Which pillar the content serves
- Which tier (1, 2, or 3)
- Content type and target length
- Any specific objection being addressed

See **08B-Content-Generator.md** for the generation prompt.

**Translation Discipline binds 08B as well.** Any content piece 08B produces must trace to: (a) a Pillar from 08_02 (with its verbatim Module 03 Proof Commitment trace preserved), (b) one or more verbatim Can Claim or Must Qualify rows from 08_06 (with verbatim upstream qualification language where Must Qualify applies), and (c) where the piece exists to address a Module 07 objection, the verbatim objection from 08_05. 08B briefs that cannot supply these traces fail the same FW_16 test — the generator does not invent its way past missing upstream anchors.

**Pending Story Proof — content-piece-IS-the-Story-Proof pattern:** if 08B is asked to produce a piece against a Pending Story Proof (per 08_04 Story-Proof-Pending Gaps), the piece itself, when published, becomes the Story Proof for that Proof Commitment. Mark such pieces "in development — becomes Story Proof on publication" and do not generate invented case-study language to fill the proof gap pre-publication.

---

## Version Notes

**Version 3.5** — 17 August 2026

- Required the shared Practitioner Brief V3 spine and Proof-and-Content-specific proof, claim, permission and release middle.

**Version 3.4** — 27 July 2026

- Preserved exact evidence class, source and testimony strength in bounded runtime work.
- Made proof-gap refusal and the smallest future evidence-production action explicit.

**Version 3.0** — 16 July 2026

- Replaced static platform stereotypes with a dated voice-fit record for the authorised Module 06 Channel Portfolio.
- Prevented Module 08 from adding or reviving channels during content distribution planning.

**Version 2.8** — 15 July 2026

- Added the confirmed Module 05 Canonical Client Explanation as a communication constraint without permitting claims-strength drift.

**Version 2.3** — June 2026

- **Audit sync.** Updated Gate 0 and source-anchor wording to the current Module 05 Belief Layer / Anchor Elements / Expression Elements / `05_14` synthesis model.
- **Source routing corrected.** Replaced stale Brand Story and combined copywriting-source language with Belief Shift Journey (`05_03`), Voice (`05_07`), and Copywriting rules (`05_12`).

**Version 2.2** — May 2026

- Body-rewrite of deliverables 08_01, 08_02, 08_04, 08_05, 08_06, 08_09, 08_13 to operationalise the Translation Discipline introduced at the Prompt level
- Each rewritten deliverable now opens with a **System Prompt — Two-Step Translation Process (per FW_16)** block (Step 1 verbatim quotes; Step 2 derived output)
- Output Formats restructured to require an explicit **Upstream Anchors (verbatim — Step 1)** block, a **derived (Step 2)** block, and **Traceability** lines
- Vital Check Gates rewritten to include verbatim-source and traceability checks
- 08_02 adds a **Pillar-level Claims Boundary cross-check** (each Pillar must map to ≥1 verbatim Can Claim row)
- 08_04 adds **Story-Proof-Pending Gaps** treatment per Module 03 Step 5 — pieces marked "in development" rather than invented; codifies the **content-piece-IS-the-Story-Proof** pattern surfaced in Module 08 gap inventory
- 08_06 binds qualification language to the *verbatim* Module 05 Must Qualify rows — softener language is no longer invented in 08
- 08_09 binds Belief Transfer Indicators to the verbatim TO language (Language Echo) and verbatim FROM → TO pattern (Perspective Shift); binds Objection Resolution Rate to the verbatim Module 07 list
- 08_13 Handoff Pack restructured to preserve trace lines back to Module 05/06/07 sources so Module 09 inherits Translation Discipline cleanly
- Added Translation Discipline binding for 08B Content Generator + Pending Story Proof handling

**Version 2.0** -- February 2026

- Applied Langfell™ Voice Guide standards
- Fixed character encoding throughout (box drawing, multiplication signs, arrows)
- Corrected all module cross-references to current numbering
- Module 10 (old Proof Strategy) -> Module 08 (distinguished from Module 08 self-refs)
- Module 07 (Brand Identity) -> Module 05
- Module 02 (raw conviction) -> Module 01
- Module 09 (old Invitation Strategy) -> Module 07
- Module 08 (old Belief Shift Strategy) -> Module 06
- Module 04 (old Digital Architecture) -> Module 09
- Module 06 (old Viability Check) -> Module 04
- Updated "Anchors Forward" -> "Handoff Pack" in deliverables
- Updated Vital 3 terminology throughout
- Added "If stuck" guidance where applicable

**Version 1.0** -- January 2026

- Initial release

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
