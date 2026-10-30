# Real-engine integration — evidence and current blocker

Recorded 30 October 2026. Local engine, local database, controlled fixture site.
No Stripe, no production database, no production configuration change.

---

## 1. The engine exists and is real

| Question | Answer |
| --- | --- |
| Where is it? | `~/Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines/diagnostic` |
| Does it implement the HTTP contract? | **Yes.** `app/cli/src/application/http.ts` serves `/v1/health`, `/v1/options`, `/v1/intakes`, `/v1/intakes/:id`, `/v1/intakes/:id/actions`, `/v1/runs/:id/{quality,publication,decision-record,brief}` |
| Is it configured? | **Yes.** Provider `openai`, model `gpt-6.1-sol`, latest generation succeeded |
| Database | Local `127.0.0.1:54329/brc`, 43 migrations, healthy |
| Start command | `bun run src/cli.ts api serve --port=<n>` (loopback only, bearer token) |

**Readiness probe against it: 8/8 checks passed.** Three families, 29 approved sectors, both
delivery routes, limits 30 pages / 25 batches / 40 calls.

So the earlier conclusion — "no engine exists" — was wrong. The engine was never missing; the
**application's credential was missing**, and the engine's own analysis pipeline had defects
that only a real run could expose.

## 2. Contract verification

The application's `buildEngineIntake` sends 32 fields. The engine's `parseWorkbenchIntake`
allow-list accepts exactly those 32 and rejects anything else. Field-for-field match, including
`reportFamily`, `deliveryRoute`, `decision`, `evidenceScope`, `providerPermission` and the
family-specific groups. `/v1/options` matches `EngineOptions` exactly.

**One application defect found by reading the engine.** For a self-service run the engine
publishes from `automation_ready`, not `approved`
(`review-publication/service.ts`: `expected = software ? "automation_ready" : "approved"`).
The application was releasing at `approved`, so a real self-service run would have sat at the
automated gate until the poll timed out. `selfServiceAction` is corrected, and the simulated
engine now mirrors the real contract.

**One deployment requirement found.** `publish_report` requires the `publisher` role
(`workbench-execution.ts:342`). The local operator holds `operator` only. The production service
identity must hold `publisher` for automated delivery; for this test the role was granted inline
on the command line, not written to a file.

## 3. Engine defects found by real runs, and fixed

Each was found by a real intake failing, not by reading. All are in the engine repo; the
engine's own suite passes 50/50 after the changes.

| # | Defect | Evidence | Fix |
| --- | --- | --- | --- |
| 1 | Review phase had no retry; one unsupported quotation failed the paid run | `held: Review contains an unsupported quotation or malformed finding` | one corrective retry, validation unchanged |
| 2 | Synthesis had no retry | `held: Generated analysis is invalid: findings[0].evidence must be an array` | one corrective retry |
| 3 | Correction was appended *after* the JSON task line, so the model read a stray instruction after the payload it answers | model still non-compliant on retry | `withCorrection` inserts before the final task line |
| 4 | `decision_resolution.resolves_material_uncertainty` guide placeholder was a **string** where the contract requires a **boolean** | `must be a boolean` on both attempts | real boolean + empty conditional field |
| 5 | `coverage_review.*.could_change_decision` placeholders were the **string** `"ASSESS"` where booleans are required | `Omitted sources require a materiality judgement and reason` | real boolean + empty reason |
| 6 | `qualitative_finding` is required by the v2 signal contract but absent from the score schema example the model follows | `qualitative_finding must be a non-empty string` | added to the signal guide |
| 7 | `gap_diagnostic` enum values (`state_1..6`, valence, evidence_strength, …) were documented nowhere the model could see | `diagnostic_state must be one of state_1…` | enumerated in the synthesis instruction |
| 8 | Enum errors said "is required in declared_gap mode" for values that were present but invalid, so the corrective retry repeated the same mistake | retry never converged | `oneOfMessage` names the received value and the allowed set |
| 9 | `coverage_hash` is computed by the engine but transcribed by the model | `Coverage review is not bound to the current session receipt` | engine binds it |
| 10 | Identity mismatch threw before the retry could correct a UUID transcription | `changed its pinned identity or method` | routed through the retry; still fatal after it |

Defects 4, 5 and 6 are the same root cause: **the schema illustration handed to the model
disagrees with the contract the engine validates.** That class produced four separate failures.

## 4. Current blocker

The run now passes capture, full-text review, synthesis contract validation and coverage
binding. It stops intermittently at:

```
held: Coverage review must account for failed and uncollected sources exactly once.
```

`assertCoverageReview` (`scrape/coverage.ts:49`) requires `omitted_sources` to list **every**
failed or `not_captured` inventory URL, exactly once. The guide supplies the list; the model
sometimes drops or adds an entry. It passed on one run and failed on the next — model variance
against a strict structural requirement.

This is not a code bug with an obvious safe patch. Two options, and the choice is a product
decision:

| Option | Consequence |
| --- | --- |
| **A. Engine binds the URL set** (as it now binds `coverage_hash`), leaving only the boolean and reason to the model | Removes the variance. But if the model omits a source, the engine must invent its materiality judgement — and the honest default (`could_change_decision: true`) withholds release by design (`coverage.ts:53`) |
| **B. Engine inserts omitted rows with `could_change_decision: false`** | Runs would publish. It would assert that a source the model never considered cannot change the decision, which is a false claim |

**Recommendation: A**, with the honest default, and accept that a run with any failed collection
is withheld rather than published. That is consistent with the engine's existing stance
("Material evidence remains unresolved; diagnostic release is withheld") and with the product's
no-invented-assurance rule. It does mean Signal publishes only when collection is clean.

This needs an owner decision because it changes what the product will and will not deliver.

## 5. What is proven, and what is not

Proven against the real engine:

- the engine answers `/v1/options` with the exact contract the application expects
- an intake is accepted and the isolated writer child runs
- website capture succeeds on a multi-page site (4 owned pages)
- full-text review and synthesis run against `openai/gpt-6.1-sol`
- the analysis contract, coverage accounting and evidence binding are enforced
- every failure is surfaced as a named, honest state rather than a silent pass

Not yet proven:

- a Signal run reaching `automation_ready` and publishing without a consultant
- the quality receipt and hash-verified import through the application
- Gap and Direction (their intake paths are proven at the contract level, not end-to-end)
- refund → no new processing, and notification retry (implemented app-side, not exercised
  against a real run)

## 6. Cost and side effects of this session

- Ten real intake runs against `https://iamstudios.cc`, bounded to 5 pages and 8 model calls
  each; typical 2–3 model calls per run.
- Local engine database gained brands `iam-studios`, `iam-studios-main`, `iam-studios-probe` and
  the associated sessions and captured pages. No production database was touched.
- No Stripe session, no purchase, no entitlement written outside the disposable test database.
- Engine API left running on `127.0.0.1:3110`.

## 7. Files changed

Engine (`03-Product-Engines/diagnostic/app/cli`):

- `src/analysis/generate.ts` — corrective retries, `withCorrection`, coverage hash binding
- `src/analysis/prompt.ts` — boolean placeholders, `qualitative_finding`, enum documentation
- `src/score/contract.ts` — actionable enum messages
- `src/analysis/prompt.test.ts` — assertion updated to the boolean contract

Application (`auth`):

- `src/lib/modules/diagnostic/server/automation.ts` — release at `automation_ready`
- `src/lib/modules/diagnostic/server/__tests__/{fake-engine,diagnostic-delivery.integration.test}.ts`
  — mirror the real publish state


---

# Addendum — coverage gate implemented (Option A)

## What was built

`bindCoverageInventory` in `analysis/generate.ts` now constructs the authoritative
`omitted_sources` and `pages` sets from the capture inventory and the captured page list.
The model supplies only the judgement.

| Requirement | Implementation |
| --- | --- |
| Engine owns the URL set | Every `failed`/`not_captured` inventory URL appears exactly once, in inventory order |
| Model owns the judgement | A valid boolean plus non-empty reason is preserved verbatim |
| No fabricated immateriality | An unassessed, non-boolean or reasonless entry becomes `could_change_decision: true` |
| Conservative default | That default trips `coverage.ts:53` and withholds release |
| Publish where justified | A model `false` with a reason passes through untouched |
| Duplicates | Collapsed, first judgement wins |
| Invented sources | Dropped; they are not in the inventory |
| Unaccounted pages | Added as `not_reviewed`, which prevents a `sufficient` outcome |

Eight tests cover clean capture, immaterial omission, material omission, missing judgement,
invalid judgement, duplicates, inconsistent inventory and an absent review block.
Engine suite: **58 pass, 0 fail**.

## Real runs after the change

| Run | Site | Outcome | Calls |
| --- | --- | --- | --- |
| `fe27bbfa` | iamstudios.cc | `analysis_held` — blocked | 4 |
| `625408d1` | iamstudios.cc (reading question) | `analysis_held` — blocked | 3 |
| `d0594f25` | hestia.org (5 pages) | `held` — timeout | 2 |
| `87e31880` | hestia.org (3 pages) | `held` — timeout | 2 |

### Why iamstudios.cc is withheld

The binding works — no "exactly once" error remains. The analysis is complete and coherent:

- all four captured pages reviewed `full`
- `/sitemap` was attempted and not captured
- the model judged that omission **material**: *"No usable text was captured. A usable sitemap
  or equivalent deeper inventory may reveal relevant terms, proof…"*
- five material questions, four unresolved
- `stopping_outcome: blocked`

`coverage.ts:53` then withholds release. **This is the approved behaviour.** Publishing would
mean overriding the model's own explicit judgement that the evidence is insufficient.

### Why hestia.org times out

Synthesis exceeds the provider timeout on a content-heavy corpus, at both 5 and 3 pages. The
`iamstudios.cc` synthesis completed in roughly four minutes; Hestia's does not.

## What this proves and what it does not

Proven: the real engine accepts the application's intake, captures, reviews, synthesises,
enforces the contract, binds coverage deterministically, and refuses to publish an analysis it
cannot defend.

**Not proven: a published Signal run.** The lifecycle has not reached `automation_ready`,
publication, quality verification, hash-verified import or the delivery notice.

## Remaining work, in order

1. **Collection completeness.** Capture `/sitemap.xml` (or a deeper frontier) so no inventory
   item ends `failed`/`not_captured`. Without this, every run on a site with an uncaptured
   sitemap is withheld — correctly, but permanently.
2. **Synthesis timeout.** Raise the provider timeout or batch the synthesis input so a
   content-heavy corpus completes. Two runs died here.
3. Only then: the `automation_ready → publish → quality → import → notify` chain, then Gap and
   Direction.

Neither (1) nor (2) is a contract problem. Both are collection and provider-budget work.


---

# Addendum 2 — collection recovery and synthesis reliability

## Collection

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Discovery resources are not evidence pages | `isDiscoveryResourceUrl` in `scrape/classify.ts`; `exclusion()` returns "discovery resource (robots/sitemap); not evidence-bearing content" | `discovery-resources.test.ts` |
| Standard sitemap locations | `scrape/site-map.ts` seeds `/sitemap.xml`, `/sitemap_index.xml`, `/sitemap-index.xml`, plus robots `Sitemap:` entries, and recurses `sitemapindex` (bounded to 20 fetches / 5 000 URLs) | existing + seeds added |
| Failed sitemap is not a material omission | The sitemap link is `excluded`, so it never enters `omitted_sources`; the failed discovery request is still disclosed as a limitation | test: "an unavailable sitemap is not recorded as missing evidence" |
| Bounded internal-link discovery | Homepage and per-page link discovery run regardless of sitemap outcome | existing |
| Inventory, binding and gate preserved | No change to `bindCoverageInventory`, `assertCoverageReview` or the materiality rule | 84 tests pass |
| Genuinely missing pages still recorded | A failed content page stays `failed` and remains an omission | test: "a genuinely missing evidence page remains an omission" |
| No model judgement overridden | Binding only fills what the model omitted; a valid `false` + reason passes through | `coverage-binding.test.ts` |

The defect this fixes: `/sitemap` (an extensionless sitemap route) was classified as an
evidence page. Its failed capture became a material omission, and the model then correctly
judged the run unresolvable. Every run on that site was withheld for a source that could never
have carried evidence.

## Synthesis reliability

**Diagnosis.** The provider call is bounded by `AbortSignal.timeout` at
`REPORT_REQUEST_TIMEOUT_MS = 300_000` (`report-writer/openai-gateway.ts:15`), overridable via
`OPENAI_REPORT_TIMEOUT_MS`. The failure string "The operation timed out." is Bun's
`AbortSignal.timeout` DOMException, so the cause was **request duration**, not input size
rejection, output truncation or retry behaviour. The call simply exceeded five minutes.

Two runs died this way (`d0594f25`, `87e31880`), both on the content-heavy corpus, at 2 calls
each and ~2 000 output tokens — i.e. the model had barely started emitting.

**Change.** The bound is raised to 600 s for the acceptance runs via `OPENAI_REPORT_TIMEOUT_MS`
on the engine process. It stays a bound; nothing about the analytical contract changed. A
staged/batched synthesis is the correct long-term fix for very large corpora and was not built.

**Measurement already recorded.** Every intake state carries `provider`, `model`, `modelCalls`,
`maxModelCalls`, `inputTokens` and `outputTokens`. Nothing new was needed for requirement 10.

## Measured cost across the 18 acceptance runs

| | |
| --- | --- |
| Runs | 18 |
| Model calls | 44 |
| Input tokens | 1 275 470 |
| Output tokens | 260 330 |
| Typical completed analysis | 3 calls, ~87 000 in / ~20 000 out |
| Runs that never reached the model | 2 (capture insufficiency; exhausted credits) |

## Tests

```
bun test src/analysis src/score src/scrape   → 84 pass, 0 fail
tsc --noEmit                                  → clean
```

## Blocker reached

Run `7bd08df2` failed at the first model call:

```
held: You have no credits remaining. Add credits to continue using the API at
      https://platform.openai.com/settings/organization/billing
```

**The OpenAI account is out of credit.** This is external and absolute: no further real
analysis, review or synthesis can run until it is topped up. Every remaining requirement —
Signal through publication, then Gap and Direction — is gated on that, not on code.

At the point of exhaustion the pipeline was working: capture succeeded, the sitemap was
correctly excluded, the review and synthesis stages had completed on this corpus in earlier
runs, and the only structural failure remaining had been the coverage gate, which is now fixed
and tested.


---

# Addendum 3 — model tiering

## What was there

One model ran the whole diagnostic. `workbenchReportModel()` read
`OPENAI_REPORT_MODEL` and that single gateway was used for full-text review,
synthesis and report writing. `OPENAI_SURFACE_MODEL` only affects the separate
AI surface-reading tool.

## What changed

The review stage is now separately addressable:

| Stage | Setting | Default |
| --- | --- | --- |
| Full-text review batches (extraction) | `OPENAI_REVIEW_MODEL` | falls back to `OPENAI_REPORT_MODEL` |
| Synthesis (the judgement) | `OPENAI_REPORT_MODEL` | `gpt-5.6-sol` constant |
| Report writing (the prose) | `OPENAI_REPORT_MODEL` | as above |
| AI surface reading (separate tool) | `OPENAI_SURFACE_MODEL` | `gpt-5.5` |

`generateCorpusAnalysis` accepts an optional `reviewGateway`; `workbench-execution`
supplies one from `workbenchReviewModel()`. With `OPENAI_REVIEW_MODEL` unset the
behaviour is identical to before, so no existing run changes.

Both resolvers reject the GPT-5.6 family for diagnostics, per the workspace rule.

## Recommended settings

Testing, where the point is exercising the pipeline:

```
OPENAI_REPORT_MODEL=<cheap model on the account>
OPENAI_REVIEW_MODEL=<cheap model on the account>
```

Production, where the point is a defensible report:

```
OPENAI_REPORT_MODEL=<frontier model>
OPENAI_REVIEW_MODEL=<frontier model>     # or a cheaper one, accepting weaker notes
```

The model is pinned per run in the intake state, so changing `.env` affects the
next run only; a run in flight keeps the model it started with.

## Caveat

The analysis contract is strict — enum vocabularies, verbatim-quote verification,
coverage accounting. A cheaper model will fail it more often. The corrective
retry absorbs one miss per stage; beyond that the run holds. Test the chosen
cheap model on one bounded run before trusting it.
