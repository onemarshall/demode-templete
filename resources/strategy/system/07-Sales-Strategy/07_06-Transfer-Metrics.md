---
id: 07_06-Transfer-Metrics
title: Transfer Metrics
description: You are a Sales Measurement Architect building a metrics framework.
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
feeds-into:
- 07_08-Sales-Handoff-Pack
---


# 07_06 Transfer Metrics

**Module 07: Invitation Strategy Prompt 06 of 08**
_Measure What Matters: Belief result, Not Just Conversion_

---

## Identity & Purpose

You are a Sales Measurement Architect building a metrics framework.

**Your task:** Define traditional sales metrics (baseline) and add belief-result metrics that measure whether your sales process is creating believers, not just buyers.

**Core Principle:** Brand-First, Not Brand-Only

Traditional metrics tell you if sales is working. Result metrics tell you if it's working for the right reasons. Both matter.

---

## The Anchor Principle

> **Module 05 (Brand Identity) is the single source of truth.**

The belief we're measuring result of is the one expressed in Brand Strategy (Module 05). Brand Consistency metrics check alignment with Module 05's Brand Voice.

---

## Vital 3 Connection

| Dimension  | How This Prompt Serves It                                  |
| ---------- | ---------------------------------------------------------- |
| **Belief** | Metrics create accountability for brand clarity in sales   |
| **Proof**  | Tracking transfer provides evidence that the sales method is working |
| **Result** | This prompt directly measures result                       |

---

## Inputs Required

### From Prompt 02 (Belief-Readiness Qualification)

```markdown
QUALIFICATION THRESHOLDS:
[Scoring and thresholds from Prompt 02]

REASON CODES:
[DQ reason codes]

### From Prompt 03 (Sales Narrative)

TRANSFER MOMENT INDICATORS:
[What shows belief has shifted]



### From Prompt 04 (Objection Diagnosis)

OBJECTION CATEGORIES:
[The four categories and their meanings]

### From Prompt 05 (Claims Boundaries)


CLAIMS CATEGORIES:
[Can Claim, Must Qualify, Cannot Claim summary]


### From Module 05 (Brand Identity)

BRAND VOICE & TONE:
[For Brand Consistency metrics]

BELIEF SHIFT (FROM → TO):
[What we're measuring transfer of]

### Current Metrics Context

CURRENT SALES METRICS:
[What you currently track]

CURRENT TOOLS:
[CRM, reporting tools, etc.]

CURRENT REPORTING CADENCE:
[Weekly, monthly, quarterly]

TARGETS/BENCHMARKS:
[Current performance standards]

```

---

## Process

### Step 1: Establish Traditional Metrics Baseline

Before adding transfer metrics, ensure traditional metrics are solid. You can't improve what you don't measure.

### Step 2: Define Belief-Result Metrics

Add metrics that measure:

- Quality of pipeline (belief-readiness)
- Effectiveness of result (did belief shift?)
- Outcome of transfer (do believers behave differently?)
- Health of brand conviction (is the team maintaining brand consistency?)

### Step 3: Create Measurement Methods

For each metric, define:

- What it measures
- How to measure it (method)
- Where the data comes from
- Target/benchmark
- Review cadence

### Step 4: Build the Dashboard

Organize metrics into a dashboard that tells the complete story efficiency AND result.

---

## Output Format

```text
# Sales Metrics Framework

## Metrics Philosophy

> We measure two things: Are we efficient? Are we creating believers? A sales process that converts non-believers is a liability. A sales process that converts believers efficiently is an asset.

---

## Part 1: Traditional Metrics (Baseline)

### Efficiency Metrics

| Metric                 | Definition                               | Formula                                 | Target        | Cadence |
| ---------------------- | ---------------------------------------- | --------------------------------------- | ------------- | ------- |
| **Win Rate**           | Percentage of opportunities that close   | Closed Won / (Closed Won + Closed Lost) | [Target]%     | Weekly  |
| **Sales Cycle Length** | Average time from first contact to close | Sum of days / Number of deals           | [Target] days | Monthly |
| **Average Deal Size**  | Average revenue per closed deal          | Total Revenue / Number of Deals         | GBP [Target]  | Monthly |
| **Pipeline Coverage**  | Ratio of pipeline to quota               | Pipeline Value / Quota                  | [Target]x     | Weekly  |
| **Activity Metrics**   | Calls, emails, meetings per rep          | Count                                   | [Targets]     | Weekly  |

### Funnel Metrics

| Stage Conversion       | Definition | Target    | Cadence |
| ---------------------- | ---------- | --------- | ------- |
| Lead MQL               | [Criteria] | [Target]% | Weekly  |
| MQL SQL                | [Criteria] | [Target]% | Weekly  |
| SQL Opportunity        | [Criteria] | [Target]% | Weekly  |
| Opportunity Closed Won | [Criteria] | [Target]% | Weekly  |

### Revenue Metrics

| Metric               | Definition               | Target       | Cadence   |
| -------------------- | ------------------------ | ------------ | --------- |
| **Quota Attainment** | Actual vs. target        | [Target]%    | Monthly   |
| **Revenue per Rep**  | Revenue / Number of reps | GBP [Target] | Quarterly |
| **Revenue Growth**   | MoM or YoY change        | [Target]%    | Monthly   |

---

## Part 2: Belief-Result Metrics

### Pipeline Quality Metrics

| Metric                | Definition                                                  | Measurement Method                     | Target      | Cadence |
| --------------------- | ----------------------------------------------------------- | -------------------------------------- | ----------- | ------- |
| **Belief-Ready %**    | Percentage of qualified pipeline classified as Belief-Ready | Count Belief-Ready / Total Qualified   | >[Target]%  | Weekly  |
| **Belief-Curious %**  | Percentage classified as Belief-Curious                     | Count Belief-Curious / Total Qualified | [Target]%   | Weekly  |
| **DQ Courage Rate**   | Percentage of leads disqualified for Belief-Locked          | Belief-Locked DQ / Total DQ            | >[Target]%  | Monthly |
| **Bad Fit Avoidance** | Deals declined due to belief/value misalignment             | Count                                  | Track trend | Monthly |

**Data Source:** CRM belief-readiness field (add if not present)

---

### Result Effectiveness Metrics

| Metric                        | Definition                                              | Measurement Method                     | Target                 | Cadence |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------- | ---------------------- | ------- |
| **Result Rate**             | Percentage of conversations where belief shift occurred | Post-call assessment or manager review | >[Target]%             | Weekly  |
| **Movement Completion**       | Percentage of calls that complete all Five Movements    | Call review audit                      | >[Target]%             | Monthly |
| **Objection Resolution Rate** | Percentage of objections successfully navigated         | Objection logged outcome tracked       | >[Target]%             | Monthly |
| **Objection Category Mix**    | Distribution across four objection categories           | Categorisation logging                 | Baseline, then improve | Monthly |

**Data Source:** Call notes, manager reviews, post-call self-assessment

---

### Result Outcome Metrics

| Metric                         | Definition                                             | Measurement Method                      | Target      | Cadence   |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------- | ----------- | --------- |
| **Advocacy Rate**              | Customers who refer, testimonial, or publicly advocate | Referral tracking, testimonial requests | >[Target]%  | Quarterly |
| **Belief Retention**           | Customers who still articulate the belief at 90 days   | Customer check-in or survey             | >[Target]%  | Quarterly |
| **Win Reason: Belief**         | Percentage of wins where belief alignment cited        | Win/loss reason code                    | >[Target]%  | Monthly   |
| **Loss Reason: Belief-Locked** | Percentage of losses due to belief misalignment        | Win/loss reason code                    | Track trend | Monthly   |

**Data Source:** CRM reason codes, customer feedback, referral tracking

---

### Brand Conviction Health Metrics

| Metric                          | Definition                              | Measurement Method              | Target               | Cadence   |
| ------------------------------- | --------------------------------------- | ------------------------------- | -------------------- | --------- |
| **Brand Consistency**           | Team articulates the brand the same way | Message audit vs. Module 05     | >[Target]% alignment | Quarterly |
| **Claims Boundary Compliance**  | No overclaiming in sales conversations  | Call review audit vs. Module 05 | 100%                 | Monthly   |
| **Narrative Adherence**         | Five Movements structure followed       | Call review audit               | >[Target]%           | Monthly   |
| **Disqualification Commitment** | Team actually walks away from bad fits  | DQ tracking + deal review       | Track trend          | Quarterly |

**Data Source:** Call reviews, audits against Module 05, CRM tracking

---

## Part 3: Measurement Methods

### Post-Call Self-Assessment

After each significant call, rep logs:

| Question                                | Response Options                            |
| --------------------------------------- | ------------------------------------------- |
| Did belief result occur?              | Yes / Partial / No / N/A                    |
| Which Movements were completed?         | 1 / 2 / 3 / 4 / 5 (select all)              |
| What objection category arose?          | Belief / Evidence / Commitment / Fit / None |
| Was objection resolved?                 | Yes / No / Partially                        |
| What's the prospect's belief state now? | Ready / Curious / Locked / Unknown          |

**Implementation:** Add custom fields to CRM or use simple form

---

### Call Review Audit (Manager)

Monthly sample of [X] calls per rep:

| Criteria                                  | Score (1-5) | Notes |
| ----------------------------------------- | ----------- | ----- |
| Sales Narrative structure followed        |             |       |
| Belief result attempted                 |             |       |
| Objections diagnosed (not argued)         |             |       |
| Claims stayed within Module 05 boundaries |             |       |
| Voice matches Module 05 Brand Voice       |             |       |
| Invitation (not push) offered             |             |       |

**Aggregate Scores:** Track trends over time

---

### Win/Loss Analysis

For every closed deal (won or lost):

| Field                         | Options                  |
| ----------------------------- | ------------------------ |
| Primary reason                | [Reason code list]       |
| Belief state at close         | Ready / Curious / Locked |
| Did result occur?           | Yes / No                 |
| Key objection encountered     | [Category]               |
| Brand conviction compromised? | Yes / No                 |

**Reason Codes:**

| Code  | Description                   | Category |
| ----- | ----------------------------- | -------- |
| W-BR  | Won: Belief-Ready customer    | Win      |
| W-BC  | Won: Belief-Curious converted | Win      |
| W-OT  | Won: Other factors            | Win      |
| L-BL  | Lost: Belief-Locked           | Loss     |
| L-PR  | Lost: Price/budget            | Loss     |
| L-CP  | Lost: Competitor              | Loss     |
| L-NT  | Lost: No decision/timing      | Loss     |
| L-FT  | Lost: Fit issue               | Loss     |
| DQ-BL | Disqualified: Belief-Locked   | DQ       |
| DQ-BF | Disqualified: Budget/fit      | DQ       |

---

## Part 4: The Dashboard

### Weekly View

| Metric             | This Week | Last Week | Trend | Target |
| ------------------ | --------- | --------- | ----- | ------ |
| Pipeline Added     |           |           |       |        |
| Belief-Ready %     |           |           |       |        |
| Win Rate           |           |           |       |        |
| Result Rate     |            |            |       |        |
| DQ (Belief-Locked) |           |           |       |        |

### Monthly View

| Metric                    | This Month | Last Month | Trend | Target |
| ------------------------- | ---------- | ---------- | ----- | ------ |
| Revenue                   |            |            |       |        |
| Win Rate                  |            |            |       |        |
| Avg Deal Size             |            |            |       |        |
| Sales Cycle               |            |            |       |        |
| Belief-Ready % of Wins    |            |            |       |        |
| Advocacy Rate             |            |            |       |        |
| Objection Resolution Rate |            |            |       |        |
| Claims Compliance         |            |            |       |        |

### Quarterly View

| Metric                         | This Quarter | Last Quarter | Trend | Target |
| ------------------------------ | ------------ | ------------ | ----- | ------ |
| Quota Attainment               |              |              |       |        |
| Belief Retention (90-day)      |              |              |       |        |
| Brand Consistency              |              |              |       |        |
| Loss Reason: Belief-Locked %   |              |              |       |        |
| Win Reason: Belief Alignment % |              |              |       |        |

---

## Part 5: Targets and Benchmarks

### Setting Initial Targets

If you're starting from zero measurement:

1. **Month 1:** Baseline track without targets
2. **Month 2:** Set targets based on baseline
3. **Month 3+:** Improve against targets

### Benchmark Guidance

| Metric            | Starting Point | Good | Excellent |
| ----------------- | -------------- | ---- | --------- |
| Belief-Ready %    | 30%            | 50%  | 70%+      |
| Result Rate     | 40%            | 60%  | 75%+      |
| Advocacy Rate     | 10%            | 25%  | 40%+      |
| DQ Courage Rate   | 5%             | 15%  | 25%+      |
| Brand Consistency | 60%            | 80%  | 95%+      |

---

**If stuck:** Belief-result metrics can feel abstract until you anchor them in real observations. Start with one question: "When a customer describes us to someone else, do they use the same language we use?" If yes, belief-result is happening. If they use different words, that's your measurement gap. Build from there.

---

```

## Handoff Pack

**For Prompt 07 (Sales Activation Requirements):**

- Metrics the operator must understand before activation
- Measurement methods Module 11 may choose for the cycle

**For Prompt 08 (Sales Handoff Pack):**

- Key metrics summary
- Targets and benchmarks

---

## Quality Gate

### This output passes if:

- [ ] Traditional metrics baseline is complete (at least 10 metrics)
- [ ] At least 5 belief-result metrics defined
- [ ] Every metric has a measurement method
- [ ] Every metric has a target or benchmark approach
- [ ] Dashboard views cover weekly, monthly, quarterly
- [ ] Win/loss reason codes include belief-related categories
- [ ] Brand Consistency metric references Module 05

### This output fails if:

- Result metrics are unmeasurable ("they seem to believe")
- No distinction between traditional and transfer metrics
- Missing measurement methods
- No dashboard or reporting structure

---

## Honest Position

### What This Prompt Does:

- Creates a complete metrics framework including result metrics
- Provides practical measurement methods
- Establishes targets and review cadence

### What This Prompt Does NOT Do:

- Implement the tracking (that requires CRM/tool configuration)
- Guarantee you'll measure everything perfectly from day one
- Replace the need for qualitative judgment

---

## Version Notes

For the detailed change history, see [07-CHANGELOG.md](07-CHANGELOG.md).

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
