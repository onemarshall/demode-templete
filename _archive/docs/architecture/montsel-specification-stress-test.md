# Montsel Specification v1.1 — Coherence & Stress Review

> **Historical scope correction — 23 October 2026:** References below to an application MCP/OAuth provider describe the reviewed snapshot. The owner has confirmed this functionality was imported by mistake and is outside product scope. It has been removed from application code; it is not a prerequisite for organisations, brands or integrations. Developer MCP connectors remain separate tooling.

**Target:** `docs/architecture/montsel-specification.md` — Version 1.1, 23 October 2026
**Method:** Coherence test (logical structure, nine questions) + adversarial stress review (strongest sincere objections from implementers, security reviewers, product ownership, operations).
**Verdict staleness:** This review is against v1.1 exactly. Any revision to the specification stales it.
**Routing note:** DeMode commercial gates (positioning, buyer reception) do not apply — this is an internal technical architecture specification. Applicable lenses: logical coherence, implementation risk, and reception by the document's real constituencies.
**Boundary:** The spec's claims about the current codebase baseline (§4) were taken as stated at review time. They have since been verified against the repository — see the Baseline Verification appendix below. All §4 baseline claims check out.

---

## 1. Scope confirmed

The document predicts two outcomes and mostly keeps them distinct:

- **Outcome A — tenancy safety:** with these rules, data-model invariants, lifecycle state machines and the shared authorisation service, no principal can read or mutate another brand's data, and revocation is immediate and reliable.
- **Outcome B — provenance integrity:** with immutable versions and exact source references, every derived artefact remains explainable against the approved inputs that produced it.

Grain-size: per-operation and per-lifecycle-event, not statistical. The phase gates decompose the two outcomes correctly (Phase 1 gate = A; Phase 2 = B). No grain-size drift found.

The relationship between the variables producing Outcome A is **multiplicative** — one endpoint that skips the boundary collapses the whole claim — and the document is honest about this (§2 rule 2; §13.1 "tenant isolation is never postponed to a later hardening phase"). The variables producing Outcome B are **sequential** (Foundation → Strategy → Plan → Campaign → Content), and the document treats them as such.

## 2. What holds

1. **The validate-both invariant is stated as validation, not cleanup** (§5: "Validate both on every protected operation, regardless of retained rows"). This is the correct answer to the most common multi-tenant failure mode — denial-by-cleanup, which fails under races and partial failures. The spec names the failure mode and rejects it.
2. **Denial responses must not disclose existence** (§6.3). Most permission specs stop at 403; this one recognises that a distinguishable 403 is itself a leak.
3. **"An after-hook alone is not evidence that operations share a transaction"** (§7.1). An informed-engineer line — it anticipates exactly how Better Auth hook integration goes wrong and refuses the comforting assumption.
4. **The Phase 1 gate list (§13.1) reads like a tenancy penetration-test plan:** two-tab concurrency, stale retry after removal, revoked-before-publication, concurrent acceptance, last-owner loss. These are the real failure modes, not a generic "test auth" checklist.
5. **Epistemic honesty as a repeated pattern:** the status line, "Test fixtures do not establish that a future storage provider or job worker is already safe" (§13.1), "Do not claim instant revocation across every external storage mechanism without proving it" (§10), "Do not invent retention guarantees" (§11.1), and the closing disclaimer. The document does not lie to itself — which matters because specifications erode exactly where they overclaim.
6. **Provenance invariants are the correct hard lessons:** "A mutable parent ID alone does not establish lineage" (§5) and the source-manifest-before-generation requirement (§9) are stated as invariants, not aspirations.
7. **Billing:** "never implicitly replicate one subscription's benefits across every organisation its purchaser joins" (§11.2) names the exact bug that would otherwise ship silently, and makes entitlement scope a Phase 1 obligation rather than a Phase 5 surprise.
8. **The zero test passes for every load-bearing variable of Outcome A.** Remove the shared service, the composite-FK invariants, the provisioning state machine, or context immutability, and isolation collapses in a way the document itself acknowledges. No variable is practically inert: each is exercised by at least one named gate scenario.

## 3. Where it breaks

**No structural findings.** The spine holds: validate-both, default-deny, context immutability, atomic-or-recoverable provisioning, and the phase decomposition are mutually consistent. I could not construct a scenario in which two stated rules produce contradictory requirements.

### Significant findings

**S1 — The hot path is unspecified: per-operation validation vs immediate revocation, with no resolution design.**
*Surfaced by Q4/Q8 (load-bearing variable with unexamined practical range) and by an inconsistency with the document's own decision-forcing pattern.*
`requireBrandAccess` (§6.3) is the most-executed code path in the system and must reflect revocation immediately (§2 rule 7; §5 "regardless of retained rows"). The document forces implementation-critical decisions elsewhere (migration runner, §4; billing mapping, §11.2) but never records how permission resolution executes: does Montsel read Better Auth's organisation tables directly (schema/version coupling the spec elsewhere warns about), call the Better Auth server API (latency/availability coupling on every protected operation), or cache with invalidation (where revocation bugs live)? "Immediate invalidation" + "validate on every operation" + no stated caching position is either slow by design or subtly wrong by default.
**Fix:** one subsection recording the resolution design — either never-cache with an explicit cost acceptance (three indexed lookups is likely fine), or cache with explicit invalidation tied to the membership/assignment/grant change events the audit trail already records. Also record the membership-check mechanism (direct read vs server API) and its version-coupling consequence.

**S2 — "Everywhere" is currently a disciplinary invariant, not a structural one.**
*Surfaced by Q3 (the multiplicative claim's weakest joint).*
The security claim is multiplicative over every surface (§2 rule 2), but nothing in the document makes skipping the check structurally difficult. The real erosion mechanism in systems like this is a new endpoint six months later that queries directly and forgets the service. The document contains the structural answer — context-carrying repositories (§6.3: "Repositories and downstream services use that context") — but does not name it as the enforcement mechanism, and prescribes no CI/test convention that fails a repository call lacking an operation context.
**Fix:** elevate the repository rule to the named mechanism: all brand-scoped data access goes through context-required repositories; no endpoint constructs tenant queries directly; add a lint/test convention that fails any repository call without a validated operation context. This converts the most fragile invariant from discipline to structure.

**S3 — The Phase 1 permission matrix content is deferred to code.**
*Surfaced by Q5 (the compound variable is the matrix itself).*
§6.2 mandates "a versioned action-permission matrix in code" and names twelve actions, but the role→action mapping that Phase 1 actually ships with appears nowhere in the document. The matrix is the single most security-critical artefact in the system; its first version will be written by whoever implements Phase 1, under schedule pressure, without gate-level review.
**Fix:** require the initial matrix (for the Phase 1 action set — at minimum `brand:read`, `brand:update`, `brand_members:manage`, `audit:read`) to be written into the specification or a reviewed appendix as part of the Phase 1 definition of done, with the same evidence status as schema.

**S4 — The existing-user migration experience is unspecified.**
*Surfaced by Q6 (the exception every current customer personally hits on day one).*
Backfill mechanics are specified (quarantine, default-deny, §4) and new-user onboarding is specified (§7.2 personal organisation), but the transitional experience of an existing user is not: do they get an auto-created personal organisation? Who owns it? What is it named? What happens when that same email is later invited to someone else's organisation? This is the one migration moment every current customer experiences, and the document is silent on it.
**Fix:** one subsection specifying the transitional account experience: auto-provisioned personal organisation (ownership = the user, naming convention, first-login presentation), and the interaction between a personal organisation and later invitation acceptance (§7.2 half-covers this for invited users; extend it to the backfilled population).

**S5 — The Directus containment is asserted, not verified.**
*Surfaced by Q6 (exception unaccounted for).*
§1 and §10.1 contain the right decision ("Initially an identity/profile mirror"), but nothing requires verifying that the current Directus integration actually is only that. If today's integration serves files, assets or any tenant-adjacent surface, that surface becomes a leak route on the day brands exist — before any "reviewed arrangement" is made.
**Fix:** add to Phase 1 step 2 (§14): inventory the existing Directus surface (what is stored, served, synced; which credentials/URLs reach it) and confirm or remediate before tenancy ships.

**S6 — Mid-session removal UX is unspecified.** *(minor-to-significant)*
*Surfaced adjacent to Q9 (denial is specified; the experienced denial is not).*
The gate tests that access fails after removal (§13.1), but not what failure looks like: does the organisation vanish from the switcher, do deep links 404 or redirect, is there a "you no longer have access" state? Two-tab behaviour is specified for switching (§8) but not for revocation.
**Fix:** specify the degraded states for removal/expiry alongside the invitation-state visibility already required in §7.1.

### Cosmetic

- **C1.** The validate-both invariant is restated in §2, §5, §6.3 and §7.2. For an authority document this reads as deliberate reinforcement rather than drift — keep, but ensure future edits update all instances.
- **C2.** The document is dense and mechanism-light by design; implementers will need a companion mechanisms/decisions record. §14 gestures at this; naming the artefacts (decision log, matrix appendix) would make the companion set explicit.

## 4. Ranked revisions

1. **S1** — record the permission-resolution execution design (cache or never-cache, membership-check mechanism, invalidation story). This is where the document's two hardest requirements meet; it is currently silent there.
2. **S2** — elevate context-required repositories to the named enforcement mechanism for "everywhere," with a CI/test convention.
3. **S3** — require the Phase 1 role→action matrix as a reviewed gate artefact.
4. **S4** — specify the transitional account experience for existing users.
5. **S5** — add a Directus current-surface inventory to Phase 1 step 2.

(S6 folds into S4's subsection or stands as a small UX-spec item.)

## 5. Survival check

**Conditional yes.** A hostile senior engineer would find S1 and use it to question whether per-operation validation with immediate revocation is implementable at all; a hostile security reviewer would find S2 and argue the boundary erodes under maintenance. Both are answerable with one recorded decision and one structural rule. After revisions 1–3, the document should survive a hostile review, with the remaining open items standing as explicitly flagged known-unknowns with owners and deadlines — the correct posture for a direction-setting specification. Without revision 1, it does not survive.

## Strongest sincere objections, by constituency

- **Implementing engineer:** "This document cannot be implemented from the document alone" — step 1 of §14 is to confirm the installed Better Auth plugin's actual APIs. That is honest, but it means the spec's authority is conditional on facts outside it. The objection lands hardest on S1 and S3, where the missing decisions are exactly the kind the document's own style forces elsewhere.
- **Security reviewer:** "The choke point is a function; the attack surface is everything that doesn't call it." Answered structurally only if S2's repository rule is elevated; otherwise the reviewer is right and the invariant erodes.
- **Product owner:** "Phase 1 is a release the size of a product" — gate list, invitation flow, ownership safeguards, backfill and four mandatory decisions in one phase. The fixture allowance (§13.1) partially answers this, but schedule risk is real; the honest mitigation is S4 (specify the smallest transitional experience), not scope reduction — the spec correctly refuses to postpone isolation.
- **Operations:** "The state machine has a recovery requirement but no runbook." §7.1 requires bounded retries, visibility and an authorised recovery action but defers who-does-what-when-it-fails. Acceptable for a spec; must exist before Phase 1 gate evidence is recorded.

## Excitement vs reality

The document is disciplined rather than excited — the risk here is not overclaiming but the gap between specification and execution capacity. Nothing in the repository implements any of this yet (per the spec's own §4), Phase 1 bundles an unusually large gate, and the document's rigour will only be as real as the gate evidence. The one place momentum could outrun reality is schedule pressure on the Phase 1 gate; the spec has already named that risk and refused the wrong answer ("tenant isolation is never postponed"). Hold that line — the pressure will come.

---

## Appendix — Baseline verification against code

Verified against the repository on 23 October 2026. Every §4 baseline claim checks out. Findings below add facts the spec's open decisions should absorb.

### §4 claims — all confirmed

| Spec claim | Evidence | Verdict |
| --- | --- | --- |
| Uses Better Auth | `better-auth@^1.7.12` + `@better-auth/{core,cimd,mcp,oauth-provider,passkey}`; server config at `src/lib/auth/server/config.ts` | Confirmed |
| PostgreSQL, direct pool, no Drizzle | Raw `pg` Pool in `src/lib/auth/server/database/db.ts` (max 20, `withTransaction` helper); no Drizzle/Kysely/ORM in package.json or imports | Confirmed |
| Global user roles | Better Auth `admin()` plugin (`src/lib/auth/modules/admin/plugin.ts`) with configurable `adminRoles`, `adminUserIds`, impersonation, ban; role lives on the user globally | Confirmed |
| Per-user Creem subscriptions | `@creem_io/better-auth` plugin, `persistSubscriptions: true`; `creem_subscription` rows keyed by `referenceId` = user.id | Confirmed |
| Directus profile synchronisation | Local `better-auth-directus` package; Better Auth → Directus via `user.create/update` after-hooks (`src/lib/auth/server/database/hooks.ts`); profile page reads back via `findUser` + avatar asset URLs | Confirmed |
| Account security history | `auth_history` table (`src/lib/auth/server/history.ts`), categories `security/account/admin`, `RETENTION_DAYS = 90` — exactly the §12 claim | Confirmed |
| No organisations or brand membership configured | No organisation plugin in the 10-plugin core list (`src/lib/auth/modules/core.ts`); zero brand/membership code; the only `organization` matches are geo-IP fields and billing copy | Confirmed |
| §11.2: deletion/export queries use user IDs for subscription references | `deletion-policy.ts`: `SELECT status, "periodEnd" FROM creem_subscription WHERE "referenceId" = $1` with `user.id`; `account-export.ts`: same pattern | Confirmed verbatim |

### Additional facts the open decisions should absorb

1. **Schema management today is three mechanisms, no runner.** (a) Better Auth tables via a dedicated CLI instance (`scripts/auth-cli.ts`, commented "this file is only for migrations"); (b) request-time `CREATE TABLE IF NOT EXISTS` for app tables (`auth_history` in `history.ts`, security storage in `security/core/storage.ts`); (c) ad-hoc one-off scripts (`scripts/database/fix-siwe-constraint.ts`, `add-provider-column.ts`, `test-migrate.ts`). §4's prohibition on request-time schema creation for tenancy tables is a real constraint because request-time creation is the *existing convention* for app tables — the migration-runner decision (§4) is genuinely open, as the spec says.
2. **Directus surface inventory (S5) — substantially answered by this pass.** The integration is user-level only: `syncUser`/`findUser`/avatar upload+delete/`getAssetUrl`. A generic `fileService` (`uploadFile`/`deleteFile`/`getFile`) exists on the provider, but its only caller is avatar upload (`routes/auth/(app)/profile/+page.server.ts`). No tenant content flows through Directus today, so "Initially an identity/profile mirror" is accurate as of today. Caveat: the capability surface is broader than current usage, and Directus asset URLs are embedded in session serialisation (`session-serializer.ts`) and the profile page — the S5 recommendation to inventory and confirm before tenancy ships stands, and this inventory is the starting point.
3. **Directus sync uses after-hooks, fire-and-forget** — errors logged, not blocking; circuit-breaker boundary in the SDK (`better-auth-directus/src/plugin.ts`). Correct for profile sync; exactly the pattern §7.1 prohibits for provisioning ("An after-hook alone is not evidence that operations share a transaction").
4. **MCP layer is auth plumbing only** — `plugins/mcp/transport.ts` (CIMD transport) plus `jwt`/`mcp`/`cimd` in the CLI schema; no domain tools registered anywhere. §10's warning about echo tools is forward-looking; no tenant risk exists today.
5. **Redis is security analytics, not auth-critical** — session analytics, geo intelligence, trust scores, captcha bypass; failures skipped silently. Better Auth `secondaryStorage` is deliberately disabled (comment in `config.ts`) so Directus sync reflects immediately rather than serving stale cached sessions.
6. **The codebase has already made one cache-vs-immediacy trade-off** — disabling `secondaryStorage` to make Directus sync reflect immediately. This is direct precedent for S1: the team has hit the immediate-reflection-vs-cache tension once and resolved it by removing the cache. S1's decision (never-cache vs cache-with-invalidation for `requireBrandAccess`) should be made with this precedent in view.
7. **`withTransaction` already exists** (`database/db.ts`) — the PostgreSQL transaction machinery §7.1 needs for atomic provisioning is present and reusable.
8. **Deployment target is Cloudflare Workers** (`@sveltejs/adapter-cloudflare`, wrangler). A raw `pg` Pool over TCP in Workers implies Hyperdrive or an equivalent — worth confirming as part of the Phase 1 deployment-sequence documentation (§4), since connection behaviour affects transaction semantics.
