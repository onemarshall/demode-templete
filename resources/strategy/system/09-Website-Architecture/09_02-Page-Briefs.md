---
id: 09_02-Page-Briefs
title: Page Briefs
description: Non-governing retained reference.
type: module-deliverable
version: 3.2
last-updated: '2026-07-10'
status: deprecated
superseded-by: 09-Prompt
reason: Component prompts consolidated into 09-Prompt.md. This file is retained as a deliverable template and output-shape reference, not an executable runner.
depends-on:
- 09-Prompt
- 09-Strategy-Schema
- 05-Handoff-Pack
- 08_13-Content-Handoff-Pack
feeds-into:
- 09-Handoff-Pack
---


# 09-02: Page Briefs

> **Non-governing retained reference.** This pre-consolidation component is retained only for historic section-pattern examples. Its references to confirmed archetypes and a Website Agent do not govern. Current page/destination briefs are produced only after M09 Digital Direction has passed its candidate, separate-destination, operating-gate and architecture-comparison decisions.

**Module 09 Langfell™**
_Strategic Structure Decisions for Each Page_

---

## Identity & Purpose

**This file is the logic library for page-brief generation.** The runtime that loops it over every page in the sitemap is the **`os-page-brief` skill** (`.agents/skills/os-page-brief/SKILL.md`).

Your job, when invoked, is to pull inputs from Modules 05–08 + the confirmed archetype into clear page-structure decisions: what sections appear on a single page, in what order, and why.

**This prompt produces (per page):** A Page Brief — structured recommendation for one page with section order, rationale, what's-not-on-the-page, and a coherence check.

**Why this matters:** Page structure is strategic, not arbitrary. Section order depends on visitor belief state, the objections to address, the proof available, the brand values, and what visitors expect from this page's role inside the confirmed archetype. This prompt makes those decisions explicit.

**Prerequisites:**

- **Confirmed archetype + modifiers** from `09_00-Site-Type-Archetypes.md` (set in `06-website-agent.md` Step 0) — determines table-stakes pages and expected functions.
- **09-01: Site Architecture** (adapted sitemap with pages, purposes, primary CTAs)
- **Module 05:** Brand Values, Belief Shift Journey, Voice, Claims Boundaries (required — dimensional gate)
- **Module 06:** Conversion goals, visitor belief stage, 10 marketing statements (required — dimensional gate)
- **Module 07:** Objections to address, sales narrative, qualification language (required — dimensional gate)
- **Module 08:** Content pillars, proof hierarchy, proof assets (required — hard gate)

See `09-README.md` Gate 0 for the full four-part precondition. If a builder must operate with partial upstream completion, see `09-Context.md` (Pathway B — named trade-offs).

---

## How the `os-page-brief` skill uses this file

The skill is the per-page executor. The flow:

1. The Website Agent (Step 2) loops the skill once per page in the confirmed sitemap.
2. The skill reads **this file** for the logic: Section Selection Rules, Section Order Rules, Coherence Rules, Page Brief Template.
3. The skill reads upstream packs (M05–M08, archetype, page slot from 09-01).
4. The skill writes one brief per page to `clients/[brand]/output/page-briefs/[NN]-[page-slug].md`.
5. After all per-page briefs are done, the agent compiles an index in `09-digital-strategy.md` § Page Briefs.
6. A single page can be re-briefed later by invoking the skill directly — no need to rerun the whole module.

**Bottom line:** Logic lives here. Runtime lives in the skill. Don't duplicate logic into the skill file — update this file and the skill picks it up.

---

## Governing Principle

Structure is strategy.

> "Section order isn't design convention. It's belief guidance. What visitors see first, second, third shapes how they read everything after."

---

## Inputs to Synthesize

### From Module 05: Brand Strategy

```text
BRAND VALUES:
1. [Value]: [Definition]
2. [Value]: [Definition]
3. [Value]: [Definition]

BELIEF SHIFT (if applicable):
FROM: [What visitors currently believe]
TO: [What we want them to believe]

VOICE:
Tone: [Characteristics]
Do: [Guidelines]
Don't: [Avoid]

CLAIMS BOUNDARIES:
Can Claim: [Fully supported]
Must Qualify: [Partially supported]
Cannot Claim: [Internal only]
```
### From Module 06: Belief Shift Strategy

```text
CONVERSION GOALS:
Primary: [Main action]
Secondary: [Alternative action]

VISITOR BELIEF STAGE:
[Where visitors are in belief journey when they arrive]

TRAFFIC SOURCES:
[Where visitors come from affects what they already know]
```
### From Module 07: Invitation Strategy

```text
KEY OBJECTIONS:
1. [Objection]: [How addressed]
2. [Objection]: [How addressed]
3. [Objection]: [How addressed]
```
### From Module 08: Proof Strategy

```text
AVAILABLE PROOF:
- [Proof asset 1]: [Type, strength]
- [Proof asset 2]: [Type, strength]
- [Proof asset 3]: [Type, strength]

MISSING PROOF:
- [What we'd like but don't have]
```
### From 09-01: Site Architecture

```text
PAGE: [Page Name]
URL: /[url]/
Purpose: [Why this page exists]
Target visitor: [Who this page serves]
Primary CTA: [Desired action]
```

---

## Page Brief Logic

### Section Selection Rules

**Include a section when:**

- It addresses a known objection (from Module 07)
- It deploys available proof (from Module 08)
- It advances the belief shift (from Module 05)
- It serves the page purpose (from 09-01)
- The archetype expects this function on this page role (from 09_00 — e.g. SaaS pricing pages expect a plan comparison; consulting offer pages expect a "Who this is for / not for" section)

**Exclude a section when:**

- No proof to support it (don't claim what you can't prove)
- It contradicts brand values
- It duplicates another section's function
- It doesn't serve the page purpose
- The archetype explicitly excludes it for this page role (rare, but happens — e.g. a Pricing page does not host long-form founder narrative)

### Section Order Rules

**Early in page (above fold / first scroll):**

- Value proposition (why should I care?)
- Belief shift trigger (challenge current thinking)
- Immediate credibility signal (if trust is low)

**Middle of page:**

- Problem elaboration (if visitor needs education)
- Solution explanation (how it works)
- Proof deployment (testimonials, case studies, data)
- Objection handling (address concerns)

**Late in page:**

- Risk reduction (guarantees, FAQs)
- Final CTA (action reinforcement)
- Alternative paths (for those not ready)

### Coherence Rules

**Non-negotiable (cannot change in Module 09):**

- Belief Shift Journey direction (FROM TO)
- Brand Values expression
- Voice rules (words to use/avoid)
- Claims Boundaries

**Adjustable (human can modify):**

- Section order
- Section inclusion/exclusion
- Emphasis within sections
- Which proof assets to feature

---

## Page Brief Template

For each page, produce the following:

---

### PAGE BRIEF: [Page Name]

**Page Context**

| Element                       | Value                                       |
| ----------------------------- | ------------------------------------------- |
| **URL**                       | /[url]/                                     |
| **Purpose**                   | [From 09-01]                                |
| **Target Visitor**            | [Who arrives here]                          |
| **Visitor Belief State**      | [What they currently believe when arriving] |
| **Primary CTA**               | [Desired action]                            |
| **Key Objections to Address** | [From Module 07, relevant to this page]     |

---

**Example Section Structure**

| #   | Section        | Purpose                | Rationale                  |
| --- | -------------- | ---------------------- | -------------------------- |
| 1   | [Section name] | [What it accomplishes] | [Why here, why this order] |
| 2   | [Section name] | [What it accomplishes] | [Why here, why this order] |
| 3   | [Section name] | [What it accomplishes] | [Why here, why this order] |
| 4   | [Section name] | [What it accomplishes] | [Why here, why this order] |
| 5   | [Section name] | [What it accomplishes] | [Why here, why this order] |
| N   | [Section name] | [What it accomplishes] | [Why here, why this order] |

---

**Section Details**

#### Section 1: [Section Name]

| Element                 | Specification                            |
| ----------------------- | ---------------------------------------- |
| **Purpose**             | [What this section must accomplish]      |
| **Key Message**         | [Core point to communicate]              |
| **Proof to Deploy**     | [Specific proof asset, or "none needed"] |
| **Objection Addressed** | [Specific objection, or "n/a"]           |
| **CTA**                 | [If applicable]                          |
| **Module 10 Note**      | [Only if this section creates a downstream design/interaction constraint] |

#### Section 2: [Section Name]

[Repeat for each section...]

---

**What's NOT On This Page**

| Excluded Element  | Reason                                                          |
| ----------------- | --------------------------------------------------------------- |
| [Section/element] | [Why excluded no proof, not relevant, contradicts values, etc.] |
| [Section/element] | [Why excluded]                                                  |

---

**Coherence Check**

| Check                          | Status              | Notes                       |
| ------------------------------ | ------------------- | --------------------------- |
| Advances Belief Shift Journey? | [x] Yes [x] N/A     | [How]                       |
| Values Expressed?              | [x] Yes             | [Which values, where]       |
| Claims Within Boundaries?      | [x] Yes             | [Any qualifications needed] |
| Objections Addressed?          | [x] Yes [x] Partial | [Which ones]                |
| Proof Deployed?                | [x] Yes [x] Partial | [What proof, where]         |

---

**Human Review Points**

Before confirming this brief, the human should consider:

1. **Section order:** Does this sequence make sense for YOUR visitors?
2. **Included sections:** Is anything missing that your audience expects?
3. **Excluded sections:** Should anything excluded be added (do you have proof)?
4. **Proof selection:** Are these the right proof assets to feature?
5. **Emphasis:** Should any section be more/less prominent?

**After human review, this brief feeds into 09B (Website Content Generator).**

---

## Example: Homepage Brief

### PAGE BRIEF: Homepage

**Page Context**

| Element                       | Value                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ |
| **URL**                       | /                                                                        |
| **Purpose**                   | Establish credibility, communicate value proposition, guide to next step |
| **Target Visitor**            | First-time visitors exploring whether we can help                        |
| **Visitor Belief State**      | Aware of problem, skeptical of solutions, comparing options              |
| **Primary CTA**               | Start free trial / Book a call                                           |
| **Key Objections to Address** | "Is this different?", "Will it work for me?", "Can I trust them?"        |

---

**Example Section Structure**

| #   | Section           | Purpose                                   | Rationale                                            |
| --- | ----------------- | ----------------------------------------- | ---------------------------------------------------- |
| 1   | Hero              | Capture attention, communicate core value | First impression; must answer "why should I care?"   |
| 2   | Problem Statement | Validate their pain                       | Before solution, show we understand; builds trust    |
| 3   | Solution Overview | Introduce our approach                    | Now that pain is validated, show the answer          |
| 4   | Social Proof      | Build credibility                         | Skeptical visitors need third-party validation early |
| 5   | How It Works      | Reduce uncertainty                        | Show the path; make it feel achievable               |
| 6   | Key Benefits      | Reinforce value                           | Concrete outcomes they'll get                        |
| 7   | Objection Handler | Address "is this for me?"                 | Common doubt that stops action                       |
| 8   | Footer CTA        | Final conversion push                     | Reiterate value, clear action                        |

---

**What's NOT On This Page**

| Excluded Element  | Reason                                              |
| ----------------- | --------------------------------------------------- |
| Detailed pricing  | Homepage is for interest; pricing on dedicated page |
| Team bios         | Not relevant to conversion decision at this stage   |
| Full case studies | Too much detail; link to case study page instead    |
| Blog feed         | Distracts from conversion path                      |

---

## Output: Per-Page Files + Combined Index

The `os-page-brief` skill writes one file per page:

```text
clients/[brand]/output/page-briefs/
├── 01-homepage.md
├── 02-features.md
├── 03-how-it-works.md
├── 04-pricing.md
├── 05-case-studies.md
├── 06-about.md
├── 07-contact.md
└── _archive/                # previous versions when a page is re-briefed
```

After all per-page briefs are written, the Website Agent compiles a combined index in `clients/[brand]/output/09-digital-strategy.md` § Page Briefs:

```text
## Page Briefs

| # | Page | URL | Status | File |
|---|------|-----|--------|------|
| 1 | Homepage | / | Confirmed | page-briefs/01-homepage.md |
| 2 | Features | /features/ | Pending review | page-briefs/02-features.md |
| 3 | Pricing | /pricing/ | Confirmed | page-briefs/04-pricing.md |
| … | … | … | … | … |

Archetype: [from 09-01]
Modifiers: [from 09-01]
Human Review Status: [Pending / Confirmed for N of M pages]
```

**Re-briefing a single page:** Invoke the skill directly with the page slot — it overwrites the per-page file and moves the previous version to `_archive/`. No need to rerun the whole module.

---

## Vital Check

Per-page check (the skill runs this for each brief):

- [ ] Confirmed archetype + modifiers recorded at the top of the brief
- [ ] Section structure with rationale for each section
- [ ] Synthesizes relevant Module 05–08 inputs (each section names its source)
- [ ] Archetype expectations for this page role checked (table-stakes functions present, archetype-excluded functions absent)
- [ ] Exclusions documented with reasons
- [ ] Coherence check completed (all boxes ticked or noted as deferred with rationale)

Module-level check (the Website Agent runs this after the loop):

- [ ] Every page in the confirmed sitemap (from 09-01) has a per-page file in `page-briefs/`
- [ ] Combined index in `09-digital-strategy.md` § Page Briefs is complete and current
- [ ] Adjacent pages cross-checked for contradictions
- [ ] Human has reviewed and confirmed briefs before 09B runs

---

## Handoff

**Per-page brief feeds into:**

- **`os-page-brief` skill** (runtime) — writes the brief file
- **09B: Website Content Generator** — composes the page from confirmed structure
- **Human review** — before 09B generates content, human confirms / adjusts structure

**Non-negotiable flow:**

```text
09-01 produces confirmed sitemap (with archetype + modifiers)
 →
Website Agent loops `os-page-brief` skill once per page
 →
Skill writes one brief per page to page-briefs/[NN]-[slug].md
 →
Human reviews structure (per page or in batch)
 →
Human confirms (with any adjustments — can re-invoke skill for single pages)
 →
09B generates content for each confirmed brief
```

Do not skip human review. Structure decisions affect everything downstream.

---

**If stuck:** A page brief isn't a wireframe. It's a strategic document explaining what each section proves and why it sits in that order. If your sections feel arbitrary, ask: "What does the visitor need to believe at each stage to keep going?" Sequence sections to build belief one step at a time. Don't sequence them to fill visual space.

---

## Time Estimate

**30-45 minutes per page** for initial brief generation

For a 10-page website: **5-8 hours** including synthesis and documentation

---

## Version Notes

**Version 3.1** — June 2026

- **Audit sync.** Replaced retired page-type wording with page-role/function language and changed visual-direction slots to Module 10 notes.

**Version 3.0** -- 28 May 2026

- Reframed as the **logic library** called by the `page-brief` skill (`.claude/skills/page-brief/SKILL.md`). Runtime is now the skill; logic stays here.
- Added confirmed archetype + modifiers (from `09_00-Site-Type-Archetypes.md`) as a hard prerequisite
- Section Selection Rules updated: archetype expectations now an explicit inclusion criterion ("the archetype expects this function on this page role"), and an exclusion criterion ("the archetype explicitly excludes it")
- Output rewritten: per-page files at `page-briefs/[NN]-[slug].md` + combined index in `09-digital-strategy.md`, replacing the single batch document
- Vital Check split into per-page (skill runs) and module-level (agent runs) checks
- Handoff flow updated to reflect skill-based per-page loop, including single-page re-brief path

**Version 2.0** -- February 2026

- Applied Langfell Voice Guide standards
- Fixed character encoding throughout (box drawing, arrows, section dividers, tree structures)
- Corrected all module cross-references to current numbering
- Module 07 (Brand Identity) -> Module 05 (in README)
- Module 04 (old self-ref) -> Module 09 (5 refs in README)
- Module 12 (old Design System) -> Module 10 (5 refs in README)
- Module 08/09/10 (old upstream refs) -> Module 06/07/08 (README prerequisites)
- Module 10 (old Economic Modeling) -> Module 04 (Handoff Pack)
- Fixed file path references in Context.md (07-_.md -> 09-_.md)
- Fixed internal deliverable ref (07-01 -> 09-01 in Philosophy)
- Fixed Cross-Module Pattern table (generator numbers and module refs)
- Added "If stuck" guidance where applicable

**Version 1.0** -- January 2026

- Initial release

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
