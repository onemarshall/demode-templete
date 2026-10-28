---
id: 07-Prompt
title: Module 07 Main Prompt
description: Apply framework/FW_38-Executive-Summary-Completion-Contract.
type: module-doc
version: 3.8
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- framework/FW_23-Client-Output-Contract
- framework/FW_24-Commercial-Direction-Contract
- framework/FW_25-Consultancy-Judgement-Contract
- framework/FW_26-Strategy-Multi-View-Contract
- 07-Strategy-Schema
- 07-Quality-Gates
- 06-Handoff-Pack
- 06-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- FW_02-Philosophy
- FW_15-Upstream-Inputs-Hard-Gate
- FW_16-Discovery-vs-Translation-Modules
- FW_17-Cross-Module-Quality-Gates
feeds-into:
- 07_08-Sales-Handoff-Pack
- 07-README
- 07-Quality-Gates
- 07B-Sales-Content-Generator
- 08-README
- templates/Commercial-Direction-Generator-Prompt.md
---


# Prompt: Invitation Strategy

## Strategy-to-action starter plans

Apply `framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md`. After this relevant strategy is explicitly accepted, derive its recommended Starter Plan with `templates/strategy-to-action/Starter-Plan-Generator-Prompt.md`, retaining the current Foundation, route, exact strategy/consequence/evidence sources and Practitioner Brief. A candidate strategy is insufficient. Present the plan as recommended implementation that still requires human adoption. Include the exact opening and eleven sections, keep recommendation class separate from lifecycle state, and preserve specialist freedom. Emit the existing named plan in `07-specialist-briefs`, keep structured provenance/events private, and pass it into the existing Commercial Direction/M11 handoff. A material strategy change invalidates the affected plan. Preserve every existing full-run output, review and continuation requirement.

> **Client paths:** Before reading inputs or writing outputs, resolve the selected client using `../templates/00-Entry-Brief-Folder-Convention.md`. Its Input, Output, collection, asset and private run destinations override legacy flat output examples. Keep existing authority and approval gates unchanged.


## Required-action completion gate

Apply `framework/FW_38-Executive-Summary-Completion-Contract.md` before candidate status. Keep every required decision function in the Executive Summary, even when condensing the text.

Apply `framework/FW_39-Instruction-Fidelity-and-Whole-Document-Completion-Contract.md` before candidate status. Map every applicable instruction to exact client or internal evidence and verify the complete rendered document.

Apply `framework/FW_37-Required-Action-Completion-Contract.md`. Do not label a Sales Strategy or derived output a candidate until its Required Action Register evidences every required upstream, decision, evidence, recognition-continuity, synthesis and review action.

## Client-language translation gate

Before rendering any client-facing Sales Strategy, apply the `FW_27` Client-language translation gate. Preserve the qualification logic, proof boundary and return conditions, but express them as the live decision, evidence needed, proportionate next step and reason to stop or refer. Keep internal labels and derivation mechanics out of the client body.

## FW_32 accountability requirements — required

Apply `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`.

For each material accepted Sales decision, record its exact decision ID, intended observable effect, Implementation Consequences, non-monetary Cost Drivers and one compact Decision Measurement Contract. Cover qualification events, conversation fidelity, proposal eligibility, objection and decline categories, price and scope response, fit-to-delivery evidence, and CRM, data, privacy and enablement requirements where material.

Each contract must state implementation proof, smallest useful baseline requirement, candidate qualitative and quantitative evidence, attribution ceiling, evidence owner, review condition, strong/partial/weak evidence decisions, stop condition and narrowest strategic return point. Do not set outreach quantities or monetary rates. Keep strategic, production, publication, budget and spend approval separate.

## Editorial Readability Contract — Required

Apply `framework/FW_27-Editorial-Readability-and-Purposeful-Framework-Contract.md`. Lead with the client's actual purchase decision. Explain the customer problem before using a diagnostic label. Where a conversation is appropriate, present its movements as decisions to resolve; transactional and self-service routes do not require a diagnostic conversation or proposal.

Keep questions, objections and stop language beside the principle they make usable. Retain framework references only where they protect qualification, evidence limits or a return path.

State the paid value from the approved offer and buyer evidence. Preserve the applicable qualification criteria and derive any memory aid from this client's accepted sales architecture. Name the permitted purchase, proposal, referral, later-return or refusal outcomes where relevant. Do not import Langfell's proposal threshold or founder-authority requirement into another business. Low sales volume does not justify weakening applicable qualification.

## Runtime Translation Boundaries — Required

Quote the exact accepted upstream anchors used before translating them. If a load-bearing upstream version is stale, mismatched or awaiting a regeneration decision, stop the affected sales output and name the smallest regeneration or reauthorisation decision needed; do not translate from the superseded version.

For a bounded request, produce only the requested sales artefact plus the minimum anchor trace and qualification boundary needed to govern it. Do not invent proof, urgency, scarcity, readiness or capacity. Pressure never overrides claims boundaries, qualification or disqualification. If a requested tactic conflicts with one of those controls, reject only that tactic and offer a permitted invitation alternative in the accepted voice.

## Anticipated buyer uncertainty and proof-question handoff — required

M07 may anticipate material buyer questions, concerns and objections before sufficient sales evidence exists. Base anticipated concerns on a reasoned assessment of the buyer, purchase, position, alternatives, proof state, claims boundary, commercial risk and sales architecture. Do not present them as observed buyer language or claim how often they occur.

Classify each record as **anticipated**, **observed** (preserve exact language and context) or **established pattern** (record the relevant recurring evidence). Generate only uncertainties that materially affect understanding or progression; do not force a Top 10 or make objections a mandatory stage.

For every material record capture: buyer uncertainty; evidence state; strategic reason; buyer stage; response direction; proof question; available proof; proof gap; claims boundary; priority; decision state (`answer`, `prove`, `qualify`, `investigate`, `refer`, `defer`, `disqualify`); M08 relevance; and review/replacement condition. A response direction is not a script and may lead to referral, deferment, investigation or disqualification.

Pass the proof-question handoff to M08. M08 may start from anticipated uncertainties when their inference, proof gap, boundary and review condition are visible; it must not turn them into invented quotations or evidence of prevalence. Learn through: anticipate → use → observe → compare → update.

### Buying-complexity context and bounded adaptive interrogation

Record only applicable buying-complexity triggers: multiple stakeholders, formal procurement, regulatory review, long sales cycle or material buyer commitment. Company size alone is not a trigger.

| Rule | Invariant | Trigger | Permitted transformation | Boundary | Evidence requirement | Output destination |
|---|---|---|---|---|---|---|
| `M07-AQ-01` | Who must recognise fit and who may make the buying decision? | Multiple stakeholders or formal procurement | Deepen the existing qualification path into a named stakeholder/decision-right map | Do not create account strategy, CRM architecture or a new audience | Current buying evidence, approved audience and human confirmation | Qualification Framework and Conversation Architecture |
| `M07-AQ-02` | What proof is needed before invitation can become commitment? | Regulation, procurement or material commitment | Increase proof specificity and approval sequence inside the existing Eight Statements/Five Movements | Do not upgrade evidence or invent compliance claims | M08-compatible evidence records, claims boundaries and buyer requirements | Proof requirements, Claims Boundaries and Proposal Threshold |
| `M07-AQ-03` | What must the conversation resolve before the next movement? | Long cycle or multiple decision events | Render the same Five Movements across explicit decision events and owners | Do not invent a separate enterprise-sales methodology | Observed sales-cycle evidence and approved route | Conversation Architecture and follow-up boundaries |
| `M07-AQ-04` | Who may make a live commercial commitment? | Seller is not the authorised commercial owner or approval is distributed | Name the live-deal authority and escalation point | AI may not accept terms, disqualify on behalf of the owner or approve a proposal | Current commercial authority record | Handoff authority and proposal threshold |

Keep the questions temporary. Carry the accepted buying map, proof burden, conversation decisions and authority into the Handoff Pack. Omit the questions used to derive them. If no rule fits, record the unresolved buying context and return it for human/framework review.

## Strategy Multi-View Output — Required

Apply `framework/FW_36-Client-Package-Reference-Structure-Contract.md`. The final 01 Langfell package is the exact client-output form reference for Sales Strategy and every derived view.

Generate `07-sales-strategy.md` with the visible title **Sales Strategy**. Begin with the shared Document details block and Decision brief, then a short discipline-specific reader lead required by `FW_23`, then the `## Executive Summary` required by `FW_23` and `FW_26`, then place the standard `About this document` orientation before deeper derivation. Make clear that acceptance generates an Executive View, Strategy Summary, Presentation View and Practitioner Brief from this authority; do not embed them or imply separate strategies. Use the standard pre-decision interface wording. Only after acceptance, lock and approval-event recording, assemble transient view-source state and render all four authorised derivatives, including `07-sales-strategy-practitioner-brief.md` when sales enablement follows, with their standard orientations and identical source/version/lock/approval metadata. Use the standard post-acceptance and derived-document wording and do not request a second strategy approval unless a view exposes a genuine contradiction, omission or unresolved decision. A Strategy change makes affected derivatives stale and requires regeneration. The Practitioner Brief must state objective, qualification logic, conversation sequence, sample questions, proposal threshold, objection approach, follow-up boundaries, assets, role-play and evidence capture. It must feel usable in a real conversation. Never render one derived view from another or create new pricing, claims, targets or cadence.

Render the Sales Practitioner Brief through `templates/Strategy-Practitioner-Brief-Renderer-Prompt.md` in the shared V3 format: `view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`, the exact common spine and a Sales-specific middle covering the conversation and qualification system, questions, proposal threshold, objections, follow-up, role-play and evidence capture. Do not substitute a script library or PRD.

Read the exact approved Engagement Brief, client `business-foundation.md` named in the Module 05 Handoff Pack and canonical Module 05 strategy. The Engagement Brief supplies confirmed factual engagement context; the Business Foundation governs what the business is; its Business Manifesto governs the worldview; Module 05 governs Brand Strategy. Sales makes that worldview relevant to a live buying decision and qualifies fit without merely reciting the manifesto. It may not reinterpret the commissioning situation, requested scope or client identity, contradict the declaration, convert conviction into pressure or create a second manifesto. A missing, stale or mismatched authority blocks Module 07 and returns to the owning upstream source; do not repair it here.

## Routing Level Awareness

This prompt supports four routing levels determined by the Entry Brief (`INPUT_ROOT/00-Entry-Brief.md`):

**Routing Levels:**
- **Skip** - Material is already complete or module doesn't apply. Do not generate.
- **Light Pass** - Back-fill/structure existing material. No live elicitation needed.
- **Constrained Run** - Full module, but downstream sub-outputs that touch pre-locked inputs defer to the locks rather than re-generate.
- **Full Run** - Module runs at full rigour as the framework specifies.

**Execution vs Delivery Mode:**
- **Execution mode** (internal): Include Upstream Anchors (verbatim quotes from Module 06), Traceability lines showing derivation, and strict translation discipline. This ensures quality control and proves derivation.
- **Delivery mode** (client-facing): Remove internal Upstream Anchors blocks, Traceability lines, derivation evidence and lifecycle controls. Preserve every substantive decision, statement, explanation, script, example, table and application rule. Delivery cleaning is not summarisation.

**Routing Level Implementation:**
- **Skip:** Do not generate any output.
- **Light Pass:** Generate simplified output focusing on structure only. Skip detailed derivations and optional sub-sections.
- **Constrained Run:** Generate full output but respect pre-locked inputs without re-derivation. Mark constrained sections in output.
- **Full Run:** Complete every required section at full semantic depth in execution mode, then remove only the internal scaffolding for delivery. Do not collapse the result into an executive summary.

## Client Output Contract — Required

Apply `framework/FW_23-Client-Output-Contract.md` and the canonical opening in `FW_26`. Before `07_00`, use a domain-specific decision-led opening: who qualifies, what the conversation decides, what earns a proposal, when sales stops or refers, the evidence and pressure boundaries, fixed/flexible/unresolved decisions and what approval authorises. Explain specialist and Langfell terms before naming them.

Module 07 may define follow-up logic and sales-stage measures. It must not set prospecting volumes, a CRM task calendar or an independent eight-week implementation schedule. Keep internal handoff, source, lifecycle, invalidation and lock material transient; persist only compact control state in `RUN-MANIFEST.md` and never append `07_08 Sales Handoff Pack` or `## Handoff and Governance` to the client document.

Use the five explicit client-file metadata fields in `FW_23` and no legacy status names. A complete sales document may remain recommended; source control or production completion must not render it accepted.

**Full Run completeness:** the client document must retain all eight written sales statements; readiness qualification and disqualification logic; the complete Five Movements conversation path; deployable invitation and follow-up boundaries; anticipated, observed or established buyer uncertainty with its evidence state; proof-question handoff; claims boundaries; transfer measures; and activation requirements. A founder must be able to respond responsibly without treating anticipated concerns as verified buyer language.

## Consultancy Judgement Sequence — Required

Run the six internal stages in order: **evidence assembly → diagnostic analysis → comparative judgement → recommendation selection → recommendation writing → handoff generation**. The client document must perform all seven consultancy functions defined by `FW_25`; keep structured decision working transient and record only the final decision state and return trigger in `RUN-MANIFEST.md`.

The sales recommendation must identify the priority buyer situation, current sales motion, conditions required before an offer, opportunities to decline, proof needed at each stage, the founder-led boundary and the condition that would justify a different sales model. Do not turn every plausible buyer or sales motion into a priority.

## Commercial Direction Contribution — Required

Populate the internal contribution in `07_08-Sales-Handoff-Pack.md` with qualification and disqualification, available sales motions, invitation and trust requirements, evidence state, constraints and invalidation triggers. Do not select the horizon route or set prospecting quantities. Commercial Direction selects the current motion; M11 later operationalises it.

**Module 07 Langfell™**
_Execution Instructions for Belief-Transfer Sales_

---

## Module Overview

Invitation Strategy translates brand strategy into **8 specific, written sales positioning statements** and a complete sales method. Work through the four phases in this document to produce language ready to use in sales conversations.

**Module Type:** Type B (Identity & Expression)
**Core Question:** "Does our sales conversation read off our brand, or off our sales-floor patterns?"
**Key Output:** 8 written sales positioning statements + conversation architecture
**Anchor Source:** Module 05 (Brand Identity)

**Capability profile:** This module runs under one of two capability profiles set by `RouteAuthorization` from Module 04:

- **`full`** (14–24+ hrs): complete Modules 04–06 first, run the full quality-gate sequence, produce fully evidenced statements. All 8 statements lock.
- **`reduced`** (4–6 hrs): use Module 05-lite scaffolding, skip Gates 1.5/5.5, accept qualified evidence for Statements 4 and 7. Statements 4 and 7 are marked `reduced-evidence` and cannot be published as full-strength claims. The module output is `conditional` and must be re-run under `full` when resources permit.

The `capability_profile` is set by `RouteAuthorization` and recorded in the M07 Handoff Pack. No timed 30-day lock applies; upstream change invalidates the handoff immediately.

---

## Step 0: Upstream Inputs Hard Gate

Run the Upstream Inputs Hard Gate per `framework/FW_15-Upstream-Inputs-Hard-Gate.md`.

**For Module 07, the gate checks:**

- **Module 05 (Brand Identity):** **Locked Module 05 Handoff Pack** required: Belief Layer, Claims Boundaries, Anchor Elements, Expression Elements, and Brand Strategy synthesis (`05_14`). Specifically: Brand Strategy (`05_14`), Belief Shift Journey (`05_03`), Audience + Anti-Audience (`05_04`), Filter (`05_09`), Claims Boundaries / Evidence Matrix, Voice (`05_07`), and Copywriting rules (`05_12`) — all quoted verbatim where used. Pre-lock concession (Module 05 in-progress) permits a non-binding draft run only; the Sales Strategy cannot lock, and 07B Generator content cannot be published.
- **Module 06 (Belief Shift Strategy / Marketing):** Gate 6 passed; the 10 Marketing Statements stable; Belief-Ready Segment, Marketing Statements 1 and 3 (FROM/TO), and Belief Stage Mapping required verbatim. Sales Statements 2 and 3 (Transfer Moment Before / After) must match Module 06 Statements 1 and 3 to prevent drift.
- **Module 04 (Viability Check) — RouteAuthorization:** Read `RouteAuthorization` from `04-Handoff-Pack.md`. The `status` must be `Approved` for full lock. For Module 07 specifically, `capability_profile: reduced` permits only Sales Statements 1–4 (Sales Context, Transfer Moments, Belief Shift Proof) and skips Statements 5–8 (Disqualification, Urgency, Value, Invitation) and the 07B Generator. `Adjust the Path` runs Module 07 with adjusted scope; `Wait` and `Walk Away` halt Module 07. If the `status` is `Draft`, `Compare Alternatives`, or `Return Upstream`, the Sales Strategy cannot lock and 07B Generator content cannot be published. Record the route, status, capability_profile, and permitted scope in the M07 Handoff Pack.
- **Module 03 (Business Commitments):** Outcome A required. **If Outcome X (Strategy Cannot Be Locked) or the Contrarian Trap halt at Step 1, halt** — Module 07 cannot brand-translate-to-sales a strategy Module 03 itself refused to lock.
- **Module 02 (Market Reality Check):** Outcome A required. No R-pattern Acknowledgments are routed directly to Module 07 (per FW_17 per-module table CMQG_03 = —); any Acknowledgments inherited via Module 03 / 05 / 06's Handoff Pack are passed through to the Risk Flags section unchanged.
- **Module 01 (Founder Convictions):** the five conviction elements + Claims Boundaries inherited via Module 05's Pass-Through; required for the Claims-Boundary cross-check in Statements 4, 5, and 7, and for Statement 5's walk-away conviction grounding.
- **"Proceed-Informed contested" flag** (if Module 05's Brand Identity carries it from the Module 04 Bias Countermeasure) — Module 07 proceeds per the path-specific rule above but surfaces the flag in its Risk section and marks the resulting Sales Strategy "Proceed-Informed contested" in the Handoff Pack to Module 08.

**If the gate halts, do not proceed to Phase 1 or any subsequent Phase.**

This is a **translation module** per `framework/FW_16-Discovery-vs-Translation-Modules.md` — Module 05's locked Handoff Pack + Module 06's 10 Marketing Statements are the source material; Module 07 translates them into sales form. No invention; no re-discovery; no re-derivation. All 8 Sales Statements, the Five Movements, and the Objection Responses must anchor on verbatim upstream outputs.

---

## Critique Loop

Module 07 produces customer-facing sales positioning statements. After generating each statement, run the **Statement Self-Critique** or route to a human reviewer. No `critique-agent.md` exists; do not invoke a non-existent agent.

**Critique lenses for M07:**
- **Accessibility lens:** Will the target audience (founders of founder-led companies, growing organisations, or established enterprises seeking a coherent, evidence-derived strategy) understand this immediately? Is jargon contextualised?
- **Coherence lens:** Does this align with Module 05 brand strategy and Module 06 marketing statements?

**Flow:**
1. Generate Statement 1 → Self-critique using the two lenses
2. If it passes → Move to Statement 2
3. If it fails → Revise → Re-critique (up to 3 rounds)
4. Repeat for all 8 statements
5. If deadlock after 3 rounds → Human review event; record reviewer, decision, and rationale

**Record critique state in the Handoff Pack:** `draft` → `self-critique-passed` → `human-review-passed` (if required) → `confirmed`.

---

This module includes a tactical communication layer used across all channels:

**The Invitation Sequence: Claim → Feel → Proof → Invite**

---

## Tactical Layer: The Invitation Sequence

Use this structure for every individual sales communication (email, DM, call opener, follow-up, proposal intro):

1. **Claim** -- state what you see, clearly and directly.
2. **Feel** -- make the issue recognisable through one concrete image/moment.
3. **Proof** -- provide one specific observation or evidence point.
4. **Invite** -- open a proportional next step.

### Sequence behavior by conversation phase

- **Diagnose:** Claim names the gap, Feel creates recognition, Proof validates, Invite checks alignment.
- **Transfer:** Claim reframes possibility, Feel makes the shift tangible, Proof demonstrates, Invite opens exploration.
- **Invite:** Claim summarizes finding, Feel recalls recognition, Proof anchors confidence, Invite proposes the next step.

### Channel compression guardrails

- **Cold email:** 4 short paragraphs (Claim / Feel / Proof / Invite)
- **LinkedIn DM:** 2-3 sentences (Claim+Feel compressed, concise Proof, question Invite)
- **Discovery opener:** 45-60 seconds spoken, then stop and listen
- **Follow-up email:** 3-4 sentences tied to the live conversation
- **Networking answer:** 15-30 seconds with one image and one example

---

## The Statement-Based Architecture

### What's Different

| Traditional Output                                                  | Statement-Based Output                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| "In sales, we represent a brand that believes [limiting belief]..." | A complete, specific sentence written for THIS business |
| "[Question 1]"                                                      | Actual question ready to ask                            |
| "Return to Movement 2"                                              | Full paragraph response ready to use                    |

### Why Statements Matter

1. **Statements reveal clarity gaps.** If you can't write it, the strategy isn't clear yet.
2. **Statements enable variation.** Once written, you can generate 50 emails from the same statement.
3. **Statements create coherence.** Every touchpoint derives from the same source.
4. **Statements are testable.** Does this language resonate?

---

## The Anchor Principle

> **Module 05 (Brand Identity) is the single source of truth.**

Invitation Strategy does NOT re-interpret raw conviction from Module 01. It imports the belief **as already translated into brand strategy, voice, and positioning** by Module 05.

**Two Inputs for Content Generation:**

1. Module 07 Sales Statements (what we say)
2. Module 05 Voice + Copywriting rules (how we write)

---

## Prerequisites

### Required Inputs (From Module 05)

| From Module 05                         | What You Need                                      | Used In                    |
| -------------------------------------- | -------------------------------------------------- | -------------------------- |
| **Brand Strategy (`05_14`)**           | The belief as market-positioned strategy           | All prompts                |
| **Belief Shift Journey (`05_03`)**     | The FROM → TO movement carried in the Belief Layer | 07_01 (Statements 2-4)     |
| **Voice + Copywriting (`05_07`, `05_12`)** | How the brand sounds and writes                | All prompts                |
| **Audience + Filter (`05_04`, `05_09`)** | Who we're for / not for, and how the line is held | 07_01 (Statement 5), 07_02 |
| **Claims Boundaries / Evidence Matrix** | What can/must qualify/cannot claim, and why       | 07_05, Statement 4         |

### Do NOT Import

- Raw Core Belief from Module 01
- Unfiltered conviction statements from Module 03

### Pre-Qualification Check

Answer honestly before proceeding:

- [ ] Is Module 05 (Brand Identity) complete?
- [ ] Is the Brand Strategy clear enough to state in one sentence?
- [ ] Is the Belief Shift Journey (FROM → TO) documented in the Belief Layer?
- [ ] Are Voice (`05_07`) and Copywriting rules (`05_12`) documented?
- [ ] Would you disqualify a prospect who actively defends the limiting belief?

**If any answer is "no":** Complete Module 05 first.

---

## Translation Discipline for All Module 07 Deliverables (per FW_16)

Module 07 is a **translation module** per `framework/FW_16-Discovery-vs-Translation-Modules.md` — every Sales Statement, Five-Movements Movement, and Objection Response is a translation of locked Module 05 + Module 06 (and earlier) anchors into sales form. **No Sales Statement, Movement, or Objection Response may be written as an invention.** Each deliverable's prompt must start by quoting its specific upstream anchor(s) verbatim from the Module 05 and Module 06 Handoff Packs (or earlier modules carried via those Packs), then produce the sales artefact *derived from* the quoted source material.

**Per-deliverable source-anchor mapping (quote verbatim before producing each deliverable):**

| Deliverable | Upstream source to quote verbatim *before* producing output |
| -- | -- |
| **Statement 1 — Sales Context** | Module 05 **Brand Strategy** (verbatim) + Module 05 **Filter / For–Not For** (verbatim) + Module 06 **Statement 8 Positioning** (verbatim). Names who we're for and what belief we transfer — using the upstream Filter and Brand Strategy as material, not a fresh formulation. |
| **Statement 2 — Transfer Moment Before** | Module 05 **Belief Shift Journey — FROM** (verbatim) + Module 06 **Statement 1 Problem Awareness** (verbatim). The prospect's current belief, in the prospect's own language. No drift from Module 06 Statement 1's FROM language. |
| **Statement 3 — Transfer Moment After** | Module 05 **Belief Shift Journey — TO** (verbatim) + Module 06 **Statement 3 New Truth** (verbatim) + Module 01 **Hidden Truth** (verbatim). The empowering belief after the transfer. No drift from Module 06 Statement 3's TO language. |
| **Statement 4 — Belief Shift Proof** | Module 03 **Proof Commitments** (verbatim, with operationalised rules from Step 4) + Module 06 **Statement 4 Proof** (verbatim) + Module 01 **Claims Boundaries** (verbatim). Demonstrates the shift is real. If proof is pre-launch / Story Proof flavour, mark "proof-in-development" rather than overclaim. |
| **Statement 5 — Disqualification** | Module 05 **Filter / Not For** (verbatim) + Module 01 **Non-Negotiable** (verbatim). Who we walk away from and why. The walk-away conviction is load-bearing — Statement 5 must hold even against a Belief-Locked prospect the builder wants to close. |
| **Statement 6 — Urgency Frame** | Module 05 **Belief Shift Journey** (verbatim) + Module 04 **Reflection Summary** including **chosen Response Path** (verbatim). Belief-based, not artificial pressure. Urgency translates from the cost of delay stated in upstream conviction, not from sales-floor pressure tactics. |
| **Statement 7 — Value Statement** | Module 05 **Brand Beliefs — Customer + Brand** (verbatim) + Module 06 **Statement 10 Value** (verbatim) + Module 04 **Reflection Summary** (verbatim, especially Response Path scope). What value means in belief terms — shaped by Response Path. |
| **Statement 8 — Invitation** | Module 05 **Personality + Voice** (verbatim) + Module 06 **Statement 6 Invitation** (verbatim). Offer, not close. The invitation is in the brand's voice, anchored on Module 06's invitation language. |
| **Belief Spectrum Readiness Qualification (07_02)** | Module 02 **Belief-Ready Segment evidence + Anti-Audience evidence** (verbatim — the prospect's own language from customer pain / interviews / lost-deal data) + Module 06 **Belief Stage Mapping** (verbatim — Belief-Ready / Belief-Curious / Not For Us breakdown) + Module 05 **Filter — Not For** (verbatim, for the Belief-Locked / Disqualification rows). The example language each prospect state uses must be the verbatim language Module 02's customer evidence captured, not a fresh paraphrase of what they might say. Disqualification Protocol inherits the walk-away conviction from Sales Statement 5. |
| **Five Movements (07_03) — Conversation Architecture** | Module 05 **Belief Shift Journey** (verbatim) + Module 06 **Belief Stage Mapping** (verbatim) + Module 05 **Voice + Copywriting rules** (verbatim). The Movements map structurally onto Module 06's Belief Stage Mapping; each Movement's questions, stories, and transitions are written in the brand's voice. |
| **Top 10 Objection Responses (07_04)** | Module 05 **Claims Boundaries** (verbatim) + Module 05 **Voice + Copywriting rules** (verbatim) + Module 06 **Marketing Statements 1–4** (verbatim, for the marketing-primed claims the prospect is reacting against). Each Response is a paragraph translation, not category language. |

**Rule:** before any Sales Statement, Movement, or Objection Response is written, the System Prompt must open with the verbatim upstream quotation(s) from the table above. The artefact then operates on the quoted source material.

**Test (per FW_16):** if a Sales Statement, Movement, or Objection Response could plausibly be written by someone who has not read the Module 05 and Module 06 Handoff Packs, the prompt slipped into discovery mode. Push the source quotation back in and rewrite.

**Claims Boundaries cross-check:** every Sales Statement (especially Statements 4 and 7) and every Objection Response must additionally verify against Module 01 / Module 05 Claims Boundaries (Can Claim / Must Qualify / Cannot Claim) before locking. Anything overclaiming fails the translation test even if it reads well.

---

## Phase Structure

| Phase                            | Prompts  | Focus                         | Key Output                                                 |
| -------------------------------- | -------- | ----------------------------- | ---------------------------------------------------------- |
| **Phase 1: Foundation**          | 07_01-02 | 8 Statements + Qualification  | Written statements, example language                       |
| **Phase 2: Conversation**        | 07_03-04 | Narrative + Objections        | Actual questions, written responses                        |
| **Phase 3: Proof & Measurement** | 07_05-06 | Claims + Metrics              | Boundaries, measurements                                   |
| **Phase 4: Integration**         | 07_07-09 | Implementation + Handoff Pack | Training plan, consolidated outputs + commercial one-pager |
| **Content Generation**           | 07B      | Sales Content Generator       | Any content type from statements                           |

---

## Phase 1: Foundation (07_01-02)

### 07_01 Sales Foundation: The 8 Statements

**Purpose:** Write all eight sales positioning statements for the business, with no placeholders.

### System Prompt — Two-Step Translation Process (per FW_16)

Use two steps for each of the eight statements. **Step 1 contains only verbatim upstream quotations.** Step 2 derives the Sales Statement from those quotations. Follow the Output Format below to show both. If a statement cannot be paired with the sources named in the Translation Discipline table, return to those sources and rewrite it.

**Step 1 — Quote Upstream Anchors Verbatim.** For each of the 8 Statements, locate the specific upstream artefact(s) named in the Translation Discipline table above (lines for "Statement 1 — Sales Context" through "Statement 8 — Invitation"). Copy those artefacts verbatim — not paraphrased, not summarised, not "captured in spirit." Paste them as the first content block under each Statement heading. If a required upstream artefact is missing, halt this deliverable and surface the missing input — do not proceed to Step 2 with a paraphrased substitute.

**Step 2 — Translate Each Quote into Sales Statement.** With the verbatim quotes in place, write the Sales Statement *derived from* the quoted source. The Statement is a sales-form translation of the upstream conviction, not a fresh formulation. Use Module 05 Voice and Copywriting rules. For Statements 2 and 3 specifically, the derived Statement must match Module 06's Statement 1 (FROM) and Statement 3 (TO) language to prevent drift across the marketing/sales boundary.

**Test (per FW_16):** if any of the 8 Statements could plausibly be written by someone who has not read the Module 05 and Module 06 Handoff Packs, that Statement's prompt slipped into discovery mode. Push the source quotation back into Step 1 and re-derive in Step 2.

**Output Format:**

```text
## 1. Sales Context Statement

### Upstream Anchors (verbatim — Step 1)

From Module 05 Brand Strategy: "[verbatim quote]"
From Module 05 Filter (For–Not For): "[verbatim quote]"
From Module 06 Statement 8 (Positioning): "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Written sentence explaining who we're for and what belief we transfer — using the quoted upstream as source material]

### Prospect Self-Qualification (conditional)

- Applicability: [applicable / not-applicable / evidence-pending]
- Prospect-facing fit test: [problem / readiness / Filter / commercial and belief conditions]
- Sources: [M05 Filter + M06 S8/S8.1 + real sales evidence]
- Boundary: [supports seller qualification; does not replace it or optimise for conversion at the expense of fit]

### Traceability

This Statement derives from: [Name the specific quote element(s) that produced each phrase of the Statement]

---

## 2. The Transfer Moment Before

### Upstream Anchors (verbatim — Step 1)

From Module 05 Belief Shift Journey — FROM: "[verbatim quote]"
From Module 06 Statement 1 (Problem Awareness): "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Specific statement of what prospect currently believes — in the prospect's own language, no drift from Module 06 Statement 1's FROM language]

### Named Diagnostic (conditional discovery mechanism)

- Applicability: [applicable / weakness-flagged / not-applicable with reason]
- Approved upstream mechanism: [M03 customer discovery mechanism / M05-M06 source]
- Form: [self-assessment / structured questions / maturity or decision framework / workshop exercise / facilitated assessment / other]
- Reveals: [current belief / practical consequence / state gap / structural issue]
- Statement 4 evidence link: [what output becomes usable proof]
- Naming boundary: [no diagnostic invented merely to satisfy the architecture]

### Traceability

[Trace this Statement to the quoted source above]

---

## 3. The Transfer Moment After

### Upstream Anchors (verbatim — Step 1)

From Module 05 Belief Shift Journey — TO: "[verbatim quote]"
From Module 06 Statement 3 (New Truth): "[verbatim quote]"
From Module 01 Hidden Truth: "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Specific statement of what prospect should believe after transfer — no drift from Module 06 Statement 3's TO language]

### Traceability

[Trace this Statement to the quoted source above]

---

## 4. The Belief Shift Journey Proof Statement

### Upstream Anchors (verbatim — Step 1)

From Module 03 Proof Commitments (with operationalised rules from Step 4): "[verbatim quote]"
From Module 06 Statement 4 (Proof): "[verbatim quote]"
From Module 01 Claims Boundaries: "[verbatim Can Claim / Must Qualify]"

### Sales Statement (derived from above — Step 2)

[Specific statement of what proves the shift is real. If Story Proof is pre-launch / strategy-not-yet-enacted per Module 03 Step 5 flavours, mark "proof-in-development" rather than overclaim.]

### Traceability

[Trace this Statement to the quoted source above]

---

## 5. The Disqualification Statement

### Upstream Anchors (verbatim — Step 1)

From Module 05 Filter — Not For: "[verbatim quote]"
From Module 01 Non-Negotiable: "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Specific statement of who we walk away from and why. The walk-away conviction is load-bearing — this Statement must hold even against a Belief-Locked prospect the builder wants to close.]

### Traceability

[Trace this Statement to the quoted source above]

---

## 6. The Urgency Frame

### Upstream Anchors (verbatim — Step 1)

From Module 05 Belief Shift Journey: "[verbatim quote — what changes for the customer between FROM and TO over time]"
From Module 04 Reflection Summary including chosen Response Path: "[verbatim quote — cost of delay; under Adjust the Path, the adjusted scope's cost-of-delay shape]"

### Sales Statement (derived from above — Step 2)

[Specific statement of why now matters — belief-based, not artificial pressure. Urgency translates from the cost of delay stated in upstream conviction, not from sales-floor pressure tactics.]

### Traceability

[Trace this Statement to the quoted source above]

---

## 7. The Value Statement

### Upstream Anchors (verbatim — Step 1)

From Module 05 Brand Beliefs — Customer + Brand: "[verbatim quote]"
From Module 06 Statement 10 (Value): "[verbatim quote]"
From Module 04 Reflection Summary (especially Response Path scope): "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Specific statement of what value means in belief terms. Under Adjust the Path or Wait, value reflects the adjusted scope, not the original ambition.]

### Pricing Conversation Architecture

- Module 04 Pricing Calibration Handoff: [verbatim range/state, assumptions, unacceptable conditions, capacity/margin limits and financial Claims Boundaries]
- Introduce price: [how and when]
- Contextualise value: [without manufacturing viability]
- Qualification and fit: [questions or conditions]
- Stop/return rule: [when the conversation must narrow, pause or return to M04]

### Traceability

[Trace this Statement to the quoted source above]

---

## 8. The Invitation Statement

### Upstream Anchors (verbatim — Step 1)

From Module 05 Personality + Voice: "[verbatim quote]"
From Module 06 Statement 6 (Invitation): "[verbatim quote]"

### Sales Statement (derived from above — Step 2)

[Specific statement of what commitment sounds like — offer, not close. In the brand's voice, anchored on Module 06's invitation language.]

### Invitation Vehicle (conditional)

- Applicability: [applicable / not-applicable / unsupported]
- Vehicle: [diagnostic / assessment / workshop / pilot / initial scoped engagement / other deliberate first commitment]
- Derivation: [M03 deployable proof artefact + M04 Offer Architecture Feasibility/Response Path + M06 S6/S8.1]
- Commitment and next decision: [what the prospect enters and what it resolves]
- Feasibility/Claims Boundary: [pass / conditional / unsupported]

### Traceability

[Trace this Statement to the quoted source above]
```
**Vital Check Gate for 07_01:**

Two tests apply by statement type. Statements 2 and 3 are *diagnostic anchors* (the prospect's belief states). Statements 1, 4–8 are *deployable language* (what the seller speaks or writes). See `07-Philosophy.md` *The Eight Sales Statements* and `07-Quality-Gates.md` Gate 1 for the full differentiated test.

*Deployable language (Statements 1, 4, 5, 6, 7, 8):*

- [ ] All six are written (not placeholders)
- [ ] Each is 1–3 sentences (specificity, not length)
- [ ] Language follows Module 05 Voice and Copywriting rules
- [ ] Disqualification (5) shows conviction (willing to walk away)
- [ ] Urgency (6) is belief-based, not artificial
- [ ] Invitation (8) is offer, not close

*Diagnostic anchors (Statements 2, 3):*

- [ ] Both written (not placeholders)
- [ ] Statement 2 captures the FROM belief in the prospect's own language (passes recognisability test)
- [ ] Statement 3 captures the TO belief the brand transfers them to
- [ ] Both derive from Module 05_03 Belief Shift FROM/TO and match Module 06 Statement 1 / 3
- [ ] Belief Shift Journey is visible across Statements 2 → 3 → 4

**Sequence rehearsal requirement:**

For each of the 8 statements, produce one short Claim-Feel-Proof-Invite draft.

- [ ] All 8 statements can be expressed in sequence form
- [ ] Each sequence keeps one point, one proof point, one invitation
- [ ] Language remains within Claims Boundaries

---

### 07_02 Belief Spectrum Readiness Qualification

**Purpose:** Define qualification indicators with **specific example language** prospects use.

### System Prompt — Two-Step Translation Process (per FW_16)

Use the same two-step process as 07_01. **Step 1 contains only verbatim upstream quotations**, particularly the *prospect’s own language* captured in Module 02’s Belief-Ready Segment and Anti-Audience evidence. Quote that evidence before writing qualification logic. This prevents plausible invented phrases from being presented as customer language.

**Step 1 — Quote Upstream Anchors Verbatim.** For each Belief State row (Belief-Ready, Belief-Curious, Belief-Locked), locate the specific upstream artefacts named in the Translation Discipline table above for "Belief Spectrum Readiness Qualification (07_02)." Copy them verbatim — interview quotes, review verbatim text, lost-deal record language, the Module 02 Belief-Ready Segment evidence per the Owned Customer-Evidence Audit. Paste as the first content block under each Belief State heading. If Module 02 didn't capture customer language for a given state, halt this deliverable for that state — do not invent example language to fill the row. Mark the row "evidence pending" and surface upstream.

**Step 2 — Translate Each Quote into Qualification Indicators + Sales Response.** With the verbatim customer language in place, derive: the specific behavioural / verbal indicator (what the seller listens for); the example language row, populated *from* the verbatim quotes (not paraphrased); the sales response (in Module 05 Voice and Copywriting rules); the probability to close. The Disqualification Protocol inherits its walk-away conviction from Sales Statement 5 (07_01) — quote Statement 5's locked language as the source for the Disqualification Protocol.

**Test (per FW_16):** if a row's example language could plausibly have been written by someone who hasn't read Module 02's customer evidence, that row slipped into discovery mode. Push the verbatim customer quote back in and re-derive.

**Output Format:**

```text
## Belief-Ready Prospects

### Upstream Anchors (verbatim — Step 1)

From Module 02 Belief-Ready Segment evidence (Owned Customer-Evidence Audit): "[verbatim customer quote 1 from interview/review/lost-deal data]"; "[verbatim customer quote 2]"; "[verbatim customer quote 3]"
From Module 06 Belief Stage Mapping — Belief-Ready row: "[verbatim — channels + Belief-Ready FROM language]"

### Qualification (derived from above — Step 2)

**Indicator:** [Specific behavioural or verbal signal the seller listens for — derived from the patterns in the verbatim quotes]
**Example language:** [Actual phrases — drawn directly from the verbatim quotes above, not paraphrased]
**Sales response:** [How to respond — in Module 05 Voice and Copywriting rules]
**Probability to close:** [Estimate, with stated basis]

### Traceability

[Trace each element to the specific quote it derives from]

---

## Belief-Curious Prospects

### Upstream Anchors (verbatim — Step 1)

From Module 02 Belief-Curious-Segment evidence (or partially-Belief-Ready customer language): "[verbatim quote 1]"; "[verbatim quote 2]"; "[verbatim quote 3]"
From Module 06 Belief Stage Mapping — Belief-Curious row: "[verbatim — channels + Questioning language]"

### Qualification (derived from above — Step 2)

**Indicator:** [Specific signal — derived from the verbatim quote patterns]
**Example language:** [Actual phrases — drawn directly from the verbatim quotes]
**Sales response:** [How to respond — in Module 05 Voice and Copywriting rules]
**Probability to close:** [Estimate, with stated basis]

### Traceability

[Trace each element to the specific quote it derives from]

---

## Belief-Locked Prospects

### Upstream Anchors (verbatim — Step 1)

From Module 02 Anti-Audience evidence (customer language from prospects who explicitly disagreed with the conviction or chose a competitor): "[verbatim quote 1]"; "[verbatim quote 2]"; "[verbatim quote 3]"
From Module 06 Belief Stage Mapping — Not For Us row: "[verbatim — channels + Defended language]"
From Module 05 Filter — Not For: "[verbatim]"

### Qualification (derived from above — Step 2)

**Indicator:** [Specific signal — derived from the verbatim quote patterns]
**Example language:** [Actual phrases — drawn directly from the verbatim quotes]
**Sales response:** [Politely disqualify — in Module 05 Voice and Copywriting rules, anchored on Module 05 Filter — Not For]
**Probability to close:** [Low — not worth pursuing, with stated reason]

### Traceability

[Trace each element to the specific quote it derives from]

---

## Disqualification Protocol

### Upstream Anchors (verbatim — Step 1)

From Sales Statement 5 — The Disqualification Statement (07_01, locked): "[verbatim from 07_01 Statement 5 derived output]"
From Module 01 Non-Negotiable: "[verbatim]"

### Protocol (derived from above — Step 2)

[Specific steps for exiting gracefully — derived from the walk-away conviction in Statement 5. The protocol must hold even when the prospect is willing to pay, because Non-Negotiable conviction is binding.]

### Traceability

[Trace each step to the quoted source above]
```
**Phase 1 Checkpoint:**

- [ ] All 8 statements written and specific
- [ ] Each qualification state has example language
- [ ] Disqualification protocol is clear

---

## Phase 2: Conversation Architecture (07_03-04)

### 07_03 Sales Narrative: Five Movements

**Purpose:** Build the conversation structure with **written questions, stories and transitions**, ready to use.

### System Prompt — Two-Step Translation Process (per FW_16)

The Five Movements have the **greatest risk of drift** among Module 07 deliverables. Questions can sound plausible while losing their connection to the Belief Shift Journey or Belief Stage Mapping. Anchor each Movement in its target Module 06 Belief Stage and the relevant part of Module 05’s Belief Shift Journey.

**Movement-to-Belief-Stage mapping (canonical structural anchor):** the Five Movements map 1:1 onto the five belief-progression stages Module 06 produced. Each Movement N takes the prospect from Belief Stage N to Belief Stage N+1. The questions, stories, and transitions for Movement N are *derived from* the specific Belief Stage row in Module 06's Belief Stage Mapping, the corresponding segment of Module 05's Belief Shift Journey, and the customer language Module 02 captured for that stage.

**Step 1 — Quote Upstream Anchors Verbatim.** For each of the 5 Movements, locate the upstream artefacts that map to that Movement's target Belief Stage. Copy them verbatim — the Module 06 Belief Stage row, the Module 05 Belief Shift Journey segment, the Module 02 customer language for that stage, and the Module 05 Voice + Copywriting rules. Paste as the first content block under each Movement heading. Stories used in the Movement must come from Module 03's confirmed Story Proofs (per the operationalised Story Proof flavour handling) — quote each Story Proof's situation / belief / shift / result verbatim before reformulating into Movement form.

**Step 2 — Translate Each Quote into Movement Architecture.** With the verbatim anchors in place, derive: the Movement's Objective; Key Questions; What to Listen For; Stories That Transfer Belief; Transfer Indicators; Transition to Next Movement; and the **Practical Conversation Mechanic** that lets the prospect participate in discovery or decision. A mechanic may be a question sequence, diagnostic interaction, proof demonstration, consequence exploration, price/fit discussion or Invitation Vehicle. It may not be a pressure device.

**Test (per FW_16):** if a Movement's questions or stories could plausibly be written by someone who has not read Module 06's Belief Stage Mapping and Module 03's Proof Commitments, the prompt slipped into discovery mode. Push the source quotation back in and re-derive.

**Story Proof guardrail:** if Module 03 surfaced thin Story Proof (pre-launch / positioning-not-yet-public / strategy-not-yet-enacted flavours per Module 03 Step 5), the Movement may have fewer than two confirmed Stories. Mark those Movement-Story slots "story-in-development" rather than invent fictional stories — the seller using invented stories is the most common form of customer betrayal Module 02's Belief-First, Proof-Always principle is designed to prevent.

**Output Format (per Movement — repeat structure for Movements 1–5):**

```text
## Movement [X]: [Name]

### Upstream Anchors (verbatim — Step 1)

From Module 06 Belief Stage Mapping — Belief Stage [X] row: "[verbatim — what % of audience, what channels, what FROM/TO language, what target belief]"
From Module 05 Belief Shift Journey — segment relevant to this Movement: "[verbatim — the specific transition this Movement accomplishes]"
From Module 02 customer language for this Belief Stage (Owned Customer-Evidence Audit): "[verbatim quotes from interviews / reviews / lost-deal data for prospects at this stage]"
From Module 05 Voice + Copywriting rules: "[verbatim voice and writing rules — tone, register, what the brand sounds like in conversation]"
From Module 03 Story Proof(s) usable in this Movement: "[verbatim Story 1 situation / belief / shift / result — only confirmed Story Proofs, not pending]"

### Movement Architecture (derived from above — Step 2)

**Objective:** [What belief transition this Movement accomplishes — derived from the Belief Stage Mapping segment quoted above]

### Key Questions

1. [Actual question — derived from the quoted customer language; should surface whether the prospect is at the target Belief Stage]
2. [Actual question — same]
3. [Actual question — same]

### What to Listen For

[Specific indicators — derived from the patterns in the verbatim Module 02 customer language quoted above]

### Stories That Transfer Belief

**Story 1: [Name]** (from Module 03 Story Proof — quote verbatim before reformulation)

- Verbatim Module 03 Story Proof: "[verbatim]"
- Situation (derived): [Setup, faithful to the verbatim source]
- Limiting belief (derived): [What they believed — must match the quoted FROM]
- What changed (derived): [The shift]
- Result (derived): [Outcome — must match the quoted Story Proof outcome]
- Tell when (derived): [Trigger — when the prospect's language matches the quoted customer language for this stage]

**Story 2 (if Module 03 surfaced a second confirmed Story Proof):** [same structure]

*If Module 03 surfaced fewer than 2 confirmed Story Proofs:* "Story-in-development. Module 03 Story Proof slot is pending per [flavour: pre-launch / positioning-not-yet-public / strategy-not-yet-enacted]. Do not deploy invented stories. Mark this Movement-Story slot for capture as soon as the qualifying incident occurs."

### Transfer Indicators

[How you know this Movement is complete — observable signals derived from the quoted Belief Stage]

### Transition to Next Movement

[Specific phrase or question — the language that moves the prospect from this Movement's Belief Stage to the next, anchored on the Belief Shift Journey segment]

### Practical Conversation Mechanic

[Name the approved participation, diagnostic, evidence, consequence or invitation mechanic that makes this Movement possible. Explain its job and source.]

### Traceability

This Movement derives from: [Name the specific upstream quote(s) for each architectural element]
```

**Vital Check Gate for 07_03:**

- [ ] All 5 Movements have actual questions (not "[Question 1]")
- [ ] Each Movement's questions trace verbatim to its Module 06 Belief Stage row + Module 02 customer language
- [ ] At least 2 stories documented with full structure — each derived from a confirmed Module 03 Story Proof (not invented); Movement-Story slots without a confirmed Story Proof marked "story-in-development"
- [ ] Transitions are specific phrases/questions, anchored on Module 05 Belief Shift Journey
- [ ] Transfer indicators are observable and derived from the quoted Belief Stage
- [ ] Movement-to-Belief-Stage 1:1 mapping confirmed

---

### 07_04 Objection Diagnosis: Written Responses

**Purpose:** Document the top 10 objections with **a complete paragraph response** to each.

### System Prompt — Two-Step Translation Process (per FW_16)

Objection Responses have a specific vulnerability: the seller (or facilitating AI) defaults to *"what objections do I think prospects might raise?"* and produces a list of plausible-sounding objections that have nothing to do with what prospects have actually said. The two-step process forces the objections themselves to come from verbatim Module 02 customer evidence (lost-quote data, churn surveys, support tickets, sales-call notes — the Owned Customer-Evidence Audit). Invented objections produce invented responses, which produce a sales conversation disconnected from the actual reasons prospects don't buy.

Responses also risk *overclaiming*: promising something that Module 01’s Claims Boundaries require the seller to qualify or prohibit altogether. Objections put sellers under pressure to say *"yes, we do that"*. Quote the Claims Boundaries before writing the response so that pressure does not determine the claim.

**Step 1 — Quote Upstream Anchors Verbatim.** For each of the 10 Objections, locate:

- The **actual objection language** verbatim from Module 02's Owned Customer-Evidence Audit (lost-quote data, churn surveys, support tickets, sales-call notes). Not "what objections might come up" — actual objections recorded from real prospects.
- The **Module 06 Marketing Statement(s)** the prospect is reacting against — the marketing-primed claim that produced the objection.
- The **Module 05 Claims Boundaries** (Can Claim / Must Qualify / Cannot Claim) relevant to the territory of the objection.
- The **Module 01 Hidden Truth or Broken Thing** the objection touches (the underlying conviction the Response must hold to).
- The **Module 05 Voice + Copywriting rules**.

Paste them verbatim as the first content block under each Objection heading. If Module 02's customer evidence doesn't contain real objection language (very early-stage business / no sales calls run / no lost-quote data), halt this deliverable and surface the missing input — do not invent objections to fill the list.

**Step 2 — Translate Each Quote into Diagnosed Response.** With the verbatim anchors in place, derive: Belief type (categorising the objection — Belief-Locked, Belief-Curious, Practical-not-belief, etc.); Root belief (what's underneath the objection, often the inverse of a Module 01 Hidden Truth); Response (a full written paragraph in Module 05 Voice and Copywriting rules, anchored on Claims Boundaries — Cannot Claim items must not be claimed, Must Qualify items must be qualified, only Can Claim items may be asserted directly); Follow-up action.

**Test (per FW_16):** if an Objection or its Response could plausibly be written by someone who has not read Module 02's customer evidence and Module 05's Claims Boundaries, the prompt slipped into discovery mode. Push the source quotation back in and re-derive.

**Claims Boundary cross-check (per CMQG_02):** every Response must verify against Module 05 Claims Boundaries before locking. A Response that asserts a Cannot Claim item — even if it "would close the deal" — fails the translation test. Surface the conflict to Module 01 for Boundary revision; do not silently overclaim at the sales surface.

**Output Format (per Objection — repeat structure 10 times):**

```text
## Objection [N]: "[Actual objection — verbatim from Module 02 customer evidence]"

### Upstream Anchors (verbatim — Step 1)

Verbatim objection from Module 02 source: "[exact prospect language]" (Source: [lost-quote record / churn survey response / sales call note / support ticket — with date])
Module 06 Marketing Statement(s) the prospect is reacting against: "[verbatim from relevant Statement 1–10]"
Module 05 Claims Boundaries relevant here:
  - Can Claim: "[verbatim, if any]"
  - Must Qualify: "[verbatim, if any]"
  - Cannot Claim: "[verbatim, if any]"
Module 01 Hidden Truth / Broken Thing the objection touches: "[verbatim]"
Module 05 Voice + Copywriting rules: "[verbatim — tone, register, what the brand sounds like under pressure]"

### Diagnosis (derived from above — Step 2)

**Belief type:** [Category — derived from the patterns in the verbatim objection]
**Root belief:** [What's underneath — often the inverse of the quoted Hidden Truth]

**Underlying concern:** [The specific concern expressed by the prospect]

**Appropriate commercial mechanic:** [proof / scope / process / price / risk-reversal / disqualification / other approved mechanic; `none—do not proceed` is valid]

**Response:**

[Full written paragraph in Module 05 Voice and Copywriting rules. Must hold to the quoted Claims Boundaries — does not assert Cannot Claim items, qualifies Must Qualify items, only directly asserts Can Claim items. Anchored on the quoted Hidden Truth.]

**Follow-up:**

[Specific next action — derived from the Belief type and the Module 06 Belief Stage the prospect appears to be at]

### Traceability

This Response derives from: [Name the specific quote(s) for each element]
Claims Boundary check: [ ] All assertions within Boundaries  [ ] Conflict surfaced for Module 01 revision

---
```

**Vital Check Gate for 07_04:**

- [ ] Top 10 objections documented — each verbatim from Module 02 customer evidence (not invented)
- [ ] Each has a written response (not a framework)
- [ ] Responses follow Module 05 Voice and Copywriting rules
- [ ] Follow-up actions are specific
- [ ] Every Response verified against Module 05 Claims Boundaries (CMQG_02) — no overclaim
- [ ] If Module 02 customer evidence couldn't supply 10 real objections, the shortfall is documented as "evidence pending — capture as sales calls accumulate," and the list is shorter rather than padded with invented objections

---

## Research Layer: Gap Research Framework + Seven Signals as Sequence Input

Before outreach writing, run a focused diagnostic pass using one of two routes:

**Route A — Gap Research Framework (preferred when prospect has visible public claims):**

Run the optional `07_10` Gap Research section in this canonical prompt before writing outreach. This produces:
- A **binary gap** (their claim vs. what is evidenced)
- A **Columbo question** in direct form (for one-to-one outreach) and open form (for broadcast content)
- A **conviction trace** connecting the gap to the builder's Module 01 conviction

The Columbo question becomes the Claim step in the outreach sequence. Use it verbatim where possible — it is built from their language, which makes it harder to dismiss.

**Route B — Seven Signals artifact scan (when Route A cannot be run or public claims are absent):**

1. Scan all seven signals (or equivalent public artifacts where website signal is weak).
2. Select the single sharpest conviction gap.
3. Convert that finding into sequence inputs:
   - **Claim:** what is visibly broken
   - **Feel:** what that break feels like for their customer
   - **Proof:** one concrete artifact proving the break
   - **Invite:** proportional opener to test alignment
4. Use that sequence as the first outreach draft.

Route A produces a more precise Claim because it uses the prospect's own published language. Route B is appropriate when there are few visible public claims to research against.

### Observable artifacts for non-website-led businesses

- **B2B manufacturing/industrial:** trade show presence, distributor descriptions, datasheets, job listings
- **B2C product:** packaging, retail presence, social content, customer review language
- **Charity/non-profit:** fundraising language vs programme/impact language

---

## Phase 3: Proof & Measurement (07_05-06)

### 07_05 Claims Boundaries

Apply Module 05 Claims Boundaries to the sales context.

### 07_06 Transfer Metrics

Define traditional sales metrics and belief-transfer metrics.

---

## Phase 4: Integration (07_07-08)

### 07_07 Sales Activation Requirements

State what must exist before Module 11 activates sales: founder familiarity with the eight statements, role-play of the Five Movements, qualification and disqualification practice, approved objection responses, call-note evidence capture, claims review and required sales assets.

Do not set training dates, outreach quantities, call cadence, conversion targets or sales-cycle thresholds. Module 11 selects and quantifies the route; Module 12 schedules it.

---

### 07_08 Sales Handoff Pack

Consolidate all statement-based outputs.

**Exports:**

```text
## Sales Positioning Statements

1. Sales Context Statement
2. The Transfer Moment Before
3. The Transfer Moment After
4. The Belief Shift Journey Proof Statement
5. The Disqualification Statement
6. The Urgency Frame
7. The Value Statement
8. The Invitation Statement

## Conversation Architecture

- The Five Movements (with specific questions, stories, transitions)
- Non-linear navigation guide
- Movement completion checklist

## Objection Handling

- Top 10 objections (ranked)
- Specific written responses
- Belief-type diagnosis
- Follow-up actions

## Qualification Framework

- Belief-Ready indicators + example language
- Belief-Curious indicators + example language
- Belief-Locked indicators + example language
- Disqualification protocol

## Proof Assets (from Module 05)

- Immediate proof (what to show)
- Referenced proof (what to describe)
- Experiential proof (what to offer)
```
**This Handoff Pack feeds to:**

- Module 07B (Sales Content Generator)
- Module 08 (Proof Strategy) for consistency
- Module 09 (Digital Architecture) for website copy guidelines
- Implementation teams for sales training

---

### 07_09 Commercial Summary

Assemble a one-page commercial summary for external readers from validated upstream outputs.

**Key addition:**

- Produces a buyer-facing one-pager that answers what you sell, why it matters, and what it costs
- Enforces derivation from Modules 04-08 (no invented claims)
- Adds a ready-to-use commercial document for sales and partnerships

---

## Handoff Pack (For Module 08)

**Locked Outputs (Do Not Change After This Point):**

| Anchor                                      | Summary                            |
| ------------------------------------------- | ---------------------------------- |
| **8 Sales Positioning Statements**          | All written, specific, deployable  |
| **Belief Spectrum Readiness Qualification** | Example language for each state    |
| **Sales Narrative**                         | Five Movements with actual content |
| **Objection Responses**                     | Written paragraphs for top 10      |
| **Claims Boundaries Verification**          | All statements within boundaries   |

---

## Module 07B: Sales Content Generator

**After completing Module 07,** use 07B to generate any sales content.

**File:** `07B-Sales-Content-Generator.md`

**Inputs:**

1. Module 07 Sales Statements (all 8)
2. Module 05 Voice (`05_07`) + Copywriting rules (`05_12`)
3. Selected Positioning Statement (1 of 8)
4. Channel (email, LinkedIn, call script, follow-up, networking, proposal)
5. Conversation phase (Diagnose, Transfer, Invite)
6. Audience context (industry, business type, likely pain point)

**Generator must output:**

- Claim sentence
- Feel image/moment
- Proof reference (specific or insertable prompt)
- Invite matched to relationship stage and channel

**User specifies:**

- Content type (email, DM, letter, script, etc.)
- Audience
- Context/angle
- Quantity
- Any requirements

**Content types it can generate:**

- Cold emails (single or sequence)
- LinkedIn messages / connection requests
- LinkedIn posts
- Sales letters (short or long form)
- DMs (Instagram, Twitter, etc.)
- Voicemail scripts
- Chat/website greetings
- Proposal introductions
- Follow-up emails
- Objection response scripts
- Negotiation talking points
- Referral request messages
- Win-back emails
- Testimonial request emails

Use the same prompt across sales content types.

---

## Vital Check Gate: Module Complete

**Pass Criteria (All must be met):**

- [ ] **8 Statements Written:** All specific to THIS business
- [ ] **Statements Follow Voice + Copywriting:** Language matches Module 05
- [ ] **Qualification Has Example Language:** Actual phrases for each state
- [ ] **Five Movements Have Actual Questions:** No "[Question 1]" placeholders
- [ ] **At Least 2 Stories Documented:** Full structure for each
- [ ] **10 Objections With Written Responses:** Paragraphs, not categories
- [ ] **Claims Boundaries Applied:** From Module 05
- [ ] **Transfer Metrics Defined:** At least 5
- [ ] **Handoff Pack Compiled:** All outputs consolidated

**If all met:** Proceed to Module 07B, then Module 08

---

## Quality Standards

### The Placeholder Test

For every output, ask:

> "Are there any brackets [ ] in this output?"

If yes, replace the placeholders with content specific to this business.
If no, the output passes the placeholder test.

### The Derivation Test

For every statement, ask:

> "Could a competitor with opposite beliefs write this exact statement?"

If yes, revise it to reflect this brand’s source decisions.
If no, it passes.

### The Usability Test

For every response/question/transition, ask:

> "Could a salesperson use this exact language in a real conversation?"

If significant adaptation would be needed, rewrite it as usable conversational language.
If it can be used as written, it passes.

---

## Troubleshooting

### If outputs still have placeholders

- Replace the framework placeholders with complete sentences
- Take ONE statement and complete it fully before moving to the next
- Read aloud: does it sound like something a human would say?

### If statements feel generic

- Check that Brand Strategy (from Module 05) is in context
- Make statements MORE specific, not more complete
- Add the business name, specific outcome, specific problem

### If team can't use the questions

- Questions should be conversational, not formal
- Test: Would you actually ask this in a call?
- Remove jargon; use prospect's language

### If objection responses feel scripted

- They should feel scripted — that's the point
- Scripted doesn't mean robotic
- Responses follow Module 05 Voice and Copywriting rules

---

## Output Locations

### Working Files

```text
/Output/<Project Name>/07-Invitation Strategy/Working/
```
### Final Outputs

```text
/Output/<Project Name>/07-Invitation Strategy/Final/
```
### Handoff Pack

```text
/Output/<Project Name>/07-Invitation Strategy/Handoff-Pack.md
```

---

## Prompt Files

Execute in sequence:

1. `07_01` section in this prompt — 8 Sales Positioning Statements
2. `07_02` section — Qualification + Example Language
3. `07_03` section — Five Movements
4. `07_04` section — Written Paragraph Responses
5. `07_05` section — Claims Boundaries
6. `07_06` section — Transfer Metrics
7. `07_07` section — Sales Activation Requirements
8. `07_08-Sales-Handoff-Pack.md` (Major update)
9. `07_09` section — one-page external commercial synthesis

Then:

- `07B-Sales-Content-Generator.md` Generate any sales content

---

## Version Notes

**Version 3.4** — 17 August 2026

- Required the shared Practitioner Brief V3 spine and Sales-specific conversation and qualification middle.

**Version 3.3** — 27 July 2026

- Tightened accepted-anchor quotation and stale-version stopping at runtime.
- Bounded single-artefact responses and prohibited invented proof, urgency, scarcity, readiness and pressure-led removal of disqualification.

**Version 2.8** — 15 July 2026

- Added the confirmed Module 05 Canonical Client Explanation as a communication constraint for sales explanation and teach-back.

For the detailed change history, see [07-CHANGELOG.md](07-CHANGELOG.md).

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
