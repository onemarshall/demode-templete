---
id: 02-Prompt
title: Module 02 Prompt
description: Apply the FW_27 Client-language translation gate to every client-facing market document.
type: module-prompt
version: 4.5
last-updated: 2026-08-29
status: active
depends-on:
- 02-Philosophy
- 02-Quality-Gates
- 01-Handoff-Pack
- 01-Quality-Gates
- FW_15-Upstream-Inputs-Hard-Gate
- framework/00-Shared-Contracts
feeds-into:
- 02-README
- 02-Handoff-Pack
- 03-Business-Commitments
---

# Module 02: Market Reality Check Prompt

> **Client paths:** Before reading inputs or writing outputs, resolve the selected client using `../templates/00-Entry-Brief-Folder-Convention.md`. Its Input, Output, collection, asset and private run destinations override legacy flat output examples. Keep existing authority and approval gates unchanged.


## Client-language translation gate

Apply the `FW_27` Client-language translation gate to every client-facing market document. Preserve evidence strength and uncertainty, but express findings as what has been observed, what it may mean and what remains to be tested rather than as research-framework machinery.

## Meaning Record requirement

Apply `FW_35` to every load-bearing market conclusion. Preserve exact evidence and counter-evidence; ground the interpretation in an observable situation and keep it provisional until the evidence supports more. Do not ask a founder to confirm an external fact they have not observed.

## FW_32 accountability requirements — required

Apply `framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`.

Preserve diagnosis evidence, counter-evidence, contradiction language, source period, cohort and access limits so later owners can establish a legitimate starting state. These records are candidate baseline evidence, not a realised effect or attribution claim. Record material market, access and evidence assumptions in the run-level Assumption Register with owner, test, confidence and expiry.

Where an accepted Module 02 decision causes research, access or evidence work, create a non-monetary Implementation Consequence and Cost Driver. Do not create a monetary estimate or infer a supportive baseline from unavailable evidence. Keep strategic, production, publication, budget and spend approval separate.

**DeMode™**
_Decoding Market Beliefs, Not Just Behaviours_

---

## Entry Brief Routing and Client Delivery — Required

Read the active `00-Entry-Brief.md` and exact approved `00-Engagement-Brief.md` before starting. The Engagement Brief supplies confirmed factual identity, category, engagement situation, commissioning/decision authority, requested work, provisional scope and constraints.

Market evidence and conclusions remain owned by this module. The brief cannot satisfy a market gate or turn a client statement into evidence. Follow the Entry Brief’s Module 02 route:

- **Skip:** do not run the module and do not create a new Module 02 client deliverable. Preserve the named locked source as upstream authority; never copy or relabel that source as a generated Module 02 output.
- **Light Pass:** translate the authorised existing evidence into the canonical Reconnaissance Log, state what was and was not retested, and mark unresolved evidence gaps. Do not merely copy the source document under a Module 02 filename.
- **Constrained Run:** complete the full method for open questions while inheriting pre-locked inputs verbatim.
- **Full Run:** complete artefact gathering, all gates, synthesis and outcome at full semantic depth.

The client document contains the complete market finding and its reader-facing interpretation. Follow the Business Groundwork structure in `FW_23`: what this work establishes, the current finding, its supporting evidence, boundaries and open questions, and what moves forward.

Put handoff, source-control, lifecycle, invalidation, re-entry and lock records in `02-Handoff-Pack.md` or the run manifest. Remove only internal controls from client delivery. Preserve the full market evidence, counter-evidence, gate findings and outcome rationale.

In the client document, refer to the upstream work as **Founder Conviction Foundation**, this work as **Market Reality Check**, and the next work as **Business Commitments**. Do not expose `Module 01`, `Module 02`, `Module 03`, `M01`, `M02`, `M03` or “the next module” in visible client prose, headings, tables, approvals or document maps. Numeric module identifiers remain internal traceability only.

### Client decision verdict — required

Near the beginning of the Executive Overview, render a compact Module 02 verdict that lets the client understand the ruling without reconstructing the research method. It must state, in this order:

1. `PROCEED TO MODULE 03`, `DO NOT PROCEED` or `RETURN FOR EVIDENCE`, with the exact cohort and scope;
2. what the market check found in plain business language;
3. confidence expressed as the decision the evidence is sufficient to support;
4. what remains unproved; and
5. the exact next permission or return route.

State beside the verdict: **“This is a green light for the next strategic question, not a green light for the business model.”** Outcome A means there is enough external support to ask Module 03 what the business is prepared to commit to. It does not mean buyers will purchase that commitment at a viable price.

Follow the verdict with a short `Why this matters commercially` explanation. Name the buyer-side situation in which the founder's conviction could create relevant value, then retain the evidence limit. Do not manufacture a commercial consequence merely to make the finding sound valuable.

The Executive Overview answers four questions in this order:

1. **What did we find?**
2. **Why do we believe it?**
3. **What does the evidence not prove?**
4. **What happens next?**

Present practical meaning before internal classifications. For example, first say that enough external evidence exists to move to the next decision at the named scope; then record `Internal classification: Validated Outcome A`. Technical labels confirm the judgement but never carry the burden of explaining it.

## Runtime Source and Collection Control

Preserve Source Basis Records, unknowns and Conflict Pairs from the Entry Brief and Module 01. For every load-bearing Industry Default, Belief Gap, pain, willingness-to-pay, audience-access or market conclusion, record the exact source basis and linked Evidence Item.

Use these distinctions:

- founder testimony is a `direct_statement`; it may originate a hypothesis but cannot independently satisfy a market-evidence gate;
- observable market artefacts and customer evidence retain their own source and evidence IDs;
- `working_inference` remains an inference;
- contrary evidence remains visible and linked;
- unavailable access remains `unknown` or `restricted`, never inferred as a supportive observation.

Record research collection separately as `not_started`, `in_progress`, `partial`, `interrupted`, `completed`, `incomplete_access`, `incomplete_timeout`, `resumed`, or `superseded`. A partial, interrupted or incomplete collection cannot produce Outcome A.

### Proportional evidence sufficiency

Keep the focused reconnaissance method. Deepen the evidence only when the accepted decision context records one of these triggers:

- a material or high-structural consequence;
- material market opacity;
- regulatory exposure; or
- difficulty reversing the decision.

Deeper work may use more diverse sources, a longer observation period, disconfirming voices or specialist evidence review. It must not impose an arbitrary enterprise sample size or become comprehensive market research.

Every depth increase records its trigger, evidence need, stopping condition and unresolved limit. Company size alone is not a trigger. Where the relevant context is unknown, ask or retain a Provisional ceiling; do not infer low materiality.

## What This Prompt Does

This is the canonical AI-facilitation prompt for Module 02. It decodes beliefs from gathered artefacts, runs them through the Builder Preconditions and Five Vacuum Gates, and produces the Reconnaissance Log defined below. Deprecated `02_01-Market-Reconnaissance.md` is provenance only.

**How to use:** Provide this prompt to an AI assistant along with your Module 01 outputs (Core Belief + all five conviction elements + draft Claims Boundary Inputs). Name your competitors and target cohort. The AI gathers publicly available artefacts — competitor pages, customer reviews, market data — then works through Preconditions → Five Gates → Synthesis → Outcome.

**Input:** Module 01 outputs (Core Belief, The Broken Thing, The Hidden Truth, The Non-Negotiable, The Hard-Won Teaching, The Legacy, draft Claims Boundary Inputs) + competitor names + target cohort description. The AI handles artefact gathering in Step 0b. Supplement with any owned customer data (CRM exports, churn surveys, sales-call notes) — owned evidence is still stronger than public evidence for Gate 3, but must be loaded with appropriate privacy/consent and access constraints.
**Output:** Reconnaissance Log with Outcome verdict (Provisional A / Validated A / B / C). A Validated A outcome does not itself lock Module 05; Module 03 must confirm the strategic bet and route it through M04 before M05 can lock.
**Time:** 60–90 minutes. Add several hours for the Validated A pressure-tests (Devil's-Advocate, Customer Falsification, Hidden-Truth Trace) — see `02-Quality-Gates.md`. The Customer Falsification Test still requires you to speak to real prospects.

---

## AI Prompt for Module 02

**To the AI Assistant:**

You are facilitating Module 02 of the DeMode framework, *Market Reality Check*. Your role is to decode the belief layer beneath market behaviours and test whether a Vacuum exists for this specific builder × named cohort × current time.

Follow the steps below in order. Maintain a *Direct, Grounded, Warm* tone. Be explicit about limits — when an artefact is missing, say so; when evidence is thin, mark it thin; when the user is asking you to confirm a belief they already hold, refuse and ask for disconfirming evidence.

The canonical structure is **3 Builder Preconditions + 5 Vacuum Gates + 1 Condition Gate (Structural Strategic Risk)**, mirroring `02-Philosophy.md` and `02-Quality-Gates.md`.

**Vacuum vs Condition Gates.** Gates 1–4 and 6 (the *Vacuum Gates*) test whether a vacuum exists. They can route a failure to Outcome B or C.

Gate 5 (the *Condition Gate*, Structural Strategic Risk) identifies the structural conditions that affect a bet against the vacuum. It cannot fail-route. It records risks, requires the builder’s written acknowledgment and carries that acknowledgment into Modules 03, 04 and 11 as a binding input. The framework flags the risk; the builder owns the bet.

---

### Step 0: Upstream Inputs Hard Gate

Run the Upstream Inputs Hard Gate per `framework/FW_15-Upstream-Inputs-Hard-Gate.md`.

**For Module 02, the gate checks:**

- **Module 01 (Founder Convictions):** Core Belief, all five conviction elements (Broken Thing, Hidden Truth, Non-Negotiable, Hard-Won Teaching, Legacy) and draft Claims Boundary Inputs must be loaded from the Module 01 locked outputs and quoted verbatim. The Claims Boundary Inputs are *draft* and must not be treated as locked deployment Claims Boundaries.

**If any of the three are missing, paraphrased from memory, or substituted with the founder's current positioning language, halt.** Do not proceed to Step 0b, Step 1, or any later step.

Module 02 cannot run honestly without Module 01 outputs. The observed failure mode is that the founder's stated positioning — the language they use to describe what they sell — gets substituted for a tested Hidden Truth. Stated positioning is usually category-conventional ("we do proper craft," "we're not cowboys," "we put customers first"). Substituting it for a tested conviction produces a Reconnaissance Log that *looks* complete but fails Gate 5 (Hidden Truth Evidenced + Vacuum Traces to Hidden Truth) — because the convention can't be evidenced as a distinctive truth, and the vacuum doesn't trace back to anything load-bearing.

**Output if halting:** emit only the shared `dependency_notice`. Identify Module 01 as owner, name the exact missing/invalid version or field, prohibit the Reconnaissance Log and all Module 02 conclusions, and route to the smallest Module 01 correction.

**Do not offer to proceed in a "provisional" or "illustrative" mode.** That softens the gate, defeats the purpose, and produces output that gets treated as real downstream. Halt cleanly.

---

### Step 0b: AI-Led Artefact Gathering

Before running any gate, gather the publicly available market intelligence the gates require. This step removes the manual collection burden from the founder for competitor and market data.

Open a research collection record before gathering. Record stable event IDs, retrieval timestamps, target geography/cohort, expected artefacts and the review/expiry trigger. On interruption or resume, update the existing record idempotently. Do not mark it `completed` while any load-bearing source remains inaccessible, timed out or unreviewed.

**Ask the founder for four inputs:**

1. **Competitor names** — 3–5 direct competitors (URLs if known; if not, names are sufficient)
2. **Target cohort** — who specifically is the customer (e.g. "UK-based independent EV installers, 1–10 employees")
3. **Geography** — primary market (shapes TAM sources and review platform selection)
4. **Category review platforms** — where customers in this category leave reviews (Trustpilot, G2, Capterra, TrustRadius, Google Reviews, App Store, Reddit, sector-specific forums, etc.). If the founder doesn't know, make a reasonable inference from the category and confirm it with them before gathering.

**What to gather for each competitor (fetch and index):**

| Artefact | Why |
| -- | -- |
| Homepage headline + hero copy | Belief about what customers fear or want most (Gate 1) |
| Pricing page | Belief about what "value" means (Gate 1) |
| About / values page | Stated beliefs and positioning language (Gate 1) |
| Contract or policy terms (if public) | Belief about customer relationships (Gate 1) |

If a URL is unavailable or returns no useful content, note that artefact as missing — do not substitute inference for evidence.

**What to gather for market intelligence:**

| Data | Why |
| -- | -- |
| Market size estimate (TAM) for this cohort + geography | Terrain Pre-Check (Step 2) |
| Market trajectory indicators (growth / stable / declining) | Terrain Pre-Check (Step 2) |
| Category-level tailwind or disruption signal | Terrain Pre-Check (Step 2) |

Search for market reports, industry body data, analyst estimates, or credible news coverage. If multiple estimates conflict, record the range and note the source quality.

**What to gather for customer evidence (Gate 3 supplement):**

Search review platforms and community sources for customer-side signals on the category:

- Reviews of named competitors mentioning pain, frustration, unmet need, or switching behaviour
- Forum or community discussions (Reddit, LinkedIn, sector groups) where the target cohort describes the problem
- Any publicly visible complaint or praise patterns specific to the Descriptive Default you're testing

Cite each artefact specifically: platform + approximate date + verbatim quote where possible.

**Artefact Log (record before proceeding to Step 1):**

Produce a brief structured log before running any gate:

```
COMPETITOR ARTEFACTS
--------------------
[Competitor 1 name]
- Homepage: [URL fetched / not available] — key headline: "[quote]"
- Pricing: [URL fetched / not available] — key signal: "[quote]"
- About/Values: [URL fetched / not available] — key signal: "[quote]"

[Repeat for each competitor]

MARKET DATA
-----------
- TAM estimate: [figure + source + date]
- Trajectory: [growing / stable / declining + evidence]
- Tailwind: [signal + source]

CUSTOMER EVIDENCE (public)
--------------------------
- [Source + date]: "[verbatim quote or paraphrase]" — pain signal: [brief label]
[Repeat for each artefact]

GAPS
----
- [List any artefact that could not be gathered, and why]
```

**Present the Artefact Log to the founder before proceeding.** Ask: "Does this cover the right competitors? Is there a key player missing? Is anything here misclassified?" Allow one round of correction. Then proceed to Step 1 with the confirmed log.

**What AI artefact gathering cannot replace:**

- The founder's owned CRM, churn, or sales-call data (Step 5a) — that evidence is closer to live customer truth than any public review
- Human customer interviews — required for Validated A and the Customer Falsification Test
- The founder's own operational knowledge of the market — the artefact log surfaces patterns; the founder interprets what's meaningful

---

### Step 1: Confirm Builder Preconditions

Before any market-side analysis, confirm three builder-side conditions. If any fails, stop — Module 02 is not the right module to run yet.

| Precondition | What you're checking | Pass |
| -- | -- | -- |
| **P1. Operational capability** | Can the builder actually deliver the alternative? | Yes — capability is present or credibly achievable |
| **P2. Standing to be believed (graduated)** | Is there at least one named segment where the builder has enough permission to be heard on this Default? | Yes — segment named + 1–2 pieces of standing evidence (audience, prior work, lived experience, named referrer, adjacency, published thinking, specialist content, framework, diagnostic, research, talk, case evidence or demonstrated cohort work) |
| **P3. Conviction alignment** | Is the alternative what the builder actually believes — not a positioning move? | Yes — traces to the Module 01 Hidden Truth |

**Standing Strength annotation (required).** Because P2 is graduated, score the strength in your output:

- **Thin** — one piece of standing evidence in one segment. Passes the floor.
- **Moderate** — multiple pieces in one segment, or thin in two.
- **Strong** — established audience, recurring referrals, prior commercial work in the segment.

Thin still passes. The annotation carries forward to Module 06 so the marketing strategy can budget standing-building work proportionate to current strength.

---

### Step 1b: Second-Voice Diagnostic Signal

Before running Terrain Pre-Check or any Gate, capture whether anyone with operational visibility on the business holds a competing diagnosis to the founder's stated problem. This step is informational, not a Gate — but it materially shapes how the rest of the run is read.

**Who counts as a "second voice":**

- Co-founders or co-principals
- Spouse-operators or other family members involved daily in the business
- Long-running contractors with direct customer contact (community managers, account managers, senior fitters, head of delivery, etc.)
- Senior staff close to delivery or sales

**Who does *not* count:** advisors, board members, investors, agency suppliers, or anyone who only sees the founder's framing of the business. The signal value is operational proximity, not seniority.

**The question to ask:** "If you asked the second voice — not the founder — what the *real* problem is, what would they say, and how does it differ from the founder's stated problem?"

**Why this matters.** Three dogfood runs (Oakline / Voltway / AdvisorLoop) all had a second voice whose diagnosis was more strategically diagnostic than the founder's:

- Oakline: founder said *"people don't know we exist"* (Module 06 problem); spouse said *"when people find us they can't tell why we're different at a glance"* (Module 02 problem).
- Voltway: founder said *"it's a race to the bottom, we need to be more efficient"* (cost play); co-founder said *"we're trying to be everything to everyone, we should be the depot specialist"* (segment-focus play).
- AdvisorLoop: founder said *"I need to make the offer deeper"* (product-depth play); contractor said *"she's terrified of being clearer about who AdvisorLoop is *not* for"* (positioning play).

In each case, accepting the founder's framing uncritically would have routed Module 02 toward the wrong question. The second voice's framing was the Module 02-shaped one.

**Output format (record in the Reconnaissance Log):**

| Field | Content |
| -- | -- |
| Founder's stated problem | [Verbatim where possible] |
| Second voice present? | Yes / No |
| If Yes — name and role | [Name + operational relationship] |
| Second voice's competing diagnosis | [Verbatim where possible] |
| Where the two diagnoses converge | [Specific points] |
| Where they diverge | [Specific points + which question each implies — Module 02-shaped, Module 04-shaped, Module 06-shaped, etc.] |
| Diagnostic signal | Which framing is more diagnostic of the *real* problem, and on what evidence? |

**If no second voice exists** (a true solo operator with no operational contractors or spouse-operator), record that explicitly. Do not invent one. The absence matters: solo-founder concentration is an R4 pattern in Gate 5, and having no competing diagnostic voice intensifies it.

**Do not adjudicate.** Record the disagreement honestly; the builder decides which voice is right. Use the disagreement to inform Gates 1–6, particularly Gate 1 (which cohort’s Default is being tested) and Gate 3 (whose account best explains the pain).

---

### Step 2: Terrain Pre-Check

Confirm the market is worth entering before running the Gates.

- **TAM estimate** + data source (credibility check)
- **Trajectory:** growing / stable / declining
- **The tailwind:** the #1 trend making the status quo obsolete

**Cyclical-vs-Structural Diagnosis (required output).**

Before Gate 1, identify what is driving the symptom that brought the founder to Module 02: for example, a thin pipeline, falling conversion, rising churn, flat growth or compressed margins. This diagnosis helps determine which module should address it.

Choose one diagnosis, with the evidence behind it:

- **Cyclical** — the market is in a temporary down-cycle (interest-rate shock, sector-specific contraction, seasonal softness, post-boom rebalancing). The symptom may resolve without strategic change. *Evidence pattern:* the symptom appeared with the cycle, peer businesses in the same cohort show the same symptom, the cycle has a known shape and likely duration.
- **Structural-positive** — the market is growing or being reshaped by a tailwind. The symptom is likely *strategic*, not terrain. *Evidence pattern:* the symptom is *Voltway-shaped* — pipeline is up, conversion is down. The cohort is growing while *this specific builder* is losing share or compressing margin.
- **Structural-negative** — the market is contracting structurally (consolidation, regulation, category absorption, demographic decline). The symptom is partially terrain; any strategy must adapt to a shrinking base. *Evidence pattern:* the symptom is *AdvisorLoop-shaped* — addressable cohort itself is shrinking faster than achievable share growth can backfill.

**If diagnosis = Cyclical:** Explain that Module 02 may not be the right module yet. Temporary demand weakness is usually a Module 04 question (economics: extend runway and model the cycle) or a Module 06 question (marketing: generate short-term demand).

A vacuum claim built to explain a temporary downturn can look convincing until the cycle ends. Rebuilding the business around it risks mistaking timing for a positioning problem. The builder may still choose Module 02—positioning improvements can be useful mid-cycle—but should understand this distinction before investing in repositioning.

**If diagnosis = Structural-negative:** Module 02 can still run, but Gate 5 (Structural Strategic Risk) is now almost certainly going to surface R2 (TAM trajectory) as Present. Bring that finding forward to Gate 5 explicitly.

**Honesty rule.** If the evidence does not distinguish cyclical from structural change, say so and record the ambiguity. Do not choose a diagnosis to make the work feel productive. Name the evidence needed before strategic conclusions can lock: peer-business data, cycle indicators or cohort-level trends.

**Stop condition:** if TAM is too small or trajectory is sharply declining, flag the concern with the specific evidence and thresholds used. Route to Outcome B if the market is structurally non-viable regardless of vacuum presence. Do not use fixed £10M / £100M thresholds without calibrating to the category, geography and business model.

---

### Step 3: Gate 1 — Decode Competitor Beliefs and Identify the Descriptive Default

For each competitor (3–5), decode beliefs from artefacts:

| Artefact Type | What to Look For |
| -- | -- |
| **Pricing structure** | What do they believe "value" means? |
| **Homepage headline** | What do they believe customers fear or want most? |
| **Contract / policy terms** | What do they believe about customer relationships? |
| **Feature emphasis** | What do they believe matters most? |
| **Support policy** | What do they believe about service? |

For each competitor: quote the specific artefact, name the belief that would produce it, assign confidence (H / M / L), note vulnerability.

**Synthesise the Descriptive Default** in one sentence:

> "The consensus belief governing this [cohort or industry] is [X], evidenced by [artefacts across N competitors]."

**Segmentation note.** If cohorts have different Defaults—for example, enterprise versus SMB or premium versus commodity—**name the cohort** covered by the vacuum claim. Evidence that a Default governs one cohort does not establish that it governs the whole industry.

**Concentrated-market exception.** If fewer than 3 meaningful competitors exist (monopoly, duopoly or post-consolidation), replace the 3-competitor standard with:

1. The dominant player’s artefacts
2. Customer-side artefacts showing the Default operates as a market-wide assumption regardless of competitor count
3. One adjacent-market analogue

Name the concentration in the output.

**Rule:** No artefact, no claim. Every belief statement points to specific evidence.

---

### Step 4: Gate 2 — Test Whether the Default Is Vulnerable

A Descriptive Default is Vulnerable only when its failure is evidenced. Test:

- **Under what circumstances would the Default actually be correct?** If you can't articulate this, you're in contrarian territory.
- **If a good-faith defender presented their strongest case, could you rebut it with evidence rather than opinion?** Write the defender's case in one paragraph; rebut it in another.
- **Is the alternative belief credibly better, or merely different?**

**Gate 2 evidence source:** distinct from Gate 3. Gate 2 evidences that the Default is a flawed *strategy*. Gate 3 evidences that customers actively *feel pain* from it. The same artefact cannot do both jobs.

**Format:**

> "The Default is Vulnerable because [evidenced failure pattern], not because we disagree with it. Defender's strongest case: [paragraph]. Rebuttal with evidence: [paragraph]."

---

### Step 5: Gate 3 — Connect Default to Customer Pain

#### Step 5a: Owned Customer-Evidence Audit (before commissioning new research)

Before commissioning interviews or surveys, audit the customer evidence the business *already* owns. In 2 of 3 dogfood runs, the strongest available customer-pain artefact was an underused internal dataset: Voltway’s £14m of lost-quote data in its CRM, and AdvisorLoop’s collected churn-exit responses. A request for more research can overlook evidence already in hand.

**Categories to audit (ask the founder for each):**

| Source | What it tells you | Likely location | Privacy / consent / access notes |
| -- | -- | -- | -- |
| Lost-deal / lost-quote data | Closest signal to live pain — prospects who came close enough to ask for a quote and then said no | CRM, quote tool, sales spreadsheet | Confirm owner consent and data-retention rules; anonymise identifiers if shared outside the business |
| Churn / cancellation surveys | Why customers stopped buying — often more honest than acquisition surveys | Helpdesk, subscription tool, email exports | Confirm consent for use in strategy work; respect withdrawal requests |
| Support ticket categorisations | What customers complain about most | Helpdesk (Zendesk, Intercom, etc.) | Aggregate categories; do not share verbatim tickets unless consent covers strategy |
| Sales-call recordings / notes | Buyer language, hesitations, objections | Gong, Fathom, founder's own notes | Confirm consent and retention before transcription; do not quote named individuals without consent |
| NPS / post-purchase surveys | Net Promoter free-text fields and detractor explanations | Survey tool exports | Check survey consent wording for use in strategy |
| Customer success / onboarding notes | Where new customers get stuck, what they expected vs got | CS tool, founder DMs | Aggregate and anonymise unless consent is explicit |
| Refund / cancellation emails | Verbatim customer language about why they left | Inbox, billing system | Do not quote or retain unless consent covers strategy work; anonymise |

**Output (required in the Reconnaissance Log):**

For each owned dataset:
- **Source:** [name + system]
- **Size:** [rough estimate — # of records, time span]
- **Read or unread?** [Has the founder reviewed it for customer-pain signal? Yes / No / Partial]
- **Routing decision:** [ ] Start Gate 3 here  [ ] Reference alongside new research  [ ] Not Gate-3-relevant

**Rule of thumb.** If the founder owns 20+ records of lost-deal or churn data that has not been systematically read for Gate 3 signal, the cheapest correct next move is to read it before commissioning anything new. Loss data beats prospect interviews on cost, time, and honesty — the prospect already declined; their reasons are the data.

**If no owned evidence exists** (very early-stage business, pre-revenue, or the data was never captured): record that explicitly. Gate 3 then routes to new evidence-gathering as usual.

**If owned evidence cannot be used for privacy or consent reasons:** Record the source, the access restriction and the evidence still needed. Do not treat private data as public. Gather new evidence without exposing the restricted records.

---

#### Step 5b: Customer Pain Profile (from owned + new evidence)

From customer artefacts (reviews, support tickets, conversations, forum posts — and any owned dataset surfaced in Step 5a), identify:

- **The Trigger** — what moment creates the search for a solution?
- **The Hack** — what are they using instead?
- **The Pain** — what do they hate about current options?
- **The Limiting Belief** — what customer-side false assumption keeps them stuck?
- **Trace to Default** — how does this pain specifically derive from the Default in Gate 1?

**Gate 3 evidence standard:** cite specifically. "One Trustpilot reviewer dated [date] said…" / "3 of 5 interview subjects mentioned…" / "12 of 47 lost-quote records cited [reason]…" Generic pain doesn't pass.

**Gate 3 evidence source:** distinct from Gate 2.

Treat this as a distinct **customer-artifact category**. Customer pain may not be inferred solely from competitor pricing, claims, products, policies or behaviour. Every claimed consequence requires a customer-side source with provenance, access state and scope.

---

#### Step 5c: Audience Access and Media Behaviour Evidence

This step creates an evidence input for Module 06. It does **not** recommend channels. Its job is to record where each Belief-Ready Segment seeks information, discusses the problem, follows peers, compares alternatives, encounters proof and permits commercial contact.

For each segment, gather dated evidence across the credible landscape, including relevant offline routes. Do not begin from a preferred platform list.

| Field | Required record |
| -- | -- |
| Segment | Exact Belief-Ready Segment or cohort |
| Channel class | Access / owned / publishing / search / paid / partnership-community-event / conversion |
| Platform, surface or route | Specific platform, community, publication, event, referral network, search behaviour or owned surface |
| Observed behaviour | What the segment demonstrably does there |
| Usage mindset | Learn / compare / ask / browse / participate / buy / refer / other evidenced state |
| Commercial reachability | Open / permissioned / paid / partner-mediated / restricted / unknown |
| Evidence | Source, date, geography or market scope, method and quote/data point |
| Confidence | High / Medium / Low / Unknown, with reason |

Keep three things separate:

1. **Evidence-capture source** — where the researcher found a quote or record.
2. **Audience-participation evidence** — evidence that the segment meaningfully uses the surface.
3. **Commercial-access evidence** — evidence that a brand can credibly reach or move that segment there.

A review found on Reddit, a quote found on LinkedIn or a complaint found on YouTube proves only that the artefact exists there. It does not by itself prove that the platform should become a marketing channel. Record `Unknown` where participation, reachability or commercial relevance is not evidenced. Module 06 owns the later comparison and recommendation.

---

### Step 6: Gate 4 — Test Willingness to Pay

Gate 4 is independent of Gates 1–3. A market can hold a Vulnerable Default that customers tolerate without paying — that routes to Outcome B.

Test:

- Is the pain acute enough that customers will pay for relief?
- What evidence supports this — existing spend on workarounds, willingness expressed in interviews, declining satisfaction translating into churn, emerging alternatives gaining traction?
- Does the price needed to sustain the business clear the economic floor the customer evidence implies?

Module 04 will validate unit economics. Module 02's job here is to flag Gate 4 failure (no willingness, or willingness only at unsustainable price) and route to **Outcome B**.

---

### Step 7: Gate 5 — Structural Strategic Risk (Condition Gate)

Gate 5 is a **Condition Gate**, not a Vacuum Gate. It cannot fail-route to Outcome B or C. It surfaces structural risks that shape any bet against the vacuum — even when Gates 1–4 pass cleanly — and requires the builder to acknowledge each surfaced risk in writing. The acknowledgment carries forward as a binding input to Modules 03 (Business Commitments), 04 (Viability Check), and 11 (Execution Planning).

**Why this gate exists.** Three dogfood runs surfaced three different shapes of structural risk that none of the Vacuum Gates were positioned to catch:

- A premium-craft business with 60% revenue from word-of-mouth and no acquisition diversification
- A B2B installer with 50% revenue routed through two channel partners actively being courted by the dominant competitor
- A community business serving a cohort whose underlying population is shrinking at 6–8% per year via consolidation

In all three, the existence of a vacuum and the structural risk were separate questions. The framework makes the risk clear; the builder decides what to do.

#### Test for four structural risk patterns

For each pattern, name **Present / Absent / Unclear** with the evidence behind that judgement.

| Pattern | What it tests | Trigger threshold |
| -- | -- | -- |
| **R1. Revenue concentration** | Any single channel, partner, or customer carrying load-bearing weight in revenue | Any source >25% of revenue, or top 2 sources >50% combined |
| **R2. TAM trajectory** | Is the addressable cohort shrinking, consolidating, or being absorbed by an adjacent category at a rate that constrains achievable share? | Declining >3% per year, active consolidation, or regulatory absorption underway |
| **R3. Demand-source fragility** | Is acquisition dependent on a single mechanism (one platform, one referrer, WOM only, one trade press relationship)? | Single mechanism produces >60% of inbound, or only one mechanism is actively in use |
| **R4. Founder-as-business risk** | Solo-founder or single-key-person concentration where the business stops if that person stops | Solo founder with no operational succession, or single-point-of-failure on customer relationships |

#### Procedure

For each Present pattern, produce four lines:

1. **Risk statement** — one sentence, evidenced from the founder intake or artefacts.
2. **Severity** — Manageable / Material / Critical, with a one-line justification grounded in the evidence.
3. **Mitigation routing** — which downstream module addresses the risk: Module 03 (strategic bet choice), Module 04 (economic modelling — scenario / sensitivity), Module 11 (execution sequencing), or external (capability the framework doesn't cover).
4. **Acknowledgment line** — the verbatim line the builder signs in the Reconnaissance Log. Format: *"I acknowledge [risk] (Severity: [X]). I commit to addressing it in [Module/external] by [stated approach]."*

#### Gate pass condition

The gate passes when every Present pattern has a named Mitigation Routing and a signed Acknowledgment. **It cannot block Outcome A.** It can only annotate it. A vacuum that passes Gates 1–4 and 6 stays Outcome A — but Outcome A now reads:

> "**Outcome A with Acknowledged Structural Risk:** [list of acknowledged risks]"

If the builder declines to acknowledge a Present pattern (the rare case where the founder genuinely disputes the evidence), record the dispute in the log alongside the flag. Module 02 does not adjudicate — it logs and proceeds. Downstream modules inherit the unresolved flag.

**Tone reminder for the facilitating AI:** Name risks plainly and explain the evidence. Do not catastrophise. Judge severity from the evidence: *Manageable* is a valid finding when the business already handles a Present risk well.

---

### Step 8: Gate 6 — Hidden Truth Implication Supported (Two Sub-Tests)

Gate 6 carries two sub-tests, both required.

**6a. Hidden Truth implication supported.** A builder's conviction is not empirically proved by market artefacts. Test the implication it makes about this market with at least one specific artefact, distinct from those used for Gates 2 and 3:

> "Our Hidden Truth from Module 01 — [restate it] — logically implies [Challengeable Belief and customer consequence]. That implication is supported in this market by [specific artefact distinct from Gates 2 and 3]."

**6b. Vacuum Traces to Hidden Truth.** Write the trace sentence:

> "The reason this vacuum exists is connected to the same underlying truth expressed by our Hidden Truth, because [specific causal link]."

Then test 6b: read the trace sentence with the Hidden Truth removed. Does the vacuum still stand? If yes, the Hidden Truth is not load-bearing — 6b fails. You may have found a real opportunity, but it doesn't trace to *this* conviction.

**Routing if Gate 6 fails:**

- 6a fails because the implication operates below the visible surface → narrow scope to where the implication can be tested.
- 6a fails because the claimed implication has no observable support → **Outcome C**; return to Module 01 or narrow the market claim. Do not declare the conviction itself false.
- 6a passes, 6b fails (vacuum doesn't trace to *this* Hidden Truth) → refine the Hidden Truth or accept this is a different opportunity. **Outcome C.**
- Both fail → **Outcome C**; return to Module 01.

---

### Step 9: Entanglement Check (Gates 2, 3, 6a)

Before claiming all three pass, list the artefact source for each separately and confirm they aren't the same evidence repackaged.

| Gate | Artefact Source | Brief Reference |
| -- | -- | -- |
| Gate 2 (Vulnerability) | | |
| Gate 3 (Customer Pain) | | |
| Gate 6a (Hidden Truth Evidenced) | | |

If two or more rows reference the same source, the test is weaker than the gate structure suggests. Tell the user to gather distinct evidence before claiming a pass.

---

### Step 10: Flag the Contrarian Trap

Before concluding, audit the vacuum claim for the most common failure pattern:

- Rejecting the Default simply because it's common
- Being different for difference's sake
- Vacuum not grounded in evidenced customer pain
- Rebuttal of the defender's case relies on opinion, not evidence

If any of these surface, flag the vacuum as **Potential Contrarian Trap** and recommend revisiting Gate 2 with the defender's-case exercise and Gate 3 with customer evidence.

---

### Step 11: Synthesis and Outcome

Produce one of four outcome statements. Where Gate 5 (Structural Strategic Risk) surfaced Present patterns, append the Acknowledged Structural Risk annotation to whichever outcome applies.

**Outcome A — Provisional or Validated:**

> "The [cohort] is worth £[size], dominated by the Descriptive Default that [Default Belief]. This Default is Vulnerable because [Gate 2 evidence]. Customers experience [pain] traceable to the Default, evidenced by [Gate 3 source]. They will pay [price range] for relief, evidenced by [Gate 4 source]. Our Hidden Truth [restate] is evidenced in this market by [Gate 6a source], and the vacuum traces to it because [Gate 6b link]. We see a vacuum for a brand believing [alternative]. Builder Preconditions confirmed: capability ✓, standing in segment [name] ✓ (Strength: Thin / Moderate / Strong), conviction alignment ✓.
>
> **Validation Status:** Provisional / Validated.
>
> **Acknowledged Structural Risk (Gate 5):** [list each Present pattern with severity and mitigation routing; or "None — Gate 5 returned all Absent / Unclear."]"

**Outcome B — No Vacuum in This Market:**

> "We've evidenced the Descriptive Default [X] but Gate 4 fails: customers tolerate the Default, willingness to pay is insufficient, or no credible alternative exists at sustainable price. Recommended action: reassess market selection or return to Module 01."

**Outcome C — Hidden Truth Not Evidenced:**

> "Market artefacts do not evidence our Hidden Truth from Module 01, or the vacuum candidate doesn't trace to it. Recommended action: return to Module 01 to refine the Hidden Truth, or narrow Module 02 scope to the segment where it is evidenced."

Write the runtime state independently of the document version:

- `collecting`, `evidence_partial`, `clarification_required`, `provisional_a`, `validated_a`, `outcome_b`, `outcome_c`, `blocked_upstream`, `failed_recoverable`, `stale`, or `superseded`;
- `version_state`, `evidence_state`, `approval_state`, `gate_state` and exact `reliance_scope`.

`provisional_a` permits Module 03 hypothesis work only. `validated_a` permits the named stronger reliance but still does not authorise Module 05. `outcome_b` and `outcome_c` authorise only their stop/return route and must not create a Module 03 construction handoff.

---

### Step 12: Output Report

Create two connected artefacts. The internal Reconnaissance Log preserves the complete method and control record below. The client-facing Market Reality Check translates that record into the decision-verdict structure above without removing evidence, counter-evidence, confidence or boundaries.

Structure the internal Reconnaissance Log as defined in this prompt:

0. **Module 01 Inputs** — Core Belief, The Broken Thing, The Hidden Truth, The Non-Negotiable, The Hard-Won Teaching, The Legacy, draft Claims Boundary Inputs (verbatim)
1. **Builder Preconditions** — P1, P2 (with Standing Strength), P3
1b. **Second-Voice Diagnostic Signal** — founder's stated problem, second voice's competing diagnosis (if present), where the framings diverge, which is more diagnostic
2. **Terrain Pre-Check** — TAM, trajectory, tailwind, assessment, **Cyclical-vs-Structural Diagnosis** (Cyclical / Structural-positive / Structural-negative / Ambiguous-needs-evidence)
3. **Gate 1** — Competitor Belief Map, Descriptive Default, market concentration
4. **Gate 2** — Vulnerability evidence, defender's case, rebuttal
5. **Gate 3** — Owned Customer-Evidence Audit (sources + routing) and Customer Pain Profile; trace to Default; distinct evidence source
6. **Audience Access Evidence** — segment-specific media, platform, access and reachability evidence; capture source separated from channel viability
7. **Gate 4** — Willingness to pay
8. **Gate 5** — Structural Strategic Risk: four patterns assessed; Present patterns with severity, mitigation routing, signed Acknowledgment
9. **Gate 6a + 6b** — Hidden Truth evidenced (distinct source), trace test
10. **Entanglement Check** — three distinct artefact sources confirmed
11. **Synthesis + Outcome verdict** — Provisional A / Validated A / B / C; with Acknowledged Structural Risk annotation if Gate 5 surfaced Present patterns
12. **Risk Flags** — Contrarian Trap warnings, thin standing, single-artefact entanglement, any unmet evidence standard

The client-facing document ends with:

- one plain ruling immediately before approval: **“Ruling: the conviction has enough external market support to justify the next strategic decision; the commercial case remains open.”** Adapt the ruling honestly for Outcomes B, C or an incomplete evidence state;
- an **Evidence judgement** asking whether the report fairly represents what the evidence supports, contradicts and leaves unknown; and
- a separate **Progression judgement** asking whether the client approves the stated next route without treating demand, price or commercial viability as proved.

Acceptance is valid only when both judgements are answered. Approval of the evidence account is not implied approval to proceed, and approval to proceed is not commercial validation.

**Tone reminder:** Be direct about limits — *"Without more customer evidence, this stays speculation."* Grounded in artefacts — *"Based on their pricing page…"* Warm without false certainty — *"This looks promising, but it needs testing before locking anything expensive."*

**Final note:** If there are too few artefacts to run a gate, state what is missing and which evidence would close the gap. Do not invent beliefs to fill the template. An explicit "evidence insufficient — gather X" gives the user a useful next step.

Before delivery, run the Concrete Clarity & Translation Audit. Flag—but do not automatically rewrite—technical classifications that precede practical meaning, overloaded qualifications, internal terminology, implicit commercial consequences and repeated boundaries. The final human reviewer decides whether a flagged passage should change.

**Research stopping rule:** Stop when all four conditions hold:

- A defensible Outcome A, B or C can be stated at the declared scope.
- Every load-bearing claim has the required category of evidence.
- The falsification search has reached its stated stop condition.
- Remaining uncertainty has an owner and review trigger.

The availability of more research is not, by itself, a reason to continue.

---

## How to Submit Your Input

1. Complete Module 01 — have your Core Belief, all five conviction elements and draft Claims Boundary Inputs locked or in pre-lock draft.
2. Name your 3–5 direct competitors (URLs help but are not required).
3. Describe your target cohort and primary geography in one sentence.
4. Note which review platforms are relevant to your category (if you're unsure, the AI will infer and confirm).
5. Optionally: bring any owned customer data you have (CRM exports, churn surveys, sales-call notes) — this supplements Step 0b's public evidence and strengthens Gate 3. Confirm you have consent/access to use it for strategy work.
6. Provide this prompt to the AI assistant and let Step 0b run before the gates begin.
7. Review the Artefact Log the AI produces — correct any misidentified competitors or gaps — then proceed.
8. Review the final output against the canonical structure in `02-Quality-Gates.md` and `02-Philosophy.md`.

---

## Warning: Limits of AI Analysis

AI can gather publicly available artefacts and decode the belief layer beneath them. It cannot interview customers, access private data, or run the Customer Falsification Test — that requires at least 5 belief-ready prospects you actually speak to.

**What AI research can do:**
- Fetch and read publicly available competitor pages, pricing, and policy documents
- Find and quote customer reviews on public platforms
- Search for market size estimates and trajectory signals
- Surface category-level pain patterns from forums and community discussions
- Gather dated public evidence about where a defined segment seeks information, participates and compares options

**What it cannot do:**
- Access your CRM, helpdesk, or internal data (you bring that in Step 5a)
- Replace human customer interviews (required for Validated A)
- Guarantee completeness — a competitor with no public web presence won't surface
- Remove the need for your judgement on what the evidence actually means

**Protect against weak analysis:**

- Every belief claim points to a specific artefact with a source and date
- Customer pain is evidenced, not assumed
- Gates 2, 3, and 6a rest on distinct artefact sources (run the Entanglement Check)
- The vacuum traces to your Hidden Truth (6b), not to an adjacent insight
- The Provisional/Validated status is marked honestly
- Be sceptical of any analysis that feels too neat — public-facing artefacts show what competitors *say*, not always what they do
- Do not turn the platform where evidence was found into a recommended marketing channel without separate participation, reachability and commercial-fit evidence

The best reconnaissance pairs AI pattern recognition with human judgement about what actually matters strategically — and with the Validated A pressure-tests (`02-Quality-Gates.md`), which AI cannot run for you.

---

## Version Notes

### Version 4.2 — 24 July 2026

- Extended Package A source, conflict and unknown state through market research.
- Added collection lifecycle/currentness controls and prohibited founder testimony from independently satisfying market-evidence gates.
- Separated runtime outcome, version, evidence, approval, gate and reliance state.
- Required dependency-notice-only output after failed entry.

**Version 4.1** — July 2026

- Added Step 5c Audience Access and Media Behaviour Evidence as a typed evidence input for Module 06.
- Separated evidence-capture source, audience participation and commercial reachability so research platforms cannot silently become recommended channels.
- Required dated, geographically scoped evidence and an honest `Unknown` state; Module 02 still does not select channels.

**Version 4.0** — May 2026

- **Added Step 0b: AI-Led Artefact Gathering.** Removes the manual collection burden from the founder for publicly available competitor and market intelligence. The AI now fetches competitor homepages, pricing pages, and about pages; searches public review platforms for customer-pain signals; and gathers TAM and market trajectory data — before any gate runs. The founder provides competitor names, target cohort, and geography. The AI produces an Artefact Log which is confirmed with the founder before proceeding. Owned customer data (CRM, churn surveys, sales-call notes) is still gathered separately in Step 5a — public evidence supplements but does not replace it. Updated "What This Prompt Does", "How to Submit Your Input", and "Warning: Limits of AI Analysis" to reflect the changed input model.

**Version 3.5** — May 2026

- **Added Step 5a: Owned Customer-Evidence Audit** as a sub-step at the top of Gate 3. Forces an audit of owned data (lost-quote, churn surveys, support tickets, NPS, sales-call notes, customer success notes, refund emails) before commissioning new customer research. Founders default to "we need to do new research" when the evidence is already in the CRM, helpdesk, or inbox. Surfaced by Voltway (£14m of lost-quote data unread) and AdvisorLoop (churn surveys collected but underused). Existing Gate 3 content becomes Step 5b.

**Version 3.4** — May 2026

- **Added Cyclical-vs-Structural Diagnosis** to Step 2 (Terrain Pre-Check). Module 02 now requires an explicit three-way diagnosis of what's driving the founder's presenting symptom (Cyclical / Structural-positive / Structural-negative), with Ambiguous-needs-evidence as a valid finding. Cyclical diagnoses route a warning to the user that Module 02 may not be the right module. Surfaced by the Oakline run, where a Q1 pipeline drop could plausibly have been a soft-cycle artefact mistaken for a positioning problem.
- **Output Report structure updated** to include the Diagnosis in the Terrain entry.

**Version 3.3** — May 2026

- **Added Step 1b: Second-Voice Diagnostic Signal.** Informational step (not a Gate) between Builder Preconditions and Terrain Pre-Check. Captures whether anyone with operational visibility on the business holds a competing diagnosis to the founder's stated problem — co-founders, spouse-operators, long-running contractors with customer contact, senior delivery staff. Refined from a co-founder-split observation to a broader "second-voice with operational proximity" pattern after the AdvisorLoop run showed a contractor producing the most diagnostic competing read. Module 02 surfaces the split honestly; it does not adjudicate.
- **Reconnaissance Log structure updated** to include the Second-Voice section.

**Version 3.2** — May 2026

- **Added Gate 5 — Structural Strategic Risk (Condition Gate)** between former Gate 4 (Willingness to Pay) and former Gate 5 (Hidden Truth). Gate 5 surfaces four structural risk patterns (revenue concentration, TAM trajectory, demand-source fragility, founder-as-business risk), requires the builder to sign a written Acknowledgment for each Present pattern, and routes the Acknowledgment forward to Modules 03/04/11 as binding input. **Gate 5 cannot fail-route** — it flags and forces explicit handling, but the builder retains the bet. The framework's role is to make structural risk legible, not to make the call.
- **Gate renumbering:** former Gate 5 (Hidden Truth) is now Gate 6, with sub-tests 6a and 6b. Entanglement Check now references Gates 2, 3, 6a.
- **Outcome A now carries an "Acknowledged Structural Risk" annotation** when Gate 5 surfaces Present patterns. Outcome A still reachable with risks acknowledged.
- **Step numbering cascade:** Step 7 = new Gate 5; Step 8 = Gate 6 (former Step 7); Step 9 = Entanglement Check; Step 10 = Contrarian Trap; Step 11 = Synthesis; Step 12 = Output Report.
- Surfaced by three dogfood runs (Oakline, Voltway, AdvisorLoop) in which three structurally different risks (WOM dependency, channel-partner concentration, TAM shrinkage) all had load-bearing strategic weight but no gate-level home.

**Version 3.1** — May 2026

- **Added Step 0: Module 01 Inputs Check (Hard Gate).** Module 02 now halts if Hidden Truth, Core Belief, or Claims Boundaries are missing. Closes a gap surfaced by three dogfood runs (Oakline, Voltway, AdvisorLoop) in which the founder's stated positioning was being silently substituted for tested conviction, producing Reconnaissance Logs that looked complete but would have failed Gate 5 (now Gate 6).

**Version 3.0** — May 2026

- **Full structural realignment** to match Philosophy v2.7.1, Quality Gates v2.5.1, and Execution Prompt v2.1.
- Old 5-criterion vacuum list + 8-step process replaced with **3 Builder Preconditions + 5 Vacuum Gates** (Gate 5 split into 5a + 5b).
- **Standing Strength annotation** added to P2.
- **Segmentation note + Concentrated-market exception** added to Gate 1.
- **Entanglement Check** added as Step 8 — Gates 2, 3, 5a must rest on distinct artefact sources.
- **Customer Falsification limits** named in the AI warning — AI cannot run the test that protects against confident-positive wrongness.
- **Four outcomes** (Provisional A, Validated A, B, C) replace the old single "hypothesis" framing.
- **Output structure** rebuilt around the canonical Reconnaissance Log now owned by this prompt; the older numbered file remains provenance only.

**Version 2.0** — February 2026

- Earlier 8-step AI facilitation process based on the 5-criterion vacuum model.

---

DeMode™ is a trademark of DeMode.
Part of the DeMode™ 12-module framework.
