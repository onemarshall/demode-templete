# M05 Brand Strategy — parity specification

Recorded 29 October 2026, before implementation. Legacy source: the Trigger repository. This records
what must survive the port, not what is convenient to rebuild.

## Legacy surface

| Concern | Legacy file | Lines |
| --- | --- | --- |
| Contracts (all stage schemas) | `src/lib/server/m05-contracts.ts` | 1,116 |
| Session lifecycle | `m05-session.ts` | 173 |
| Upstream gate | `m05-upstream.ts` | 424 |
| Inheritance checks and meaning records | `m05-meaning.ts` | 290 |
| Semantic ledger | `m05-semantic.ts` | 373 |
| Element-stage steps | `m05-steps.ts` | 263 |
| Mechanical gates, coverage, freeze | `m05-gates.ts` | 243 |
| Drafts and Gate 7 review | `m05-synthesis.ts` | 386 |
| Decision packet | `m05-decisions.ts` | 508 |
| Seal and package | `m05-seal.ts` | 373 |
| Render and derived views | `m05-render.ts` | 381 |
| API orchestration | `m05-api.ts` | 120 |
| Stage screen | `src/routes/brand-strategy/+page.svelte` | 724 |

This is the largest module in the port. It is **not** a one-session build at the M02/M03/BF standard.

## Stage machine

`eligibility → inheritance → semantic → identity → audience → character → expression → synthesis →
packet → checks → review → package → client-decision → sealed`

Statuses: `draft`, `blocked`, `candidate`, `approved`, `sealed`, `stale`, `revision-requested`,
`return-upstream`, `declined`.

Route: `full | constrained | light`. The route capability recorded on the session comes from the
sealed Foundation's route authorisation, not from a local choice.

## Upstream gate (hard, no override)

Every one of these must hold or no session is created:

1. The M05 entry authority is satisfied — an entry-authority receipt for this exact chain.
2. The M05 module route is confirmed and is not `skip`.
3. The **newest sealed** Business Foundation exists. Never fall back to an older seal.
4. The BF seal verifies against its immutable version.
5. The BF gate is `open` **and** `m05Permission` is `granted`.
6. The BF handoff exists, is approved, and pins the exact sealed version and hash.
7. The BF record carries a recorded client approval of `approve`.
8. The BF assessment, manifesto, document and pinned M01–M04 source chain all parse.

The gate then builds the chain: `entry`, `bf` (seal, gate, approval, assessment, manifesto, document,
handoff, sources), `m04` (session, seal version, seal hash, route authorisation, data), `m03`
(session, commitments, seal receipt), `m02` (session, recon, seal receipt), `m01` (session, outputs,
handoff). The fingerprint is `sha256(JSON.stringify(chain))` and the session pins it.

**Auth blocker:** the legacy gate depends on an Entry Brief `moduleRoute(folder, "m05")` confirmation
and an M05 entry-authority receipt. Auth has no Entry Brief module. M05's route confirmation and
entry-authority receipt have no current producer, so this must be resolved before M05 can be
implemented honestly — either a route-authority record is added to Auth, or M05 inherits the
Foundation's authorisation explicitly and the parity spec is amended with that decision recorded.
This is a user decision, not something to invent.

## Inheritance (Phase 0)

Verbatim carriers: the seven convictions, the M03 belief-shift journey (FROM/TO verbatim), the claims
boundary, the Foundation's governing declarations (3–5, verbatim), and the foundation summary.
Plus a permission record (permitted/prohibited interpretations, translation rights, compression
boundary, return conditions, ownership boundary, approval and generation authority), a fifteen-field
engagement inheritance check with an honest disposition per field, brand context (state, scope,
naming scope, equity, rights), supplied assets with permission states, and meaning records.

Meaning records (FW_35): each has source words, interpretation, the strongest rejected alternative,
situation, people, action, decision, consequence, opposite, boundary, compression, repeat-back,
state, owner, consumers and stale condition. Required coverage: the five conviction elements, the
journey FROM and TO, and every governing declaration.

## Semantic inheritance ledger (FW_34)

Ledger items carry exact language, confirmed meaning, semantic role, authority level, preservation
rule, translation permission, expression permission, promotion permission, public-copy state,
headline permission, boundaries, evidence state, invalidation condition and recognition cue.

The ledger must map all fourteen hierarchy levels, declare a collapse point, record promotions and
their state, run adversarial checks (promotion, boundary, collapse, translation, evidence,
recognition), record recognition continuity, and complete the exact-authority check (declarations
verbatim, core belief from owner, owner fields verbatim, mislabelled inherited items, unclassified
load-bearing items). It ends in a recommendation: proceed, proceed conditionally, return upstream or
wait.

## Element stages

- **identity** — purpose (with competitor test, proof points, evidence basis), vision (with at least
  two horizons each carrying a proof milestone), three to five values (each with behaviour evidence
  and a real rejection), world/customer/brand beliefs, brand beliefs with standing, and the belief
  shift whose FROM/TO must equal the inherited journey verbatim.
- **audience** — primary segment with a full belief profile, secondary segments, anti-audience with
  the opposed belief and refusal boundary, readiness signals, channels, and a five-stage journey map.
- **character** — awareness (conviction ideal, five levels with evidence, gaps, barriers, objectives),
  personality (three to six traits with too-little/just-right/too-much, never-behaviours, scenarios),
  voice (attributes with belief connection, words used/avoided, five tones, examples, platforms), and
  attributes (X-Factor with at least two competitor-friction elements, tiered attribute mapping,
  hierarchy, whole-distinction verdict, personal-brand ritual).
- **expression** — the belief filter (four belief checks, four audience checks, six refusals, edge
  cases), tagline (established/deferred/not-required with alternatives, claims status, naming state),
  visual direction (colours, typography, imagery, at least four never-dos), copywriting (moves with
  examples, principles, four claims rules, channel variations), and asset reconciliation.
- **synthesis** — seven story beats (each with the belief visible at that moment and source refs),
  the strategy core (positioning, organising idea, decision summary, drift guards, conviction checks)
  and traceability rows.

## Decision packet (FW_40)

One record per load-bearing choice: source refs, exact source, decision, boundary, evidence state,
freedom (fixed/bounded), authorised range, render requirement and location, wording class, resolution
state, materiality, return owner. Packet problems block the gate; resolutions are human acts.

## Gates

Mechanical gates 0–6 over the confirmed stages: pre-suite, core identity, audience, expression
foundation, expression application, synthesis, coherence. Each gate returns findings with a code,
message and reference; a gate fails when it has findings.

Then an exact render-coverage audit (every required element must appear in the rendered strategy),
the packet hash, and the candidate freeze (Action 08) which records `candidateHash` and
`candidateVersionId`. Any later edit to the rendered strategy invalidates the review and every
derived view.

**Gate 7** is a fresh-context independent review over eight lenses with an independence declaration,
a hash match against the frozen candidate, findings with severity and disposition, an offered
alternative, and a verdict: pass, revise-m05, return-upstream, invalid or pending.

## Package, client decision, seal

The package renders six derived views (brand strategy, brand story, executive view, strategy summary,
presentation, practitioner brief) and reconciles them against the candidate.

The client decision is accept, revise or decline, by a named approver, with the exact response; a
revision names the stage it returns to.

The seal records the exact candidate hash, the packet hash, the gate results, the review and the
package, so the sealed version is independently verifiable and any later drift is detectable.

## Auth design decisions

- Same shape as M03/BF: SQL repository, source pin under a new `m05-bf` slot, durable generation
  jobs, committed outbox, immutable version with a receipt, stage screen.
- Attribution uses the authenticated actor. The client decision still carries the named approver.
- Every mutable zod default is a lazy factory. The M02 shared-default defect is not reproduced.
- The waitpoint mirror is replaced by the durable job runner and outbox.
- Generated views are derived artefacts; the canonical sealed version is the authority.

## Implementation plan

Two sessions, because the module is roughly three times BF.

**Pass 1 — domain foundation**
1. `stages/m05/contracts.ts` — port all stage schemas with lazy defaults.
2. `stages/m05/source.ts` — the `m05-bf` upstream body and its validation.
3. `app/strategy-m05-source.server.ts` — derive the chain from the newest sealed BF, verify the BF
   seal, gate permission, handoff and approval; pin under `m05-bf`.
4. Tests: contract shapes and default independence; derivation against a real sealed BF row;
   refusal of a blocked gate, an unapproved Foundation and a stale chain.

**Pass 2 — vertical slice**
5. `stages/m05/{rules,gates,meaning,semantic,decisions,render,seal,service}.ts`.
6. `providers/m05.ts`, `jobs/m05-worker.ts`, `app/strategy-m05-host.server.ts`, trigger task, wiring.
7. Route `brand-strategy` and the stage screen.
8. Tests: full flow to seal, gate failures, review independence, tamper detection, successor.

## Open questions that need a user decision

1. **M05 route authority.** Auth has no Entry Brief. Does M05 require its own confirmed route record
   (a new small authority surface), or does it inherit the Foundation's authorisation with the
   dependency recorded explicitly? The legacy gate refuses without a confirmed M05 route, so this
   cannot be silently dropped.
2. **Entry-authority receipt.** The legacy gate checks an M05 entry-authority receipt that names the
   exact approved sources. Auth's equivalent is the BF source chain. Either that chain is adopted as
   the M05 entry authority (and the receipt becomes a derived record), or the receipt is dropped and
   the parity spec records the reduced guarantee.
