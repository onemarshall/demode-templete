---
id: business-foundation-approval-record-template
title: Business Foundation Approval State Schema
description: Transient runtime control.
type: runtime-schema
version: 2.1
last-updated: '2026-10-02'
status: active
depends-on:
- ../framework/FW_28-Business-Foundation-Document-Contract.md
- Business-Foundation-Document-Template.md
feeds-into:
- ../04-Viability-Check/04-Handoff-Pack.md
- ../05-Brand-Strategy/05-Prompt.md
---

# Business Foundation Approval State — [Business]

> Transient runtime control. Do not render this as a standalone production file. Persist the exact version/hash, decision owner, date, exact response, gate states and any required participant evidence compactly in `RUN-MANIFEST.md`.

## Identity and source trace

- **Business Foundation file:** [path]
- **Input assessment:** [runtime assessment ID / date]
- **Version / hash:** [version and hash]
- **Foundation ID / creation state:** [ID / state]
- **M01 authority:** [ID / version]
- **M02 authority:** [ID / version]
- **M03 authority:** [ID / version]
- **M04 Handoff / RouteAuthorization:** [ID / version / state]
- **Facts and offer authorities:** [IDs / versions]
- **Offer form:** [classification / evidence]
- **Explanatory dependency:** required / helpful / not-required / unresolved
- **Operating model state:** not-applicable / proposed / approved / unresolved
- **Rendered at:** [date]
- **Input assessment ID / state:** [ID] / not_started / collecting / assessment_in_progress / passed / remediation_required / blocked / awaiting_owner_decision / stale / superseded

## Structural fidelity

| Test | Result | Evidence / return path |
| --- | --- | --- |
| All required business-definition fields present | passed / failed | [evidence] |
| Input assessment passed without invention | passed / failed | [evidence] |
| Familiar business or purchase form is clear | passed / failed | [evidence] |
| Buyer, user, buying trigger, customer receipt and delivery are concrete | passed / failed | [evidence] |
| Facts, approved decisions, hypotheses and unknowns remain distinct | passed / failed | [evidence] |
| Every field traces to its owning source | passed / failed | [evidence] |
| Established business position recorded; no new upstream decision or brand positioning, marketing, sales, website or visual strategy introduced | passed / failed | [evidence] |
| Offer form and explanatory dependency are correctly classified | passed / failed | [evidence] |
| Required operating mechanism is present, simplest accurate and source-backed | passed / failed / not-applicable | [evidence] |
| Customer value, operating mechanism and full methodology are distinct | passed / failed / not-applicable | [evidence] |
| Business Manifesto is derived from the preceding Foundation without invention | passed / failed | [evidence] |
| Governing Declarations trace to the manifesto and named upstream sources | passed / failed | [evidence] |
| Manifesto preserves evidence strength, qualifications and claims boundaries | passed / failed | [evidence] |
| Established business position, manifesto, Brand Story, brand positioning and campaign jobs remain distinct | passed / failed | [evidence] |
| No generic category description substitutes for the actual business | passed / failed | [evidence] |
| Module 05 can inherit without redefining the business | passed / failed | [evidence] |
| Every load-bearing declaration has a current confirmed Meaning Record | passed / failed | [record IDs / return path] |

## Client approval

- **State:** draft / review_required / revision_requested / source_disputed / upstream_reopen_required / approved / approval_withdrawn / stale / superseded / invalid
- **Approver and authority:** [name / role]
- **Prompt used:** Have we correctly understood this business? Is this where the business is prepared to stand?
- **Business-definition confirmation:** [verbatim; normally `Yes, this is our business`]
- **Manifesto confirmation:** [verbatim; normally `Yes, this is where we stand`]
- **Meaning Record confirmation:** [IDs / exact response confirming each load-bearing meaning, or return path]
- **Exact response:** [verbatim]
- **Decision date:** [date]
- **Revision requested:** [none or detail]

## Representative-reader validation

Use a person who has not read the source modules or been coached before the test. A familiar-category business requires at least one participant. An explanatory-dependent, unfamiliar or proprietary-category business requires two independent participants: one plausible buyer-side reader and one employee, supplier or implementation-side reader.

Repeat this block for each required participant.

- **Participant / relationship:** [record]
- **Read only this version:** yes / no
- **Unaided repeat-back before questions:** [verbatim]
- **Could state what the business is:** passed / failed
- **Could state what customers can buy now:** passed / failed
- **Could identify who pays and who uses it:** passed / failed
- **Could state what causes the purchase:** passed / failed
- **Could state what the customer receives:** passed / failed
- **Could explain how it is delivered or used:** passed / failed
- **Could state the practical outcome without a generic transformation claim:** passed / failed
- **Could state why it exists:** passed / failed
- **Could distinguish it from an adjacent type of business:** passed / failed
- **Could identify what is available now and what is not:** passed / failed
- **Could explain how the offer creates customer value:** passed / failed / not-applicable
- **Could distinguish the operating mechanism from the full methodology:** passed / failed / not-applicable
- **Could explain it accurately to another person:** passed / failed
- **Exact repeat-back:** [verbatim]
- **Phrase repeated but not understood:** [none or verbatim]
- **Incorrect assumptions or points requiring founder correction:** [verbatim or none]
- **Failure classification / return path:** [expression / source / authority / none]

## Engagement inheritance check

Complete this internally with the Module 05 delivery operator. Use only `inherited`, `open for Brand Strategy` or `return upstream`.

| Field | Classification | Exact inherited definition or return path |
| --- | --- | --- |
| Business form and familiar category | [state] | [definition / source] |
| Current offers and status | [state] | [definition / source] |
| Customer, payer, user and purchase context | [state] | [definition / source] |
| Practical outcome | [state] | [definition / source] |
| Delivery or use model | [state] | [definition / source] |
| Business model and material constraints | [state] | [definition / source] |
| Founder belief and fixed commitments | [state] | [definition / source] |
| Source-backed distinction | [state] | [definition / source] |
| Claims and evidence boundaries | [state] | [definition / source] |
| Fixed, open and unknown decisions | [state] | [definition / source] |
| Current route and scope | [state] | [definition / source] |

- **Operator / relationship:** [record]
- **Any business-definition field marked `open for Brand Strategy`:** yes / no — [why it is genuinely a brand decision]
- **Any field marked `return upstream`:** yes / no — [owner / path]
- **Operator supplied a substitute answer:** yes / no
- **Inheritance-readiness decision:** pending / passed / failed

## Independent system validation

- **Independent inheritance operator / relationship:** [record or pending]
- **Independent-inheritance validation state:** pending / passed / failed
- **Representative-reader state:** pending / passed / failed
- **Permitted claim:** [none / independently comprehensible / clean-room transferable]
- **Public-exemplar state:** blocked / open

These fields validate the system and its transferability. They do not add a client approval event or block private engagement progression after the engagement inheritance check and client decisions pass.

## Gate decision

- **Client approval state:** pending / approved / revision-requested
- **Input sufficiency state:** passed / remediate / blocked
- **Representative-reader state:** pending / passed / failed
- **Inheritance-readiness state:** pending / passed / failed
- **Independent-inheritance validation state:** pending / passed / failed
- **RouteAuthorization state:** [state]
- **Downstream gate state:** blocked / open
- **Release readiness state:** blocked / open
- **Decision owner:** [owner]
- **Decision date:** [date]
- **M05 generation permission:** denied / provisional / granted

The development gate is `open` when the engagement conditions in FW_28 Section 4 pass. The delivery operator's inheritance result protects live progression. Representative readers and an independent repeat protect system-validation and public-exemplar claims; they do not block private delivery, accepted downstream strategy or separately governed production.

## Change and invalidation record

| Date | Event | Changed field / owning source | Old / new version | Affected / unaffected dependants | Regeneration decision |
| --- | --- | --- | --- | --- | --- |
| [date] | [event] | [field / source] | [versions] | [IDs] | pending / approved / refused |

Approval applies only to the exact version/hash above. Withdrawal, staleness, supersession or invalidity closes reliance and generation permission. No dependant is regenerated automatically.

## Version notes

### Version 2.0 — 20 August 2026

- Added structural trace and role-boundary checks for the Business Manifesto.
- Required the exact client approval event to confirm both the business definition and where the business stands.

### Version 1.7 — 24 July 2026

- Added the full approval lifecycle, exact object identity and material-change/regeneration record.

### Version 1.5 — 20 July 2026

- Separated the engagement inheritance check from independent system validation.
- Removed technical validation records from the client decision path.

### Version 1.4 — 19 July 2026

- Separated provisional Module 05 development permission from release readiness.
- Moved the Brand Inheritance Test into Module 05 Phase 0.

### Version 1.3 — 17 July 2026

- Added the multi-reader rule for unfamiliar and explanatory-dependent offers.
- Added unaided repeat-back evidence and the field-by-field Brand Inheritance Test.

### Version 1.2 — 17 July 2026

- Added the separate input-assessment identity and gate state.
- Expanded the representative-reader test to the transaction, buyer, trigger, delivery, availability and adjacent-category questions.

### Version 1.1 — 15 July 2026

- Added offer-form, explanatory-dependency and operating-model state.
- Added structural and human tests for customer value, operating mechanism and fuller methodology.
