---
id: business-definition-input-assessment-template
title: Business Definition Input Assessment Runtime Schema
description: Transient runtime control.
type: runtime-schema
version: 1.6
last-updated: '2026-10-02'
status: active
depends-on:
- ../framework/FW_28-Business-Foundation-Document-Contract.md
- ../framework/FW_33-Commercial-Foundation-Evidence-and-Build-Permission-Contract.md
feeds-into:
- Business-Foundation-Document-Generator-Prompt.md
- Business-Manifesto-Generator-Prompt.md
- Business-Foundation-Approval-Record-Template.md
- ../05-Brand-Strategy/05-Prompt.md
---

# Business Definition Input Assessment State — [Business]

> Transient runtime control. Use this schema to assess whether the current material is sufficient to define the business. Do not render it as a standalone production file; persist only the result, sources, material gaps and return decision in `RUN-MANIFEST.md`.

## Identity and source set

- **Assessment ID / state:** [ID] / not_started / collecting / assessment_in_progress / passed / remediation_required / blocked / awaiting_owner_decision / stale / superseded
- **Business:** [name]
- **Entry Brief:** [path / version]
- **Approved Engagement Brief:** [path / version / approval event]
- **Factual identity and decision authority:** [inherited fields / source IDs / unresolved limitations]
- **M01 authority:** [ID / version]
- **M02 authority:** [ID / version]
- **M03 authority:** [ID / version]
- **M04 authority and RouteAuthorization:** [ID / version / state]
- **Commercial Foundation:** [not adopted / absent / ID / version / hash / approval / adoption]
- **Commercial Conclusion IDs used:** [IDs / states / qualifications / expiry / reliance ceiling]
- **Facts, offer and evidence authorities:** [IDs / versions]
- **Assessed by:** [name / role]
- **Assessment date:** [YYYY-MM-DD]

## Sufficiency assessment

Assess the established business position across the existing audience, offer, outcome, distinction, belief and constraint rows. Existing authorised positioning may supply relevant choices after currentness/source/gate-equivalence review. No prior positioning document is required: partial or absent positioning is developed through the existing owning upstream modules. This assessment checks those decisions; it does not invent them. Facts, pricing, evidence and economic authority retain their named owners.

Use `sufficient`, `partial`, `missing`, `conflicted` or `not-applicable`. Classify the basis as `observed fact`, `approved decision`, `supported hypothesis`, `unsupported assertion` or `unknown`.

| Required business reality | State | Basis | Source evidence | Field owner | Smallest next action | Capability blocked |
| --- | --- | --- | --- | --- | --- | --- |
| Approved factual business identity, current context and decision authority | [state] | [basis] | [Engagement Brief / Entry Brief sources] | [owner] | [action] | [capability] |
| Familiar business or purchase form | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Products or services available now | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Payer and user | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Buying situation, need or trigger | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| What the customer receives | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| How the offer is delivered or used | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Commercial model and material constraints | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Operating market, geography and routes | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Practical customer outcome | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Source-backed distinction | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Founder belief, commitments and non-negotiables | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Evidence for material facts and claims | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Current, validating, planned, deferred and retired offer states | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Operating mechanism, when explanatory dependency is required | [state] | [basis] | [source] | [owner] | [action] | [capability] |
| Unknowns, contradictions and required decisions | [state] | [basis] | [source] | [owner] | [action] | [capability] |

## Contradictions and unknowns

| ID | Issue | Owning source | Why it matters | Required decision or evidence | Blocks final Foundation? |
| --- | --- | --- | --- | --- | --- |
| [BDI-01] | [issue] | [source] | [effect] | [action] | yes / no |

## Assessment decision

- **Input sufficiency state:** passed / remediation_required / blocked / awaiting_owner_decision
- **Decision reason:** [why]
- **Questions to resolve:** [list or none]
- **Return owners:** [M01 / M02 / M03 / M04 / facts authority]
- **Conviction Audit and manifesto route:** permitted / refused
- **Final Business Foundation render:** permitted only after manifesto coherence and Foundation Implications reconciliation / refused
- **Decision owner:** [name / role]

`passed` means enough reliable material exists to audit the governing convictions and define the business without invention. It permits the manifesto route; it does not establish the manifesto, approve the final definition or prove that a representative reader understands it.

Partial input may be summarised only as bounded working state with its limitations and owner. It cannot become a completed fact, approved Foundation field or downstream permission. Resume updates the same assessment event unless a material source version changed.
