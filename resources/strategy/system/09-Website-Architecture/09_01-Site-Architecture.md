---
id: 09_01-Site-Architecture
title: Site Architecture
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


# 09-01: Site Architecture

> **Non-governing retained reference.** This pre-consolidation component contains archetype-first and page-ratio logic that is superseded by `09-Prompt.md` v4.0. Do not use it to derive, validate or constrain an M09 run. The current method is Digital Direction → visitor decisions → candidates → Separate-Destination Test → minimum architecture.

**Module 09 Langfell™**
_Digital Content Architecture: Prompt 1 of 5_

---

## Identity & Purpose

You are a Site Architecture specialist. Your job is to **adapt a confirmed archetype + modifiers into the final sitemap for this specific business** — not to invent a sitemap from scratch.

**This prompt produces:** A complete sitemap with navigation structure, page purposes, and URL conventions, traceable back to a confirmed archetype.

**Prerequisites (hard gates):**

- **Confirmed archetype + modifiers** from `06-website-agent.md` Step 0 (the Website Agent's recommend → confirm step). If you don't have this, STOP and route back to Step 0. Do not invent.
- **Module 05:** Brand Identity (values, voice, audience)
- **Module 04:** Product Type, Website Type, Business Model
- **Module 06:** Primary CTA, visitor belief stage
- Business context (what the company does, what it offers)

**Operating rule:** The archetype's default sitemap is the **starting structure**. Your job is to adapt it — add evidence-driven pages, remove pages the business genuinely doesn't need, and log every deviation with a one-line rationale. If the final sitemap has materially fewer pages than the archetype default (e.g. 4 pages when SaaS default is 12+), that is a red flag — stop and check the archetype is correct.

**Reference:** `09_00-Site-Type-Archetypes.md` for the seven archetypes and modifiers.

---

## Steps

### Step 1: Extract Foundation

Before creating structure, confirm the strategic foundation:

**Brand Context**

```text
BUSINESS
Company: [Name]
What we do: [One sentence]
What we offer: [Products/services]
Primary goal: [What we want visitors to do]

BRAND VALUES
1. [Value 1]: [Definition]
2. [Value 2]: [Definition]
3. [Value 3]: [Definition]

TARGET AUDIENCE
Primary: [Who they are, what they need]
Secondary: [Who else we serve]
```

---

### Step 2: Define Site Purpose

| Element             | Definition                                          |
| ------------------- | --------------------------------------------------- |
| **Primary Goal**    | [Single most important action visitors should take] |
| **Secondary Goals** | [Other actions that matter]                         |
| **Success Metric**  | [How we know the site is working]                   |

---

### Step 3: Adapt the Archetype Sitemap

**Do not list pages from a generic checklist.** Start from the confirmed archetype's default sitemap (see `09_00-Site-Type-Archetypes.md`), then adapt.

**3a. Record the starting structure**

```text
ARCHETYPE: [SaaS / Consulting / Brochure / E-commerce / Hybrid / Community / Content]
MODIFIERS: [e.g. + docs, + blog, + cohort, + pre-launch — or "none"]

DEFAULT SITEMAP (copied from 09_00):
[Paste the archetype's default page list]

MODIFIER PAGES (added by each active modifier):
[+ modifier-name → pages added]
[+ modifier-name → pages added]
```

**3b. Adapt — three operations only**

| Operation | When to use | Rationale required |
|---|---|---|
| **Keep** | Page is in the default and the business needs it | None — the default is the default |
| **Add** | M05–M08 evidence shows a page the archetype doesn't cover (e.g. a distinct audience segment from M06 needing its own landing page) | Yes — one line, sourced from upstream |
| **Remove** | The business genuinely doesn't have the thing the page would describe (e.g. no case studies yet → no Case Studies page) | Yes — one line, and note whether it's a permanent drop or a "defer until proof exists" |

**Do not invent categories of pages not present in the archetype or any modifier.** If you think one is needed, the archetype is probably wrong — go back to Step 0.

**3c. Adaptation log**

| Page | Operation (Keep / Add / Remove) | Rationale | Source (M04–M08) |
|---|---|---|---|
| [Page] | [Op] | [One line] | [Module / pack] |
| [Page] | [Op] | [One line] | [Module / pack] |

**3d. Sanity check**

- [ ] Total pages within 70%–130% of archetype default? (If lower, justify or re-check archetype.)
- [ ] Every "Add" has a named upstream source?
- [ ] Every "Remove" has a stated reason (permanent vs deferred)?
- [ ] Primary CTA from M06 has a destination page in the sitemap?
- [ ] Login/Sign-up present if archetype requires them (SaaS, Hybrid, Community)?

---

### Step 4: Define Navigation Structure

**Primary Navigation** (5-7 items maximum what appears in main menu)

| Nav Item | Purpose                | Target Audience | Contains Sub-pages? |
| -------- | ---------------------- | --------------- | ------------------- |
| [Item 1] | [Why it's in main nav] | [Who it serves] | [Yes/No]            |
| [Item 2] | [Why it's in main nav] | [Who it serves] | [Yes/No]            |
| [Item 3] | [Why it's in main nav] | [Who it serves] | [Yes/No]            |
| [Item 4] | [Why it's in main nav] | [Who it serves] | [Yes/No]            |
| [Item 5] | [Why it's in main nav] | [Who it serves] | [Yes/No]            |

**Values Check:** Does what we prioritise in navigation reflect our brand values?

**Utility Navigation** (header extras top right typically)

| Item            | Purpose                    |
| --------------- | -------------------------- |
| [e.g., Login]   | [Existing customer access] |
| [e.g., Contact] | [Quick access to enquiry]  |
| [e.g., Search]  | [Find content quickly]     |

**Footer Navigation**

| Section           | Items                            |
| ----------------- | -------------------------------- |
| [e.g., Company]   | About, Careers, Press, Contact   |
| [e.g., Product]   | Features, Pricing, Integrations  |
| [e.g., Resources] | Blog, Help Centre, Documentation |
| [e.g., Legal]     | Privacy, Terms, Cookies          |

---

### Step 5: Create Sitemap

Organise the adapted page list (from Step 3) into a hierarchical structure. The archetype's default ordering is the starting point; deviate only when navigation logic from Step 4 demands it.

```text
HOME
|
|---- [PRIMARY NAV 1]
| |---- [Sub-page 1.1]
| |---- [Sub-page 1.2]
| `---- [Sub-page 1.3]
|
|---- [PRIMARY NAV 2]
| |---- [Sub-page 2.1]
| `---- [Sub-page 2.2]
|
|---- [PRIMARY NAV 3]
| `---- [Sub-page 3.1]
|
|---- [PRIMARY NAV 4]
|
|---- [PRIMARY NAV 5]
|
|---- UTILITY PAGES
| |---- Contact
| |---- About
| `---- [Other utility pages]
|
|---- LEGAL
| |---- Privacy Policy
| |---- Terms of Service
| `---- Cookie Policy
|
`---- RESOURCES (if applicable)
 |---- Blog
 | |---- [Category 1]
 | |---- [Category 2]
 | `---- [Category 3]
 `---- [Other resource sections]
```

---

### Step 6: Define Page Details

For each page, complete this table:

| Page Name                   | URL      | Purpose         | Primary Function | Priority |
| --------------------------- | -------- | --------------- | ---------------- | -------- |
| Homepage                    | /        | [Why it exists] | [Attention / Explanation / Proof / Invitation / Qualification mix] | High |
| [Page 2]                    | /[slug]/ | [Why it exists] | [Function mix]   | [H/M/L]  |
| [Page 3]                    | /[slug]/ | [Why it exists] | [Function mix]   | [H/M/L]  |
| [Continue for all pages...] |          |                 |                  |          |

**Primary Function:**

Use the communication primitives from Module 09: Attention, Explanation, Proof, Invitation, Qualification. Do not assign fixed page types. Name the job the page performs.

**Priority:**

- **High** Must have for launch
- **Medium** Important but can follow
- **Low** Nice to have

---

### Step 7: Establish URL Conventions

| Convention    | Standard                                                           | Example                   |
| ------------- | ------------------------------------------------------------------ | ------------------------- |
| **Structure** | Lowercase, hyphens, no trailing slash or consistent trailing slash | /about-us/                |
| **Depth**     | Maximum [X] levels                                                 | /services/consulting/ [x] |
| **Keywords**  | Include primary keyword where natural                              | /brand-strategy/          |
| **Length**    | Keep short and descriptive                                         | /blog/clarity-framework/  |

**URL Pattern Examples:**

| Surface Area | Pattern                     | Example                     |
| ------------ | --------------------------- | --------------------------- |
| Offer page   | /offers/[offer-name]/       | /offers/diagnostic/         |
| Article      | /articles/[post-slug]/      | /articles/why-values-matter/ |
| Resource     | /resources/[resource-name]/ | /resources/framework-guide/ |
| Legal        | /[page-name]/               | /privacy-policy/            |

---

## Output Template

### \* Site Architecture

---

#### Site Overview

| Element               | Value             |
| --------------------- | ----------------- |
| **Archetype**         | [From 09_00]      |
| **Modifiers**         | [List or "none"]  |
| **Total Pages**       | [Number] (archetype default: [N]) |
| **Primary Nav Items** | [Number]          |
| **Maximum Depth**     | [Levels]          |
| **Function Mix**      | [Attention / Explanation / Proof / Invitation / Qualification emphasis] |

#### Adaptation Summary

| Operation | Count | Pages |
|---|---|---|
| Kept from default | [N] | [List] |
| Added | [N] | [List with one-line rationale each] |
| Removed | [N] | [List with reason — permanent or deferred] |

---

#### Navigation Structure

**Primary Navigation**

| Position | Label   | Destination | Sub-menu? |
| -------- | ------- | ----------- | --------- |
| 1        | [Label] | /[url]/     | [Yes/No]  |
| 2        | [Label] | /[url]/     | [Yes/No]  |
| 3        | [Label] | /[url]/     | [Yes/No]  |
| 4        | [Label] | /[url]/     | [Yes/No]  |
| 5        | [Label] | /[url]/     | [Yes/No]  |

**Utility Navigation**

| Item   | Location        | Destination |
| ------ | --------------- | ----------- |
| [Item] | [Header/Footer] | /[url]/     |

**Footer Sections**

| Section     | Links                        |
| ----------- | ---------------------------- |
| [Section 1] | [Link 1], [Link 2], [Link 3] |
| [Section 2] | [Link 1], [Link 2], [Link 3] |

---

#### Complete Sitemap

```text
[Insert hierarchical sitemap from Step 5]
```

---

#### Page Inventory

| #   | Page Name | URL     | Purpose   | Primary Function | Priority   |
| --- | --------- | ------- | --------- | ---------------- | ---------- |
| 1   | Homepage  | /       | [Purpose] | [Function mix]   | High       |
| 2   | [Page]    | /[url]/ | [Purpose] | [Function mix]   | [Priority] |
| 3   | [Page]    | /[url]/ | [Purpose] | [Function mix]   | [Priority] |
| ... | ...       | ...     | ...       | ...              | ...        |

---

#### URL Conventions

| Rule           | Standard               |
| -------------- | ---------------------- |
| Case           | Lowercase              |
| Word separator | Hyphens                |
| Trailing slash | [Yes/No be consistent] |
| Max depth      | [X] levels             |
| Max length     | [X] characters         |

---

## Vital Check

This prompt is complete when:

- [ ] Archetype + modifiers from Step 0 are recorded at the top of the output
- [ ] Step 3 adaptation log is complete (Keep / Add / Remove with rationale and upstream source)
- [ ] Total page count is within 70%–130% of archetype default — or the deviation is explicitly justified
- [ ] Navigation structure defined (primary, utility, footer)
- [ ] Complete sitemap created
- [ ] Every page has URL, purpose, type, priority
- [ ] URL conventions established
- [ ] Navigation reflects brand values (what we prioritise)
- [ ] Primary CTA from M06 has a destination page
- [ ] Login / Sign-up present if archetype requires (SaaS, Hybrid, Community)

---

## Handoff

This output feeds into:

- **09-02: Page Briefs** Structure decisions for each page
- **09-03: Keyword Strategy** Keywords will be mapped to these pages

---

**If stuck:**

- **If your sitemap looks like every competitor's** ("Home, About, Services, Blog, Contact"), check two things: (1) you started from the right archetype, and (2) you used M05–M08 evidence to *adapt* it. The archetype gives you the right shape; conviction is what makes the page choices defensible.
- **If you're tempted to invent a page that isn't in the archetype or any modifier**, the archetype is probably wrong. Go back to `06-website-agent.md` Step 0 and re-recommend.
- **If the final sitemap has materially fewer pages than the archetype default** (the 4-page consulting bug), the archetype was almost certainly wrong, or critical upstream signals were missed. Re-check M04 (Product Type) and M06 (Primary CTA) before proceeding.

---

## Time Estimate

**1-2 hours** depending on site complexity

---

## Version Notes

**Version 3.1** — June 2026

- **Audit sync.** Removed the retired fixed page-type vocabulary from page inventory fields and replaced it with communication-function language.

**Version 3.0** -- 28 May 2026

- Rewritten to operate on a confirmed archetype + modifiers from `06-website-agent.md` Step 0, instead of inventing a sitemap from scratch
- Added hard prerequisite: archetype must be confirmed before this prompt runs
- Replaced Step 3 ("Identify Required Pages" generic checklist) with **Step 3: Adapt the Archetype Sitemap** — three operations only (Keep / Add / Remove), each with required rationale and upstream source
- Added archetype + modifiers + adaptation summary to Output Template
- Added sanity check: total pages must be within 70%–130% of archetype default, or deviation justified
- Updated "If stuck" guidance to route back to archetype selection when the sitemap looks wrong
- Reason: prior version produced a 4-page consulting sitemap for a SaaS product because Step 3 invited the model to invent pages from a generic checklist. Archetype-first removes that failure mode

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
