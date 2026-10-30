# Pre-Diagnostic Assessment — Phase 1 as-is/to-be plan

Recorded 30 October 2026. Read from source at the commit checked out in this working tree.
**No code was modified.** This is the Phase 1 deliverable requested by
`montsel-pre-diagnostic-specification.md` §9 and §13.

## 0. Verification basis and limits

| Claim | Basis |
| --- | --- |
| Files, functions and line references below | Read in full or grepped in this working tree |
| Behaviour under a live diagnostic engine | **Not verified.** `DIAGNOSTIC_ENGINE_URL` is unset locally; every engine call fails closed |
| Browser behaviour | **Not verified.** No dev server run, no browser pass |
| Production configuration (`RELEASED_PRODUCTS`, Stripe keys) | **Not verified.** Read from `.env.example` only |
| Stripe live events | **Not verified** |

This independently confirms `docs/architecture/diagnostic-module-current-state.md`; where I
contradict or extend it, the extension is marked.

---

## 1. As-is architecture map

### 1.1 Where the money path actually lives

```
/auth/pricing                          src/routes/auth/(public)/pricing/+page.svelte
  ├─ card UI + inline eligibility form  lines 257–312
  ├─ checkDiagnosticEligibility         billing/remote/eligibility.remote.ts:18
  │    └─ checkEligibility              diagnostic/server/eligibility.ts:52
  ├─ createCheckout                     billing/remote/checkout.remote.ts:66
  │    ├─ getPlan / isPlanReleased      app/plans.ts:84, :234
  │    ├─ checkEligibility (gap|direction only)   checkout.remote.ts:97–110
  │    ├─ slidingWindowCheck × 2        auth/security/features/rate-limit/sliding-window.ts
  │    ├─ captcha bypass validation     auth/security/endpoints/captcha.ts
  │    ├─ findOrCreateUser + magic link checkout.remote.ts:289, :159
  │    └─ createOrder                   billing/server/orders.ts
  └─ requestInvoice                     checkout.remote.ts:334 (same eligibility gate, :356)

Stripe webhook → purchase activated → fulfilPurchase
    products/server/fulfilment.ts:32
      └─ ensurePersonalOrganisation     tenancy/server/onboarding.ts
      └─ INSERT product_entitlement     source='purchase', status='active'

/app/workflow/[productKey]             src/routes/(montsel)/app/workflow/[productKey]/+page.server.ts
  ├─ (montsel)/app/+layout.server.ts → resolveActiveBrand  ← requires session + brand membership
  ├─ resolveBrandProducts              products/server/resolve.ts
  ├─ requireEngagementEligibility      diagnostic/server/eligibility.ts:151
  ├─ startEngagement                   diagnostic/server/engagement.ts:162
  │    └─ requireStartPayment          diagnostic/server/payments.ts:67  ← activated purchase
  └─ dispatchDiagnosticIntake          diagnostic/server/dispatch.ts:9 → Trigger.dev

diagnostic-intake-v1 → app/diagnostic-worker.server.ts:49
  ├─ startDiagnosticRun                diagnostic/server/orchestration.ts:217
  └─ syncDiagnosticRun (5s poll, 25min) orchestration.ts:261
       └─ importDeliveredReport        orchestration.ts:310 → import.ts (SHA-256 verified)
            └─ output + output_version (append-only by trigger)

/app/diagnostic/[engagementId]         tenant-scoped read + comment threads
/consult/[engagementId]                consultant_grant-guarded review, publish
/share/[shareSlug]                     output.share_slug capability read
```

### 1.2 The two authorities, and where they are enforced

| Authority | File | Enforced at |
| --- | --- | --- |
| Intake shape (per family) | `diagnostic/shared/registry.ts` | workflow action, `parseIntake` |
| Deliverability | `diagnostic/server/eligibility.ts` | pricing pre-check, checkout, invoice, engagement start |
| Payment | `diagnostic/server/payments.ts` | engagement start |
| Tenancy | `tenancy/server/context.ts:91` | every brand-scoped read/write |
| Release | `app/plans.ts:224` (`RELEASED_PRODUCTS`) | checkout, invoice |

### 1.3 What already exists that the assessment can reuse

| Capability | Path | Reusable? |
| --- | --- | --- |
| Anonymous draft + token + claim + resume | `visual-contract` (`0010_visual_contract.sql`, `server/access.ts`, `server/actor.ts`, `server/flow.ts`) | **Yes — the closest precedent.** Guest drafts keyed by hashed edit token in a cookie, `guest_expires_at`, retention index, later claim by a signed-in user |
| Email providers + templating | `auth/server/email/{index.ts,types.ts,emails/}` | Yes — add a template kind |
| Magic-link owner access | `auth/features/magic-link` | Yes |
| Rate limiting | `auth/security/features/rate-limit/sliding-window.ts` | Yes |
| Object storage | `platform/storage/{service.ts,providers/*}` | Yes for uploads, but no diagnostic upload path exists |
| Disposable-DB proof harness | `scripts/diagnostic/disposable-db.ts` | Yes — the pattern for schema proof |
| OpenAI-compatible transport | `strategy/server/providers/completion.ts` (`boundedCompletion`) | Technically yes; currently strategy-only. Cross-module import is legal (`#lib/`) but semantically wrong |

---

## 2. Gap analysis — conflicts between spec and code

Ordered by how much they block the journey.

### G1 — There is no assessment domain. Everything is new.

No table, module, route, type or env var references a pre-assessment. `grep -i assessment src/`
returns only unrelated hits in the Strategy/BF module. Spec §7.1's storage list has no home.

### G2 — The pricing card *is* the eligibility form. Spec Step 0 says remove it.

`src/routes/auth/(public)/pricing/+page.svelte`:

- `needsEligibility()` (line 43) — `gap` and `direction` only
- inline inputs for website / sector / has-proposal (lines 257–312)
- `checkEligibilityFor()` (line 55) calls the remote command
- `eligibilityComplete()` (line 44) disables the buy and invoice buttons (lines 317, 331)
- `+page.server.ts:22` loads `getOptions().sectorIntelligence` into the page

Removing this UI is safe **only** because the same gate runs again in `createCheckout` and
`requestInvoice`. That is the spec's §9 rule ("do not remove a safety gate because the UI hides it")
and it holds here.

### G3 — A website is mandatory for every product, including Gap.

`eligibility.ts:66` runs before any family branch:

```ts
if (!hasWebsite) missing.push('A public website address is required.');
```

So Gap for a new business with thin public material (spec journey C) is `needs_input`, and the
pricing page disables the button. Spec §3C explicitly forbids this reflex.

Note the distinction the code does not currently make: Signal genuinely cannot run without current
public material, and `signalIntakeSchema.subjectUrl` requires an http(s) URL. That is correct. The
defect is that the *pre-assessment recommendation* and the *paid deliverability gate* share one
function, so "no website" reads as "no product".

### G4 — Approved sector coverage is a hard block, and there is no research pipeline to soften it.

`eligibility.ts:76–91`:

- `sectorRef` absent → `needs_input`
- ref not in `getOptions().sectorIntelligence` → `blocked` (`ineligible`)
- engine unreachable → `blocked`

`getOptions()` reads `sectorIntelligence` from the engine (`engine.ts:200`). **This repository has no
sector-research pipeline**: no queue, no provenance store, no approval workflow, no cache. The
catalogue is whatever the engine already holds.

Spec §Step 4 and §7.3 ask for a research-preparation workflow, and say do not remove the backend
delivery gate until it is implemented and verified. Both halves of that instruction are currently
unsatisfiable: the workflow does not exist, and the gate cannot be relaxed without it.

### G5 — Full Diagnostic is priced and popular, but cannot be sold or run.

| Fact | Location |
| --- | --- |
| £2,495, `popular: true`, CTA "Buy Full Diagnostic" | `app/plans.ts:91–108` |
| `PRODUCT_KEY_BY_PLAN['full-diagnostic'] = 'diagnostic.full'` | `app/plans.ts:211` |
| Product descriptor, `salesMode: 'planned'` | `products/shared/registry.ts:118–134` |
| **No entry in `VARIANTS`** | `diagnostic/shared/registry.ts:113–138` |
| Eligibility gate skips it | `checkout.remote.ts:97` (gap/direction only) |
| Workflow page renders "not open yet" | `+page.server.ts:38` returns `variant: null` |

If `full-diagnostic` were added to `RELEASED_PRODUCTS` today, a buyer could pay £2,495 and have no
route to start work, and the eligibility gate would not have run. Spec makes Full the default
recommendation for the £75k journey (A). **This is the single largest commercial defect**, and it is
a pre-existing one, not caused by the assessment work.

### G6 — Intake is post-payment, authenticated and brand-scoped. There is no anonymous path.

- `/app/workflow/[productKey]` is under `(montsel)/app`, whose `+layout.server.ts` calls
  `resolveActiveBrand` → `requireTenancySession` + `requireBrandAccess`.
- `startEngagement` calls `requireStartPayment` (`engagement.ts:177`), which requires a live
  entitlement and, where purchase-sourced, an `activated` purchase.
- `OperationContext` (`tenancy/server/context.ts:45`) is branded, frozen and only issuable by
  `requireBrandAccess`, which requires `userId`.

So the spec's "begin without an account" cannot be expressed with existing primitives. It needs a
new access shape — the Visual Contract guest-draft pattern is the precedent.

### G7 — No document upload for diagnostics.

`platform/storage` provides s3 / local / cloudinary / mock providers. There is no diagnostic upload
route, no size/type limit, no prompt-injection defence, no retention rule, no virus/scan step. The
`visual-contract` `designer-send` path is outbound only.

Spec Step 1 wants proposal / brief / document upload. This is entirely greenfield.

### G8 — Sharing exists only for delivered outputs, and cannot be revoked.

- `output.share_slug` + `can_share` (`0009_montsel_products.sql:99–117`), unique index on slug.
- Readers: `report.ts:82` (`readSharedReport`), `repository.ts:297` (`findSharedOutput`).
- Writers: only inserts — `visual-contract/server/repository.ts:355, :563` and `import.ts:127`.
- **No expiry column, no revocation path, no access log, no redaction, no `noindex` control.**

Spec §7.5 wants a pre-purchase, redacted, revocable, scope-controlled share link with access
logging. None of that exists.

### G9 — Email is auth-lifecycle only.

`auth/server/email/index.ts` exposes `sendTemplateEmail`, `sendOTPEmail`, `sendMagicLinkEmail`. The
template kinds in `types.ts:58` and `emails/*.ts` are all account events. `EMAIL_PROVIDER` defaults
to `mock` (`env-schema.ts:158`). No assessment delivery, no follow-up, no suppression list.

### G10 — The engine boundary is unproven, and its limits are hard-coded.

`DIAGNOSTIC_ENGINE_URL` is unset locally. `buildEngineIntake` (`orchestration.ts:113–115`) sends
`maxPages: 10`, `maxReviewBatches: 10`, `maxModelCalls: 20` regardless of
`EngineOptions.limits`. If the pre-assessment calls the engine, it inherits an unverified dependency
in the critical path of a *free* funnel.

### G11 — There is no in-app analytical surface to reuse.

Only `OPENAI_API_KEY` exists (`env-schema.ts:564`). The only LLM transport is
`strategy/server/providers/completion.ts`, used by M01/M04. There is no prompt registry, schema
versioning, evaluation harness or provenance model outside Strategy.

### G12 — No marketing-consent or follow-up record exists outside Visual Contract.

`visual_contract_version.consent_marketing` (`0010:109`) is the only consent column, and it is
scoped to that product. There is no lawful-basis, opt-out or suppression record for assessment
follow-up. Spec §7.6 and the PECR/GDPR note are unimplemented.

---

## 3. To-be architecture

### 3.1 Shape

A new bounded module, `src/lib/modules/assessment/`, owning the pre-diagnostic only. It must not
own the paid diagnostic: `modules/diagnostic` stays the sole bridge to the engine.

```
modules/assessment/
  shared/
    schema.ts          progressive intake zod schemas + step machine
    registry.ts        assessment version, prompt version, recommendation model version
    questions.ts       the three-question contract (typed, evaluated)
  server/
    access.ts          guest token / owner token / share token resolution
    repository.ts      tenant-free, token-keyed persistence (mirrors visual-contract/server/access.ts)
    recommendation.ts  evidence readiness + product fit — pure, unit-testable
    analysis.ts        calls the analysis owner (engine or dedicated service)
    brief.ts           Decision Brief renderer + printable summary
    share.ts           token issue / redact / revoke / access log
    followup.ts        suppression + cadence (feature-flagged off by default)
    email.ts           assessment templates
  ui/
    ...screen components

routes/(assessment)/assessment/...   ← new public route group, no layout guard
```

**Why a new module, not a folder in `modules/diagnostic`:** the spec's §9 Phase 2 asks for an
explicit ownership boundary, and `modules/diagnostic/README.md` states its scope as "the delivered
bytes of a Diagnostic report". A pre-purchase, anonymous, non-engine object does not belong there.
The boundary checker (`scripts/check-module-boundaries.mjs`) permits `#lib/` cross-module imports,
so `assessment` may call `diagnostic/server/eligibility.ts` and `billing/remote/*` without
violation.

### 3.2 The critical separation the code does not currently make

Today one function answers two different questions:

| Question | Today | Should be |
| --- | --- | --- |
| Can this be *recommended* for investigation? | `checkEligibility` | `assessment/server/recommendation.ts` — pure, no engine call, no side effects |
| Can this *paid product be delivered*? | `checkEligibility` | unchanged `diagnostic/server/eligibility.ts` |

Recommendation must be able to return `Signal | Gap | Direction | Full | no_offer | needs_clarification`
and must never be able to authorise a sale. Deliverability stays exactly where it is, and
`createCheckout` keeps its own call. That satisfies spec §10 ("checkout refuses payment when
deliverability is genuinely unresolved, even if the client manipulates the UI") without weakening
anything.

### 3.3 Where the analysis runs — the open decision

Spec §12 leaves this open (§12 item 5). Three options:

| Option | Fit with repo invariants | Cost | Risk |
| --- | --- | --- | --- |
| **A. Engine endpoint** `/v1/assessments` | Strongest. `diagnostic/README.md` and `orchestration.ts` both insist the app holds no prompt, rule or score | Engine work, outside this repo | Free funnel blocked by an unverified dependency (G10) |
| **B. Dedicated assessment service** | Good. Same boundary, separate availability | New deployable + auth + budget | Operational surface grows |
| **C. In-app LLM call** | Weakest. Breaks the "no analysis in the app" invariant and there is no eval harness | Cheapest to start | Prompt/score drift, no provenance, hard to test |

**Recommendation: A, with C explicitly rejected.** The repo's strongest stated invariant is that the
application never holds analytical logic. The pre-assessment produces judgement about a business's
decision — that is analytical. Putting it in `orchestration.ts` or a route action would be the one
change most likely to be regretted.

But A has a hard consequence worth stating plainly: **the free funnel's quality is capped by an
engine that has never been verified from this repository.** Phase 3 step 1 should therefore ship a
static, non-AI Decision Brief prototype first, so the journey can be tested before the analysis
dependency exists.

### 3.4 Anonymous access model (mirrors Visual Contract, does not reuse it)

Three distinct capabilities, three distinct columns:

| Capability | Holder | Grants |
| --- | --- | --- |
| **Draft token** | hashed in an httpOnly cookie, `draft_token_hash` | resume own draft, before email |
| **Owner token** | hashed, delivered by email link | read full brief, edit facts, regenerate, share, buy |
| **Share token** | random slug in URL | read redacted brief only; never edit, never pay, never see raw uploads |

Rules taken from the existing precedent (`0010:20–48`):

- only the hash is stored; the token itself never is
- guest/draft rows carry `expires_at` and a partial index for the retention sweep
- a public token is view-only and never carries the edit token
- `noindex` + `X-Robots-Tag` on every tokenised route

### 3.5 Checkout hand-off

`createCheckout` gains one optional field: `assessmentRef` (id + version). Server-side it:

1. loads the assessment by ref and owner token,
2. **re-runs** `checkEligibility` with the assessment's own inputs (never trusting the client),
3. stamps `purchase.assessment_id` + `purchase.assessment_version` on the row `createOrder`
   writes (`billing/server/orders.ts:58`),
4. proceeds as today.

After `fulfilPurchase` creates the entitlement, the assessment is linked to the engagement at
`startEngagement` time, and the intake is **pre-filled** from the assessment rather than re-asked.
The engagement's `work_item_id` derivation (`engagement.ts:150`) is unchanged, so idempotency holds.

---

## 4. Schema migration proposal

New migration `database/migrations/0022_assessment.sql`. Append-only; no existing table altered
except two additive columns.

```sql
-- 1. The assessment. Owner-less until an email is verified.
CREATE TABLE "assessment" (
  "id"                    text PRIMARY KEY,
  "status"                text NOT NULL DEFAULT 'draft'
      CHECK ("status" IN ('draft','awaiting_email','delivered','purchased',
                          'shared','abandoned','expired','declined')),
  "draft_token_hash"      text,          -- sha256, cookie-held
  "draft_expires_at"      timestamptz,
  "owner_user_id"         text REFERENCES "user"("id") ON DELETE SET NULL,
  "owner_email"           text,
  "email_verified_at"     timestamptz,
  "organisation_id"       text,
  "brand_id"              text,
  "entry_product"         text,          -- analytics only; never recommendation input
  "intake"                jsonb NOT NULL DEFAULT '{}'::jsonb,
  "analysis_version"      text,          -- prompt/schema version that produced the brief
  "recommendation"        text CHECK ("recommendation" IN
      ('signal','gap','direction','full','no_offer','needs_clarification')),
  "recommendation_reason" jsonb,
  "evidence_readiness"    jsonb,
  "share_token_hash"      text,
  "share_expires_at"      timestamptz,
  "share_revoked_at"      timestamptz,
  "marketing_opt_in"      boolean NOT NULL DEFAULT false,
  "marketing_opt_in_at"   timestamptz,
  "suppressed_at"         timestamptz,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "assessment_has_a_capability"
      CHECK ("draft_token_hash" IS NOT NULL OR "owner_email" IS NOT NULL),
  CONSTRAINT "assessment_draft_expiry"
      CHECK ("draft_token_hash" IS NULL OR "draft_expires_at" IS NOT NULL),
  CONSTRAINT "assessment_share_needs_expiry"
      CHECK ("share_token_hash" IS NULL OR "share_expires_at" IS NOT NULL),
  CONSTRAINT "assessment_brand_pair"
      CHECK (("brand_id" IS NULL) = ("organisation_id" IS NULL)),
  CONSTRAINT "assessment_brand_fk"
      FOREIGN KEY ("brand_id","organisation_id")
      REFERENCES "brand"("id","organisation_id") ON DELETE SET NULL
);

-- 2. Versioned brief. Append-only: a correction is a new version.
CREATE TABLE "assessment_brief_version" (
  "assessment_id" text NOT NULL REFERENCES "assessment"("id") ON DELETE CASCADE,
  "version"       integer NOT NULL CHECK ("version" >= 1),
  "content_hash"  text NOT NULL,
  "brief_markdown" text NOT NULL,
  "questions"     jsonb NOT NULL,        -- exactly 3, each with evidence links
  "analysis_version" text NOT NULL,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("assessment_id","version")
);

-- 3. Uploaded documents. Bytes live in object storage; this is the reference.
CREATE TABLE "assessment_document" (
  "id"            text PRIMARY KEY,
  "assessment_id" text NOT NULL REFERENCES "assessment"("id") ON DELETE CASCADE,
  "storage_key"   text NOT NULL,
  "filename"      text NOT NULL,
  "mime_type"     text NOT NULL,
  "bytes"         integer NOT NULL CHECK ("bytes" > 0),
  "sha256"        text NOT NULL,
  "kind"          text NOT NULL CHECK ("kind" IN ('proposal','brief','other')),
  "redacted_by_default" boolean NOT NULL DEFAULT true,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

-- 4. Access log for share links (spec §7.5).
CREATE TABLE "assessment_share_access" (
  "id"            bigserial PRIMARY KEY,
  "assessment_id" text NOT NULL REFERENCES "assessment"("id") ON DELETE CASCADE,
  "accessed_at"   timestamptz NOT NULL DEFAULT now(),
  "ip_hash"       text,
  "user_agent_hash" text
);

-- 5. Follow-up suppression (spec §7.6).
CREATE TABLE "assessment_followup_event" (
  "id"            text PRIMARY KEY,
  "assessment_id" text NOT NULL REFERENCES "assessment"("id") ON DELETE CASCADE,
  "kind"          text NOT NULL CHECK ("kind" IN ('delivered','reminder_1','reminder_2',
                                                  'opt_out','purchased','replied')),
  "sent_at"       timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE UNIQUE INDEX "assessment_draft_token_unique"
  ON "assessment"("draft_token_hash") WHERE "draft_token_hash" IS NOT NULL;
CREATE UNIQUE INDEX "assessment_share_token_unique"
  ON "assessment"("share_token_hash") WHERE "share_token_hash" IS NOT NULL;
CREATE INDEX "assessment_draft_expiry_idx"
  ON "assessment"("draft_expires_at") WHERE "draft_expires_at" IS NOT NULL;
CREATE INDEX "assessment_owner_email_idx" ON "assessment"(lower("owner_email"));

-- 7. Additive links on existing tables.
--    NB: there is no "order" table. `createOrder` (billing/server/orders.ts:58)
--    writes to "purchase", and the id it returns is the purchase id.
ALTER TABLE "purchase" ADD COLUMN "assessment_id" text;
ALTER TABLE "purchase" ADD COLUMN "assessment_version" integer;
ALTER TABLE "diagnostic_engagement" ADD COLUMN "assessment_id" text;
```

Deliberately **not** proposed:

- No new column on `product`. Release stays an environment decision (`plans.ts:224`).
- No change to `diagnostic_eligibility`. Pre-assessment checks are a different object; conflating
  them is how the current pre-purchase checks ended up unrecorded (current-state §"What is not
  wired" item 6).
- No change to `output`. Pre-purchase sharing is not `output` sharing; reusing it would require
  revocation and expiry columns that delivered reports do not want.

---

## 5. API contracts

All remote functions live in `modules/assessment/remote/*.remote.ts` (SvelteKit `command`/`query`,
matching `billing/remote/*`). Every input is zod-parsed at the boundary.

| Function | Kind | Input | Output | Guards |
| --- | --- | --- | --- | --- |
| `startAssessment` | command | `{ entryProduct?: string }` | `{ draftToken, assessmentId }` | IP rate limit 10/h |
| `saveAssessmentStep` | command | `{ draftToken, step, values }` | `{ step, complete }` | token, zod per step, 5 req/min |
| `clarifyAssessment` | command | `{ draftToken, answer }` | `{ nextQuestion \| null }` | token, max 3 clarifications |
| `requestBrief` | command | `{ draftToken, email }` | `{ sent: true }` | token, email rate limit 3/h, generic response |
| `readBrief` | query | `{ ownerToken }` | `AssessmentBriefView` | token hash, expiry |
| `correctBrief` | command | `{ ownerToken, corrections }` | `{ version }` | token, creates a new version |
| `shareBrief` | command | `{ ownerToken, expiresInDays, redact }` | `{ shareUrl }` | owner only |
| `revokeShare` | command | `{ ownerToken }` | `{ revoked: true }` | owner only |
| `readSharedBrief` | query | `{ shareToken }` | `RedactedBriefView` | token, expiry, not revoked; logs access |
| `beginCheckout` | command | `{ ownerToken, productId, cancellationConsent, captchaBypassToken }` | `{ url }` | **re-runs `checkEligibility` server-side** |

Types that must exist in `shared/schema.ts`:

```ts
type Recommendation = 'signal'|'gap'|'direction'|'full'|'no_offer'|'needs_clarification';

interface EvidenceReadiness {
  decisionDefined: boolean;
  proposalSupplied: boolean;
  currentMaterialSufficient: boolean;
  sectorCovered: 'approved'|'researchable'|'unknown';
  missing: Array<{ input: string; howToSupply: string; blocks: ProductKey[] }>;
}

interface BriefQuestion {
  id: string;
  text: string;                 // ≤ 140 chars
  rationale: string;            // grounded, cites an intake field or supplied document
  evidenceRefs: string[];       // intake field keys or document ids — never invented
  tests: 'problem_definition'|'buyer_proof'|'proposed_action';
}
```

`BriefQuestion[]` is constrained to length 3 by a zod tuple, not an array with `.max(3)`, so a
generation that returns two or four is a type error rather than a silently shorter brief.

---

## 6. File-by-file change list

### 6.1 New files

| Path | Purpose | Size |
| --- | --- | --- |
| `database/migrations/0022_assessment.sql` | §4 above | M |
| `src/lib/modules/assessment/shared/schema.ts` | intake steps, `Recommendation`, `EvidenceReadiness`, `BriefQuestion` | M |
| `src/lib/modules/assessment/shared/registry.ts` | analysis version constants, recommendation policy table | S |
| `src/lib/modules/assessment/server/access.ts` | token issue/hash/verify, cookie handling | M |
| `src/lib/modules/assessment/server/repository.ts` | CRUD, token-keyed, no `OperationContext` | L |
| `src/lib/modules/assessment/server/recommendation.ts` | **pure** recommendation + readiness | L |
| `src/lib/modules/assessment/server/analysis.ts` | calls the chosen analysis owner; schema-validates output | M |
| `src/lib/modules/assessment/server/brief.ts` | render markdown, redacted view, printable summary | M |
| `src/lib/modules/assessment/server/share.ts` | issue/revoke/expire/log | S |
| `src/lib/modules/assessment/server/followup.ts` | suppression + cadence, flag-gated | M |
| `src/lib/modules/assessment/server/email.ts` | two template kinds | S |
| `src/lib/modules/assessment/remote/*.remote.ts` | §5 contracts | L |
| `src/routes/(assessment)/assessment/+page.svelte` | entry | M |
| `src/routes/(assessment)/assessment/[step]/+page.svelte` | progressive steps | L |
| `src/routes/(assessment)/brief/[ownerToken]/+page.server.ts` | owner view | M |
| `src/routes/(assessment)/brief/[ownerToken]/print/+page.svelte` | procurement summary | S |
| `src/routes/(assessment)/s/[shareToken]/+page.server.ts` | redacted share view | S |
| `src/lib/modules/assessment/server/__tests__/recommendation.test.ts` | §10 acceptance cases | L |
| `src/lib/modules/assessment/server/__tests__/access.test.ts` | token isolation | M |
| `scripts/assessment/verify-assessment.ts` | disposable-DB proof, mirroring `scripts/diagnostic/verify-engagement.ts` | M |

### 6.2 Modified files

| Path | Change | Risk |
| --- | --- | --- |
| `src/routes/auth/(public)/pricing/+page.svelte` | delete eligibility block (lines 27–83, 257–312), replace all CTAs with "Start your free assessment" carrying `entryProduct` | **Low** — gate still runs in checkout |
| `src/routes/auth/(public)/pricing/+page.server.ts` | drop `getOptions()` sector load | Low |
| `src/lib/modules/billing/remote/checkout.remote.ts` | add optional `assessmentRef`; re-run `checkEligibility` from assessment inputs; stamp `purchase` | **High** — money path |
| `src/lib/modules/diagnostic/shared/registry.ts` | add `diagnostic.full` variant + `fullIntakeSchema` | **High** — changes sellable surface |
| `src/lib/modules/diagnostic/server/eligibility.ts` | split into `assessRecommendation()` (pure) + unchanged `checkEligibility()`; add `researchable` sector state | **High** |
| `src/routes/(montsel)/app/workflow/[productKey]/+page.server.ts` | accept `?assessment=` to prefill; never bypass `requireStartPayment` | Medium |
| `src/lib/modules/diagnostic/server/engagement.ts` | store `assessment_id` | Low |
| `src/lib/modules/products/shared/registry.ts` | `diagnostic.full` → `salesMode: 'self_service'` **only after** the variant exists | Medium |
| `src/lib/app/plans.ts` | no price change; release stays env-driven | — |
| `src/lib/modules/auth/server/email/types.ts` | two new `EmailTemplateKind` members | Low |
| `src/lib/platform/config/env-schema.ts` | `ASSESSMENT_*` flags, all defaulting to off | Low |

### 6.3 Explicitly **not** changed in this plan

- `diagnostic/server/payments.ts` — the entitlement gate is correct and must stay.
- `diagnostic/server/orchestration.ts` — no assessment logic may enter it.
- `output` / `output_version` — delivered-report sharing is a different capability.
- `RELEASED_PRODUCTS` semantics — fail-closed stays.

---

## 7. Security and privacy controls

| Control | Implementation |
| --- | --- |
| Token storage | SHA-256 only; token in httpOnly, `sameSite=lax`, `secure` cookie or URL path |
| Token entropy | 32 bytes from `crypto.getRandomValues`, base64url |
| Enumeration | every token route returns an identical 404 for miss, expiry, revocation |
| Indexing | `X-Robots-Tag: noindex, nofollow` + `<meta name="robots">` on tokenised routes |
| Upload safety | 10 MB cap, allowlist `pdf/docx/md/txt`, magic-byte check, reject on mismatch, store outside web root, never execute |
| Prompt injection | uploaded text is wrapped in a delimited block and labelled `untrusted_source` in the analysis contract; the analysis owner must not follow instructions found inside it |
| Rate limits | reuse `slidingWindowCheck`; distinct keys per endpoint; IP + email |
| Share redaction | default excludes uploads, quotes, email, personal data; the renderer takes an explicit `Redaction` set, so "share everything" is not the default argument |
| Access log | hash IP and UA; never store raw |
| Retention | draft 30 days, delivered brief 24 months, uploads deleted with the assessment; sweep index from §4 |
| Deletion | owner-initiated hard delete of assessment, versions, documents, share access rows |
| Consent | `marketing_opt_in` is separate from report delivery, defaults false, and is recorded with timestamp; suppression is checked before every send |
| Abuse | captcha bypass token reused on `requestBrief` and `beginCheckout` in production |

---

## 8. Sequencing

Ordered so that each step is independently shippable and nothing unsafe is removed before its
replacement is proven.

| # | Step | Depends on | Size | Verifiable without the engine? |
| --- | --- | --- | --- | --- |
| 1 | Pricing CTA change + static journey prototype (no persistence) | — | S | Yes |
| 2 | Migration 0022 + repository + token access + `verify-assessment.ts` | 1 | L | Yes (disposable DB) |
| 3 | Progressive intake, resumable drafts, uploads | 2 | L | Yes |
| 4 | `recommendation.ts` (pure) + acceptance tests | 2 | M | Yes |
| 5 | Analysis integration (engine or service — **decision required**) | 3, 4 | L | **No** |
| 6 | Decision Brief renderer, printable summary, redacted share | 4 | M | Yes |
| 7 | Email delivery + owner link + magic-link return | 2, 6 | M | Yes (mock provider) |
| 8 | Checkout hand-off + assessment→engagement link | 2, 6 | M | Partly (Stripe test mode) |
| 9 | Full Diagnostic variant (`diagnostic.full`) | 4, 8 | L | Yes |
| 10 | Sector research workflow — **separate project** | — | XL | No |
| 11 | Langfell booking hand-off | 6, 7 | S | Yes |
| 12 | Follow-up, consent, suppression | 7 | M | Yes |
| 13 | Staging pilot, privacy review, gradual rollout | all | M | — |

**Steps 1–4 and 6–7 are the whole free journey except the intelligence.** That is worth stating
plainly: most of the value is deliverable and testable while the analysis-owner decision and the
engine's unverified state remain open.

Step 10 is called out as a separate project because spec §Step 4 says the delivery gate must not be
relaxed until the research workflow is implemented *and verified*. Nothing in this plan should
touch `eligibility.ts`'s sector block before that lands.

---

## 9. Acceptance criteria mapping

| Spec §10 criterion | Where it is satisfied |
| --- | --- |
| Pricing cards show no eligibility questionnaire | Step 1 |
| Begin without an account; resumable | Steps 2, 3 |
| Email delivery and secure return link | Step 7 |
| Direction-only question not sold Full | `recommendation.test.ts` case D |
| No proposal → no Direction/Full | `recommendation.test.ts` case B |
| Thin public material → Gap considered | `recommendation.test.ts` case C; requires G3 split |
| Missing sector → preparation or clear hold | Step 10; until then, `needs_clarification` with a named blocker |
| Four products keep distinct minimum inputs | `registry.ts` + `parseIntake` unchanged in spirit |
| Never outputs a paid verdict or Signal score | `analysis.ts` output schema has no score or verdict field |
| Three questions grounded and non-generic | zod tuple + `evidenceRefs` non-empty + review gate |
| Close uses actual investment or a non-numeric alternative | `brief.ts` branches on `proposedCommitment` presence |
| No human-review claim on self-service | copy constant asserted in a test |
| Share, revoke, return without re-entry | Steps 2, 6 |
| Checkout refuses when deliverability unresolved | `createCheckout` re-run, unchanged in authority |
| Purchase links one assessment version to one engagement | Step 8; idempotency via existing `deriveWorkItemId` |
| Langfell ends with consultation invitation | Step 11 |
| Follow-up stops on opt-out | Step 12 |
| E2E covers failures, delays, abuse, duplicates, downtime | Step 13 |

---

## 10. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Full Diagnostic sold before it can run (G5) | **Critical, pre-existing** | Step 9; until then leave `full-diagnostic` out of `RELEASED_PRODUCTS` and remove `popular: true` from the card |
| Free funnel depends on an unverified engine | High | Steps 1–4, 6–7 ship without it; static prototype first |
| Recommendation biased toward Full | High | `recommendation.ts` is pure and table-driven; acceptance tests assert lower offers and `no_offer` |
| Prompt injection via uploaded proposal | High | §7 controls; analysis owner treats uploads as untrusted |
| Assessment becomes a second intake authority | High | `diagnostic/shared/registry.ts` stays the only intake authority; assessment *maps into* it |
| Checkout regression | High | Existing tests in `billing`; add assessment-path cases before touching `checkout.remote.ts` |
| Share link leaks a confidential proposal | High | Redaction default; test asserts uploads absent from shared payload |
| Retention/erasure never implemented | Medium | Step 2 includes the sweep; disposable-DB proof asserts expiry |
| Scope creep into sector research | Medium | Step 10 is out of scope and blocks nothing else |

---

## 11. Decisions required before engineering commitment

These are the spec's §12 items, now grounded in what the code actually needs.

1. **Analysis owner** (§12.5). Engine endpoint, dedicated service, or in-app? Recommendation: engine.
   This blocks step 5 and nothing else, but it is the largest single unknown.
2. **Full Diagnostic** (§12 item, implied). Does it become a real variant now, or is it withdrawn
   from the catalogue until it is? Leaving it priced-but-unsellable is the worst of both.
3. **Email timing** (§12.2). Required before the brief is generated, or only before delivery? The
   code supports either; the privacy notice differs.
4. **Retention defaults** (§12.3). 30/90/365 days for drafts; share expiry default 14 or 30 days.
5. **Sector policy** (§12.4). What standard makes research "approved", and who signs it off?
   Without an answer, `needs_clarification` is the only honest recommendation for an uncovered sector.
6. **Langfell booking provider** (§12.6). The repo has `/consult` behind sign-in; the spec wants an
   anonymous booking action.
7. **Independence wording** (§12.7). "Independent of the agency's implementation fees" — is this
   operationally true for Montsel today?
8. **Follow-up legal basis** (§12.8). Corporate vs individual subscriber; PECR analysis needed
   before step 12 is enabled.
9. **Delivery time and format claims** (§12.9). Cannot be published until measured.
10. **Release gate** (§12.10). Which environment gets `RELEASED_PRODUCTS` first.

---

## 12. What I could not establish

- Whether the engine can serve an assessment endpoint, or what its `sectorIntelligence` catalogue
  actually contains.
- Whether a self-service run can reach `published` without a consultant grant. The current-state
  document flags this; I confirmed the application has no bypass path, but the engine's behaviour is
  outside this repository.
- Whether `RELEASED_PRODUCTS` in production currently includes `full-diagnostic`.
- Whether Stripe test-mode checkout completes end to end in this tree.
- Actual email deliverability for any configured provider.

Each is marked here rather than assumed, per the spec's instruction to distinguish implemented
features from unverified assumptions.
