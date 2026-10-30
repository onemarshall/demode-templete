# Pre-Diagnostic Assessment — Phase 2 design

Recorded 30 October 2026. Architecture validation and implementation preparation only.
**No production code, schema or configuration was changed.** Phase 1 audit:
`docs/architecture/pre-diagnostic-assessment-plan.md`.

Status: **awaiting review. Do not implement until approved.**

---

## 0. Basis, and what changed since Phase 1

Phase 2 re-read the engine client, the orchestration and import path, the publishing
authority, the migration set, the feature-flag conventions, the email and magic-link
plugins, and the Visual Contract guest-access precedent.

Three Phase 1 positions are **revised** below, each because the deeper read contradicted
the earlier assumption:

| Phase 1 position | Phase 2 finding | Section |
| --- | --- | --- |
| Assessment schema as drafted was broadly correct | It has no owner-token column at all, so the email link has nothing to verify against; several columns also break repo conventions | §4.1 |
| Full Diagnostic could be composed from three runs | The import path is single-artefact, single-hash. Three runs cannot satisfy it. Full must be **one engine run** | §2.2 |
| Engine endpoint is the cleanest analysis owner | Still true, but the app must gate on an advertised engine capability rather than assume it | §1.2 |

Verification limits are unchanged from Phase 1: no live engine, no browser pass, no Stripe
event, no production configuration inspected.

### 0.1 Baseline — resolved

An earlier draft of this section recorded that the working tree was dirty and that the
diagnostic module did not exist in `HEAD`. **That is no longer true and the caveat is
withdrawn.**

Verified at the time of this revision:

| Check | Result |
| --- | --- |
| `git status --porcelain` | Empty. Working tree clean. |
| `HEAD` | `e20f1c2` "Add the order lifecycle and the diagnostic engagement front end" |
| Branch | `main` |
| Phase 1 and Phase 2 documents | Committed (`git ls-files docs/architecture` lists both) |

So the diagnostic module, the billing remote layer, the pricing route, the product registry
and the env schema are now committed at `e20f1c2`, and every citation in both audits
describes a reproducible commit rather than an uncommitted tree.

**No reset, checkout, stash or cleanup was performed to reach this state.** The change came
from the owner committing the work. That is the correct resolution: the uncommitted work was
the work.

Baseline rule for implementation: branch from `e20f1c2` or later, and record the base commit
in the first implementation pull request. Do not rebase the diagnostic module onto an earlier
commit, and do not treat `6cde0be` as authoritative — it does not contain the module.

### 0.2 Verification performed for this review

| Question | Method | Result |
| --- | --- | --- |
| Which tree is authoritative? | `git status`, `git log`, `git ls-files` | Clean at `e20f1c2`; see §0.1 |
| Is `full-diagnostic` purchasable in production? | Read `wrangler.jsonc` `vars` (the deployed Worker configuration) and `.env` | **No.** `RELEASED_PRODUCTS: "signal"` in both. See §9 |
| Can the engine publish a self-service run automatically? | Searched `.env` and `wrangler.jsonc` for `DIAGNOSTIC_ENGINE_URL` / `_TOKEN` | **Not determinable here.** Neither is present in either file. A Cloudflare secret could exist outside the repo, so absence is not proof of absence — but this environment cannot answer the question. See §2.7 |

---

## 1. Diagnostic engine integration and the pre-assessment endpoint

### 1.1 What the integration is, precisely

`src/lib/modules/diagnostic/server/engine.ts` is a generic typed client. It establishes:

| Property | Value | Source |
| --- | --- | --- |
| Transport | HTTPS JSON, `Authorization: Bearer <token>` | `engine.ts:148–163` |
| Correlation | `x-request-id: <uuid>` per call | `engine.ts:158` |
| Envelope | `{ ok: boolean, data?: T, error?: { code, message } }` | `engine.ts:164–181` |
| Timeout | `DIAGNOSTIC_ENGINE_TIMEOUT_MS`, default 30 000 | `engine.ts:117` |
| Config | `DIAGNOSTIC_ENGINE_URL` + `DIAGNOSTIC_ENGINE_TOKEN`, both required | `engine.ts:114–135` |
| Failure mode | fails closed: `unconfigured` 503 | `engine.ts:128–133` |

Every method is `request<T>(path)` — a thin generic wrapper. The client therefore supports
**any** endpoint that honours the envelope and returns JSON. Adding `/v1/assessments`
requires no change to the transport, error handling or auth.

### 1.2 Can a lightweight pre-assessment endpoint be supported?

Two different questions, with two different answers. They must not be conflated.

**Supported by the application integration — yes, unconditionally.** `request<T>` is
generic; `EngineError` already carries `code`/`status`; the timeout is configurable per
environment. A new method is one exported function.

**Supported by the engine — unknown, and not determinable from this repository.** The
engine is external. The repo proves only what the client calls. Two facts argue caution:

1. `EngineOptions.families` is the engine's own statement of what it can run, and
   `scripts/diagnostic/engine-readiness.ts:73–110` probes only `signal`, `gap`, `direction`.
   There is no evidence the engine advertises `full`, let alone an assessment capability.
2. `DIAGNOSTIC_ENGINE_URL` is unset locally, so no call has ever been made from this tree.

**Therefore the app must not assume the capability. It must read it.**

Proposed addition to the options contract — optional, so an older engine still parses:

```ts
export interface EngineOptions {
  // ...existing
  /** Capabilities beyond the run families. Absent means none. */
  capabilities?: string[];
}
```

The assessment flag may only be enabled when `capabilities` includes `'assessment'`.
`engine-readiness.ts` gains a check for it and fails closed when absent.

### 1.3 Proposed contract — `POST /v1/assessments`

Synchronous, single call, one model budget. Rationale in §1.6.

#### Request

```jsonc
{
  "schemaVersion": 1,
  "assessmentRef": "asm_01J...",          // app-owned, for lineage only
  "locale": "en-GB",

  "decision": {
    "question": "Should we approve the agency's rebrand and website proposal?",
    "timing": "Board decision, November",
    "owner": "Managing Director",
    "reader": "Board and Finance Director"
  },

  "organisation": {
    "name": "Ashford Precision Engineering Ltd",
    "website": "https://example.test",     // null when none exists
    "sector": "manufacturing",             // catalogue ref, or null
    "geography": "GB",
    "stage": "assessing_proposals"         // exploring | developing_brief |
                                           // assessing_proposals | seeking_approval | ready_to_implement
  },

  "commitment": { "amountMinor": 7500000, "currency": "GBP" },   // null when unknown

  "supplied": {
    "proposal": {
      "present": true,
      "version": "v3",
      "excerpt": "…"                       // bounded, see limits
    },
    "documents": [
      { "id": "doc_…", "kind": "proposal", "contentHash": "…", "text": "…" }
    ],
    "answers": { "whyNow": "…", "evidenceOfSuccess": "…" }
  },

  "clarifications": [ { "promptId": "p1", "answer": "…" } ],

  "limits": {
    "maxInputChars": 60000,
    "maxModelCalls": 1,
    "deadlineMs": 20000
  }
}
```

Bounding rules the app enforces before sending: total `text` ≤ 60 000 characters; each
document ≤ 20 000; `excerpt` ≤ 4 000. The app truncates at a paragraph boundary and records
the truncation in the request so the engine can report it as a limit rather than silently
reading less.

#### Response

```jsonc
{
  "ok": true,
  "data": {
    "assessmentRef": "asm_01J…",
    "schemaVersion": 1,
    "analysisVersion": "assessment-2026-10-30.1",
    "model": { "provider": "openrouter", "name": "…" },

    "understanding": {
      "summary": "…",
      "fields": [ { "key": "goal", "value": "…", "source": "customer_statement" } ]
    },

    "established": [
      { "claim": "…", "source": "supplied_document",
        "ref": "doc_…", "confidence": "high" }
    ],

    "unknowns": [
      { "question": "…", "whyItMatters": "…", "resolvableBy": "diagnostic" }
    ],

    "readiness": {
      "decisionDefined": true,
      "proposalSupplied": true,
      "currentMaterialSufficient": true,
      "sectorCoverage": "approved",        // approved | research_required | unavailable
      "missing": [
        { "input": "geography", "howToSupply": "…", "blocks": ["gap", "full"] }
      ]
    },

    "recommendation": {
      "product": "full",                   // signal | gap | direction | full |
                                           // no_offer | needs_clarification
      "rationale": "…",
      "alternatives": [ { "product": "direction", "whyNot": "…" } ]
    },

    "questions": [
      { "id": "q1", "text": "…", "rationale": "…",
        "tests": "problem_definition",
        "evidenceRefs": ["doc_…", "answer:whyNow"] }
    ],

    "closing": {
      "confidenceQuestion": "Before you invest £75,000, how confident are you that it's the right decision?",
      "usesCommitment": true
    },

    "limits": {
      "whatThisEstablishes": ["…"],
      "whatItDoesNot": ["…"]
    },

    "usage": { "modelCalls": 1, "inputChars": 41200 }
  }
}
```

#### Provenance model

Every claim in `understanding`, `established` and `unknowns` carries a `source` from a
**closed** enum:

| `source` | Meaning | Renderer treatment |
| --- | --- | --- |
| `customer_statement` | The buyer said it | Plain, attributed to "you told us" |
| `supplied_document` | Read from an upload; `ref` required | Quoted, with document label |
| `public_material` | Observed on the website | Quoted, with URL |
| `model_inference` | The assessment's judgement | Marked "our reading", never as fact |
| `unknown` | Explicitly not established | Rendered under "what remains to be tested" |

The app validates the response with zod and **rejects the whole response** if any claim lacks
a valid `source`, if a `supplied_document` claim has no `ref`, or if `questions` is not
exactly three. A malformed response is an error, never a degraded brief.

#### Deliberate omissions — the safety mechanism

The response schema contains **no** Signal score, **no** Direction verdict, **no**
`proceed|refine|pause|reset` field, and no market-size or demand conclusion. These are absent
from the type, not forbidden by a rule. A model cannot return a field the contract has no
place for, and the app cannot render one. This satisfies spec §7.2 and §10 more strongly than
a validation rule would.

#### Free-text containment — the limit of typed omission

Typed omission stops a model returning a verdict in a *structured* field. It does not stop it
writing one in prose: "on balance this direction should proceed" is a `model_inference`
sentence, and the schema will happily carry it.

Three controls, in order of strength:

1. **Contract.** The prompt states the prohibition explicitly and supplies the allowed
   vocabulary for judgement language ("worth investigating", "not yet established"), naming
   the four Direction verdicts and any numeric score as forbidden.
2. **Validation.** Every free-text field in the response is scanned before persistence for
   verdict vocabulary (`proceed`, `refine`, `pause`, `reset`, `should proceed`, `do not
   proceed`) and score patterns (`\b\d{1,3}\s*(?:/|out of)\s*(?:10|100)\b`, `score of`,
   `rated`). A hit **rejects the response** and triggers the rules-mode fallback; it is never
   silently rewritten, because rewriting model prose changes its meaning. The pattern list is
   a versioned constant beside `analysisVersion`.
3. **Evaluation.** A fixed corpus of 30 intake fixtures runs on every analysis-owner change.
   Each asserts: no verdict token in any free text; exactly three questions; every claim has
   provenance; the recommendation is in the fixture's allowed set; no commitment figure is
   invented. A manual read of 20 sampled briefs gates first production enablement.

**Stated honestly:** regex scanning is a backstop, not a guarantee. A model can assert a
verdict in language the patterns miss. The residual risk is accepted only because the brief is
advisory, carries a visible limits section, and the customer retains decision authority. It
would be wrong to describe this control as preventing verdicts.

#### Error contract

Reuses the existing envelope. New codes, with the app's handling:

| Engine `code` | HTTP | App behaviour |
| --- | --- | --- |
| `assessment_unsupported` | 404 / 501 | Flag cannot be enabled; readiness check fails |
| `assessment_input_too_large` | 413 | Ask the buyer to reduce uploads; preserve draft |
| `assessment_budget_exceeded` | 429 | Static fallback brief; no retry |
| `assessment_validation_failed` | 422 | Log with request id; static fallback; never show raw error |
| `timeout` (existing) | 504 | One retry, then static fallback |
| `unreachable` (existing) | 502 | Static fallback |
| `unconfigured` (existing) | 503 | Journey unavailable; CTA reverts to today's pricing cards |

Every non-2xx keeps the draft. Nothing is lost, and nothing is charged.

#### Idempotency and budget

- `Idempotency-Key: sha256(assessmentRef | schemaVersion | canonical(inputs))`, sent by the
  app. A double submit returns the stored brief rather than spending a second call.
- `maxModelCalls: 1`. A free funnel must not be able to spend more than one call per
  completed assessment.
- Rate limits (app side, reusing `slidingWindowCheck`): 5 assessments/hour/IP,
  3 briefs/hour/email.

### 1.4 Readiness probe

`scripts/diagnostic/engine-readiness.ts` gains:

```
assessment supported   pass: options.capabilities?.includes('assessment') ?? false
assessment bounded     pass: limits.maxInputChars > 0 && limits.maxModelCalls === 1
```

Both fail closed. The probe governs **analysis only** — §5.1 resolves the two-capability
model, and with it the contradiction between this section and the flag inventory.

- `assessment supported` false → `ASSESSMENT_ANALYSIS_ENABLED` cannot be enabled. The journey
  still runs in rules mode (§1.5).
- `assessment bounded` false → same.

The probe never gates the journey itself, because a rules-mode brief needs no engine.

### 1.5 Fallback if the engine cannot support it

If the engine cannot host the endpoint, the fallback is **not** an in-app LLM call. It is:

1. Ship the journey with a **static Decision Brief** — the three questions and the closing
   question composed from intake rules only, no model. Honest, useful, and testable today.
2. Defer the personalised brief until a dedicated assessment service exists.

This keeps the "no analysis in the application" invariant intact. §6 step 2 is written so
this fallback is a configuration change, not a rewrite.

### 1.6 Decision required

**Synchronous or queued?** Recommended: synchronous with a 20 s deadline and a static
fallback. A queue adds a worker, a retry policy and a status vocabulary for a free object
whose worst failure is a less personal brief. Revisit only if measured latency exceeds 8 s
at p90.

---

## 2. Full Diagnostic — complete implementation design

### 2.1 The defect being designed around

`full-diagnostic` is priced £2,495 and marked `popular: true` (`app/plans.ts:91`), has a
product descriptor (`products/shared/registry.ts:118`), a Stripe price var
(`STRIPE_PRICE_FULL_DIAGNOSTIC`, `env-schema.ts:455`), and a `PRODUCT_KEY_BY_PLAN` mapping
(`app/plans.ts:211`). It has **no variant** (`diagnostic/shared/registry.ts:113`) and is
**skipped by the eligibility gate** (`checkout.remote.ts:97`). If released, a buyer pays and
has no route to start work.

### 2.2 Composition model — the decision that constrains everything else

Three options were considered:

| Model | Evidence | Verdict |
| --- | --- | --- |
| **One engine run, `reportFamily: 'full'`** | `diagnostic_engagement.family` CHECK already permits `'full'` (`0014:47`); `buildEngineIntake` forwards `reportFamily: engagement.family` (`orchestration.ts:106`); `EngineQualityReceipt.reportFamily` exists (`engine.ts:60`) | **Required** |
| Three runs composed by the app | `importDeliveredReport` imports **one** publication with **one** `content_hash` (`orchestration.ts:331–349`); `import.ts` refuses bytes that do not match that hash | Impossible without breaking the hash receipt |
| Three runs, three outputs | Contradicts "one connected report, not three separate documents" (`plans.ts:100`) | Rejected |

**Conclusion: Full is one engine run.** The app must not merge reports. If the engine cannot
run a `full` family, Full cannot ship — and that is a hard dependency, not something to
work around in the application.

This also means the `needs_decision_record` / `review_required` question in §2.7 is
existential for Full, not incidental.

### 2.3 Intake

`fullIntakeSchema` = the decision frame plus the union of what the three component
investigations need. Nothing invented, nothing optional that a component requires.

```ts
export const fullIntakeSchema = z.object({
  ...decisionFrame,          // subjectUrl, commissionedDecision, decisionOwner,
                             // intendedReader, decisionTiming  — shared, asked once
  // Signal component
  declaredScope: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  // Gap component
  sectorRef: z.string().trim().min(1).max(200),
  geography: z.string().trim().min(2).max(80),
  buyerInput: z.string().trim().min(10).max(4000),
  organisationalIntent: z.string().trim().min(10).max(4000),
  availableProof: z.string().trim().min(10).max(4000),
  // Direction component
  decisionContext: z.string().trim().min(10).max(2000),
  proposedDirection: z.string().trim().min(20).max(8000),
  proposalVersion: z.string().trim().min(1).max(80),
  constraints: z.string().trim().min(10).max(4000),
  claimSupport: z.string().trim().min(10).max(4000),
  expectedCommitment: z.string().trim().min(5).max(2000),
  currentEvidence: z.string().trim().min(10).max(4000),
  readinessEvidence: z.string().trim().min(10).max(4000),
  evidenceScope: z.string().trim().min(3).max(600)
});
```

Registry entry:

```ts
{
  key: 'diagnostic.full',
  family: 'full',
  deliveryRoute: 'montsel_self_service',
  depth: 'automated',
  sellable: true,
  name: 'Full Diagnostic'
}
```

`intakeSchemaFor('full')` must return `fullIntakeSchema`. The current implementation falls
through to `signalIntakeSchema` for any non-gap, non-direction family — a silent data-loss
bug if `full` were added without this branch. **The variant and the schema branch ship in
one change.**

### 2.4 Eligibility

`checkEligibility` currently ends with:

```ts
} else if (productKey !== 'diagnostic.signal') {
  blocked.push('This product is not available as a self-service diagnostic.');
}
```

Adding the variant without touching this makes Full permanently `ineligible`. That is a safe
failure, but it must be made explicit rather than discovered in production.

Required shape after change:

| Product | website | sectorRef (approved) | business context | proposal |
| --- | --- | --- | --- | --- |
| Signal | required | — | — | — |
| Gap | required | required | required | — |
| Direction | required | required | required | required |
| **Full** | required | required | required | required |

Full's requirements are exactly the union, which is the honest reading: it runs all three
jobs, so it needs all three input sets. A proposal cannot be fabricated to make Full
eligible (spec §7.3).

### 2.5 Orchestration

`buildEngineIntake` (`orchestration.ts:96`) branches on `family === 'gap'` and
`family === 'direction'`; anything else returns `base` only. A `full` engagement would
therefore send **no Gap or Direction inputs** — a paid run with missing evidence, producing
either a refusal or a thin report.

Required: a `full` branch that composes both field groups onto `base`:

```ts
if (engagement.family === 'full') {
  return {
    ...base,
    // Gap component
    buyerInput, organisationalIntent, availableProof, geography,
    sectorIntelligenceRef,
    // Direction component
    decisionContext, proposedDirection, proposalVersion, constraints,
    claimSupport, expectedCommitment, currentEvidence, readinessEvidence
  };
}
```

`base.reportFamily` is already `engagement.family`, so the engine receives `'full'`.

**Sequencing constraint:** the variant, the schema branch, the eligibility row and this
orchestration branch are a single atomic change. Any subset produces a product that takes
money and cannot deliver.

### 2.6 Report composition

The engine owns composition. The app's only responsibilities:

1. Read the quality receipt first (`orchestration.ts:316`). Any failed check parks the
   engagement in `quality_hold` and imports nothing.
2. Import the publication bytes and verify SHA-256 against `content_hash` (`import.ts:93`).
3. Write `output` (`out_<runPublicId>`), one append-only `output_version`, and the section
   manifest from `publication.sections`.

No app-side merging, no section synthesis, no scoring. The title stays
`${engagement.family} report`, which for Full reads "full report" — acceptable, though
"Full Diagnostic report" is better; a display-name map in `brief`/documents would fix it
without touching data.

### 2.7 Publishing — the blocking condition

Current state: the application recognises `needs_analysis_review`, `needs_decision_record`,
`review_required` and `approved` as states that only a `consultant_grant` can move
(`consultant.ts:79–83`), and `publish` requires the `publisher` role. The pricing page
states "no consultant sign-off" (`pricing/+page.svelte:188`).

For a self-service product these two cannot both be true. The application has **no path** to
`published` without a consultant. Whether the engine emits `automation_ready → published`
for `delivery_route: montsel_self_service` is engine behaviour and is not determinable from
this repository.

**Release gate G5 requires a recorded engine run proving a self-service engagement reaches
`published` and imports, with no `consultant_grant` row created.** Until that exists, Full
must not be released — and neither should Signal, Gap or Direction be advertised as
"no consultant sign-off".

### 2.8 Checkout safeguards

Four changes, all in existing files.

1. **Registry.** Add the variant (§2.3).
2. **Product descriptor.** `products/shared/registry.ts:129`: `salesMode: 'planned'` →
   `'self_service'`. This is presentation only; it confers no access.
3. **Eligibility gate — a declared property, not another string.** `checkout.remote.ts:97`
   and `:356` currently hard-code `gap || direction`. That literal is the exact bug that lets
   Full bypass the gate.

   The obvious refactor — gate every `montsel_self_service` variant — **is wrong, and would
   break Signal**. The pricing page only sends `website` for `gap` and `direction`
   (`pricing/+page.svelte:43`, `needsEligibility`), so a registry-wide predicate would make
   every Signal purchase fail with 409 "A public website address is required." Signal's
   deliverability requirement is the `subjectUrl` it collects *after* payment in its own
   intake, which is why it was never checked at checkout.

   Correct design: make the requirement an explicit property of the variant, so a new
   product cannot inherit the wrong default by omission.

   ```ts
   export interface DiagnosticVariant {
     // ...existing
     /**
      * Whether checkout must prove deliverability before taking payment.
      * `not_required` only where the sole input is collected in the paid intake.
      */
     checkoutEligibility: 'required' | 'not_required';
   }
   ```

   | Variant | `checkoutEligibility` | Reason |
   | --- | --- | --- |
   | Signal | `not_required` | Only needs `subjectUrl`, collected in the paid intake |
   | Gap | `required` | Sector and business context decide deliverability |
   | Direction | `required` | Also needs a supplied proposal |
   | Full | `required` | Needs all three input sets |

   Checkout then reads the property, never a product-key list:

   ```ts
   const variant = getVariant(PRODUCT_KEY_BY_PLAN[productId] ?? '');
   if (variant?.checkoutEligibility === 'required') { … }
   ```

   This is behaviour-preserving for all three existing products and makes Full's
   inclusion a data decision rather than a forgotten `||`. A test asserts that every variant
   whose family is not `signal` is `required`, so the mistake cannot recur silently.

4. **Release.** `RELEASED_PRODUCTS` is unchanged. Release remains an environment decision
   (`plans.ts:224`), fail-closed when unset.

Preserved unchanged: cancellation consent (reg. 37), captcha bypass, IP/email rate limits,
same-origin redirect validation, order-before-session ordering, webhook-activated
entitlement, `requireStartPayment` at engagement start.

### 2.9 What must be true in the engine before Full ships

| # | Requirement | Verifiable from this repo? |
| --- | --- | --- |
| 1 | `families` includes `full` | Only via `/v1/options` at runtime |
| 2 | A `full` intake produces one integrated publication | No |
| 3 | Quality checks pass for `full` | No |
| 4 | Self-service route reaches `published` without a consultant grant | No |
| 5 | Section manifest present for comment anchoring | No |

Items 2–5 are release-gate evidence, not assumptions. `engine-readiness.ts` covers 1.

---

## 3. Sector research approval policy

### 3.1 Three states, three behaviours

| State | Meaning | Recommendation may suggest? | Checkout may proceed? | Customer message |
| --- | --- | --- | --- | --- |
| `approved` | Engine catalogue holds a current, versioned entry | Yes | Yes | — |
| `research_required` | Montsel can responsibly research it; not yet approved | Yes | **No** | "We can research this sector before we begin. That takes up to N working days, and you are not charged until it is ready." |
| `unavailable` | Cannot be established to a defensible standard | No — `no_offer` or `needs_clarification` | No | "This is not something we can establish to the standard we publish." |

The critical distinction: `research_required` is **not** `ineligible`. Today
`eligibility.ts:83` collapses both into `blocked`. The recommendation engine must be able to
say "this is worth investigating" while the purchase gate refuses. One gate, two messages.

### 3.1a Suitability and availability are separate, and rendered separately

A recommendation is durable. Availability is not. They must not share a field, or the brief
will claim a product is purchasable after research lapses, or refuse one that has just become
available.

The brief carries two independent objects:

```ts
interface AssessmentBrief {
  recommendation: {
    product: 'signal' | 'gap' | 'direction' | 'full';
    rationale: string;              // why this investigation fits this decision
    alternatives: Array<{ product: string; whyNot: string }>;
  };
  // Computed at read time, never stored in the brief version.
  availability: {
    available: boolean;
    blocker: 'sector_research' | 'deliverability' | 'not_released' | null;
    detail: string | null;          // "Sector research for manufacturing is in progress"
    expectedResolution: string | null;
  };
}
```

Rendering rules:

| Case | Brief says | CTA |
| --- | --- | --- |
| Recommended and available | Why this investigation fits, and what it will examine | Buy — correct price |
| Recommended, sector research pending | Why Gap is the right investigation; which sector is being researched; that nothing is charged until it is approved | "Tell me when it is ready" — email capture only, same consent rules; **no buy button** |
| Recommended, product not released | Why it fits; that it is not yet on sale | No CTA |
| Not suitable | No offer, with the reason | No CTA |

Two implementation consequences:

1. `availability` is computed server-side on every read from the engine catalogue plus
   `RELEASED_PRODUCTS`. Storing it would freeze a stale answer into an immutable brief.
2. The recommendation must survive a blocker. A brief that recommends Gap and then withholds
   the reason is worse than no recommendation, and it is the failure mode this section exists
   to prevent.

This is what makes `research_required` usable: the brief can be honest and useful on the same
page where checkout is closed.

### 3.2 Approval standard

A sector entry is `approved` only when all six hold, and the approval is recorded:

1. **Sources.** ≥ 5 independent sources, ≥ 2 primary, all with URL and retrieval date.
2. **Recency.** All sources within 24 months for fast-moving sectors; 36 months otherwise,
   with the choice recorded.
3. **Coverage statement.** An explicit statement of what the entry establishes and what it
   does not — the same discipline as the report's own limits section.
4. **Named sign-off.** A named approver, a decision, and a date. No anonymous approvals.
5. **Version.** Every approval produces a version id. Runs record the version used —
   `diagnostic_eligibility.sector_intelligence_version_id` already exists for this.
6. **Revalidation.** 12 months after approval the entry reverts to `research_required`
   automatically. Stale approval is indistinguishable from no approval.

### 3.3 Ownership — one catalogue, no second authority

The catalogue is engine-owned: `getOptions().sectorIntelligence` (`engine.ts:200`). The
application must not hold a parallel list; two catalogues diverge and the delivery gate
stops matching the report.

Proposed split:

| Concern | Owner |
| --- | --- |
| Approved entries, versions, coverage statements, sign-off | Engine |
| Revalidation clock | Engine |
| "This buyer needs sector X researched" | Engine queue |
| That this assessment is blocked on sector X | App — `assessment.evidence_readiness.sectorCoverage` |

The app records the state it observed; it does not own the state.

### 3.4 Effect on the code

`EligibilityResult` gains a fourth value, or `EligibilityCheck` gains a reason kind:

```ts
export type EligibilityResult = 'eligible' | 'needs_input' | 'research_required' | 'ineligible';
```

`checkEligibility` returns `research_required` when the ref is absent from the catalogue but
the sector is researchable, and `ineligible` when it is not. `createCheckout` and
`requestInvoice` continue to require `'eligible'`, so the purchase gate is unchanged in
strictness. Only the message and the recommendation change.

**This must not be enabled until §3.5 is implemented and verified** (spec §Step 4). Until
then the fourth state exists in the type but no code path returns it, and the current
`ineligible` behaviour is preserved exactly.

### 3.5 Failure handling

| Failure | Behaviour |
| --- | --- |
| Catalogue unreachable | `needs_input` with "cannot be confirmed right now" — today's behaviour, preserved |
| Research not started | Assessment stays `needs_clarification`, named blocker, no charge |
| Research exceeds budget | Stop, report the blocker, no charge |
| Research completes, fails standard | `unavailable`, explicit refusal, no charge |
| Research completes, approved | Re-run eligibility, then the purchase CTA appears |

Never: silently downgrade to an unapproved sector, take payment against an unapproved
sector, or claim coverage that was not approved.

---

## 4. Security review of the assessment design

### 4.1 Schema — corrections to the Phase 1 proposal

The Phase 1 schema was drafted before the Visual Contract access model was read. Eight
corrections follow, each grounded in an existing convention.

| # | Phase 1 | Problem | Correction |
| --- | --- | --- | --- |
| C1 | No owner-token column | The email link has nothing to verify against; `owner_email` alone is data, not a capability | Add `owner_token_hash`, `owner_token_expires_at` |
| C2 | `assessment_share_access.id bigserial` | Every table in this repo uses prefixed `text` ids (`out_`, `eng_`, `evt_`, `elig_`) | `text PRIMARY KEY` |
| C3 | `ON DELETE SET NULL` on the composite brand FK | Repo precedent is `ON DELETE RESTRICT` (`visual_contract_draft`, `output`, `work_item`, `diagnostic_engagement`); SET NULL would orphan a purchased assessment from its brand | `ON DELETE RESTRICT` |
| C4 | `assessment_document.sha256` | Repo convention is `content_hash` (`output_version.content_hash`) | Rename |
| C5 | `redacted_by_default boolean` | A boolean defaulting true is a weak guarantee; a renderer that forgets the flag leaks | `redaction_class text CHECK IN ('always_redacted','shareable') DEFAULT 'always_redacted'` — safe state is a value, and sharing must be an explicit opt-in |
| C6 | No immutability on `assessment_brief_version` | `output_version` is append-only by trigger (`0013:49–58`); a brief must be too, or a purchased assessment's brief can be rewritten after the fact | Same trigger pattern |
| C7 | `marketing_opt_in` on `assessment` | Consent belongs to a person/address, not an assessment. Two assessments by one person would disagree | New `assessment_contact` keyed by `lower(email)`, holding consent, lawful basis, opt-out, suppression |
| C8 | `status` includes `'shared'` | Sharing is orthogonal to lifecycle; an assessment can be delivered *and* shared *and* purchased | Remove `'shared'`; capabilities are columns, not statuses |

Also corrected: `CHECK ("draft_token_hash" IS NOT NULL OR "owner_email" IS NOT NULL)` is
wrong, because it treats an unverified email as a capability. Replaced by:

```sql
CONSTRAINT "assessment_has_a_capability"
  CHECK ("draft_token_hash" IS NOT NULL OR "owner_token_hash" IS NOT NULL)
```

and owner access additionally requires `email_verified_at IS NOT NULL` at the query, not just
at the constraint.

Retention: Phase 1 proposed 30 days for drafts. `visual_contract` uses 7 and states it in the
UI (`actor.ts:27–33`). Proposed 14 days, stated in the UI, swept by an indexed partial index.

### 4.2 Guest access

Mirror `visual-contract/server/actor.ts` exactly — it is the mature precedent.

```ts
export type AssessmentActor =
  | { kind: 'draft';  tokenHash: string }
  | { kind: 'owner';  assessmentId: string; tokenHash: string }
  | { kind: 'share';  tokenHash: string };
```

- Repository functions take an actor and narrow on `kind`. A draft actor cannot reach an
  owner view even with a leaked assessment id.
- Token: 32 bytes from `crypto.getRandomValues`, base64url (`createGuestToken`, `actor.ts:35`).
- Hash: `crypto.subtle.digest('SHA-256', …)` — **Web Crypto, not `node:crypto`**. Route
  handlers run on Cloudflare Workers; `import.ts` gets away with `node:crypto` because it
  runs in the Node worker. Using `node:crypto` in a route would fail at runtime.
- Lookup is by hash on an indexed column, so there is **no token comparison** and therefore
  no timing side channel. State this rather than adding a constant-time compare.
- Cookie: `httpOnly`, `sameSite=lax`, `secure` when not dev, `path='/assessment'`.
- Miss, expiry and revocation return an identical 404.

### 4.3 Email ownership verification

**Do not use the Better Auth magic-link plugin.** Two reasons, both concrete:

1. It is gated on `AUTH_MAGIC_LINK_PLUGIN`, whose schema default is `false`
   (`env-schema.ts:308`). `.env.example` sets it true, but the free funnel must not depend on
   an auth plugin's runtime state.
2. Magic link creates a **session**. The assessment needs proof of email control, not
   authentication — a session is more authority than the object requires.

Proposed flow:

1. `requestBrief` stores `owner_token_hash` (32 bytes, hashed), `owner_token_expires_at`
   (24 h), sends the link.
2. Response is always generic: "If that address can receive mail, we've sent a link."
   Identical timing-independent response prevents address enumeration.
3. Redeeming the link sets `email_verified_at` and rotates the token. The token is
   **single-use**; re-issuing invalidates the previous one.
4. The link lands on a **view**, not a login. No session is created.
5. Rate limits: 3/hour/email, 10/hour/IP, both via `slidingWindowCheck`.

#### Recovery — the board-approval case

A single-use 24-hour link verifies ownership. It is the wrong tool for return: a buyer seeking
board approval comes back days or weeks later, possibly on another device, with the link
expired. Recovery must be durable, and it must not be a second verification.

Three capabilities, deliberately distinct:

| Capability | Lifetime | Purpose |
| --- | --- | --- |
| Verification link | 24 h, single-use | Prove control of the address, once |
| Owner session cookie | 90 days, httpOnly, revocable | The common return path; no email needed |
| Email re-issue ("Find your assessment") | On demand | The durable path; survives cookie loss, device change and delay |

**"Find your assessment"** — `/assessment/find`:

1. Enter an email. Response is always identical: "If that address has an assessment, we've sent
   a link to it."
2. If a verified owner exists, send a fresh 24-hour link to a **list** of that address's
   assessments, not to a single brief.
3. The list shows decision question, date, recommended product and status — no report content,
   no uploaded filenames, no commitment figure. Nothing private travels in the email body or
   subject (spec §7.6).
4. Rate limit 3/hour/email, 10/hour/IP.

Rules:

- Re-issue **rotates the owner token** but must not invalidate existing share links, which are
  a separate capability (§4.4). A board pack already circulated must keep working.
- Re-issue must never create a second assessment or a second brief version.
- The owner cookie is cleared on explicit sign-out, on token rotation, and on deletion.
- Recovery is unavailable for an assessment whose owner email was never verified, because
  there is nothing to prove control of. The draft token remains the only key, and the retention
  policy in §4.1 is stated in the UI.

This satisfies return-without-re-entry (§6 step 13) without extending the life of a
verification token.

### 4.4 Secure sharing

| Control | Design |
| --- | --- |
| Token | Separate 32-byte token; never derived from the owner token |
| Storage | Hash only; unique partial index |
| Expiry | Mandatory, ≤ 90 days, chosen by the owner |
| Revocation | `revoked_at` set; route requires `revoked_at IS NULL AND expires_at > now()` |
| Redaction | Default `always_redacted` excludes documents, email, commitment amount, organisation name. Sharing is an explicit opt-in per field |
| Access log | Hash IP and UA with **HMAC-SHA-256 under a server secret**, not bare SHA-256 — an unsalted hash of an IPv4 address is reversible by enumeration |
| Indexing | `X-Robots-Tag: noindex, nofollow` + `<meta name="robots">` |
| Referrer leakage | `Referrer-Policy: no-referrer` on tokenised routes, so the token does not travel to any third party |
| Authority | Read-only. No edit, no payment, no raw uploads, no download |
| Identity claims | The page never claims to know who viewed it |

### 4.5 Purchase hand-off

The highest-risk surface, because it touches money.

**Client sends:** `ownerToken`, `productId`, `cancellationConsent`, `captchaBypassToken`.
Nothing else. No price, no eligibility, no assessment fields.

**Server does, in order:**

1. Resolve the assessment by owner-token hash, requiring `email_verified_at IS NOT NULL`.
2. Derive eligibility inputs **from the stored assessment**, never from the request.
3. Run `checkEligibility` for the chosen product. Refuse with 409 when not `eligible`.
4. Load the plan, confirm release, confirm price id — existing order of checks preserved.
5. `createOrder` with `assessment_id` and `assessment_version` stamped on `purchase`.
6. Proceed to Stripe exactly as today.

**Three rules that must hold:**

- **The buyer may buy against the recommendation.** Spec §2: the customer retains final
  decision authority. Choosing Direction when Full was recommended is allowed; the choice is
  recorded as `purchase_against_recommendation` for analysis, and the eligibility check runs
  for the product actually chosen. The recommendation must never be enforced by the gate.
- **The assessment links only when the emails match.** Pre-fill the purchase email from the
  verified assessment email; allow a change. If the buyer pays with a different address, the
  purchase proceeds but the assessment stays unlinked, and the page says so. This prevents
  one person's brief being attached to another's account.
- **The query parameter is not authority.** Prefill at `startEngagement` reads
  `purchase.assessment_id` joined to the brand, never a URL parameter alone.

**Idempotency.** `deriveWorkItemId(brandId, productKey, canonical(intake))` is unchanged, so
re-entering with the prefilled intake resumes rather than commissioning a second engagement.

### 4.6 Threat table

| Threat | Control | Residual |
| --- | --- | --- |
| Enumerating assessments | Hash-only storage, indexed lookup, identical 404, generic email response | Low |
| Token theft via referrer | `no-referrer` on tokenised routes | Low |
| XSS via model output | `renderDocumentMarkdown` — `html:false`, images disabled (`document-markdown.ts:11`) | Low; keep the brief on the same renderer |
| Prompt injection via uploads | Uploads sent as a delimited `untrusted_source` block; contract forbids following embedded instructions; response validated against a closed schema | Medium — model behaviour is not verifiable here |
| Malware upload | 10 MB cap, magic-byte allowlist (`pdf/docx/md/txt`), stored outside web root, never executed, never served as HTML | Low |
| Price manipulation | Price from `priceIdForPlan`, never from the client | Low |
| Cross-tenant linkage | `purchase.assessment_id` + brand join; `ON DELETE RESTRICT` on the brand FK | Low |
| Replay of a purchase link | Owner token rotates on redemption; purchase idempotency via Stripe session | Low |
| Unbounded model spend | `maxModelCalls: 1`, per-assessment idempotency key, IP/email rate limits | Low |
| Scraping free intelligence | Rate limits; the brief is not indexable; share links expire | Medium — accepted, a free assessment is meant to be seen |
| Leaking a confidential proposal through a share link | `redaction_class` defaults to `always_redacted`; a test asserts documents never appear in a shared payload | Low |

---

## 5. Feature flags and non-disruption

### 5.1 Flag inventory

All private server flags unless marked public. All default `false` — a misconfiguration
closes the journey, never opens it.

**Two capabilities, two flags.** An earlier draft made `ASSESSMENT_ENABLED` require the engine
readiness probe, which contradicted the rules-mode fallback in §1.5. The contradiction is
resolved by separating them:

| Flag | Gates | Depends on engine? |
| --- | --- | --- |
| `ASSESSMENT_ENABLED` | The journey: routes, intake, rules-mode recommendation, brief rendering, static three questions | **No** |
| `ASSESSMENT_ANALYSIS_ENABLED` | Personalised analysis: the `/v1/assessments` call | **Yes** — readiness probe must pass |
| `ASSESSMENT_EMAIL_ENABLED` | Owner-link send and recovery | No |
| `ASSESSMENT_SHARING_ENABLED` | Share issue/read | No |
| `ASSESSMENT_UPLOADS_ENABLED` | Document upload | No |
| `ASSESSMENT_FOLLOWUP_ENABLED` | Reminders | No — off until legal review; **not a pilot flag** |
| `PUBLIC_ASSESSMENT_CTA_ENABLED` | Pricing card CTA copy | No |

Enablement order is `ASSESSMENT_ENABLED` first, `ASSESSMENT_ANALYSIS_ENABLED` later. The
reverse is impossible by construction: analysis without a journey has nothing to serve.

### 5.1a Rules mode must not claim intelligence

The journey can run without the engine, but it must not pretend otherwise. When
`ASSESSMENT_ANALYSIS_ENABLED` is off:

- The brief carries `analysisSource: 'rules'` and renders a visible statement: *"This
  assessment used our structured decision model, not a language model. It has not read your
  documents."*
- The three questions are composed from intake answers only, and each cites the intake field
  it came from. No inferred claim, no document reference.
- The recommendation is table-driven. It can still be right; it cannot be personalised prose.
- No copy anywhere — page, email, share view — may use "AI", "intelligent", "our analysis of
  your documents", or equivalent while analysis is off.
- A snapshot test asserts the rules-mode label is present and the forbidden vocabulary absent
  from every rules-mode surface.

A rules-mode brief that reads as if a model had examined the proposal is the one outcome that
would make the whole journey dishonest. It is treated as a release-blocking defect, not a copy
nit.

### 5.2 Why flags alone are not sufficient

Two changes in the plan are **not** flag-gated, and pretending otherwise would be dishonest:

1. **The eligibility-gate refactor** (§2.8.3). It is behaviour-preserving for all three
   existing products — an earlier draft of this design gated every self-service variant,
   which would have broken Signal checkout outright, and that mistake is recorded here rather
   than quietly removed. It still must be reviewed as a money-path change, because it alters
   how a purchase is authorised even though no current product behaves differently.
2. **The pricing card eligibility removal.** Spec Step 0 requires it. During pilot it is
   gated on `PUBLIC_ASSESSMENT_CTA_ENABLED` so that turning the flag off restores today's page
   byte-for-byte. After rollout the old block is deleted.

### 5.3 Disruption analysis, per touched file

| File | Flag-off behaviour | Risk |
| --- | --- | --- |
| `pricing/+page.svelte` | Identical to today | Low |
| `pricing/+page.server.ts` | Identical (sector load retained while flag off) | Low |
| `checkout.remote.ts` | `assessmentRef` absent → path identical; gate now property-derived, behaviour-preserving | **High** — see §5.2 |
| `diagnostic/shared/registry.ts` | New variant exists but `full-diagnostic` is not in `RELEASED_PRODUCTS` → unreachable | Low |
| `diagnostic/server/eligibility.ts` | Signature preserved; existing results preserved for existing keys; `research_required` never returned while §3.5 is absent | Medium |
| `orchestration.ts` | New `full` branch unreachable without a `full` engagement | Low |
| `products/shared/registry.ts` | `salesMode` display only | Low |
| `env-schema.ts` | New optional flags with `false` defaults | Low |

### 5.4 Rollback

Every step is reversible by configuration, except the migration — and the migration is
additive only (new tables, two nullable columns). Rolling back means turning a flag off and
leaving inert rows; no destructive down-migration is needed or proposed.

| Rollback point | Action | Data consequence |
| --- | --- | --- |
| R1 after step 1 | `PUBLIC_ASSESSMENT_CTA_ENABLED=false` | None |
| R2 after step 4 | `ASSESSMENT_ENABLED=false` | Drafts retained, unreadable |
| R3 after step 7 | `ASSESSMENT_EMAIL_ENABLED=false` | Existing links stop issuing |
| R4 after step 9 | `ASSESSMENT_ANALYSIS_ENABLED=false` | Falls back to static brief |
| R5 after step 11 | Remove `full-diagnostic` from `RELEASED_PRODUCTS` | Existing engagements continue |
| R6 after step 12 | `ASSESSMENT_SHARING_ENABLED=false` | Existing share links 404 |

---

## 6. Dependency-ordered implementation plan

Sizes: S ≤ 1 day, M 2–3, L 4–7, XL > 7. Estimates are relative, not commitments.

| # | Step | Depends | Size | Acceptance tests | Gate |
| --- | --- | --- | --- | --- | --- |
| 1 | Pricing CTA behind `PUBLIC_ASSESSMENT_CTA_ENABLED`; static journey prototype, no persistence | — | S | Card copy test; flag-off snapshot matches today | **G1** |
| 2 | Engine readiness: `capabilities` in `EngineOptions`; two new checks | 1 | S | Probe fails closed when capability absent | G1 |
| 3 | Migration `0022_assessment` (corrected §4.1) + `verify-assessment.ts` disposable-DB proof | 2 | L | Token isolation, expiry sweep, immutability trigger, FK restrict | G2 |
| 4 | `assessment/server/{access,repository}` + remote contracts | 3 | L | Draft actor cannot read owner view; miss == expired == revoked | G2 |
| 5 | Progressive intake, resumable drafts | 4 | L | Resume after reload; per-step zod rejects | G2 |
| 6 | Uploads (flag-gated) | 5 | M | Magic-byte rejection; size cap; redaction default | G2 |
| 7 | `recommendation.ts` — pure, table-driven | 4 | M | Cases A–E from spec §3; `no_offer` reachable; never Full for a Direction-only question | G2 |
| 8 | Static Decision Brief renderer + printable summary | 7 | M | Three questions always; closing question omits figures when commitment unknown | G2 |
| 8a | Suitability/availability split in the brief; rules-mode labelling | 8 | M | Rules-mode label present and "AI"/"intelligent" absent; recommended-but-blocked renders no buy button | G2 |
| 9 | Email owner link + single-use redemption + generic response | 4 | M | Replay rejected; enumeration indistinguishable; rate limits | **G3** |
| 9a | Owner recovery: 90-day owner cookie + "Find your assessment" re-issue | 9 | M | Re-issue rotates owner token but leaves share links working; list leaks no content; no second assessment created | **G3** |
| 10 | Analysis integration (engine `/v1/assessments`) | 2, 7 | L | Malformed response rejected wholesale; no score/verdict fields possible; budget enforced | **G3** |
| 11 | Sharing: issue, redact, revoke, expiry, access log | 8, 9 | M | Documents never in shared payload; revoke 404s; HMAC salt present | G3 |
| 12 | Checkout hand-off: `assessmentRef`, eligibility re-run, `purchase` stamping | 9, 11 | L | Client-supplied price ignored; mismatched email does not link; recommendation not enforced | **G4** |
| 13 | Assessment → engagement prefill at `startEngagement` | 12 | M | Idempotent re-entry resumes; URL param alone grants nothing | G4 |
| 14 | Full Diagnostic: variant + schema branch + eligibility row + orchestration branch, one change | 7, 13 | L | Full intake carries all three field groups; partial rollout impossible | **G5** |
| 15 | `checkoutEligibility` property on the variant; checkout reads it instead of the literal | 12 | M | Signal still unchecked; Gap/Direction unchanged; Full gated; test asserts every non-signal variant is `required` | **G5** |
| 16 | Engine evidence: self-service run reaches `published` without `consultant_grant` | engine | — | Recorded run + import, no grant row | **G5** |
| 17 | Sector `research_required` state (type only until workflow exists) | 7 | S | No code path returns it; today's behaviour preserved | G5 |
| 18 | Langfell booking hand-off | 8, 9 | S | Ends with conversation, not checkout | — |
| 19 | Follow-up, consent, suppression | 9 | M | Opt-out stops sends; consent per contact not per assessment | **G6** |
| 20 | Staging pilot, privacy review, gradual rollout | all | M | Metrics from spec §11 instrumented | **G6** |

### Gates

| Gate | Condition | Evidence required |
| --- | --- | --- |
| **G1** Presentation | Free CTA live, no persistence, reversible | Screenshot of both flag states; copy test |
| **G2** Persistence | Drafts, tokens, uploads, recommendation | `verify-assessment.ts` green on a disposable DB; security review signed |
| **G3** Intelligence | Analysis + email + sharing | Engine readiness green; malformed-response rejection proven; legal review of email |
| **G4** Commerce | Purchase hand-off | Stripe **test mode** end-to-end; idempotency proof; price-tampering test |
| **G5** Release | Full Diagnostic sellable | §2.9 items 1–5 evidenced; support runbook written |
| **G6** Public | Follow-up and rollout | PECR/GDPR review complete; suppression proven |

### Steps that must not be split

- **14** is one change: variant, `intakeSchemaFor` branch, eligibility row, orchestration
  branch. Any subset takes money and cannot deliver.
- **15** must ship with or before **14**, or Full bypasses the gate it just gained.
- **16** must precede releasing `full-diagnostic`, or the product cannot publish.

### Deliberately excluded

Sector research workflow (separate project, spec §Step 4); any change to
`diagnostic/server/payments.ts`; any change to `orchestration.ts` beyond the `full` branch;
any change to `output`/`output_version`; any relaxation of `RELEASED_PRODUCTS`.

---

## 7. Preserving the agreed customer experience

The three commitments from the specification are pinned to specific design elements, so they
cannot erode during implementation:

| Commitment | Pinned to | Test |
| --- | --- | --- |
| **Three personalised questions** | `questions` is a zod tuple of exactly 3 (§1.3); each needs non-empty `evidenceRefs` and a `tests` value | Response with 2 or 4 is rejected; a question with no evidence ref is rejected |
| **Independent recommendation** | `recommendation` is table-driven and pure (§6 step 7); `no_offer` and `needs_clarification` are first-class outcomes | Cases assert lower-priced and no-offer outcomes are reachable; Full is never returned for a Direction-only question |
| **One decisive confidence-led close** | `closing.confidenceQuestion` + `usesCommitment`; the renderer branches on whether `commitment` is known | With £75,000 → numeric question; without → "Before you commit to the proposed work…" and no invented ratio |
| **Honest about what it is** | `analysisSource: 'model' \| 'rules'` plus the rules-mode label (§5.1a) | Rules-mode surfaces carry the label and none of the intelligence vocabulary |
| **Honest about what is available** | `recommendation` and `availability` are separate fields (§3.1a) | Recommended-but-blocked renders the reason and no buy button |

The renderer, not the model, chooses the closing wording. The model supplies the question;
the app decides whether a figure may appear. That is the only way the "no invented figure"
rule can be enforced rather than hoped for.

---

## 8. Decisions

### 8.1 Settled by review, 30 October 2026

These are decided. They are design decisions, not evidence that the engine can deliver them —
§2.9 and §9 record what remains to be proven.

| # | Decision | Settled as | Consequence |
| --- | --- | --- | --- |
| 1 | Analysis owner | **External diagnostic engine** | §1.3 contract; app holds no prompt or score |
| 2 | Assessment execution | **Synchronous, 20 s deadline, clearly labelled fallback** | §1.6 resolved; fallback must be labelled, see §5.1a |
| 3 | Full Diagnostic | **Keep planned; disable purchasing until delivery is proven** | Step 14 not started; §9 confirms it is already unreleased |
| 4 | Consultant sign-off | **Retain the no-sign-off promise only after an automated publishing test passes** | G5 is now a promise gate, not only a product gate — see §9 |
| 5 | Sector research | **Engine owns research, approval and revalidation** | §3.3 confirmed; no app-side catalogue |
| 6 | Draft retention | **14 days, documented as new policy** | §4.1 retention set to 14 |
| 7 | Share expiry | **14 days default, 90 days maximum** | §4.4 |
| 8 | Purchase email | **Verified ownership required for automatic linkage** | §4.5 rule 2 confirmed; mismatch leaves unlinked |
| 9 | Full popularity badge | **Remove** | Step 14 includes it; see §9 for the smaller immediate action |
| 10 | Langfell booking | **Provider deferred** | Step 18 blocked, not blocking others |

### 8.2 Still open

| # | Question | Blocks | Why it cannot be closed here |
| --- | --- | --- | --- |
| A | Does the engine advertise an `assessment` capability, and at what latency and cost? | Step 10 | Engine is external and unreachable from this environment |
| B | Does a `full` run produce one integrated publication, and does it pass quality gates? | Step 14 | Same |
| C | Can a self-service engagement reach `published` without a `consultant_grant`? | **G5, and the live Signal promise** | Same — see §9 |
| D | Does production hold engine credentials outside the repository? | Step 10, C | Cloudflare secrets are not inspectable from here |
| E | What is the sector research turnaround that may be promised in the brief? | §3.1a copy | Operational, not architectural |

---

## 9. Targeted safety change — exposure confirmed, separate approval

The review asked for the `full-diagnostic` exposure to be confirmed before any change, and for
the resulting change to be approved separately from the assessment work. Both are done.

### 9.1 Exposure: not currently purchasable

| Source | Value |
| --- | --- |
| `wrangler.jsonc:71` (`vars`, deployed Worker, `PUBLIC_ENV_MODE: "production"`) | `"RELEASED_PRODUCTS": "signal"` |
| `.env:154` (local) | `RELEASED_PRODUCTS=signal` |

`createCheckout` refuses an unreleased plan before Stripe is touched
(`checkout.remote.ts:86–88`, 409 "This product is not available for purchase yet"), and
`requestInvoice` does the same (`:347–349`). The pricing page renders "Coming soon" rather than
a button for any plan not in the released set (`pricing/+page.svelte:313–326`).

**Conclusion: Full Diagnostic cannot be bought today.** The defect recorded in §2.1 is real but
**latent**. No emergency change is required, and removing it from `RELEASED_PRODUCTS` is
unnecessary because it was never added.

### 9.2 What the same configuration reveals, which is not latent

Signal **is** released. That means:

- Signal purchases are live, and Signal is the one product with no checkout eligibility gate
  (§2.8.3) — so a Signal buyer reaches the intake and dispatch path today.
- The pricing page makes the "no consultant sign-off" claim to those buyers
  (`pricing/+page.svelte:188`).
- The application has no path to `published` without a `consultant_grant` (§2.7).

So one of two things is true right now, and this environment cannot tell which: either the
engine publishes self-service runs automatically and the claim holds, or Signal buyers are
stalling at `review_required` / `needs_decision_record`. **This is the highest-priority
verification item in the whole programme, and it is live rather than latent.** It is item C in
§8.2 and the first condition of G5.

### 9.3 Two configuration contradictions worth separate review

Recorded, not acted on:

- `wrangler.jsonc:53–56`: the comment reads "Off until the VAT position is established …
  before this is set to 'true'", but the value is `"PUBLIC_STRIPE_ENABLED": "true"`, with
  `VAT_ENABLED: "false"`.
- `wrangler.jsonc:72–73`: the comment reads "Off until Stripe reports pay_by_bank available on
  this account", but the value is `"PAY_BY_BANK_ENABLED": "true"`.

Both may be deliberate — the comments may be stale. But a comment that contradicts its value
is a control that reads as engaged when the reader assumes it is not. They should be resolved
by someone who knows the VAT and payment-method position, not by the assessment work.

### 9.4 Proposed targeted change, for separate approval

Deliberately small, and **not** started:

1. **Remove `popular: true`** from the `full-diagnostic` plan (`plans.ts:105`). Display only.
   It currently badges an unbuildable product as "Most complete", which is a nudge toward the
   one product that cannot be delivered. No behavioural effect; no release-config change.
2. **Add a guard test**: every key in `PRODUCT_KEY_BY_PLAN` beginning `diagnostic.` must have an
   entry in `VARIANTS`, or the test fails with the missing key named. This is the regression
   guard against a priced-but-unbuildable product reappearing, and it would have caught the
   current state at the point it was introduced.
3. **Change nothing in `RELEASED_PRODUCTS`.** It is already correct.

Items 1 and 2 are safe to approve independently of the assessment programme. Neither touches
checkout logic, schema or the release gate.

---

## 10. What remains unverified

- Whether the engine implements or can implement `/v1/assessments`, and what its actual
  latency and cost are.
- Whether `families` includes `full`, and whether a `full` run produces one integrated
  publication.
- Whether a self-service engagement can reach `published` without a `consultant_grant`.
- ~~Whether `RELEASED_PRODUCTS` in production contains `full-diagnostic` today.~~ **Resolved
  §9.1: it does not.** Signal is the only released product.
- Stripe test-mode checkout end to end in this tree.
- Actual email deliverability for the configured provider.
- Whether the prompt-injection defence holds against a real model.

Each is a gate condition above, not an assumption.
