# Visual Contract v2 — Teams and Enterprise Specification

**Version:** 0.1 (candidate)  
**Date:** 28 October 2026  
**Status:** Candidate product specification. Requires owner approval before implementation. No section of this document authorises a build, a price, a public claim or a release.  
**Scope:** Visual Contract only. It extends the shipped Solo V1 model into multi-person use and organisation-level governance. It does not restate the platform specification, which remains authoritative for identity, organisations, brands and entitlements.  
**Depends on:** `docs/architecture/montsel-specification.md` v1.2 (tenancy, roles, entitlements, limits), `01-Library/visual-contract/commercial/03-Offer-or-Availability.md` (v1 scope and exclusions).

**Recorded position (28 October 2026):** Drafted and parked. No owner decision has been taken on any section. No implementation, price, claim or release is authorised.

## At a glance

- **The problem v2 solves is not "add users."** It is that a brand-scoped draft is already editable by every member of the brand, with no named decision-maker, no attribution and no record of disagreement. That is an access defect disguised as a feature gap.
- **The recommended model is one contract, one named decider, structured input from collaborators, and recorded dissent.** Not voting. Not consensus.
- **Enterprise is governance, not extra product.** SSO, audit export, retention policy, decider policy and branding. The six pairs do not change.
- **Two hard dependencies exist before any team tier can be sold:** organisation-owned billing (platform Phase 5) and the removal of the transitional Phase 1 member/brand caps. Neither is optional.

## 1. What v2 is

Visual Contract v2 lets more than one person participate in recording a project's visual direction without turning that record into a committee average.

It has two surfaces:

| Surface | Who | What changes from V1 |
| --- | --- | --- |
| **Team** | Several people inside one brand or organisation | Named decider, collaborator input, recorded dissent, explicit revision history, contract-level permissions |
| **Enterprise** | An organisation buying governance | SSO, audit export, retention policy, enforced decider policy, branded contract page, seat administration |

Everything else stays: six pairs, one shareable page, a Visual Contract Brief and an Evaluation Companion, the designer retaining creative judgement, no acceptance signature.

## 2. What v2 is not

- Not a voting or polling product. There is no majority rule, weighting, scoring or automatic reconciliation.
- Not a client-facing account system. The client is represented by the named decider or receives the shared link. No client logins in v2.
- Not a designer marketplace or acceptance workflow. No counter-signature, no proof of agreement.
- Not a replacement for the wider creative brief, brand strategy or Module 10 visual identity work.
- Not a claim that team use produces better design, fewer revisions or faster agreement. No such evidence exists.

## 3. The design position

The Solo product's value is that it records **one** direction. Teams produce multiple directions by default. The obvious product response — let everyone choose and combine the result — destroys the artefact, because an averaged set of six pairs describes nobody's intention and gives the designer nothing to interpret.

v2 therefore separates three things the Solo product runs together:

1. **Input** — anyone on the brand may say which quality they would choose, and why.
2. **Decision** — exactly one person records the six choices. That person is named on the contract.
3. **Dissent** — a differing input is retained against the contract as an explicit note, not silently discarded.

This preserves the mechanism and makes the disagreement inspectable. It also satisfies the existing rule in the product documents that a change to the criteria must be recorded rather than quietly applied around a preferred concept.

**Rejected alternatives and why:**

| Alternative | Why rejected |
| --- | --- |
| Majority vote per pair | Produces incoherent combinations; no one is accountable for the direction. |
| Weighted voting by seniority | Encodes an org chart into a visual record; unverifiable and unexplained to the designer. |
| Consensus required | Blocks projects indefinitely; the tool's value is availability during review, not agreement. |
| Everyone edits freely (current behaviour) | Already the status quo defect: silent overwriting, no attribution, no history. |

## 4. Decisions

Each decision below is a recommendation with its consequence stated. None is approved.

### D1 — Contract ownership

**Recommended:** a contract belongs to a brand, and names one `decider_user_id`. The decider is the only principal who may confirm choices or open a revision.

**Consequence:** brand-wide read remains, brand-wide write ends. This is a breaking change to the current repository contract, which scopes every query by `brand_id` and `organisation_id` only.

### D2 — Collaboration model

**Recommended:** contributors submit input per pair before confirmation. Input is visible to the decider and to other contributors, and is frozen into the version record at confirmation as dissent where it differs from the decision.

**Consequence:** requires a new input table and a pre-confirmation screen. Contributors cannot change the recorded choices at any point.

### D3 — Designer participation

**Recommended:** the designer remains outside the account system in v2. The public `/contract/[publicId]` link is unchanged and unauthenticated. An optional designer comment channel is deferred; if added later it is a separate surface, not a login.

**Consequence:** no new authentication surface, no designer seat in Team. Enterprise may add a named designer contact field only.

### D4 — Revision model

**Recommended:** confirmed contracts are immutable. A revision creates a new version with `changed_by`, `reason`, and the axis-level diff. The public page shows the current version and a visible "revised" marker; prior versions remain retrievable by the brand.

**Consequence:** the existing `versionNumber` field becomes load-bearing rather than incidental.

### D5 — Guest claim into a team

**Recommended:** an unclaimed guest draft may be claimed into a brand. On claim, the claimer becomes decider, the guest TTL is cleared, and the draft appears in the brand's Documents area exactly as a brand-created draft does today.

**Consequence:** a claimed guest draft is immediately visible to every brand member. The claim screen must say so before the action is taken.

### D6 — Multi-brand and agency use

**Recommended:** an agency organisation may hold many client brands. Each brand carries its own contracts and its own decider. There is no cross-brand contract view in v2, and no client account for the brand's end client.

**Consequence:** agency workflows are supported structurally, not as a distinct product surface. A true agency workspace remains out of scope.

### D7 — Plan structure

**Recommended:** Solo stays free and unchanged. Team and Enterprise are separate paid surfaces defined in §8. Pricing figures are not set by this document.

**Consequence:** requires a commercial decision from the owner and, for organisation-owned billing, platform Phase 5.

## 5. Roles and permissions

v2 adds contract-scoped actions alongside the existing brand actions. Existing brand roles map as follows.

| Contract action | brand_admin | editor | contributor | viewer |
| --- | --- | --- | --- | --- |
| `contract:read` | yes | yes | yes | yes |
| `contract:create` | yes | yes | no | no |
| `contract:contribute` | yes | yes | yes | no |
| `contract:decide` | yes | yes | no | no |
| `contract:revise` | yes | yes | no | no |
| `contract:share` | yes | yes | no | no |
| `contract:export` | yes | no | no | no |

**Rules that sit above the matrix:**

1. `contract:decide` and `contract:revise` additionally require `decider_user_id = actor.userId`. A brand_admin may reassign the decider but may not confirm on their behalf.
2. A viewer never sees another brand's contracts, and never sees a draft that has not been confirmed unless explicitly added as a contributor.
3. Contributor input is visible to the decider and to other contributors on the same contract. It is not visible to viewers.
4. Reassigning the decider is an audited action and is recorded on the contract history.

**Implementation note:** these are new `BrandAction` members. `ACTION_ROLES` in `tenancy/server/context.ts` is an exhaustive record, so adding them is a compile-time forcing function across every repository — that is desirable, and it should not be worked around with a string cast.

## 6. Contract lifecycle

| Stage | Actor | State | Notes |
| --- | --- | --- | --- |
| Create | editor, brand_admin | `draft` | Decider defaults to creator; may be reassigned |
| Invite input | decider | `draft` | Contributors added by brand member, not by email in v2 |
| Contribute | contributor | `draft` | Per-pair choice plus optional reason |
| Confirm | decider only | `confirmed` | Input frozen; dissent recorded where it differs |
| Share | decider, editor | `confirmed` | Public link, unchanged from V1 |
| Revise | decider only | `confirmed` → new version | Reason mandatory; diff recorded |
| Archive | brand_admin | `archived` | Read-only; link remains live unless revoked |

The existing flow steps (`context`, `choose`, `confirm`, `review`, `generated`) are preserved. Team mode inserts one screen between `choose` and `confirm`: **Input received**, showing contributor responses and any divergence.

## 7. Data model

Existing tables are extended; three are new.

**Extended — `visual_contract_draft`**

| Column | Change |
| --- | --- |
| `decider_user_id` | new, nullable for guest drafts, required for brand drafts |
| `created_by_user_id` | new, nullable, records the actual creator separately from the decider |
| `revision_of_version_id` | new, nullable |

**Extended — `visual_contract_version`**

| Column | Change |
| --- | --- |
| `decider_user_id` | new, frozen at confirmation |
| `revision_reason` | new, nullable, required when `version_number > 1` |
| `supersedes_version_id` | new, nullable |

**New — `visual_contract_participant`**

`contract_draft_id`, `user_id`, `role` (`decider` | `contributor` | `viewer`), `added_by_user_id`, `status`, `created_at`. Unique on (`contract_draft_id`, `user_id`).

**New — `visual_contract_input`**

`contract_draft_id`, `user_id`, `axis`, `choice`, `reason`, `created_at`, `frozen_in_version_id`. Unique on (`contract_draft_id`, `user_id`, `axis`) while unfrozen.

**New — `visual_contract_revision`**

`version_id`, `from_version_id`, `changed_by_user_id`, `reason`, `axis_changes` (jsonb), `created_at`.

**Audit:** create, decider reassignment, confirm, revise, share, export and archive are written to the existing brand audit stream and require `audit:read` to view. Ordinary brand membership does not gain audit visibility through v2.

## 8. Plans, entitlements and limits

### 8.1 Structure

| Plan | Surface | Contract limit | Seats | Governance |
| --- | --- | --- | --- | --- |
| **Solo** | Free, unchanged | 1 active contract per person | 1 | None |
| **Team** | Paid, per seat | 10 active contracts per brand | 3 minimum, 25 maximum | Decider policy, shared revision history |
| **Enterprise** | Paid, annual contract | Negotiated | Negotiated — requires a cap change (§8.2) | SSO, audit export, retention policy, branded page |

### 8.2 Two blockers that must be resolved before Team can be sold

1. **Organisation-owned billing does not exist.** `isOrganisationEntitled` currently resolves entitlement only through a personal organisation whose owner holds a live subscription, and explicitly returns `false` for organisation-owned billing ("org-owned billing is Phase 5"). A Team tier sold to an organisation has no entitlement path until Phase 5 lands, or until a transitional rule is written and approved.
2. **Transitional caps contradict a team promise.** `MEMBERS_PER_BRAND = 25`, `BRANDS_PER_ORGANISATION = 10`, `ORGANISATION_MEMBERS = 100`. Enterprise copy elsewhere in the product promises "unlimited everything". A v2 plan table may not promise a capacity the server will refuse. Either the caps move per plan, or the copy states the real ceiling.

### 8.3 Pricing

Not set here. The only price anchors in the codebase are the generic platform tiers in `src/lib/app/plans.ts` ($9 / $29 / $99), which describe an authentication platform and should not be inherited by a Visual Contract tier without a separate decision.

Recommended shape: seat-based for Team, annual for Enterprise, with no per-contract metering — charging per contract penalises the behaviour the product exists to encourage.

## 9. Enterprise definition

Enterprise is governance. It does not add design capability.

| Capability | Requirement |
| --- | --- |
| SSO | SAML or OIDC through the platform identity layer; no Visual Contract-specific auth |
| Audit export | Contract lifecycle events exportable in a stable format, brand-scoped |
| Retention policy | Organisation-set retention for archived contracts; must not silently delete approved source history |
| Decider policy | Optionally restrict decider to a named role; enforced server-side |
| Branded page | Organisation logo and colour on the public contract page; no removal of the "not a legal agreement" disclaimer |
| Seat administration | Existing brand member management, no separate console |
| Data processing | Covered by the platform DPA; no Visual Contract-specific subprocessor |

Explicitly not included: custom pair sets, white-label domains, API access, SLA-backed uptime claims, or any claim of SOC 2 / HIPAA coverage. The platform does not currently hold those certifications, and the Enterprise copy in `plans.ts` that implies otherwise should be corrected independently of this specification.

## 10. Sharing and the designer

Unchanged from V1 and deliberately so:

- One page, one link, viewable without an account.
- An email address is required only to send an email.
- Designer Send remains a delivery wrapper, not a document and not an acceptance step.
- The disclaimer remains on the page: the contract is the client's recorded direction, not a legal agreement, and does not mean the designer has accepted it.

Team mode adds one thing to the public page: the decider's name and, where dissent exists, a single line stating that alternative views were recorded. It does not publish who disagreed.

## 11. Migration from V1

1. Every existing brand draft gets `decider_user_id` from `owner_user_id`; where that is null, from the brand's `brand_admin`.
2. Guest drafts are untouched. Their claim path is D5.
3. Existing confirmed versions get `version_number = 1` and no revision record.
4. No draft is deleted or rewritten. No confirmed contract changes meaning.
5. Rollback is by feature flag: with Team disabled, the product behaves exactly as V1 and `decider_user_id` is ignored for authorisation.

## 12. Security and isolation requirements

These extend the platform's Phase 1 gate; they do not replace it.

- Cross-brand denial for contract read, write, contribute, revise, export and public-link revocation.
- Revoked brand membership loses contract access immediately, including while a session remains active.
- A contributor cannot confirm, revise or share, by any route, including direct server action invocation.
- A reassigned decider loses decide rights on the next request, not the next session.
- Concurrent confirm and revise cannot produce two current versions.
- Public link revocation takes effect without deleting the brand's version history.
- Decider reassignment and revision reasons appear in audit with actor, before and after values.
- Guest token hashes never grant brand access, and a claimed draft cannot be re-claimed by a different token.

## 13. Non-goals

Consensus engine, scoring, AI adjudication of pairs, client accounts, designer accounts, contract templates per industry, cross-brand reporting, analytics dashboards, PDF as primary output, e-signature, and any statement that the tool reduces revisions or improves design.

## 14. Open decisions for the owner

| # | Decision | Blocks |
| --- | --- | --- |
| 1 | Does Visual Contract remain "a free tool" in its public positioning, with Team sold as a separate product, or does the free framing end? | All external copy, the commercial records in §15 |
| 2 | Is Team sold per seat, per brand, or per organisation? | Pricing, entitlement model |
| 3 | Does Team wait for platform Phase 5 org billing, or does a transitional entitlement rule get written? | Any Team release |
| 4 | Do the Phase 1 caps move per plan, or does the copy state real ceilings? | Enterprise copy |
| 5 | Is recorded dissent acceptable to publish on the shared page? | Public page design, D2 |
| 6 | Is a designer comment channel in scope for v2.1 or deferred indefinitely? | D3 |

## 15. Reconciliation with the commercial records

This section exists because v2 cannot ship while the product records say otherwise.

The v1 exclusions in `03-Offer-or-Availability.md` are explicitly scoped to the first version: "These exclusions describe the planned first version." They list no team decision-making, no agency or consultant workspace, no paid version, no reporting, and no separate primary output.

That scoping means v2 does not contradict the commercial record — it moves beyond a boundary that was written for v1. But three statements still need an owner decision before v2 is presented anywhere:

1. `02-Positioning-and-Core-Explanation.md` describes Visual Contract as "a planned free tool" and says possible future team products are "separate commercial hypotheses". A paid Team tier is permissible under that wording only while it remains a hypothesis; it stops being one the moment it is priced.
2. `01-Product-Overview.md` states the first version is "planned for one person and one project". Once v2 ships, that sentence describes a historical version, not the product.
3. `04-Commercial-Status-and-Next-Decision.md` records availability as closed and evidence as limited to a twelve-persona written simulation. v2 changes the product's surface, not its evidence position. No v2 claim may cite team usage as validation.

Recommended handling: v2 ships as a **separate availability statement** with its own scope line, and the v1 pages are amended to say "Solo, the first version" rather than being silently rewritten.

## 16. Acceptance criteria

v2 is ready for review when all of the following are demonstrated, not asserted:

1. A brand with three members produces one contract with a named decider, two contributor inputs and one recorded dissent.
2. A contributor's attempt to confirm is refused server-side and produces no state change.
3. A revision produces a new version with reason and axis diff, and the public page shows the revised marker while the prior version remains retrievable.
4. A revoked member loses access on the next request.
5. Concurrent confirm and revise yields exactly one current version.
6. Guest claim assigns the claimer as decider and discloses brand-wide visibility before the action.
7. With Team disabled, every V1 route and action behaves identically to the shipped build.
8. Audit contains create, reassign, confirm, revise, share and archive with actor and before/after values.
9. No plan copy promises a capacity the server refuses.

## 17. Implementation sequence

| Step | Work | Gate |
| --- | --- | --- |
| 1 | Decider field, attribution, narrow mutation authority | Isolation tests; V1 parity |
| 2 | Participant and input tables, pre-confirm input screen | Contributor refusal tests |
| 3 | Revision model, version history, revised marker | Concurrency tests |
| 4 | Guest claim | Claim disclosure and re-claim tests |
| 5 | Entitlement and plan enforcement | Org billing decision (D7, blocker 1) |
| 6 | Enterprise governance | SSO, audit export, retention, branded page |

Steps 1–4 are product work and can proceed on the existing entitlement model. Step 5 cannot start until the org-billing decision is made.
