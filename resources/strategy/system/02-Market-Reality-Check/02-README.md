---
id: 02-README
title: Module 02 Market Reality Check README
description: DeMode™
type: module-doc
version: 2.8
last-updated: 2026-08-29
status: active
depends-on:
- 01-Handoff-Pack
- 01-Quality-Gates
- framework/00-Shared-Contracts
feeds-into:
- 02-Prompt
- 02-Handoff-Pack
- 03-README
---

# Module 02: Market Reality Check

**DeMode™**
_Decode the Beliefs That Shape Your Market_

---

## What This Module Does

Market Reality Check examines the **belief layer** beneath your market: what competitors and customers assume to be true, and where those assumptions may be wrong.

Traditional research describes _what_ a market looks like. This module examines _why_ it looks that way and where the assumptions behind it may be failing customers.

**Input:** Core Belief and all five conviction elements (Module 01) + draft Claims Boundary Inputs + competitor artifacts + customer pain signals
**Output:** An internal Reconnaissance Log plus a client-facing Market Reality Check that states the verdict, evidence, counterevidence, confidence, commercial significance, unproved matters and exact next decision. Internal classification remains Provisional A / Validated A / B / C.
**Time:** 8–12 hours for Provisional A; +6–10 hours for Validated A (devil's-advocate + customer falsification + Hidden-Truth trace)

---

## Why This Module Exists

Every competitive landscape is governed by shared beliefs: "This is what customers want." "This is how we must compete." "This is the only way to operate."

These beliefs set the terms of competition. When everyone accepts the same premises, they compete on the same dimensions. This module tests which boundaries are real and which are assumed.

When you understand what competitors _believe_ (not just what they do), you can identify where those beliefs may be wrong -- and where your conviction might create value.

---

## The Core Method: Two-Sided Artifact Decoding

We don't guess what competitors believe or how customers experience those beliefs. We use two distinct evidence categories:

| Category | Examples | What It Reveals |
| -- | -- | -- |
| **Industry / competitor artifacts** | Pricing, homepage claims, product architecture, policies, contracts, feature emphasis, service structures, operating behaviour | What the industry appears to believe |
| **Customer artifacts** | Reviews, interviews, sales conversations, support tickets, cancellation reasons, search language, feature requests, complaints, community discussions | How customers experience the consequences |

**The Rule:** No artifact, no claim. Competitor evidence cannot stand in for customer-pain evidence; customer evidence cannot by itself establish what competitors believe.

---

## Key Outputs

### Client decision verdict

The client-facing document opens with a practical ruling: proceed, stop or gather more evidence. It explains why, how confident to be, what remains unproved and what the next approval permits. It must state that permission to begin Business Commitments does not validate the business model.

Client documents name the work directly: **Founder Conviction Foundation → Market Reality Check → Business Commitments**. Numeric module labels remain internal and do not appear in the client reading path.

### 1. Terrain Analysis

Market health check: TAM (Total Addressable Market), growth trajectory, key trends, and confidence assessment.

### 2. Competitor Belief Map

| Competitor | Artifact (Evidence) | Decoded Belief | Vulnerability |
| -- | -- | -- | -- |
| Name | Specific observable evidence | The underlying assumption | Why it might fail |

### 3. Industry Default Statement

> "The consensus belief governing this market is [X], evidenced by [artifacts]."

### 4. Customer Pain Profile

| Element | What It Captures |
| -- | -- |
| **The Trigger** | What moment creates the search for a solution? |
| **The Hack** | What are they using instead? |
| **The Pain** | What do they hate about current options? |
| **The Limiting Belief** | What false assumption holds them back? |

### 5. Belief Gap Analysis

The synthesis: Industry Default Belief, customer frustration it creates, potential vacuum (where truth is being ignored), and alignment with your Core Belief.

### 6. Audience Access Evidence

Dated evidence shows where each Belief-Ready Segment seeks information, participates, compares options and permits contact. Finding an artefact on a platform does not establish that the audience uses it meaningfully or can be reached there commercially. Module 02 records that distinction; Module 06 uses the evidence to compare and choose channels.

### Quality Gates Flowchart

```text
  PRECONDITION
       │
       ▼
  ┌─────────┐   FAIL   ┌──────────────┐
  │Gate 0   │──────────►│Halt: return  │
  │01 Inputs│          │to Module 01  │
  └────┬────┘          └──────────────┘
       │ PASS
       ▼
  ┌─────────┐   FAIL   ┌──────────────┐
  │Gate 1   │──────────►│Gather        │
  │Artifacts│          │artifacts     │
  └────┬────┘          └──────────────┘
       │ PASS
       ▼
  ┌─────────┐   FAIL   ┌──────────────┐
  │Gate 2   │──────────►│Re-examine    │
  │Default  │          │competitors   │
  └────┬────┘          └──────────────┘
       │ PASS
       ▼
       .
       .   Gates 3–7 run in sequence
       .   (each fail routes to specified action)
       ▼
  ┌─────────┐   FAIL   ┌──────────────┐
  │Gate N   │──────────►│Specific      │
  │passed?  │          │action per    │
  └────┬────┘          │gate docs     │
       │ PASS         └──────────────┘
       ▼
  ┌─────────────────────────────────────────┐
  │  Gate 5: Condition Gate                 │
  │  Structural Strategic Risk Acknowledged   │
  │  (cannot fail-route — flags only)       │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │  OUTCOME: Provisional A / Validated A   │
  │  or B (no vacuum) / C (Hidden Truth gap)│
  └─────────────────────────────────────────┘
```

> See `framework/FW_21-Diagram-Reference.md` (P1.1) for canonical source.

---

## How to Use This Module

### Step 1: Gather Inputs

- Your Core Belief (from Module 01)
- 3–5 competitor websites (pricing pages, homepages, policies)
- 5+ customer conversations OR 20+ detailed reviews

### Step 2: Execute the Reconnaissance

Follow the execution prompt (`02-Prompt.md`), which is structured around the Builder Preconditions, Five Vacuum Gates, and one Condition Gate (Structural Strategic Risk) from `02-Philosophy.md`. `02_01-Market-Reconnaissance.md` is deprecated and retained as reference only.

0. **Module 01 Inputs Check (Hard Gate)** — Core Belief, all five conviction elements and draft Claims Boundary Inputs loaded verbatim; halt if missing
1. **Builder Preconditions check** — capability, standing, conviction alignment
1b. **Second-Voice Diagnostic Signal** (informational, not a Gate) — capture whether anyone with operational visibility holds a competing diagnosis to the founder's stated problem
2. **Terrain Pre-Check** — TAM, trajectory, tailwind, **Cyclical-vs-Structural Diagnosis** (Cyclical / Structural-positive / Structural-negative / Ambiguous)
3. **Gate 1 — Descriptive Default identified** (terrain + competitor artifacts; name the cohort if defaults are plural)
4. **Gate 2 — Default is Vulnerable** (evidenced failure, not contrarianism)
5. **Gate 3 — Customer pain traceable to the Default** (run Owned Customer-Evidence Audit first; then Pain Profile from owned + new evidence; distinct artifact source from Gate 2)
5c. **Audience Access Evidence** — record segment-specific media behaviour and reachability; separate evidence source from channel viability
6. **Gate 4 — Willingness to pay at a sustainable price**
7. **Gate 5 — Structural Strategic Risk (Condition Gate)** — four-pattern assessment; written Acknowledgment for each Present pattern; cannot fail-route
8. **Gate 6 — Hidden Truth evidenced in market** (sub-tests 6a + 6b; distinct artifact source from Gates 2 and 3)
9. **Synthesis** — Belief Gap Statement; route to Outcome A (Provisional or Validated, with Acknowledged Structural Risk if Gate 5 surfaced any), B, or C

### Step 3: Validate Before Proceeding

Complete the Vital Check before moving to Module 03.

---

## Vital Check (Threshold Gate)

**All markers must be met before proceeding:**

| Marker | Evidence Required | ✓ |
| -- | -- | --- |
| Market Health | TAM sufficient, trajectory positive/stable | |
| Artifacts Decoded | 3+ competitors with specific artifacts cited | |
| Default Identified | Industry Default stated with evidence | |
| Pain Confirmed | Customer pain linked to default (source cited) | |
| Alignment Checked | Vacuum aligns with Core Belief | |

**If all met:** Proceed to Module 03 (Business Commitments)
**If any missing:** Gather that evidence before proceeding
**If you cannot meet one:** Reassess whether this market fits your conviction -- OR whether your conviction itself needs refining. Module 02 failure often traces back to Module 01. Iteration back into Module 01 is the expected path when Module 02 reveals the Hidden Truth doesn't hold in this market.

**Note:** Failing a marker isn't failure -- it's information about where you need more evidence or where upstream refinement is needed. The marker that fails tells you exactly what to go and find.

---

## What This Module Does NOT Do

- **Prove commercial viability** -- It identifies potential vacuums, not proven opportunities (Module 04 handles economics)
- **Validate your conviction** -- It tests whether a vacuum exists, not whether you're right
- **Replace customer research** -- Decoded beliefs are hypotheses until customers confirm them
- **Select marketing channels** -- It supplies audience-access evidence; Module 06 compares and recommends the channel portfolio
- **Work without conviction** -- If you don't have a belief to test, you'll get a map but not insight

---

## Common Mistakes

| Mistake | Symptom | Fix |
| -- | -- | -- |
| Guessing beliefs | "I think they believe..." without evidence | Find the artifact first |
| Assuming default is wrong | "They believe X, so X must be false" | Test if your alternative is better |
| Every gap = opportunity | "There's a gap, let's fill it" | Validate pain + willingness to pay |
| Preference as truth | "I believe X, so market wants X" | Separate conviction from evidence |

---

## Connection to Other Modules

**Receives from Module 01:**

- Core Belief
- The Broken Thing
- The Hidden Truth
- The Non-Negotiable
- The Hard-Won Teaching
- The Legacy
- Builder Manifesto (for context)
- Natural Language Bank (for context)
- Evidence Matrix
- Draft Claims Boundary Inputs

**Note:** Belief Shift Journey is not a locked Module 01 output. It is drafted in Module 01 and finalised in Module 05.

**Sends to Module 03:**

- Industry Default Beliefs
- Competitor Belief Map
- Customer Limiting Beliefs
- Belief Gap Analysis
- Leverage Assessment
- **Second-Voice Diagnostic Signal** (founder's stated problem vs second voice's competing diagnosis, with diagnostic-signal verdict) — informs Module 03's Belief Challenge framing and Step 8b (Advocate Challenges)
- **Cyclical-vs-Structural Diagnosis** (Cyclical / Structural-positive / Structural-negative / Ambiguous, with evidence) — informs Module 03's positioning timeline
- **Acknowledged Structural Risk** (R1–R4 patterns with severity, mitigation routing, signed Acknowledgments) — risks routed to Module 03 are carried into Module 03's Friction Analysis and Risk Flags; risks routed to Modules 04/06/11 are carried forward unchanged for those modules to receive

**Sends to Module 06 as evidence lineage:**

- Audience Access Evidence with channel class, observed behaviour, usage mindset, reachability, dated source, market scope, confidence and unknowns
- This evidence does not authorise a platform. Module 06 refreshes time-sensitive facts and makes the comparative channel decision.

---

## Time Estimate

**Provisional A — Vacuum Identified, Builder-Verified (8–12 hours)**

| Activity | Time |
| -- | -- |
| Data gathering (3–5 competitor artifact sets, 5+ customer conversations or 20+ reviews) | 3–5 hours |
| Belief decoding (artifact-by-artifact, with distinct sources for Gates 2, 3, 5) | 2–3 hours |
| Five Gates check + Builder Preconditions confirmation | 2 hours |
| Synthesis + Reconnaissance Log | 1–2 hours |
| **Provisional total** | **8–12 hours** |

**Validated A — Externally Pressure-Tested (+6–10 hours)**

| Activity | Time |
| -- | -- |
| Devil's-Advocate Test (run with outsider, or written self-rebuttal) | 2–3 hours |
| Customer Falsification Test (min 5 belief-ready prospects) | 3–5 hours |
| Hidden-Truth Trace Test (re-run Gate 6 explicitly) | 1–2 hours |
| **Validated additional** | **+6–10 hours** |

**Realism note.** A 3–5 hour run gives you something that looks complete and hasn't been pressure-tested. Downstream modules inherit that thinness. The longer estimate is what passing Gates 1–7 honestly costs. If you can't budget the full time, run Provisional only, mark the status, and don't lock anything expensive until you've done the Validated work.

---

## Files in This Module

| File | Purpose |
| -- | -- |
| `02-README.md` | This document (what + how to use) |
| `02-Philosophy.md` | Why this module works this way |
| `02-Glossary.md` | Module-specific terminology |
| `02-Quality-Gates.md` | Pass/fail criteria for module completion |
| `02-Prompt.md` | AI facilitation prompt |
| `02_01-Market-Reconnaissance.md` | Deprecated execution prompt (retained as reference only) |

---

## Version Notes

**Version 2.7** — June 2026

- **Relationship to Gap Principle noted.** The Belief Gap Analysis (Module 02 output) and the Gap Research Framework (`07_10`) operate at different levels and should not be conflated. Module 02 identifies the sector-level belief gap — where the industry's default belief creates a strategic opening for the builder's conviction. `07_10` identifies a prospect-specific binary gap — where an individual prospect's published claims contradict observable evidence. The Module 02 Belief Gap is business position input; the `07_10` binary gap is precision sales input. Both trace to the builder's Module 01 conviction, but they serve different functions and run at different stages.

**Version 2.6** — May 2026

- **Added Owned Customer-Evidence Audit** as the first step of Gate 3 — audit lost-quote, churn-survey, support-ticket, sales-call, NPS, customer-success, and refund-email data before commissioning new research.

**Version 2.5** — May 2026

- **Added Cyclical-vs-Structural Diagnosis** to Terrain Pre-Check in the execution sequence. Module 02 now requires an explicit diagnosis of what's driving the founder's presenting symptom, with Ambiguous as a valid finding.

**Version 2.4** — May 2026

- **Added Second-Voice Diagnostic Signal step (1b)** between Builder Preconditions and Terrain Pre-Check in the execution sequence. Informational step (not a Gate) that captures competing diagnoses from anyone with operational visibility on the business.

**Version 2.3** — May 2026

- **Added Module 01 Inputs Check (Hard Gate)** as Step 0 in the execution sequence — Module 02 now halts if Module 01 outputs aren't loaded.
- **Added Gate 5 — Structural Strategic Risk (Condition Gate)** between Gate 4 (Willingness to Pay) and the Hidden Truth gate. Gate 5 surfaces structural risk patterns (revenue concentration, TAM trajectory, demand-source fragility, founder-as-business risk), requires written Acknowledgment, and cannot fail-route.
- **Renumbered Hidden Truth gate from Gate 5 to Gate 6** throughout the module documentation.
- **Updated execution sequence** in "Step 2: Execute the Reconnaissance" to reflect new step numbering and the Condition Gate.

**Version 2.0** -- February 2026

- Applied DeMode™ Voice Guide standards
- Corrected metadata IDs and cross-references
- Updated module numbering to align with current framework
- Added difficulty markers and "If stuck" guidance
- Clarified connection to upstream/downstream modules

**Version 1.0** -- January 2026

- Initial release

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
