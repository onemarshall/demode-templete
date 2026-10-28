---
id: FW_24-Commercial-Direction-Contract
title: Commercial Direction and Controlled-Cycle Contract
description: Governs Commercial Direction, its selected horizon, implementation portfolio and controlled-cycle boundaries.
type: framework
version: 2.4
last-updated: '2026-10-04'
status: active
depends-on:
- 00-Shared-Contracts
- FW_04-Anchor-Contract
- FW_23-Client-Output-Contract
feeds-into:
- 11-Prompt
- 12-Prompt
- templates/Commercial-Direction-Generator-Prompt.md
- templates/Integrated-Executive-Report-Generator-Prompt.md
---

# Commercial Direction and Controlled-Cycle Contract

## Purpose

This contract governs the joined recommendation about the commercial direction a client business should hold over its selected directional horizon. It sits after the applicable M05–M10 strategy work and before M11 cycle planning. Twelve months is a common planning surface, not a compulsory Langfell duration.

It does not add a numbered module. It creates one client-facing authority record: **Commercial Direction**.

The record must be titled **Commercial Direction** and emitted as `Output/01-decision-pack/commercial-direction.md` under the resolved client folder, following `../templates/00-Entry-Brief-Folder-Convention.md`. It is the concise, client-readable authority for the selected directional horizon, including the implementation portfolio and commercial sequence. Commercial Direction remains the name of the decision it governs. The Executive Strategic Report remains the senior narrative front door and must preserve the record's essential decisions; it does not replace or conceal the record.

## Authority boundary

Commercial Direction owns these decisions for the selected directional horizon:

- business outcome;
- priority audience subset and buying situation;
- required commercial movement;
- recommended strategic route;
- three to five joined strategic moves;
- strategic sequence and progression gates;
- exclusions and deferred alternatives; and
- conditions for confirmation, revision or invalidation.

It selects within M04 RouteAuthorization, M05 identity and the applicable M06–M10 domain authorities. It may not redefine their locked fields.

Commercial Direction also owns the **implementation portfolio**: the material M05–M10 implementation consequences selected for the joined commercial direction, their classification and broad sequence. It may select and sequence inherited consequences; it may not create a new domain consequence, production scope, Cost Driver or monetary estimate.

M11, client-facing **Commercial Cycle 01**, owns only the selected first-phase consequences' quantities, operational targets, capacity assumptions, ownership commitments, thresholds and controlled-cycle commitments. M12, client-facing **Working Cycle 01**, owns weekly dates, dependencies, scheduling and tracking. M12 preserves M11's exact quantities, ownership commitments, route, proof actions and thresholds. The integrated report renders these decisions and creates none of them.

## Starter-plan inheritance

Apply `FW_41`. Consume relevant recommended functional Starter Plans as derived views of source-owned implementation consequences, not accepted commitments. Select their consequences through the existing portfolio and preserve disposition, evidence and dependency boundaries. After Direction acceptance, emit the derived Business Priorities Starter Plan. M11 resolves cross-functional first-phase choices; M12 produces one joined working plan. Neither a Starter Plan nor its Required class grants adoption, production, spend or release.

## Planning-horizon and cycle-selection rule

The system connects a durable business basis, a broader directional horizon, a controlled commercial cycle, an operating rhythm and an evidence-led review. It does not treat a shorter cycle as the whole strategy, or a longer direction as a detailed operating calendar.

Select the directional horizon and controlled-cycle horizon for the decision at hand. Assess decision materiality, reversibility, evidence velocity, dependency horizon, capital exposure, operating complexity, market velocity, governance requirement and learning value. Explain why the selected cycle is proportionate. A 90-day cycle may be selected where it fits the evidence and decision cadence; it is never a universal rule.

The record must distinguish:

- **Durable business basis** — decisions that remain stable unless material evidence challenges their owning source.
- **Longer-term ambition** — only client-supplied or approved future context; do not manufacture a vision, forecast or enterprise plan.
- **Current commercial direction** — the current best route and selected horizon.
- **Controlled near-term commitment** — the first selected cycle, its evidence purpose and its review event.

At review, classify the affected decision as confirmed, strengthened, qualified, adapted downstream, returned upstream or stopped. A cycle ending does not itself reopen the Foundation, core buyer, offer, commercial model, approved position or claims boundary. It may change route priority, channel emphasis, sequence, proof emphasis, implementation timing, capacity allocation or next-cycle commitments within the authority of their source.

### Nested horizons and authority boundary

Where material, the same logic permits nested horizons: client-supplied longer organisational context; a commercial or communication direction; portfolio or programme direction; controlled cycles for relevant workstreams; and weekly, monthly or milestone operating rhythms. Different workstreams may run at different speeds. Scale governance depth with materiality and complexity; do not manufacture enterprise bureaucracy for a smaller client.

The client retains sector knowledge, operating reality, regulation, internal economics, constraints, objectives and operating evidence. Langfell governs the agreed decision architecture, connected strategic judgement, cross-discipline coherence, inheritance, evidence/assumption separation, decision boundaries, handoff logic and claims integrity. Specialists retain disciplinary judgement. Leadership retains material acceptance, investment and risk decisions. The system may identify a contradiction, propose options and assemble a decision record; it may not approve a direction, infer missing ambition, commit investment or replace client domain authority.

Adaptation is not drift. A change is permitted only when evidence, changed conditions, an authorised reconsideration or a defined return condition warrants it. Drift occurs when a still-valid decision is silently reinterpreted, reconstructed or changed because its authority did not travel. Avoidable reconstruction must be corrected by restoring the source and handoff; responsible reconsideration returns to the owning decision.

## Required record

The client-visible approval record contains:

1. scope, selected directional horizon, evidence cut-off and upstream versions.
2. one recommendation.
3. the directional outcome, priority audience, buying situation and required commercial movement.
4. the recommended route, credible alternative and trade-off.
5. three to five strategic moves.
6. a compact sequence and review gates, with the current cycle concrete and later phases conditional.
7. exclusions and deferred alternatives.
8. dimension-specific evidence, risks and invalidating conditions.
9. client decision, what approval authorises and the next review trigger.
10. why the route is proportionate to the live decision, which material uncertainty it reduces and which evidence could reopen it.
11. the implementation portfolio and its broad commercial sequence.

The full field contract and acceptance criteria live in `../dev/Langfell-Strategy-Layer-Upgrade-Specification-v2.md` until the implementation closes. This framework file owns the runtime authority boundary.

The record is an approval register, not a second report. Keep each field concise. Do not repeat the report's full diagnosis, domain implications or narrative roadmap. The record may retain a compact sequence because progression gates are part of the decision being approved. Put the board-level diagnosis, comparative argument and domain explanation in the Executive Strategic Report. Keep exact IDs, source versions, machine lifecycle state and any fuller structured authority fields in non-rendered frontmatter or the run manifest.

For each material inherited consequence, classify it as **Active / First Phase**, **Next**, **Later**, **Conditional**, **Excluded / Not Now**, or **Not Required**. Record its upstream reason, commercial job, dependencies, evidence state, material capacity/cost considerations and strategic owner. Sequence work using the selected horizons; 0–90 days, 3–6 months and 6–12 months are useful defaults where proportionate, not required calendar bands. A 12–24 month horizon is conditional and appears only where it exposes a material future decision; use evidence and progression conditions rather than false date precision.

## Separate state axes

Do not collapse recommendation, evidence and permission.

| Axis | Allowed states |
| --- | --- |
| Strategic decision | `draft`, `recommended`, `client-approved`, `client-overridden`, `revision-required`, `superseded` |
| Evidence | dimension-specific; at minimum `absent`, `hypothesis`, `observed`, `tested`, `contradicted` |
| Execution permission | `analysis-only`, `evidence-gathering`, `pilot-only`, `controlled-90-day`, `wider-execution`, `blocked` |

`controlled-90-day` is a retained compatibility label for controlled-cycle execution permission. It does not mandate a 90-day duration; the recorded selected cycle determines the horizon. No permission may be inferred from the label alone.

A client-approved direction may still require evidence gathering before wider execution. Normally that evidence is gathered inside the selected controlled first cycle. A separate Pilot is optional and exists only when the Commercial Direction explicitly requires a smaller pre-commitment test.

Render those controls for the client as:

- **Document state:** complete / in production / incomplete.
- **Decision state:** recommended / accepted / revised / declined.
- **Evidence state:** hypothesis / observed / commercially evidenced / outcome evidenced.
- **What this decision authorises:** a plain-English description of the work that may now begin.

Do not print `direction_id`, move IDs, `analysis-only`, `locked`, `RouteAuthorization` or machine field names in the record body.

In client-file frontmatter use `client-decision-state`, never `decision-status` or a bare `status`. Keep source authority separate as `source-authority-state`; a locked source does not make the direction accepted. Put detailed execution permission and lifecycle state in the run manifest unless the client needs the translated effect in the body.

## Required lifecycle

The authorised human decision owner is the founder where applicable. Record the owner and the exact decision and permission granted; a role title or this lifecycle does not establish authority.

```text
applicable M05-M10 outputs
-> Recommended Commercial Direction
-> authorised human decision owner accepts / revises / overrides / returns upstream
-> M11 selected controlled first-cycle plan
-> M12 coordination
-> confirm / qualify / revise / invalidate at the named review event
```

The record must choose evidence gathering, controlled first-cycle execution, an optional pre-cycle test, local specialist or no action. It must name the evidence event required for stronger permission.

## Input and provenance requirements

Applicable M05–M10 handoffs provide a `commercial_direction_contribution` containing:

- decisions the direction must inherit;
- options the direction may select;
- fields it may not reopen;
- evidence and confidence;
- strategic implications;
- invalidation triggers; and
- non-applicability reason where relevant.

The Commercial Direction itself provides:

- `direction_id` and version;
- exact upstream IDs and versions;
- directional horizon, horizon rationale, longer-term ambition context where supplied, and priority buying situation;
- strategic route and move IDs;
- current controlled-cycle objective, horizon, evidence purpose and review event;
- later-phase progression gates;
- first evidence assumption, review event and permission;
- exclusions, risks and evidence states;
- authorised human decision owner event (founder where applicable); and
- downstream invalidation map.

Do not generate a separate `Commercial-Direction-Handoff.md`. Exact upstream IDs, hashes, privacy, lifecycle and invalidation controls live in the run manifest or a non-client provenance record. The client receives the Commercial Direction alongside the Executive Strategic Report; internal transport plumbing is never exposed.

## Optional pre-cycle evidence test

When a smaller test is genuinely required before the selected controlled cycle, it must reference one direction version and return one of:

- `confirm`;
- `qualify`;
- `revise`;
- `invalidate`; or
- `return-upstream`.

The effect creates a new direction version or an explicit confirmation event. It may use the existing Pilot method internally, but no separate Pilot document is generated by default and it is never presented as Commercial Direction. Silent mutation is prohibited.

## M11 entry gate

M11 must refuse a lock when the Commercial Direction is absent, stale, contradictory or lacks a recorded decision by the authorised human decision owner and usable execution permission. A non-binding draft may be used to preview the controlled first-cycle plan. A separate pre-cycle evidence record is required only when the Commercial Direction explicitly makes it an entry condition.

M11 must preserve the direction's outcome, audience, route, strategic moves, first-phase job, exclusions and progression condition.
M11 may activate only implementation consequences classified **Active / First Phase** by the current Commercial Direction. If a required asset, capability or investment is absent from that selection, it must return to Commercial Direction or the owning source module; M11 cannot create it locally.

## Invalidation

A material change to scope, directional outcome, priority audience, required movement, route, strategic moves or progression conditions must identify and stale affected evidence records, initiative records, M11 plans, M12 schedules, briefs and assets.

## Client-output rule

The client must be able to identify the recommendation for the selected directional horizon, strategic moves, sequence, exclusions, selected first cycle and change conditions without opening module documents or learning the internal architecture.

The Executive Strategic Report may explain that direction and the Executive Strategic Presentation may present it live. Both must preserve the Commercial Direction's exact route, moves, portfolio, sequence, exclusions, progression conditions and decision state. Neither may become a competing Commercial Direction authority.

Any numerical outcome or progression threshold must include a short rationale: why that number is useful now, what it can show, and what it cannot prove. Planning assumptions must not be presented as forecasts or statistical validation.

The Commercial Direction must not justify value through the number of stages, documents or views produced. It states the capability created by the joined direction, the material uncertainty reduced, the accepted trade-off and the evidence that will reopen the decision. Engagement fee logic belongs in the Engagement Value and Scope Record and must follow decision stakes, organisational and stakeholder complexity, route breadth, research and evidence burden, handoffs, activation support and review duration. Use client-supplied or explicitly modelled figures; never invent ROI.

## Version notes

### Version 2.4 — 4 October 2026

- Reconciled remaining fixed-duration requirements with the selected directional horizon and controlled cycle; retained `controlled-90-day` as a compatibility label.
- Named the authorised human decision owner (founder where applicable) and required the exact recorded decision and permission without inferred authority.
- Corrected the client output destination and completed the metadata description; clarified required-record prose without changing fields or ownership.

### Version 2.2 — 22 August 2026

- Replaced the fixed twelve-month / first-quarter assumption with a selected directional-horizon and controlled-cycle rule.
- Made the stable-versus-adaptable boundary and review outcomes explicit, without changing upstream approval or execution permissions.

### Version 2.1 — 21 August 2026

- Promoted the Commercial Direction to a visible client authority at `commercial-direction.md` because its implementation portfolio and commercial sequence are client decisions, not internal transport detail.
- Retained the Executive Strategic Report as the senior narrative front door and the run manifest as the location for machine provenance and lifecycle control.

### Version 2.0 — 21 July 2026

- Classified the Commercial Direction as an internal system authority stored at `_internal/commercial-direction.md`.
- Removed the record from the normal client package and retained the Executive Strategic Report as the complete senior-client representation.
- Limited disclosure of the record to an explicit governance or audit need.

### Version 1.9 — 21 July 2026

- Made `_internal/commercial-direction.md` the reader-facing authoritative filename and retired the former `Commercial-Record.md` alias.
- Required all dependent plans, reports, presentations, manifests and validators to reference the same filename.

### Version 1.8 — 21 July 2026

- Renamed the visible approval layer to Commercial Direction while retaining `_internal/commercial-direction.md` as the stable technical filename.
- Made the record an internal or advanced formal trace rather than a second mandatory senior-client read.
- Required the Executive Strategic Report to carry the record's essential decisions.

### Version 1.7 — 17 July 2026

- Added proportionality, uncertainty-reduction and capability requirements to the Commercial Record.
- Connected fee logic to the separate Engagement Value and Scope Record rather than document count.

### Version 1.6 — 16 July 2026

- Required the joined consultancy presentation to preserve the Commercial Record exactly while remaining a non-authoritative delivery rendering.

### Version 1.5 — 16 July 2026

- Renamed the client-visible authority record and required output file to `Commercial Record` / `_internal/commercial-direction.md`.
- Preserved Commercial Direction as the name of the governed strategic decision.

### Version 1.4 — 14 July 2026

- Made client-file metadata unambiguous and separated controlled source authority from client acceptance.
- Required recommended directions to remain recommended throughout the rendered record until the client decision event occurs.

### Version 1.3 — 14 July 2026

- Reduced the client-visible Commercial Record to the fields needed for approval and review.
- Removed repeated diagnosis and domain explanation from the approval record while retaining a compact evidence-gated sequence.

### Version 1.2 — 14 July 2026

- Defined the Commercial Record as a concise client approval register rather than a second narrative report.
- Added the client-visible state vocabulary and internal-language exclusions.
- Required a reason and evidence boundary for material numerical thresholds.
