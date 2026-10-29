# M03 Business Commitments — parity specification

Recorded 29 October 2026, before implementation. Source of truth for the port is the legacy
implementation in the Trigger repository; this document records what must survive, not what is
convenient to rebuild.

## Legacy surface traced

| Concern | Legacy file |
| --- | --- |
| Stage machine, upstream gate, session lifecycle | `src/lib/server/m03-session.ts` |
| Working record schema | `src/lib/server/m03-commitments.ts` |
| Step drafts, confirmations, outcome checks, seal, render | `src/lib/server/m03-steps.ts` |
| Setup/step orchestration | `src/lib/server/m03-api.ts` |
| Remote transport | `src/routes/business-commitments/m03.remote.ts` |
| Stage screen | `src/routes/business-commitments/+page.svelte` |
| Durable mirror | `src/lib/server/m03-waitpoints.ts`, `src/trigger/m03-session.ts` |

## Upstream gate (hard, no override)

M03 consumes the **newest sealed M02 run** for the engagement. All of the following must hold or no
session is created:

1. A sealed M02 run exists.
2. Its reconnaissance log exists and its seal verifies against its immutable version.
3. `contrarianTrap.flags` is empty. If not, the return route is M01 — a grid built on a
   category-conventional truth is procedurally complete and still wrong.
4. Its outcome is `provisional_a` or `validated_a`.
5. The exact M01 version pinned by M02 is still current: M01 lock state `locked`, and the M01
   session id and outputs hash match the ones inside the M02 seal receipt.

A failed gate produces a dependency notice (owner module 01 or 02, reason, missing, prohibition,
correction) — never a session.

## Route

`skip | light | constrained | full`. A confirmed Skip route halts creation with an Entry Brief
notice and produces no output. Absent a recorded route the run is proposed Full.

## Stages

`upstream → inputs → challenge → journey → grid → proof → friction → credibility →
confrontations → cost → advocate → judgement → sealed`

Eight steps are model-drafted and human-confirmed: challenge, journey, grid, proof, friction, cost,
advocate, judgement. Credibility and confrontations are human-only. Every confirmation is
attributable (`by`, `at`) and only a confirmation advances a stage.

## Step rules that must survive

- **inputs**: solving for the second voice requires a recorded reason; a cyclical terrain diagnosis
  requires `terrainRead` and raises a risk flag; an ambiguous terrain requires `terrainRead`;
  prior positioning marked supplied must carry text.
- **challenge**: at least one contradiction; the contrarian check must be answered in writing.
  Industry default and core belief are copied verbatim from the sealed record, never re-drafted.
- **journey**: FROM, TO, experiential change in the customer's voice, experience shape, discovery
  mechanism.
- **grid**: exactly four rows, one per action. QUESTION and REJECT need a public specialisation
  signal; COMMIT and INTRODUCE need a deployable proof artefact type. Every row needs move, belief
  rationale, proof commitment, operational rule and an explicit trace to the Core Belief.
- **proof**: one row per action; at least one of product/policy/story/framework; prospective or thin
  evidence requires a capture-and-review plan; a `must-qualify` claim boundary note raises a risk
  flag and never promotes the claim.
- **friction**: one row per action, all seven sources assessed; the lowest-friction competitor must
  be named and assessed — friction buys time, not permanence. Replaces the previous lowest-friction
  risk flag.
- **credibility**: a gap needs its cause; a named gap needs a review condition; non-credible states
  raise a risk flag.
- **confrontations**: a past item whose belief says "no" needs refine/pivot; undecided is allowed
  and blocks Outcome A.
- **cost**: an empty cost list raises a risk flag.
- **advocate**: all three challenges with a case and a verdict; a failed challenge raises a risk
  flag.
- **judgement**: at least two options, a direct call, confidence and basis, three commercial
  consequences, reversal conditions, an integrity check and named next work.

## Outcome and ceiling

Outcome is `a` or `x` and is recorded after judgement, in the same stage.

- Outcome A requires `outcomeCheck` to report no problems: complete grid, complete friction, no
  undecided contradiction, non-empty cost, no failed advocate challenge, every M03-routed
  acknowledged risk landed, and a recorded judgement.
- Outcome X requires a return document (module 01 or 02, what to refine, what evidence this run
  produced).
- The upstream ceiling applies mechanically: Outcome A always lands `provisional`, and the
  reliance scope is "Module 04 hypothesis-mode analysis only — does not authorise Module 05 lock".
  Outcome X's reliance scope is "Return route only — no authorised strategy handoff".

## Seal

The seal must refuse if the pinned M01/M02 upstream changed or became ineligible, or if Outcome A
is no longer eligible at seal time.

Immutable receipt and snapshots must be independently verifiable. Legacy hashes raw
`session-m03.json`, `commitments.json` and `handoff-m03.json` bytes and stores copied snapshots.
The Auth port keeps the same shape: pretty-printed JSON snapshot hashes for session and commitments,
a receipt hash over the receipt payload, and a canonical version whose bytes are hashed with the
existing `sha256-json-stringify-v1` algorithm. The rendered client document and its hash travel in
the version payload so the exact exported bytes can be checked.

Two documents: `03-business-commitments.md` for Outcome A, `03-outcome-x-return.md` for Outcome X.

## Deliberate differences in the Auth port

- Filesystem runs and the Trigger waitpoint mirror are replaced by the shared SQL repository, the
  durable job runner and the committed outbox, as with M01/M02/M04. No per-stage mirror is added.
- Legacy sync read seams exist only for the legacy M04 mutation lock. Auth's M04 already reads SQL,
  so no synchronous variants are introduced.
- Legacy shared mutable zod defaults (`X.default(X.parse({}))`, `.default({})`, `.default([])`) are
  **not** reproduced: every mutable default is a lazy factory. The M02 defect fixed on 29 October
  is the precedent.
- Legacy's separate `confirmedBy` name field is replaced by the authenticated actor, matching
  M01/M02/M04 in Auth. Attribution is the authenticated identity, not a typed name.
