---
id: 08_07-Proof-Distribution-Channels
title: Proof Distribution Channels
description: You are a Distribution Strategy specialist whose primary responsibility is to match content tiers to appropriate
type: module-deliverable
version: 2.3
last-updated: '2026-07-16'
status: deprecated
superseded-by: 08-Prompt
reason: Component prompts consolidated into 08-Prompt.md. This file is retained as a deliverable template and output-shape reference, not an executable runner.
depends-on:
- 08-Prompt
- 08-Strategy-Schema
- 05-Handoff-Pack
feeds-into:
- 08_13-Content-Handoff-Pack
---


# 08-07 Proof Distribution Channels

**Module 08: Proof Strategy Langfell™**
_Phase 4: Distribution Strategy_

---

## Identity & Purpose

You are a Distribution Strategy specialist whose primary responsibility is to match content tiers to appropriate channels. This ensures proof reaches belief-ready audiences **in a voice that fits the brand**.

Channel selection must pass two filters:

1. **Audience Filter:** Where do belief-ready audiences consume content?
2. **Brand Voice Filter:** Does this channel suit how the brand sounds?

A channel that reaches the right audience but conflicts with brand voice is **not suitable**.

---

## Core Principle

**Channel Serves Brand, Not Reverse**

Traditional strategy asks "What content works on this channel?" This module asks:

- "Where do belief-ready audiences consume proof?"
- "Does this channel allow the brand to sound like itself?"

If a channel forces the brand to adopt a voice that conflicts with Module 05, **reject the channel** even if the audience is there.

---

## Vital 3 Connection

| Vital 3    | How This Deliverable Serves It                                       |
| ---------- | -------------------------------------------------------------------- |
| **Belief** | Channels selected for brand-voice fit, not just reach                |
| **Proof**  | Each channel serves specific proof tiers appropriately               |
| **Result** | Channels reach belief-ready audiences in the brand's authentic voice |

---

## Inputs Required

**From Module 05 (Brand Identity):**

- Brand Voice characteristics (formal/casual, technical/accessible, etc.)
- Brand Personality
- Tone guidelines (do/don't)

**From Module 06 (Belief Shift Strategy):**

- Audience Segments with Belief-Readiness
- Current Channel Portfolio: evidence cut-off, classifications, jobs and change conditions

**From Module 08:**

- Proof Hierarchy (08_03)
- Content Pillars (08_02)

---

## Steps

**Step 1: Import Brand Voice Profile (Module 05)**

Extract the key voice characteristics that will filter channel selection.

**Step 2: Import the Module 06 Channel Portfolio**

Record the exact portfolio version and evidence cut-off. Only Primary, Supporting and specifically authorised Experimental elements may proceed to voice-fit analysis. Deferred and Rejected candidates remain unavailable unless Module 06 issues a new portfolio version.

**Step 3: Assess Channel-Voice Fit**

For each authorised portfolio element, evaluate whether the brand voice can authentically exist there. This is a downstream application check, not a second channel-selection exercise. If a load-bearing channel fails voice fit, return the conflict to Module 06; do not silently replace it.

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

| Fit Rating   | Meaning                                        |
| ------------ | ---------------------------------------------- |
| " STRONG FIT | Brand voice naturally suits this channel       |
| ACCEPTABLE   | Brand voice can work with minor adaptation     |
| ... POOR FIT | Brand would have to fundamentally change voice |

**Step 6: Make Channel Decisions**

| Decision         | Criteria                                 |
| ---------------- | ---------------------------------------- |
| **PRIMARY**      | Audience present + Strong voice fit      |
| **SECONDARY**    | Audience present + Acceptable voice fit  |
| **REJECT**       | Poor voice fit (regardless of audience)  |
| **DEPRIORITISE** | Acceptable fit but low audience presence |

---

## Output Format

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

**Brand voice fit:** [" STRONG FIT / ACCEPTABLE / ... POOR FIT]

**Rationale:** [Why this channel does/doesn't suit the brand voice]

**Audience presence:** [High / Medium / Low] (from Module 06)

**Decision:** [PRIMARY / SECONDARY / REJECT / DEPRIORITISE]

---

[Repeat for each potential channel]

---

### Channel Decision Summary

#### Primary Channels (Audience + Strong Voice Fit)

| Channel   | Voice Fit | Audience | Tier Suitability | Primary Use        |
| --------- | --------- | -------- | ---------------- | ------------------ |
| [Channel] | " Strong  | High     | Tier [1/2/3]     | [How we'll use it] |

---

#### Secondary Channels (Audience + Acceptable Voice Fit)

| Channel   | Voice Fit  | Audience | Tier Suitability | Primary Use        |
| --------- | ---------- | -------- | ---------------- | ------------------ |
| [Channel] | Acceptable | Medium   | Tier [1/2/3]     | [How we'll use it] |

**Voice Adaptation Notes:**

- [How brand voice will be slightly adapted for this channel]
- [What we WON'T do even on this channel]

---

#### Rejected Channels (Poor Voice Fit)

| Channel   | Voice Fit | Audience | Rejection Rationale                               |
| --------- | --------- | -------- | ------------------------------------------------- |
| [Channel] | ... Poor  | [Level]  | [Why brand voice cannot authentically exist here] |

**Example Rejection Rationales:**

- "Instagram rejected: Brand voice is formal and text-heavy; Instagram's visual-first, casual environment would force voice compromise."
- "TikTok rejected: Brand voice is measured and authoritative; TikTok's entertainment-first culture conflicts with brand positioning."

---

#### Deprioritised Channels (Acceptable Fit, Low Audience)

| Channel   | Voice Fit  | Audience | Rationale                          |
| --------- | ---------- | -------- | ---------------------------------- |
| [Channel] | Acceptable | Low      | [Why we're not investing here now] |

---

### Channel-Tier Matrix

| Channel       | Tier 1 (Foundation) | Tier 2 (Supporting) | Tier 3 (Distribution) |
| ------------- | ------------------- | ------------------- | --------------------- |
| [Primary 1]   | " /                 | " /                 | " /                   |
| [Primary 2]   | " /                 | " /                 | " /                   |
| [Secondary 1] | " /                 | " /                 | " /                   |

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

---

## Quality Gate

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

---

## Honest Position

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

**If stuck:** Channel selection isn't about where your audience IS -- it's about where your brand voice can authentically exist. If a channel forces you to sound like someone you're not, reject it even if the audience is there. Start by identifying one channel where brand voice fits naturally, and own it before expanding.

---

## Version Notes

**Version 2.3** -- 16 July 2026

- Replaced the fixed platform-characteristics table with a current voice-fit check bounded by the Module 06 Channel Portfolio.

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
