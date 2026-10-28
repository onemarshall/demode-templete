---
id: 08B-Content-Generator
title: Module 08B Content Generator
description: This file is an optional content-form and proof-deployment reference, not the production router.
type: rules-library
version: 3.2
last-updated: '2026-07-10'
status: active
depends-on:
- 08-Prompt
- 08-Strategy-Schema
- 08_13-Content-Handoff-Pack
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
- templates/Initiative-Authority-Record-Template.md
feeds-into:
- 08_13-Content-Handoff-Pack
---


# Module 08B Content Generator

> **Client paths:** Before reading inputs or writing outputs, resolve the selected client using `../templates/00-Entry-Brief-Folder-Convention.md`. Its Input, Output, collection, asset and private run destinations override legacy flat output examples. Keep existing authority and approval gates unchanged.


## Current runtime contract — governing

Use this file as an optional reference for content formats and the use of proof. `os-communication-router` checks authority and selects behaviour C, E or C+E in a valid packet. `.agents/skills/os-content-piece/SKILL.md` writes from that packet, consulting the relevant content-type guidance here when needed. Specialist checks, claims validation and editing are separate passes.

Later instructions to gather Module 04–08 sources directly, use one universal structure, show derivation or run every diagnostic while drafting remain as manual reference material. They do not govern the current runtime.

## Initiative Authority Gate

Production requires a current, accepted Initiative Authority Record. It must contain the initiative ID/version, Direction ID/version and strategic move ID, plus the authorised audience/trigger, movement, offer, proof, channel, claims, exclusions, success and invalidation fields. Return `authority-input-incomplete` if authority is missing, incomplete, stale or does not permit the requested work. Record all three authority IDs on the output. If that authority is invalidated, the asset becomes stale.

**Langfell™**
_The content rules library — content-type guidelines, generation process, proof discipline_

---

## How the os-content-piece skill uses this file

`.agents/skills/os-content-piece/SKILL.md` is the per-piece runtime; this file is an optional reference it may consult selectively.

| Layer | Where | What |
|---|---|---|
| **Rules / logic library** | **this file** | Content-type guidelines, generation process, output format, proof-deployment + claims discipline, quality gate. Updated centrally. |
| **Per-piece runtime** | `os-content-piece/SKILL.md` | Inputs, pillar selection, proof planning, generation, storage, cross-piece coherence, conditional scripture-check, re-run logic. Calls these rules. |
| **Cross-piece context** | `RUN_ROOT/content/_cross-piece-context.md` | Prevents overuse of one proof asset or opening, and repeated coverage of a pillar already supported by sufficient proof. |

**Don't duplicate rules into the skill.** Change a content-type guideline or proof rule here; the skill reads it. The skill reads M08 against `08-Strategy-Schema.md` (pillars `08_02 → Pillar N`; proof hierarchy `08_03`; objection map `08_05`), M05 brand layer against `05-Strategy-Schema.md`, and M06/M07 for consistency.

**Stay in long-form:** short broadcast assets are `os-marketing-asset` (06B); sales assets are `os-sales-asset` (07B); pages are `os-page-copy` (09B). This library is long-form proof-bearing content only. When content makes scriptural/textual claims, the skill runs `book-scripture-check`.

---

## Overview

Module 08B generates actual content pieces from the strategy defined in Module 08. Module 08 answers "what content should we create and why?" Module 08B answers "write this specific piece."

This separates strategy decisions from content production as needed, following the pattern used by 06B, 07B and 09B.

---

## When to Use This Module

Use Module 08B when you have:

- Completed Module 08 (Content Pillars, Proof Hierarchy defined)
- Module 05 Voice (`05_07`) and Copywriting rules (`05_12`) available
- Approved RouteAuthorization from Module 04
- A specific content piece to generate

Do NOT use if:

- Module 08 is incomplete (no pillars defined)
- Module 05 Voice or Copywriting rules are missing
- Module 04 RouteAuthorization `status` is not `Approved` or `Overridden`, or `generation_permission` is `draft-only`, and the requested piece would be public or buyer-facing
- You don't know which pillar the content serves

---

## Required Inputs

Before generating content, gather these from completed modules:

### From Module 04 (RouteAuthorization)

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

Do not generate publishable content for a route, audience, proof path, or offer not listed in `permitted_*`. If `generation_permission` is `draft-only`, output draft-only internal options. If `status` is not `Approved` or `Overridden`, halt and request route approval.

### From Module 08 (Proof Strategy)

```text
CONTENT PILLARS (from 08_02):

Pillar 1: [Brand-Specific Name]

- Type: [Disruption / Vision / Method / Evidence / Defence]
- What it proves: [Connection to Brand Strategy]
- Belief Stage: [Recognition / Disruption / Alternative / Proof / Adoption]

Pillar 2: [Brand-Specific Name]
[Same structure]

Pillar 3: [Brand-Specific Name]
[Same structure]

[Continue for 3-5 pillars]
```
```text
PROOF HIERARCHY (from 08_03):

Tier 1 (Foundation):

- Definition: [What qualifies]
- Depth: Comprehensive, authoritative
- Examples: Pillar pages, guides, research, detailed case studies

Tier 2 (Supporting):

- Definition: [What qualifies]
- Depth: Focused, practical
- Examples: Blog posts, how-tos, specific case studies

Tier 3 (Distribution):

- Definition: [What qualifies]
- Depth: Accessible, scannable
- Examples: Social posts, newsletter snippets, short videos
```
### From Module 05 (Brand Identity)

```text
BRAND VOICE:

- Tone: [Characteristics]
- Do: [Voice guidelines]
- Don't: [Anti-patterns]

COPYWRITING FRAMEWORK:
[The framework from Module 05]

BELIEF SHIFT:

- FROM: [Limiting belief]
- TO: [Empowering belief]

CLAIMS BOUNDARIES:

- Can Claim: [List]
- Must Qualify: [List]
- Cannot Claim: [List]
```
### From Module 01 (Natural Language Bank)

```text
NATURAL LANGUAGE BANK:
[Paste the Natural Language Bank from Module 01 Handoff Pack]
```
Use the builder’s vocabulary, energy patterns and natural language captured in Module 01 to preserve their voice in the content.

---

## Content Request Format

When requesting content, specify:

```text
CONTENT REQUEST:

Content Type: [Blog post / Article / Case study / Guide / etc.]
Pillar: [Which pillar this serves]
Tier: [1 / 2 / 3]
Working Title: [Suggested title]
Target Length: [Word count or "standard for tier"]
Specific Focus: [What aspect of the pillar to address]
Objection Addressed: [If applicable, from 08_05]
Call to Action: [What reader should do next]
```

---

## Generator Prompt

### Identity & Purpose

You generate content that proves the brand's belief. Every piece you produce must:

- Serve a specific Content Pillar (from Module 08)
- Meet Tier requirements (depth, authority, format)
- Follow Module 05 Voice and Copywriting rules
- Stay within Claims Boundaries
- Move the reader along the Belief Shift

### Core Principle

**Content is Proof, Not Promotion**

Show, explain or support the brand’s belief with evidence. An assertion alone is insufficient.

### Content Type Guidelines

#### Blog Posts (Tier 2)

**Purpose:** Focused exploration of one aspect of a pillar
**Length:** 800-1,500 words
**Structure:**

- Hook that connects to reader's current belief
- Problem/tension that the pillar addresses
- Insight or method that proves the brand's position
- Practical takeaway or application
- Connection to foundation proof (Tier 1)

**Voice:** Conversational but authoritative. First person plural ("we") when representing brand perspective.

---

#### Long-Form Articles (Tier 1)

**Purpose:** Comprehensive, definitive treatment of a pillar topic
**Length:** 2,000-4,000 words
**Structure:**

- Executive summary / key takeaways
- Context: Why this matters now
- The problem: Current belief and its costs
- The alternative: Brand's position with evidence
- The method: How to apply this thinking
- Proof points: Cases, data, examples
- Implications: What this means going forward
- Call to action

**Voice:** Authoritative, well-researched. Can include data, quotes, examples.

---

#### Case Studies (Tier 1 or 2)

**Purpose:** Third-party validation of brand's belief
**Length:** 1,000-2,000 words (Tier 1) or 500-800 words (Tier 2)
**Structure:**

- Situation: Client's starting point (aligned with "FROM" belief)
- Challenge: What they were struggling with
- Approach: How brand's method was applied
- Results: What changed (quantified where possible)
- Reflection: Client's perspective shift (aligned with "TO" belief)

**Voice:** Narrative, specific. Let the client's experience tell the story.

**Claims Check:** All results must be within "Can Claim" boundaries. Qualify anything in "Must Qualify."

---

#### Thought Leadership (Tier 1)

**Purpose:** Establish brand as authority on the pillar topic
**Length:** 1,500-2,500 words
**Structure:**

- Provocative opening: Challenge conventional wisdom
- The observation: What you've noticed that others miss
- The argument: Why your perspective is more accurate
- The evidence: Support from experience, data, examples
- The implication: What this means for the reader
- The invitation: How to engage further

**Voice:** Confident, distinctive. This is where brand personality shows most.

---

#### How-To Guides (Tier 2)

**Purpose:** Practical application of brand's method
**Length:** 1,000-2,000 words
**Structure:**

- What you'll learn (outcome)
- Why this approach (brief connection to brand belief)
- Prerequisites / what you need
- Step-by-step process
- Common mistakes to avoid
- What success looks like
- Next steps / deeper resources

**Voice:** Instructional, clear. Focus on reader's success.

---

#### Newsletter Content (Tier 3)

**Purpose:** Maintain connection, drive to proof library
**Length:** 300-600 words
**Structure:**

- One insight or observation
- Brief exploration
- Link to deeper content (Tier 1 or 2)
- Personal note / human element

**Voice:** Personal, conversational. As if writing to someone you respect.

---

#### Social Thought Leadership (Tier 3)

**Purpose:** Distribute ideas, drive traffic to proof
**Length:** 80–300 words (or platform-appropriate)
**Structure:**

- Hook (first line must stop scroll)
- One clear point
- Brief support
- Engagement prompt or link to more

**Voice:** Punchy, memorable. Adapted to platform norms while maintaining brand voice.

---

### Generation Process

**Step 1: Confirm Inputs**

- Which pillar does this serve?
- What tier is this content?
- What Belief Shift stage does it address?

**Step 2: Apply Voice + Copywriting Rules**
Import Module 05 Voice and Copywriting rules and apply them to this piece.

**Step 3: Draft Content**
Write the content following the type-specific guidelines above.

**Step 4: Claims Check**
Review every claim against Claims Boundaries:

- Can Claim: State directly
- Must Qualify: Add softening language
- Cannot Claim: Remove or reframe

**Step 5: Voice Check**
Does this sound like the brand (per Module 05 Brand Voice)?

**Step 6: Proof Check**
Does this content prove something about the brand's belief, or just assert it?

**Step 7: CTA Check**
Is there a clear next step for the reader?

---

### Output Format

```text
## [Content Title]

**Pillar:** [Which pillar]
**Tier:** [1 / 2 / 3]
**Belief Stage:** [Where in the arc]
**Claims Status:** [Verified against boundaries]

---

[CONTENT BODY]

---

### Content Metadata

**Word Count:** [X]
**Tier 1 Link:** [What foundation proof this connects to]
**CTA:** [What reader should do next]
**Objection Addressed:** [If applicable]

### Claims Verification

| Claim Made | Boundary Status | Treatment                  |
| ---------- | --------------- | -------------------------- |
| [Claim 1]  | Can Claim       | Stated directly            |
| [Claim 2]  | Must Qualify    | Softened with "[language]" |
```

---

## Quality Gate

Before finalising any content piece:

- [ ] Serves identified Content Pillar
- [ ] Meets Tier depth requirements
- [ ] Follows Module 05 Voice and Copywriting rules
- [ ] All claims within boundaries
- [ ] Voice consistent with Module 05
- [ ] Advances Belief Shift (not just informs)
- [ ] Has clear CTA
- [ ] Links to or supports Tier 1 proof (if Tier 2/3)

---

## Content Types Supported

Module 08B can generate:

| Content Type          | Typical Tier | Primary Use            |
| --------------------- | ------------ | ---------------------- |
| Long-form articles    | 1            | Foundation proof       |
| Research summaries    | 1            | Authoritative evidence |
| Comprehensive guides  | 1            | Method demonstration   |
| Detailed case studies | 1            | Third-party validation |
| Blog posts            | 2            | Focused exploration    |
| How-to guides         | 2            | Practical application  |
| Short case studies    | 2            | Quick proof points     |
| Interviews/Q&As       | 2            | Expert perspectives    |
| Newsletter content    | 3            | Relationship building  |
| Social posts          | 3            | Distribution           |
| Email content         | 3            | Direct engagement      |
| Video/podcast scripts | 2-3          | Multi-format proof     |

---

## Example Usage

**User Request:**

```text
Generate a Tier 2 blog post for the Disruption Pillar.
Topic: Why traditional approaches fail
Target length: 1,200 words
Objection addressed: "Our current method works fine"
```
**Generator Response:**
[Produces blog post following all guidelines, with claims verification]

---

## Honest Position

**What 08B does:**

- Generates content that serves the strategy defined in Module 08
- Enforces tier discipline (appropriate depth)
- Maintains voice consistency (Module 05)
- Checks claims against boundaries
- Produces ready-to-publish content

**What 08B does not do:**

- Create content strategy (that's Module 08)
- Invent claims beyond evidence (bounded by Module 05)
- Replace risk-based release judgement. Low-risk assets may pass automated claims, coherence and provenance checks; material commercial claims require authorised-owner approval; attributed client material requires client permission; high-risk causal or outcome claims require independent review.
- Generate content without pillar alignment (refuses if unspecified)

---

**If stuck:** Check that the piece has a defined Content Pillar and Proof Hierarchy tier, and follows Module 05 Voice and Copywriting rules. Adapt the format while preserving those source decisions.

---

## Cross-Module Pattern

Module 08B follows the same pattern as other generators:

| Module                   | Strategy Output                 | Generator | Content Types              |
| ------------------------ | ------------------------------- | --------- | -------------------------- |
| 06 Belief Shift Strategy | Marketing Statements            | 06B       | Ads, social, campaigns     |
| 07 Invitation Strategy   | Sales Statements                | 07B       | Emails, proposals, scripts |
| **08 Proof Strategy**    | **Content Pillars + Hierarchy** | **08B**   | **Blog, articles, guides** |
| 09 Digital Architecture  | Page Briefs                     | 09B       | Website pages, sections    |

---

## Market calibration and referenceability generation gate

Before generating a substantive asset, carry forward the VOC state and source. Identify the selected Pillar Map route and the Proof Gap the asset serves. If VOC is `evidence-pending`, do not claim the expression is market-calibrated. Relevant Tier 1 assets require a Citation Readiness judgement before release, but that judgement cannot upgrade evidence strength. The asset must make the selected specialisation visible and name the qualitative belief-transfer signal it is intended to produce. Reach or engagement alone does not demonstrate belief transfer.

## Version Notes

**Version 3.1** — June 2026

- **Audit sync.** Updated required inputs and generation guidance to use Module 05 Voice (`05_07`) + Copywriting rules (`05_12`) instead of the older combined copywriting framework language.
- **Text cleanup.** Repaired visible list/encoding artifacts in the usage guardrails.

**Version 3.0** -- June 2026 (rules-library reframe)

- Reframed from standalone generator to **rules library** for the `content-piece` skill (skill-extraction pattern, System Architecture Decisions §3). `type: rules-library`; `feeds-into: [content-piece]`.
- Added the "How the content-piece skill uses this file" handshake.
- Pointed pillar/proof/brand reads at the locked schemas (`08-Strategy-Schema.md`, `05-Strategy-Schema.md`).
- Conditional `scripture-check` for content with textual/scriptural claims now lives in the skill.
- Standalone prompt retained as the manual/reference path.

**Version 2.0** -- February 2026

- Applied Langfell™ Voice Guide standards
- Fixed character encoding throughout (emojis, box drawing, arrows, status indicators)
- Corrected all module cross-references to current numbering
- Module 07 (Brand Identity) -> Module 05 (all 189 refs)
- Module 02 (raw conviction) -> Module 01
- Module 09 (old Invitation Strategy) -> Module 07
- Module 08 (Belief Shift Strategy) -> Module 06 (distinguished from Module 08 self-refs)
- Module 04 (old Digital Architecture) -> Module 09
- Module 06 (old Viability Check) -> Module 04
- Updated Vital 3 terminology throughout
- Added "If stuck" guidance where applicable

**Version 1.0** -- January 2026

- Initial release

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
