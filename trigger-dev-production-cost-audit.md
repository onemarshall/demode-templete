# Trigger.dev production cost audit — Montsel

**Audit date:** 30 October 2026
**Scope:** read-only technical and financial audit of Trigger.dev across the Montsel application
**Repository:** `/Users/rob/Sites/_static/_sveltekit/_live/auth/auth`
(branch state at commit `e20f1c2`, plus uncommitted working-tree changes)

> Nothing in the application was modified, no job was triggered, no paid API was called, and no
> production data or infrastructure was touched.

---

## 1. Executive summary

**Trigger.dev is not a material cost line for Montsel, at any volume the business is likely to reach.**

| Finding | Result |
|---|---|
| Fixed cost with **zero customers** | **$6.53/month** (expected), range $3.99–$12.39 |
| Cost at **100 engagements/day** mixed workload | **≈ $122/month** (expected), range $49–$259 |
| Trigger.dev cost per Signal engagement | **$0.022** expected — **0.004 %** of the £395 price |
| Trigger.dev cost per Strategy engagement | **$0.10–$0.31** expected — **0.002–0.005 %** of the £4,995 price |
| Self-hosted minimum footprint | **7 vCPU / 14 GB** (3 vCPU webapp + 4 vCPU worker) against a **4 vCPU / 24 GB** VPS |
| Break-even for self-hosting (cash only, zero time cost) | ≈ **17 engagements/day** |
| Break-even for self-hosting (maintenance priced at 4 h/month) | ≈ **350 engagements/day** |

Four things matter more than the bill:

1. **The idle schedules cost more than the Free tier's included credit.** Two cron tasks running in
   both STAGING and PRODUCTION cost $6.53/month with no customers at all, against a $5 Free-tier
   credit. Montsel is on Hobby or Pro by default whether or not it has a customer.
2. **The diagnostic reconcile sweep re-polls engagements that are already being polled.** It selects
   `in_delivery`, which is exactly the state the intake task occupies. Every engagement in flight is
   polled twice. This is the single largest structural inefficiency found, and it is cheap today only
   because volumes are low.
3. **The sweep's own work budget is 10× its `maxDuration`.** `reconcileDiagnosticEngagements` allows
   25 engagements × 120 s = 3,000 s, against an inherited `maxDuration` of 300 s. A sweep that hits the
   cap is a *failure*, and the project default retries failures **8 times**.
4. **Polling uses `setTimeout`, not `wait.for()`.** Trigger.dev does not bill waitpoint waits over 5 s,
   but it does bill ordinary code execution. The 25-minute diagnostic poll loop is therefore billed as
   wall-clock compute — roughly $0.05 per full-length run — where a checkpointed wait would be free.
   This is the difference between "cheap" and "essentially free", and it is the only finding that would
   change the shape of the numbers.

**Recommendation:** stay on Trigger.dev Cloud. There is no credible financial case for self-hosting.
The work worth doing is a small number of correctness and cost-hygiene fixes, none of which are
required for the economics to work (see §12).

---

## 2. Method, and what is verified versus estimated

Every figure below is tagged:

- **[V]** verified — read from source, or fetched from official documentation on 30 October 2026.
- **[E]** estimated — derived from source structure and stated assumptions, with the formula shown.
- **[U]** unverified — no measurement exists; treated as an open question.

No execution times were invented. Where a duration is required and unmeasured, the report gives the
formula, a labelled range, and the exact measurement that would replace it.

---

## 3. Actual Trigger.dev architecture

### 3.1 Deployment shape

| Fact | Value | Source |
|---|---|---|
| SDK version | `@trigger.dev/sdk` **4.7.3** (pinned) | [V] `package.json` |
| Runtime | `node` | [V] `trigger.config.ts:10` |
| Task directory | `./src/trigger` | [V] `trigger.config.ts:12` |
| Project default `maxDuration` | **300 s** | [V] `trigger.config.ts:14` |
| Project default retries | **maxAttempts 8**, factor 2, 5 s → 120 s, randomised | [V] `trigger.config.ts:16-21` |
| Machine preset | **none configured** — inherits `small-1x` (0.5 vCPU / 0.5 GB) | [V] no `machine` key anywhere in `src/` or `trigger.config.ts` |
| Queues / concurrency keys | **none configured** | [V] no `queue:` or `concurrencyKey` in the repo |
| Environments with schedules | `STAGING`, `PRODUCTION` | [V] both cron task definitions |

There are exactly **two** trigger call sites and **two** scheduled tasks in the entire application:

```
src/lib/modules/diagnostic/server/dispatch.ts:18   tasks.trigger('diagnostic-intake-v1', …)
src/lib/modules/strategy/server/jobs/gateway.ts:43 tasks.trigger(taskId, {version:1, jobId}, …)
```

There is **no** `triggerAndWait`, `batchTrigger`, `wait.for`, `wait.until`, waitpoint token, Realtime
subscription, or `runs.*` call anywhere in `src/`. [V] — exhaustive grep.

### 3.2 The two workload families

**Diagnostic (Signal / Gap / Direction).** One task, `diagnostic-intake-v1`, is dispatched when the
buyer **submits the intake form** — not when payment settles.
[V] `src/routes/(montsel)/app/workflow/[productKey]/+page.server.ts:126`. The task calls
`runDiagnosticAutomation` → `advanceEngagement`, which polls the external diagnostic engine every 5 s
for up to 25 minutes, issues a `publish_report` action when the engine reaches `approved`, imports the
published bytes with a SHA-256 check, and sends one delivery email.

**Strategy.** Fourteen tasks, one per module (`auth-strategy-m01-session-v1` … `auth-strategy-m12-session-v1`,
plus `auth-strategy-bf-session-v1` and `auth-strategy-cd-session-v1`). Each run processes **exactly one
durable job**, which is **one stage draft or one independent review**. The job is dispatched by
`createTriggerStrategyGateway` either from the web request (fast path) or from the outbox drained by
`auth-strategy-recovery-v1`.

### 3.3 What runs outside Trigger.dev — excluded from all Trigger.dev figures

| Work | Where it runs | Cost owner |
|---|---|---|
| SvelteKit app, checkout, auth, delivery email | **Cloudflare Workers** (`wrangler.jsonc`) | Cloudflare |
| Engagement, job, outbox, checkpoint persistence | **PostgreSQL** (`pg`, `BETTER_DATABASE_URL`) | Database provider |
| The diagnostic run itself (scraping ≤10 pages, ≤20 model calls) | **external diagnostic engine** via `/v1/*` | Engine provider |
| Strategy model completions (OpenRouter) | **OpenRouter** HTTP API | OpenRouter |
| Strategy method documents | **Directus** (read-only service identity) | Directus host |
| Transactional email | **usesend** | Email provider |
| Payments | **Stripe** | Stripe fees |

None of these are attributed to Trigger.dev below. The engine's own limits — `maxPages: 10`,
`maxReviewBatches: 10`, `maxModelCalls: 20` [V] `orchestration.ts:118-120` — mean a single diagnostic can
make up to 20 provider calls that Trigger.dev never sees.

### 3.4 Prospecting

**Not implemented.** There is no prospecting module, task, table or workflow. The only occurrences of
"prospect" in `src/` are prose inside the Strategy method documents and M07's sales-stage copy
(customers/prospects as a market segment). Prospecting is therefore **excluded** from every table below,
as required by the brief. [V]

---

## 4. Complete task inventory

### 4.1 Scheduled tasks (run with zero customers)

| Field | `auth-strategy-recovery-v1` | `diagnostic-reconcile-v1` |
|---|---|---|
| Source | `src/trigger/strategy-recovery-v1.ts` | `src/trigger/diagnostic-reconcile-v1.ts` |
| Product | Strategy | Diagnostic |
| Trigger | cron `* * * * *` (every minute) | cron `*/5 * * * *` (every 5 minutes) |
| Environments | STAGING + PRODUCTION | STAGING + PRODUCTION |
| Runs/day (both envs) | **2,880** | **576** |
| Execution | `dispatchRecoverable()` across **14 stages** (14 SQL queries) + `dispatchOne()` outbox drain, bounded to 50 iterations | One queue query, then `advanceEngagement` for up to **25** engagements |
| Duration [E] | 0.4 s / 1.2 s / 3.0 s (low/expected/high) | 0.3 s / 0.6 s / 1.5 s idle; up to **120 s per engagement** when work exists |
| Machine | `small-1x` (default) | `small-1x` (default) |
| Waiting | none (DB only) | 5 s sleeps inside each engagement's poll |
| Retries | project default — **maxAttempts 8** | project default — **maxAttempts 8** |
| `maxDuration` | inherited **300 s** | inherited **300 s** |
| Billing risk | low | **high** — work budget 25 × 120 s = 3,000 s against a 300 s cap |

Two structural notes:

- **Recovery runs 14 queries, not 1.** `createStrategyExecution` builds a recovery object per stage
  [V] `strategy-runtime.server.ts:185` and the handler calls each in turn. The idle cost is therefore
  ~14× a naive single-query estimate.
- **Recovery re-dispatch is on a 2-minute cooldown.** `strategy_job.recovery_dispatch_after =
  now() + interval '2 minutes'` [V] `data/jobs.ts:375`. A job that can never succeed is re-dispatched
  **720 times a day**, forever. See §8.3.

### 4.2 Diagnostic tasks

| Field | `diagnostic-intake-v1` |
|---|---|
| Source | `src/trigger/diagnostic-intake-v1.ts` |
| Product | Diagnostic (Signal, Gap, Direction) |
| Trigger | Buyer submits intake form → `dispatchDiagnosticIntake` |
| Frequency | Once per engagement (idempotency key `diagnostic-intake:<id>`, scope `global`) |
| Payload | `{ version: 1, engagementId }` — the engagement id is the only caller-supplied authority |
| Execution | `advanceEngagement`: load engagement → start engine run if missing → poll `/v1/intakes/:id` every 5 s → on `approved` POST `publish_report` → on `published` GET quality receipt + publication → verify SHA-256 → import → send one email |
| Duration | poll deadline **1,500 s** (25 min), interval **5 s** → up to **300 engine polls** |
| `maxDuration` | **1,800 s** |
| Machine | `small-1x` |
| Waiting | **`setTimeout` sleeps**, 5 s each — *not* a Trigger.dev waitpoint |
| Retries | **maxAttempts 3**, 5 s → 120 s, factor 2, randomised |
| Concurrency | none configured — shares the environment default queue |
| Billing | wall-clock compute for the whole poll window + $0.000025 invocation |

**Duration budget overrun.** `advanceEngagement` runs a `for(;;)` loop where each iteration calls
`pollUntilSettled` with a fresh 1,500 s deadline, and `continue`s after a release. Worst case is
3 × 1,500 s = **4,500 s** against a `maxDuration` of 1,800 s. A run needing two release rounds is killed
at 1,800 s and then retried (up to 3 attempts). [V] `automation.ts:250-300`.

### 4.3 Strategy tasks

All fourteen share one shape: `schemaTask` → `worker.run(jobId)` → load job, re-authorise actor and
billing, claim a fenced lease, **one model call**, re-check authority, persist, complete. A 30 s
heartbeat keeps the lease alive. [V] `jobs/runner.ts`

| Task | Module | Model calls per run | `maxDuration` | Retries |
|---|---|---|---|---|
| `auth-strategy-m01-session-v1` | M01 Founder Convictions | 1 (per call; synthesis makes several) | 1,200 s | 10 |
| `auth-strategy-m02-session-v1` | M02 Market Reality | 1 per gate | 1,200 s | 10 |
| `auth-strategy-m03-session-v1` | M03 Business Commitments | 1 per draft step | 1,200 s | 10 |
| `auth-strategy-m04-session-v2` | M04 Viability Check | 1 per stage | 1,200 s | 10 |
| `auth-strategy-bf-session-v1` | BF Business Foundation | 1 per action | 1,200 s | 10 |
| `auth-strategy-m05-session-v1` | Marketing Strategy | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m06-session-v1` | M06 | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m07-session-v1` | Sales Strategy | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m08-session-v1` | Content Strategy | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m09-session-v1` | Digital Direction | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m10-session-v1` | Visual Identity | 1 per stage | 1,800 s | 10 |
| `auth-strategy-cd-session-v1` | Commercial Direction | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m11-session-v1` | Execution Planning | 1 per stage | 1,800 s | 10 |
| `auth-strategy-m12-session-v1` | Work Coordination | 1 per stage | 1,800 s | 10 |

**No Strategy task spawns another task directly.** Chaining happens through the durable outbox and the
minute schedule, so a Strategy engagement is a long series of short, independent runs gated by human
confirmation. That is the right shape for cost: no run is held open while a human thinks.

**Runs per Strategy engagement [E].** Counted from the stage schemas in
`src/lib/modules/strategy/server/stages/*/contracts.ts`; a "run" is one draft or one independent review.

| Module | Runs |
|---|---|
| M01 | 2–6 (est. 3) |
| M02 (six gates) | 6 |
| M03 (eight draft steps) | 8 |
| M04 (seven stages) | 7 |
| BF (assessment, manifesto, document + review) | 4 |
| M05 | 9 |
| M06 | 10 |
| M07 | 9 |
| M08 | 13 |
| M09 | 8 |
| M10 | 10 |
| CD | 9 |
| M11 | 6 |
| M12 | 10 |
| **Full chain M01→M12** | **≈ 112** |

Three scopes are modelled in §6, because the *sold* product is "Business Foundation plus one connected
strategy", not the full chain:

- **Scope A** — Foundation + one strategy route (M01, M02, M03, M04, BF, M05) = **37 runs**
- **Scope B** — full chain M01→M12 = **112 runs**
- **Scope C** — full chain with heavy revision = **180 runs**

### 4.4 Tasks that spawn tasks or run repeatedly

| Mechanism | Behaviour | Cost consequence |
|---|---|---|
| `diagnostic-reconcile-v1` → `advanceEngagement` | Re-drives any engagement in `enquired / in_delivery / ready / retrying`, up to 25 per sweep, every 5 min | Duplicate polling of live engagements (§8.1) |
| `strategy-recovery-v1` → `dispatchRecoverable` | Re-dispatches any job that is `pending` past `available_at`, or `running` with an expired lease, on a 2-minute cooldown, 50 per stage | A permanently stuck job costs ~$52/month (§8.3) |
| `strategy-recovery-v1` → `dispatchOne` | Drains the outbox, ≤50 events per run | Bounded, but each event is a `tasks.trigger` API call |
| Any task failure | Project default 8 attempts (diagnostic intake: 3; strategy: 10) | A failing long run multiplies its own cost |

---

## 5. Verified pricing (30 October 2026)

**Sources**
- `https://trigger.dev/pricing` — plans, compute rates, run invocation price. Fetched 30 Oct 2026.
- `https://trigger.dev/docs/run-usage.md` — what counts as compute. Fetched 30 Oct 2026.
- `https://trigger.dev/docs/wait.md` and `wait-for.md` — wait billing and concurrency. Fetched 30 Oct 2026.
- `https://trigger.dev/docs/limits.md` — concurrency, queues, schedules, TTL. Fetched 30 Oct 2026.
- `https://trigger.dev/docs/machines.md` — presets and default. Fetched 30 Oct 2026.
- `https://trigger.dev/docs/how-to-reduce-your-spend.md` — "you don't pay for compute during any wait
  longer than 5 seconds". Fetched 30 Oct 2026.
- `https://trigger.dev/docs/self-hosting/overview.md` and `docker.md` — self-host requirements and
  feature gaps. Fetched 30 Oct 2026.

### 5.1 Plans

| Plan | Price | Included credits | Production concurrency | Schedules |
|---|---|---|---|---|
| Free | **$0/mo** | **$5/mo** | 20 | 10 |
| Hobby | **$10/mo** | **$10/mo** | 50 | 100 |
| Pro | **$50/mo** | **$50/mo** | 200+ ($10/mo per 50 after) | 1,000+ |

### 5.2 Compute rates (per second, on the managed worker)

| Machine | vCPU | RAM | $/sec | $/hour |
|---|---|---|---|---|
| micro | 0.25 | 0.25 | $0.0000169 | $0.06084 |
| **small-1x (default)** | **0.5** | **0.5** | **$0.0000338** | **$0.12168** |
| small-2x | 1 | 1 | $0.0000675 | $0.24300 |
| medium-1x | 1 | 2 | $0.0000850 | $0.30600 |
| medium-2x | 2 | 4 | $0.0001700 | $0.61200 |
| large-1x | 4 | 8 | $0.0003400 | $1.22400 |
| large-2x | 8 | 16 | $0.0006800 | $2.44800 |

**Montsel runs entirely on `small-1x`** because no task sets `machine`. Every figure in this report uses
$0.0000338/s.

### 5.3 How execution time is billed — the rules that actually matter here

| Rule | Source | Effect on Montsel |
|---|---|---|
| Per-run invocation: **$0.000025** ($0.25 per 10,000 runs) | pricing page | Material for the 2,880 recovery runs/day |
| Only charged **while executing** | pricing page | — |
| **Waits > 5 s do not count** toward compute, when using `wait.for` / `wait.until` / `triggerAndWait` | `run-usage.md`, `wait.md` | **Not used by Montsel** |
| Waits ≤ 5 s **do** count | `run-usage.md` | — |
| Time between attempts and before code executes is **not** charged | `run-usage.md` | Retries are cheaper than they look |
| **DEV environment runs are not charged** | pricing page | STAGING *is* charged — both schedules run in STAGING and PRODUCTION |
| Failed runs are charged for the compute they used | implied by "charged while executing" | Retries multiply cost |
| Max run TTL 14 days | `limits.md` | Irrelevant at these durations |
| Concurrency is **per environment** | `limits.md` | Free prod 20 / Hobby 50 / Pro 200+ |

**The critical nuance, stated plainly.** The documentation exempts *waitpoints*. Montsel's diagnostic
poll loop uses `setTimeout` inside ordinary async code (`polling.ts:70-74`), which is code execution, not
a waitpoint. The conservative and correct assumption is therefore that **the full poll window is billed**.
§9 records this as the first thing to measure, because if Trigger.dev did treat idle `setTimeout` as a
wait, the diagnostic cost would fall by roughly 90 %.

### 5.4 Hosted versus self-hosted — the documented differences

| Feature | Cloud | Self-hosted |
|---|---|---|
| Warm starts | yes | **no** |
| Auto-scaling | yes | **no** |
| Checkpoints (non-blocking waits) | yes | **no** |
| Dedicated support | yes | community |

Self-hosted minimums, from `docker.md`: **webapp 3+ vCPU / 6+ GB RAM**, **worker 4+ vCPU / 8+ GB RAM**,
plus Postgres, Redis, object storage, a container registry and a Docker socket proxy.

---

## 6. Monthly cost projections

### 6.1 The cost formula

Everything below is one of two forms. Both are shown so any figure can be re-derived.

```
cost_per_run      = (duration_seconds × 0.0000338) + 0.000025
cost_per_month    = Σ (runs_per_day × 30 × cost_per_run) + fixed_schedule_cost
fixed_schedule    = (2,880 × recovery_cost_per_run) + (576 × reconcile_cost_per_run)
```

### 6.2 Fixed cost at zero customers

| Component | Runs/month | Invocations | Compute (low / exp / high) | Total (low / exp / high) |
|---|---|---|---|---|
| `auth-strategy-recovery-v1` | 87,552 | $2.19 | $1.18 / $3.55 / $8.88 | **$3.37 / $5.74 / $11.07** |
| `diagnostic-reconcile-v1` (idle) | 17,510 | $0.44 | $0.18 / $0.36 / $0.89 | **$0.62 / $0.79 / $1.33** |
| **Total, no customers** | **105,062** | **$2.63** | | **$3.99 / $6.53 / $12.39** |

Assumed durations: recovery 0.4 s / 1.2 s / 3.0 s (14 stage queries + pool connect + outbox claim);
reconcile 0.3 s / 0.6 s / 1.5 s (one queue query, no engagements).

> **This exceeds the Free tier's $5 credit at the expected and high cases.** Montsel cannot sit on Free
> without paying overage, so the effective floor is the **Hobby plan at $10/month** (which covers the
> idle baseline entirely) unless overage billing on Free is acceptable.

**Note on STAGING.** Both schedules list `environments: ['STAGING', 'PRODUCTION']`. Halving the
scheduled cost by dropping STAGING would take the idle baseline to **$2.00 / $3.27 / $6.20**.

### 6.3 Cost per completed engagement

Assumptions, all labelled [E]:

| Product | Engine/job duration (low / exp / high) | Basis |
|---|---|---|
| Signal | 3 / 8 / 20 min | ≤10 pages, ≤20 model calls; single reading |
| Gap | 6 / 14 / 25 min | Adds sector intelligence + evidence gates |
| Direction | 8 / 18 / 25 min (25 = poll deadline) | Adds proposal testing; longest family |
| Strategy (per run) | 25 / 70 / 150 s | **One measured completion: 146.4 s** (`docs/architecture/strategy-worker-integration.md`); smaller stages shorter |
| Reconcile sweep overlap | ~90 s per 5 min of delivery | One sweep per 5-min window, average poll before the 120 s cap |
| Retry uplift | ×1.02 / ×1.05 / ×1.15 | Assumed failure rates |

| Product | Trigger.dev cost per engagement (low / exp / high) |
|---|---|
| **Signal** | **$0.0081 / $0.0222 / $0.0607** |
| **Gap** | **$0.0162 / $0.0388 / $0.0758** |
| **Direction** | **$0.0215 / $0.0499 / $0.0758** |
| **Strategy, Scope A (37 runs)** | **$0.036 / $0.101 / $0.216** |
| **Strategy, Scope B (112 runs)** | **$0.109 / $0.305 / $0.653** |
| **Strategy, Scope C (180 runs)** | **$0.176 / $0.490 / $1.050** |

Worked example — Signal, expected:

```
intake run        480 s × 0.0000338          = $0.01622
sweep overlap     144 s × 0.0000338          = $0.00487
invocation                                   = $0.00003
subtotal                                     = $0.02112
retry uplift      × 1.05                     = $0.02218
```

### 6.4 Monthly cost by product at each volume

Monthly volume = engagements/day × 30. All figures are **expected case**, and include the $6.53 fixed
schedule cost.

| Engagements/day | /month | Signal | Gap | Direction | Strategy (A) | Strategy (B) |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 30 | $7.20 | $7.69 | $8.03 | $9.56 | $15.68 |
| 5 | 150 | $9.86 | $12.35 | $14.02 | $21.68 | $52.28 |
| 10 | 300 | $13.19 | $18.17 | $21.50 | $36.83 | $98.03 |
| 25 | 750 | $23.18 | $35.63 | $43.95 | $82.28 | $235.28 |
| 50 | 1,500 | $39.83 | $64.73 | $81.38 | $158.03 | $464.03 |
| 100 | 3,000 | $73.13 | $122.93 | $156.23 | $309.53 | $921.53 |

Low and high cases, for the same volumes (the ranges are wide because the engine durations are
unmeasured — this is the honest width of the estimate, not a hedge):

| Engagements/day | Signal low→high | Gap low→high | Direction low→high | Strategy A low→high |
|---|---:|---:|---:|---:|
| 1 | $4.23–$14.21 | $4.48–$14.66 | $4.63–$14.66 | $5.07–$18.87 |
| 5 | $5.21–$21.50 | $6.42–$23.76 | $7.21–$23.76 | $9.39–$44.79 |
| 10 | $6.42–$30.60 | $8.85–$35.13 | $10.44–$35.13 | $14.79–$77.19 |
| 25 | $10.06–$57.91 | $16.14–$69.24 | $20.12–$69.24 | $30.99–$174.39 |
| 50 | $16.14–$103.44 | $28.29–$126.09 | $36.24–$126.09 | $57.99–$336.39 |
| 100 | $28.29–$194.49 | $52.59–$239.79 | $68.49–$239.79 | $111.99–$660.39 |

### 6.5 Mixed workload

**Assumed distribution** (stated because the brief requires it, and it drives the blended figure):

| Product | Share |
|---|---|
| Signal | 50 % |
| Gap | 25 % |
| Direction | 15 % |
| Strategy (Scope A) | 10 % |

This reflects the current release position — `RELEASED_PRODUCTS: "signal"` in `wrangler.jsonc` means only
Signal is actually purchasable today [V] — with a plausible path to the rest of the catalogue.

Blended expected cost per engagement = `0.5(0.0222) + 0.25(0.0388) + 0.15(0.0499) + 0.10(0.101)` =
**$0.03839**. Blended low = $0.01492, blended high = $0.08227.

| Engagements/day | /month | Fixed | Variable | **Total (expected)** | Total low→high |
|---|---:|---:|---:|---:|---:|
| **0** | 0 | $6.53 | $0.00 | **$6.53** | $3.99–$12.39 |
| 1 | 30 | $6.53 | $1.15 | **$7.68** | $4.44–$14.86 |
| 5 | 150 | $6.53 | $5.76 | **$12.29** | $6.23–$24.73 |
| 10 | 300 | $6.53 | $11.52 | **$18.05** | $8.47–$37.07 |
| 25 | 750 | $6.53 | $28.79 | **$35.32** | $15.18–$74.09 |
| 50 | 1,500 | $6.53 | $57.59 | **$64.11** | $26.38–$135.79 |
| 100 | 3,000 | $6.53 | $115.17 | **$121.69** | $48.76–$259.20 |

With the full Strategy chain (Scope B) as the Strategy line item, the blend becomes **$0.05878** per
engagement and the 100/day total rises to **$182.88**.

### 6.6 Retries, failures and maintenance

| Source | Effect on the model |
|---|---|
| Strategy task retries (10) | A permanently failing job can burn 10 × its own duration. At 150 s that is 1,500 s = **$0.051 per failed job** |
| Diagnostic intake retries (3) | A persistent engine outage can burn 3 × 1,800 s = 5,400 s = **$0.183 per engagement** |
| Sweep retries (8) | A capped sweep (300 s) retried 8× = 2,400 s = **$0.081 per sweep event**, every 5 minutes |
| Engine timeouts | A run that reaches `timed_out` returns normally — **no retry**, but the engagement stays `in_delivery` and is re-polled by every subsequent sweep, indefinitely |

---

## 7. Concurrency and performance

### 7.1 Simultaneous active tasks

Concurrent in-flight engagements = `daily volume × duration / 1,440`.

| Volume | Signal (8 min) | Gap (14 min) | Direction (18 min) | Strategy A (37 × 70 s, spread over days) |
|---|---:|---:|---:|---:|
| 1/day | 0.006 | 0.010 | 0.013 | ~0.03 |
| 10/day | 0.056 | 0.097 | 0.125 | ~0.30 |
| 100/day | 0.56 | 0.97 | 1.25 | ~3.0 |

**Every one of these is far below even the Free tier's 20-slot production limit.** Concurrency is not a
constraint for Montsel at any modelled volume, and no concurrency configuration is needed.

### 7.2 Peak

Realistic peak = `concurrent users × 1 job each + 1 recovery + 1 reconcile`. A plausible worst case is
**10–15 simultaneous runs** — a burst of buyers submitting intakes while a sweep is mid-poll and a
recovery pass is draining the outbox. Even that is under the Free tier limit.

### 7.3 Maximum sustainable throughput

Bounded by `concurrency × 1/duration`:

| Limit | Diagnostic at 8 min | Strategy at 70 s |
|---|---|---|
| Free (20) | 3,600 runs/day | 24,686 runs/day |
| Hobby (50) | 9,000 runs/day | 61,714 runs/day |
| Pro (200) | 36,000 runs/day | 246,857 runs/day |

**Conclusion: throughput is bounded by the diagnostic engine and OpenRouter, not by Trigger.dev.**
[U] — this is the honest answer, and it is not a claim of measured capacity. It says only that the queue
is not the bottleneck.

### 7.4 Queueing delays

None expected. At 100 engagements/day, average utilisation of the Free tier's 20 slots is under 5 %.
The one queueing scenario worth naming: if a burst of 20 diagnostics filled every slot for a full
25-minute poll window, a Strategy job dispatched in that window would wait up to ~25 minutes. At current
volumes this cannot happen.

### 7.5 Do Strategy and Diagnostic compete?

**Yes, structurally — but not in practice.** There are no concurrency keys or per-task queues anywhere in
the repo, so all 16 tasks share one environment-wide pool. Strategy runs are short (25–150 s) and
diagnostics are long (up to 1,500 s), so in a saturated environment the diagnostics would dominate the
pool. At modelled volumes the pool is never more than a few percent used.

### 7.6 Which tasks consume compute, and which mostly wait

| Task | Compute character |
|---|---|
| `diagnostic-intake-v1` | **Mostly waiting, but billed as executing.** Up to 300 polls over 25 min; each poll is a fast HTTP GET. Nearly all of the cost is the `setTimeout` gap. |
| Strategy `*-session-*` | **Mostly waiting on OpenRouter, inside one HTTP call.** The measured completion spent 626 ms to headers and 146.4 s to body — the whole wait is inside the request, which is billed. |
| `diagnostic-reconcile-v1` | Cheap when idle, **expensive when it catches an engagement** (120 s per catch). |
| `auth-strategy-recovery-v1` | Cheap but constant: 2,880 runs/day, 14 queries each. |

### 7.7 What must be benchmarked

Do not claim precise capacity without measured execution data. The following are the measurements that
would replace the estimates in §6:

1. `runs.retrieve(runId)` → `durationMs` and `costInCents` for **one real Signal run**, one Gap, one
   Direction. This settles the `setTimeout` billing question and the engine-duration ranges in one step.
2. The Trigger.dev **Usage** dashboard, "total duration by task", over a week — this gives the real
   per-task distribution without any instrumentation.
3. One Strategy run per module, to replace the single 146.4 s datapoint.
4. Sweep duration distribution, to confirm the 300 s cap is not being hit.

---

## 8. Structural findings that affect cost

These are observations, not recommendations to change anything during the audit.

### 8.1 The reconcile sweep re-polls engagements that are already polling

`listEngagementsNeedingAttention` selects `status IN ('enquired', 'in_delivery', 'ready', 'retrying')`
[V] `automation.ts:347`. `in_delivery` is precisely the state a live intake task occupies. So every
engagement in flight is polled by **two** Trigger.dev runs at once — the intake task and whichever sweep
overlaps it — each issuing its own `/v1/intakes/:id` calls.

Cost effect: the sweep's per-catch cost (up to 120 s) is real, additive compute. It is included in §6.3 as
"sweep overlap". Engine effect: duplicate engine reads, which are the engine's cost, not Trigger.dev's.

### 8.2 The sweep's work budget is 10× its duration cap

`reconcileDiagnosticEngagements` allows `limit: 25` engagements × `deadlineMs: 120_000`
[V] `diagnostic-worker.server.ts:51-56`. That is **3,000 s of work** against an inherited `maxDuration`
of **300 s** [V] `trigger.config.ts:14`. Once roughly three engagements are simultaneously in flight, the
sweep will be killed at 300 s, which counts as a failure, and the project default retries it **8 times**.

At the modelled volumes this is unlikely — §7.1 shows concurrency well under 1 — but it is a cliff, not a
slope, and it is the most likely source of a surprise bill.

### 8.3 A permanently stuck Strategy job costs ~$52/month, indefinitely

`strategy_job.recovery_dispatch_after` is set to `now() + interval '2 minutes'`
[V] `data/jobs.ts:375`. A job that can never succeed is therefore re-dispatched **720 times a day**, each
a full run. At 70 s per run on `small-1x`:

```
720 runs/day × 70 s × 0.0000338 = $1.70/day = $51.11/month — per stuck job
```

There is no attempt ceiling visible in the recovery path. This is the single largest unbounded cost risk
in the system.

### 8.4 The provider timeout is shorter than a measured completion

`STRATEGY_PROVIDER_TIMEOUT_MS` defaults to **120,000 ms** [V] `strategy-configuration.server.ts:9`. The
one measured live M04 completion took **146,437 ms** to body [V]
`docs/architecture/strategy-worker-integration.md`. At the default, that call would abort and be retried
— and a Strategy task retries **10 times**, so one slow section could cost 10 × 150 s = **$0.051** and
still fail.

### 8.5 `maxDuration` is not a cost control here

`diagnostic-intake-v1` declares 1,800 s but `advanceEngagement` can want 4,500 s. `reconcile` inherits
300 s but wants 3,000 s. In both cases the cap converts a slow run into a *failed* run, and the retry
policy then multiplies it. A cap that is lower than the work is more expensive than a cap that matches it.

---

## 9. Hosted versus self-hosted

### 9.1 A. Trigger.dev Cloud

| Dimension | Assessment |
|---|---|
| Monthly subscription | $0 / $10 / $50 |
| Compute at 100 engagements/day mixed | **$121.70/month** (expected) |
| Operational simplicity | Deploy with the CLI; no servers, no upgrades, no backups |
| Managed scaling | Automatic; 20–200+ concurrent runs per environment |
| Reliability | Managed workers, warm starts, checkpoints, dedicated support on Pro |
| Total cash cost at the modelled ceiling | **≈ $122/month** |

### 9.2 B. Self-hosted on the existing Oracle VPS

**The VPS cannot meet the documented minimum.** From `docker.md`: webapp **3+ vCPU / 6+ GB RAM**,
worker **4+ vCPU / 8+ GB RAM**. Combined that is **7 vCPU / 14 GB**. The VPS has **4 vCPU / 24 GB**.

The RAM is not the binding constraint — the 14 GB minimum would fit inside 24 GB, leaving roughly 10 GB
for Postgres, Directus and everything else already running. That is tight, but not impossible.
**The vCPU is the problem.** There are 4, and the documented floor is 7. An undersized combined stack
would run, but every `small-1x` run needs 0.5 vCPU, so a 4 vCPU box hosting a 3 vCPU webapp supports
roughly **2 concurrent runs** — below Montsel's realistic peak of 10–15, and below even the Free tier's
20-slot allowance.

Additional requirements the VPS does not currently provide [V] from `docker.md`:

- PostgreSQL and Redis for the Trigger webapp (may reuse existing, but then Trigger and Directus contend
  for the same instance)
- MinIO / object storage for payloads and outputs
- A container registry
- A Docker socket proxy
- Docker, alongside whatever already runs there

**What self-hosting would cost, with explicit assumptions [E]:**

| Item | Assumption | Monthly |
|---|---|---|
| VPS uplift to ~8 vCPU / 32 GB | Oracle Ampere A1 beyond the 4 OCPU / 24 GB allowance; verify against current Oracle list pricing | $25–$40 |
| Storage (registry + object storage) | 50–200 GB block volume | $5–$15 |
| Monitoring / alerting | Reuse existing, or add | $0–$20 |
| **Maintenance time** | **4–8 h/month** (upgrades, backups, incident recovery, patching, registry hygiene) | **£300–£600 at £75/h** |

**Feature regressions, which are also cost regressions:**

- **No checkpoints.** The diagnostic poll loop's 5 s sleeps would consume a worker slot for the whole
  25-minute window, on infrastructure Montsel pays for continuously. On Cloud the same pattern at least
  competes only for a managed slot.
- **No auto-scaling.** A burst of intakes either queues or degrades; you buy capacity for the peak and
  pay for it at 3 a.m.
- **No warm starts.** Every run pays Node process startup, which the recovery schedule — 2,880 runs a
  day — would pay 2,880 times.

### 9.3 The break-even, stated two ways

**Cash only, maintenance valued at zero:**

```
Cloud cost  = subscription + usage
Self-hosted = VPS uplift + storage + monitoring

Hobby ($10) vs VPS uplift ($30):  crossover when usage > $20/month
                                 = 521 engagements/month ≈ 17/day (mixed)
```

**With maintenance priced honestly (the correct view):**

```
Maintenance at 4 h/month × £75/h = £300 ≈ $381/month
Break-even usage = $381 + $30 − $6.53 ≈ $404.47/month
                 = 10,537 engagements/month ≈ 351/day (mixed)
At 8 h/month:    ≈ 20,478/month ≈ 683/day
```

**So: ~17 engagements/day if your time is free, and ~350/day if it is not.** The modelled ceiling is
100/day. Neither threshold is reached by the business plan, and the second one is not close.

**There is no credible financial justification for self-hosting Trigger.dev on the existing VPS.**

---

## 10. Important uncertainties and missing measurements

| # | Uncertainty | Why it matters | How to close it |
|---|---|---|---|
| 1 | **Whether `setTimeout` sleeps are billed** | Changes the diagnostic cost by up to 90 % | `runs.retrieve(runId).durationMs` on one real run. If `durationMs` ≈ wall clock, sleeps are billed |
| 2 | **Actual Signal / Gap / Direction engine durations** | The largest single driver of the diagnostic ranges | The same call, over ~10 real runs per family |
| 3 | **Actual Strategy per-stage durations** | Only one datapoint exists (146.4 s, M04 context) | One run per module |
| 4 | **Whether the schedules are attached in the Trigger.dev project** | Determines whether the $6.53 idle baseline is real | Trigger.dev dashboard → Schedules |
| 5 | **Whether STAGING is live and billed** | Halves or doubles the fixed cost | Dashboard, per environment |
| 6 | **Current real volume** | `RELEASED_PRODUCTS: "signal"` means Signal-only today | Stripe / `diagnostic_engagement` row count |
| 7 | **Engine provider cost per diagnostic** | Likely **larger** than the Trigger.dev cost; excluded by design | Engine billing export |
| 8 | **OpenRouter cost per Strategy engagement** | Measured at $0.00247 for one section → order $0.05–$0.60 per engagement | OpenRouter usage export |
| 9 | **FX rate** | All GBP conversions assume **£1 = $1.27** | Figures scale linearly; substitute the real rate |
| 10 | **Whether the sweep's inclusion of `in_delivery` is intended** | It is a product decision, not a bug | Product owner |

**Other cost categories, listed separately as required, and excluded from every Trigger.dev figure:**

| Category | Status |
|---|---|
| AI model inference (OpenRouter) | Measured once: **$0.00247** for 25,083 prompt + 2,732 completion tokens |
| Diagnostic engine (scraping + up to 20 model calls per run) | **Unmeasured — the largest unknown in the whole unit economics** |
| PostgreSQL | Not modelled |
| Email (usesend) | Not modelled |
| Stripe | Not modelled; use the account's published rate |
| Cloudflare Workers | Not modelled |

---

## 11. Cost per product, and share of selling price

Prices are read from `src/lib/app/plans.ts` [V], not assumed.

| Product | Price | Trigger.dev (expected) | Share of price | Share (high case) |
|---|---:|---:|---:|---:|
| Signal | **£395** | $0.022 ≈ **£0.017** | **0.0044 %** | 0.0121 % |
| Gap | **£995** | $0.039 ≈ **£0.031** | **0.0031 %** | 0.0060 % |
| Direction | **£1,495** | $0.050 ≈ **£0.039** | **0.0026 %** | 0.0040 % |
| Strategy, Scope A | **£4,995** | $0.101 ≈ **£0.080** | **0.0016 %** | 0.0034 % |
| Strategy, Scope B | **£4,995** | $0.305 ≈ **£0.240** | **0.0048 %** | 0.0103 % |
| Strategy, Scope C | **£4,995** | $0.490 ≈ **£0.386** | **0.0077 %** | 0.0165 % |

**Allocated scheduled-task overhead**, which dominates at low volume and vanishes at high volume:

| Volume | Overhead per engagement |
|---|---|
| 30/month | **$0.218** |
| 150/month | $0.044 |
| 300/month | $0.022 |
| 750/month | $0.009 |
| 3,000/month | $0.002 |

At launch, the fixed schedule cost is roughly **ten times** the per-engagement compute. That is the real
finding at low volume: the sweeps cost more than the customers do.

---

## 12. Final recommendation

**Stay on Trigger.dev Cloud. The financial case for self-hosting does not exist.**

The bill at the top of the modelled range — 100 engagements/day across all products, mixed — is
**≈ $122/month**, which is **0.002–0.008 % of revenue** on every product in the catalogue. Self-hosting
would require a VPS upgrade Montsel's current hardware cannot support (7 vCPU documented floor against
4 available), would remove checkpoints and auto-scaling, and would cost **£300–£600/month of time** to
save at most ~$122.

**Put the effort where the money actually is.** Trigger.dev is not the cost problem. A single diagnostic
may make up to **20 model calls** and read up to **10 pages** [V] `orchestration.ts:118-120`; at any
plausible per-call price that dwarfs the $0.022 of Trigger.dev compute behind it. Strategy is closer to
parity — the one measured OpenRouter completion cost **$0.00247** for a single section, so ~37 sections
is roughly $0.09 of model spend against $0.10 of Trigger.dev compute. Measure both.

**Four cost-hygiene items, in value order.** None is required for the economics to work; all are
worth doing before volume arrives:

1. **Measure one real run** (`runs.retrieve` → `durationMs`, `costInCents`). This single call replaces
   most of the estimation in this document, and settles the `setTimeout` question.
2. **Stop the sweep re-polling `in_delivery`** engagements, or bound its per-engagement poll to a few
   seconds. It removes duplicate engine load and duplicate compute for one predicate change.
3. **Give `diagnostic-reconcile-v1` a `maxDuration` and retry policy that match its work** — or reduce
   its budget from 25 × 120 s to something that fits inside 300 s. A cap below the work turns slow runs
   into 8× retried failures.
4. **Bound the recovery re-dispatch** for jobs that have failed repeatedly. A stuck job currently costs
   ~$52/month forever.

**One thing to watch, not to fix:** if `RELEASED_PRODUCTS` stays at `signal`, Montsel pays the full
$6.53/month idle baseline to deliver a product whose Trigger.dev cost per engagement is **$0.022**. The
ratio is 300:1. That is not a reason to change anything — it is a reason to know it.

---

## Appendix A — Worked calculations

**Machine rate.** `small-1x` = $0.0000338/s = **$0.002028/minute** = $0.12168/hour.

**Run invocation.** $0.000025 per run that starts executing.

**Fixed schedule cost, expected case.**

```
recovery:  1,440 runs/day/env × 2 env × 30.4 days = 87,552 runs/month
           invocations 87,552 × 0.000025              = $2.1888
           compute     87,552 × 1.2 s × 0.0000338     = $3.5511
           total                                      = $5.7399

reconcile: 288 runs/day/env × 2 env × 30.4 days = 17,510.4 runs/month
           invocations 17,510.4 × 0.000025            = $0.4378
           compute     17,510.4 × 0.6 s × 0.0000338   = $0.3551
           total                                      = $0.7929

fixed total                                          = $6.5328
```

**Signal, expected case.**

```
engine duration                          480 s
intake run compute      480 × 0.0000338 = $0.016224
sweep overlap           (480/300)×90 s   = 144 s → $0.004867
invocation                               = $0.000025
subtotal                                 = $0.021116
retry uplift × 1.05                      = $0.022172
```

**Mixed workload, 100 engagements/day.**

```
blended per engagement = 0.50(0.02217) + 0.25(0.03878) + 0.15(0.04986) + 0.10(0.1010)
                       = 0.011085 + 0.009695 + 0.007479 + 0.010100
                       = $0.038359

variable = 3,000 × 0.038359 = $115.08
fixed                        =   $6.53
total                        = $121.61   (rounds to $121.69 with unrounded per-product figures)
```

**Self-host break-even.**

```
maintenance 4 h/month × £75/h = £300  ≈ $381.00
VPS uplift                    ≈ $30.00
avoided fixed schedule        =  $6.53

break-even usage = 381 + 30 − 6.53 = $404.47/month
                 = 404.47 / 0.038359 = 10,544 engagements/month
                 = 351 engagements/day (mixed)
```

---

## Appendix B — Source index

| Claim | File |
|---|---|
| Project config, defaults, retries | `trigger.config.ts` |
| Diagnostic task definition | `src/trigger/diagnostic-intake-v1.ts` |
| Diagnostic schedule | `src/trigger/diagnostic-reconcile-v1.ts` |
| Strategy schedule | `src/trigger/strategy-recovery-v1.ts` |
| Strategy task definitions (14) | `src/trigger/strategy-*-session-*.ts` |
| Strategy task handlers | `src/trigger/strategy-task-handlers.ts` |
| Diagnostic dispatch | `src/lib/modules/diagnostic/server/dispatch.ts` |
| Strategy dispatch gateways | `src/lib/modules/strategy/server/jobs/gateway.ts` |
| Poll loop and deadlines | `src/lib/modules/diagnostic/server/polling.ts` |
| Automation policy and sweep | `src/lib/modules/diagnostic/server/automation.ts` |
| Worker composition | `src/lib/app/diagnostic-worker.server.ts`, `src/lib/app/strategy-worker.server.ts` |
| Engine client and limits | `src/lib/modules/diagnostic/server/engine.ts`, `orchestration.ts` |
| Job recovery cooldown | `src/lib/modules/strategy/server/data/jobs.ts` |
| Job runner, heartbeat | `src/lib/modules/strategy/server/jobs/runner.ts` |
| Provider timeout, model config | `src/lib/app/strategy-configuration.server.ts` |
| Product prices | `src/lib/app/plans.ts` |
| Diagnostic variants | `src/lib/modules/diagnostic/shared/registry.ts` |
| Release state | `wrangler.jsonc` (`RELEASED_PRODUCTS: "signal"`) |
| Measured completion (146.4 s) | `docs/architecture/strategy-worker-integration.md` |
| Delivery pipeline | `docs/architecture/diagnostic-delivery-automation.md` |

---

*Prepared 30 October 2026. Pricing verified against trigger.dev on the same date. No code, dependency,
configuration, infrastructure or production data was modified during this audit.*
