---
id: 06_06-Channel-Strategy
title: Channel Strategy
description: Langfell™ Belief Shift Strategy
type: module-deliverable
version: 2.1
last-updated: 2026-07-10
status: deprecated
superseded-by: 06-Prompt
reason: Component prompts consolidated into 06-Prompt.md. This file is retained as a deliverable template and output-shape reference, not an executable runner.
depends-on:
- 06-Prompt
- 05-Handoff-Pack
- 05-Strategy-Schema
feeds-into:
- 06-Handoff-Pack
---

# Deliverable 06: Channel Strategy

**Langfell™ Belief Shift Strategy**
**Phase 3: Messaging & Channels**
**v4.2 | Statement-Based Architecture**

> **Deprecated example only.** The named surfaces and two-layer deployment below are retained for migration history; they are not an authorised platform list. The live `06-Prompt.md`, `06-Strategy-Schema.md` and `06-Handoff-Pack.md` require a brand-specific candidate landscape, current channel intelligence, comparative judgement and a classified Channel Portfolio.

---

## Identity & Purpose

Pick channels by where the belief-ready audience already gathers. Map which statements deploy where.

This deliverable now operates a **two-layer architecture.** Layer 1 carries broad conviction messaging to the widest belief-ready audience. Layer 2 carries precision-targeted messaging — derived from Gap Research (07_10) — to specific segments where a binary gap has been identified and evidenced. Both layers deploy from the same 10 Marketing Positioning Statements, but they deploy differently and to different surfaces.

---

## Inputs Required

**From Module 05:**

```text
- Brand Voice
- Claims Boundaries
```
**From Deliverable 03:**

```text
- Where Belief-Ready gather
- Statement-to-Stage mapping
```
**From Deliverable 05:**

```text
- Statements 1-7 (written)
```

---

## Two-Layer Architecture

### Layer 1 — Broad Conviction Messaging

Purpose: Build belief at scale with the widest belief-ready segment.

| Where it lives | What it carries | Input source |
| --- | --- | --- |
| Website (homepage, services, about) | Statements 1–7 (belief journey) + Statements 8–10 (anchor) | Deliverable 05 + M05 Brand Strategy |
| Organic content (LinkedIn, email list, blog) | Belief challenge and new truth (Statements 2–3) | Deliverable 05 |
| SEO / long-form | Problem awareness + social proof (Statements 1, 4, 7) | Deliverable 05 |
| Paid awareness | Single-statement entry points (Statement 1 or 2 most common) | Deliverable 05 |

**This layer is always present.** Every business runs Layer 1 regardless of sector or audience type.

### Layer 2 — Precision-Targeted Messaging

Purpose: Open specific conversations with prospects where a binary gap is evidenced and the conviction trace is clean.

**When Layer 2 applies:**

| Client type | Layer 2 active? |
| --- | --- |
| B2B professional services (financial, consulting, legal, agency, advisory) | Yes — use Route A Gap Research |
| Other B2B where specific segment gap research has been run | Yes — use Route B Gap Research |
| B2C, local services, consumer-facing without segment gap research | No — Layer 1 only |

**If Layer 2 active**, run `07_10-Gap-Research-Framework.md` before Channel Strategy is finalised. The binary gap output and Columbo question define what Layer 2 content says.

| Where it lives | What it carries | Input source |
| --- | --- | --- |
| Cold email / LinkedIn DM | Columbo question (direct form) — opens conversation | 07_10 Gap Research Output |
| Sector-specific LinkedIn posts | Columbo question (open form) — speaks to category | 07_10 Gap Research Output |
| Campaign landing pages | Binary gap evidence + belief journey entry | 07_10 + Statements 1–3 |
| Precision cold outreach sequences | Claim → Feel → Proof → Invite (derived from gap) | 07_10 + 07B |

**Layer 2 is never the brand’s primary face.** Broad conviction (Layer 1) must be coherent before Layer 2 outreach lands. If the prospect checks the website after receiving a Columbo question and the brand is incoherent, the question becomes credibility-undermining rather than credibility-building.

---

## Output Template

```text
## Channel Strategy

---

### Channel Selection

| Priority | Channel   | Belief-Ready Presence | Statements Deployed | Investment % |
| -------- | --------- | --------------------- | ------------------- | ------------ |
| 1        | [Channel] | High/Med/Low          | [1, 2, 3...]        | [%]          |
| 2        | [Channel] | [Level]               | [Statements]        | [%]          |
| 3        | [Channel] | [Level]               | [Statements]        | [%]          |

---

### Statement-to-Channel Mapping

| Statement            | Primary Channels | Content Format               |
| -------------------- | ---------------- | ---------------------------- |
| 1. Problem Awareness | [Channels]       | [Ads, posts, hooks]          |
| 2. Belief Challenge  | [Channels]       | [Educational, threads]       |
| 3. New Truth         | [Channels]       | [Hero, manifesto-derived expression] |
| 4. Proof             | [Channels]       | [Case studies, testimonials] |
| 5. Differentiation   | [Channels]       | [Comparison, FAQ]            |
| 6. Invitation        | [Channels]       | [CTAs, landing pages]        |
| 7. Advocacy          | [Channels]       | [Referral, community]        |

---

### Content Pillars

| Pillar     | Brand Connection   | Primary Statements |
| ---------- | ------------------ | ------------------ |
| [Pillar 1] | [How proves brand] | [1, 2, 3...]       |
| [Pillar 2] | [How proves brand] | [Statements]       |
| [Pillar 3] | [How proves brand] | [Statements]       |

---

### Two-Layer Deployment

**Layer 1 (Broad Conviction):**

| Surface | Statements deployed | Priority |
| --- | --- | --- |
| Website | [Statements] | [High/Med/Low] |
| Organic content | [Statements] | [High/Med/Low] |
| [Other surface] | [Statements] | [High/Med/Low] |

**Layer 2 (Precision-Targeted) — complete only if Layer 2 is active:**

[ ] Layer 2 is active for this business (Gap Research has been run: `07_10` output exists)

| Segment | Gap Research route | Surface | Columbo form used |
| --- | --- | --- | --- |
| [Segment] | A or B | Cold email / LinkedIn DM | Direct |
| [Category] | A or B | LinkedIn post / email content | Open |

**Layer 2 validation check:** Website (Layer 1) is coherent before Layer 2 outreach begins.

[ ] Confirmed: website and LinkedIn profile are consistent with the brand conviction Layer 2 outreach assumes.

---

### Budget Allocation

| Category   | Layer | %   | Statement Priority  | Rationale               |
| ---------- | ----- | --- | ------------------- | ----------------------- |
| [Category] | 1 or 2 | [%] | [Statements served] | [Brand result reason] |

**Won't Spend On:** [Activities not serving statements]
```

---

## Quality Gate

**Layer 1 (always required):**

- [ ] Each channel mapped to specific statements
- [ ] Statement-to-channel mapping complete
- [ ] Content pillars connected to statements
- [ ] Budget tied to statement deployment

**Layer 2 (required only if active):**

- [ ] Layer 2 applicability assessed (B2B professional services or gap-researched segment)
- [ ] If active: `07_10` Gap Research output exists and binary gap is documented
- [ ] If active: Columbo questions (direct + open form) are written
- [ ] If active: Layer 1 (website) coherence confirmed before Layer 2 outreach begins
- [ ] If active: Layer 2 surfaces added to channel map with statement trace

---

**If stuck:** Don't try to be everywhere. Pick the channels where your belief-ready audience already gathers and where your voice can land clearly. Own one channel — don't whisper on five. Start with the channel where Statement 1 (Problem Awareness) lands hardest.

---

## Version Notes

**Version 2.1** — June 2026

- Added Two-Layer Architecture section: Layer 1 (broad conviction messaging) and Layer 2 (precision-targeted messaging).
- Layer 2 activation logic: B2B professional services or any segment where `07_10` Gap Research has been run. B2C and non-segment-researched contexts run Layer 1 only.
- Updated Output Template to include Two-Layer Deployment table with Layer 2 validation check.
- Updated Quality Gate with separate Layer 1 and Layer 2 checks.
- Layer 2 content (Columbo questions, precision outreach) sources from `07_10-Gap-Research-Framework.md`.

**Version 2.0** -- February 2026

- Applied Langfell™ Voice Guide standards
- Fixed character encoding throughout (box drawing, diamonds, warning signs)
- Corrected all module cross-references to current numbering
- Module 07 (Brand Identity) -> Module 05
- Module 02 (raw conviction) -> Module 01
- Module 09 (Invitation Strategy) -> Module 07
- Module 10 (Proof Strategy) -> Module 08
- Stale generator references corrected to Module 06B
- Module 04 (Digital Architecture) -> Module 09
- Updated Vital 3 terminology throughout
- Added "If stuck" guidance where applicable

**Version 1.0** -- January 2026

- Initial release

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
