---
id: 07_11-Brand-Mirror-Integration
title: Brand Mirror Integration
description: How Brand Mirror connects to the Langfell sales system
type: module-deliverable
version: 2.1
last-updated: '2026-07-10'
status: deprecated
superseded-by: 07-Prompt
reason: Component prompts consolidated into 07-Prompt.md. This file is retained as a deliverable template and output-shape reference, not an executable runner.
depends-on:
- 07-Prompt
- 07-Strategy-Schema
- 05-Handoff-Pack
- 02-Handoff-Pack
feeds-into:
- 07_08-Sales-Handoff-Pack
---


# 07_11 Brand Mirror Integration

**Module 07: Invitation Strategy — Reference 11 of 11**
_How Brand Mirror connects to the Langfell sales system_

---

## Purpose

This document maps the relationship between Brand Mirror (the 48-hour brand diagnostic product) and Module 07's Gap Research and sales system. It exists to:

1. **Clarify the commercial funnel** — how Brand Mirror fits between outreach and Langfell engagement
2. **Map outputs to inputs** — how Brand Mirror findings become Module 07 inputs
3. **Govern the evidence chain** — how claims made in Brand Mirror outreach pass Claims Boundary compliance
4. **Enable precision deployment** — how the system uses Brand Mirror as a qualification and proof tool

---

## The Commercial Funnel

```text
07_10 Gap Research (binary gap identified)
        |
        v
07B Precision Outreach (Columbo question — opens conversation)
        |
        v
Brand Mirror Purchase (£149 — 48-hour diagnostic)
        |
        v
Brand Mirror Report (evidence-based: declared vs. derived, coherence score)
        |
        v
Module 07 Engagement (Phase 1: £5-8k / Phase 2: £10-15k / Phase 3: £25-30k)
```

**What Brand Mirror does in this funnel:** It converts the Columbo question from a claim into a demonstrated finding. The outreach says "I notice this gap" — the Brand Mirror report says "here is the evidence." The report is the proof that makes the Langfell engagement invitation credible.

---

## Brand Mirror as Gap Research Output

Brand Mirror's core analysis — **Declared vs Derived** — is Gap Research at the brand level. When a Brand Mirror report is completed for a prospect, it produces the equivalent of a `07_10` Gap Research output, with additional detail:

| Brand Mirror Output | 07_10 Gap Research Equivalent |
| --- | --- |
| Declared position (what brand claims) | Their claim (exact published language) |
| Derived position (what brand actually communicates) | Evidence shows (binary gap evidence) |
| Coherence score | Gap severity indicator |
| Specific surface finding (verbatim quote) | Proof artifact for Columbo question |
| Industry context (Gap Principle layer) | Sector-level binary gap (Route A research) |

**If a Brand Mirror report exists for a prospect, it supersedes 07_10 as the Gap Research input.** The report is deeper, evidence-backed, and formatted for direct use in Module 07 conversation architecture.

---

## How Brand Mirror Feeds Module 07

### What to extract from a Brand Mirror report for Module 07 use

When a Brand Mirror report exists, extract the following before running the Module 07 conversation:

**For the Columbo question (Movement 2 of 07_03):**

```text
Their claim: [Declared position — verbatim from Brand Mirror Executive Summary]
Evidence shows: [Derived position / specific surface finding — verbatim from report]
Coherence score: [Overall score] — dimension most relevant: [dimension name]
Columbo question (direct form): "You describe your brand as [declared position]. But [specific surface finding from report]. I might be missing something — how do those fit together?"
```

**For Statement 2 (Transfer Moment Before) in 07_01:**

The derived position from Brand Mirror is strong evidence for the limiting belief the prospect currently holds about their brand. Use the derived position as the evidenced form of Statement 2.

**For Statement 4 (Belief Shift Proof) in 07_01:**

The Brand Mirror finding (with specific surface evidence, verbatim quotes, URLs) is the proof asset that demonstrates the gap is real and documentable. This proof is stronger than most alternatives at this stage because it is evidence-based, not assertion-based.

**For the Sales Handoff Pack (07_08) — Gap Research section (Part 9):**

| Field | Brand Mirror Source |
| --- | --- |
| Segment | Sector/industry from Brand Mirror industry context |
| Binary gap description | Declared vs. Derived delta from Executive Summary |
| Columbo question (direct) | Built from declared position + specific surface finding |
| Columbo question (open form) | Industry-level pattern from Gap Principle layer |
| Conviction trace | Which Module 01 conviction element the gap connects to |
| Claims boundary check | Verify all findings are within Module 05 Claims Boundaries |

---

## The Enhanced Outreach Sequence (Brand Mirror Aware)

When Gap Research (07_10) has been run and Brand Mirror has NOT yet been purchased, the outreach uses the Columbo question to open a conversation and position Brand Mirror as the natural next step.

### Pre-Brand Mirror outreach (Columbo → Brand Mirror offer)

```text
CLAIM (Columbo question, direct form):
"[Their exact claim from research]. But [specific evidence]. I might be missing something — how do those fit together?"

FEEL:
[One sentence making the consequence of the gap recognisable from the inside]

PROOF:
[One concrete, checkable artifact from the Gap Research — not invented]

INVITE:
"We run a Brand Mirror — a 48-hour evidence-based analysis of exactly this. It maps what your brand actually communicates versus what you intend. Would it be useful to see that before you make any decisions about [relevant context: rebrand, campaign, investment round]?"
```

**Tone note:** The invite is not a pitch for Langfell. It is a proportional next step from the observation. Brand Mirror at £149 is a low-commitment way to find out whether the observation is real. This is the correct relationship-stage invite.

### Post-Brand Mirror outreach (Report → Langfell engagement)

When a prospect has a Brand Mirror report, the conversation moves from "I noticed this gap" to "here's what the evidence shows." The report is the Proof step in the Claim → Feel → Proof → Invite sequence:

```text
CLAIM:
"The report confirmed [the core finding from the Brand Mirror Executive Summary]."

FEEL:
"[The finding from the report that makes the cost of the gap tangible — use a specific dimension finding]"

PROOF:
"[Verbatim evidence from the report — the specific surface finding, with URL if relevant]"

INVITE:
"[Proportional to relationship stage: debrief call, Phase 1 brief, strategy conversation]"
```

---

## Claims Boundary Compliance

All Brand Mirror outreach and conversation must pass Claims Boundary checks before use.

### Claims governed by Brand Mirror findings

| Claim type | Status | Notes |
| --- | --- | --- |
| Specific observation about a prospect's surface | **Can claim** if verbatim from Brand Mirror evidence | Must cite source (page, URL) |
| Coherence score interpretation | **Can claim** if using exact Brand Mirror score language | Do not extrapolate beyond what the score says |
| Industry pattern / sector gap | **Can claim** if sourced from Gap Research Route A data (dated, credible source) | State source; do not present as proprietary insight |
| Business impact (revenue, conversion) | **Must qualify** | "typically associated with" not "definitely costs you" |
| Internal culture or team dynamics | **Cannot claim** | Brand Mirror analyses public surfaces only; internal state is not evidenced |
| Competitor comparison | **Cannot claim** unless Brand Mirror explicitly ran comparatives | Do not imply Brand Mirror findings are relative unless report states this |

### Conviction trace requirement

Every Brand Mirror outreach piece must be traceable to a Module 01 conviction element. The gap observed in a prospect's brand should connect to what the builder genuinely holds. If the observation cannot be traced to a Module 01 conviction, it is opportunistic, not principled — and will read that way.

**Check:** "Why does this gap matter to me, specifically, given what I believe?" If the answer traces to the builder's Core Belief, Hidden Truth, or Non-Negotiable, the outreach passes. If the answer is "because it's a gap I can fix," it fails.

---

## How Brand Mirror Connects to the Langfell Module Stack

### Brand Mirror as Module 06 proof action (Layer 2)

A Brand Mirror report is a **precision proof action** — the builder demonstrating their diagnostic capability to a specific prospect. It proves Statement 4 (Belief Shift Proof) in practice: "here is what our diagnostic process actually produces."

This is why Brand Mirror belongs in the **Layer 2 channel strategy** (06_06): it is not broadcast content. It is precision-targeted action to a prospect where a binary gap has been identified.

### Brand Mirror feeds Module 08 (Proof Strategy)

Brand Mirror reports, over time, become the proof asset library for Module 08:

- Each report is evidence that the methodology produces findings
- Anonymised findings become industry benchmark data (Gap Principle layer)
- Sector patterns, once documented across multiple reports, become publishable sector research
- Published sector research becomes Layer 1 content (broadcast conviction) feeding back to Module 06

**The flywheel:** Gap Research (07_10) identifies sector patterns → Brand Mirror runs confirm them at the brand level → anonymised patterns become sector research → sector research becomes Layer 1 marketing content → Layer 1 content attracts belief-ready audience → belief-ready audience self-selects into Brand Mirror.

### Brand Mirror in the Module 11 context

Brand Mirror outreach is an **outreach-as-proof action** for Module 11. Each Columbo-question contact and subsequent Brand Mirror conversation is itself a demonstration of the builder's diagnostic conviction — not just a commercial transaction. This is the correct relationship between outreach and proof in the Langfell system.

---

## Quality Gate

Before deploying Brand Mirror in the Module 07 sales system, verify:

**Research quality:**
- [ ] Brand Mirror report is dated within 90 days (public surfaces change)
- [ ] All findings have verbatim source citations with URLs
- [ ] Industry context data (if used) has credible, dated source

**Claims boundary:**
- [ ] Every claim in outreach traces to a specific Brand Mirror finding
- [ ] Business impact language is qualified ("typically associated with"), not asserted
- [ ] No internal culture or dynamics claims

**Conviction trace:**
- [ ] The gap identified in Brand Mirror traces to the builder's Module 01 conviction
- [ ] The builder could explain why this gap matters to them specifically

**Sequence integrity:**
- [ ] Columbo question is the observation, not the pitch
- [ ] Brand Mirror is offered as a proportional next step (£149 diagnostic), not positioned as a gateway to Langfell engagement
- [ ] Post-Brand Mirror invite is proportional to the relationship stage (debrief, not close)

---

## Version Notes

For the detailed change history, see [07-CHANGELOG.md](07-CHANGELOG.md).

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
