---
id: business-foundation-document-generator-prompt
title: Business Foundation Document Generator Prompt
description: Create a source-complete Business Foundation for exact-version client review.
type: output-template
version: 2.8
last-updated: 2026-10-04
status: active
depends-on:
- ../framework/FW_28-Business-Foundation-Document-Contract.md
- ../framework/FW_14-Distillation-Cycle.md
- ../framework/FW_27-Editorial-Readability-and-Purposeful-Framework-Contract.md
- ../framework/FW_33-Commercial-Foundation-Evidence-and-Build-Permission-Contract.md
- Business-Definition-Input-Assessment-Template.md
- Business-Foundation-Document-Template.md
- Business-Manifesto-Generator-Prompt.md
- Business-Foundation-Approval-Record-Template.md
---

# Business Foundation Document Generator Prompt

Use this prompt to explain the business from its current assessed sources and prepare the complete Foundation for client review. Keep the client explanation and the private control record separate.

> **Client paths:** Before reading inputs or writing outputs, resolve the selected client using `00-Entry-Brief-Folder-Convention.md`. Its Input, Output, collection, asset and private run destinations override legacy flat output examples. Keep existing authority and approval gates unchanged.


## Whole-document completion gate — required

Apply `../framework/FW_39-Instruction-Fidelity-and-Whole-Document-Completion-Contract.md`. Before presenting a Foundation candidate, record every applicable prompt, contract, template and reference instruction in the Instruction Compliance Register and verify its complete client document against the Document Coverage Map.

## FW_32 Foundation Use Contract — required

Apply `../framework/FW_32-Strategy-Accountability-Implementation-and-Decision-Support-Contract.md`.

After the exact Business Foundation is approved, create one source-owned Foundation Use Contract without reopening its business-definition fields. The contract identifies the exact Foundation decision and version; accurate uncoached explanation; downstream inheritance; use in one real brief or decision; founder reconstruction; contradictory briefing; implementation proof; evidence owner; smallest useful baseline state; earliest review; minimum evidence; strong, partial and weak next decisions; attribution ceiling; and invalidation and strategic return conditions.

The contract tests transfer and use, not whether the Foundation guarantees a business result. Keep production, publication, budget and spend approvals separate.

Assess the current, exact Module 01–04 authorities and named facts sources before generating `business-foundation.md`. Perform the input assessment and approval checks as transient runtime state. Persist source lineage, hashes, assessment, approval, route, lifecycle, gate and permission controls in `_internal/RUN-MANIFEST.md`; do not place them in the client document.

## Required two-document boundary

Render exactly two output classes:

1. **Client Foundation — `business-foundation.md`:** portable `title`, `description`, `order`, `document-type`, version/date and reader-facing candidate or approval state. Its body explains the business, decisions, evidence limits, portfolio architecture and complete Business Manifesto. It has no H1 and no internal identifiers, hashes, source maps, assessment, route, lifecycle, gate or generation controls.
2. **Internal run record — `_internal/RUN-MANIFEST.md`:** exact source receipt and hashes, per-section lineage, input assessment, Conviction Audit, Foundation Implications, Meaning Records, approval evidence, route, lifecycle, gate, permission, validation and invalidation controls.

Every client H2 is a major reading movement. Render `---` on the very next line below every client H2, with no intervening blank line and normal spacing after the rule before its content. This is a client-document convention only: do not impose it on the internal run record or other control artifacts.

Apply the `FW_27` block-quote label style everywhere it is used: write `> **Label:** explanation`, never `> **Label**: explanation` or a fully bold explanatory sentence.

Refuse the rerun if either document is incomplete, stored in the wrong place or contains material intended for the other. Move private controls to their record while preserving the required client explanation and complete canonical manifesto.

## Governing questions

> **Have we correctly understood this business?**
>
> **Is this where the business is prepared to stand?**

Explicitly record the established business position from the assessed M01–M04 and named source authorities: audience, offer/work, relevant customer value, distinctive commitments, governing belief/stand, and choices/constraints. Join these in the existing Foundation sections with their source and evidence limits. Do not independently invent missing positioning decisions, change an approved business choice, or produce public positioning copy. Brand positioning, marketing, sales, website expression and visual decisions develop downstream within this approved position. The required Business Manifesto declares its governed stand; it is not a substitute for audience, offer, value or difference.

## Required inputs

- approved Engagement Brief exact path/version, factual business identity, people/authority, current situation, requested work, naming/identity state, scale/commercial context, constraints and known unknowns;

- Module 01 conviction elements, Core Belief, founder language and founder understanding;
- Module 02 served group, evidenced need, market language and evidence state;
- Module 03 practical outcome, distinctive commitment, proof commitments and strategic choices;
- Module 04 business basics, products/services, business model, current route, constraints and RouteAuthorization;
- where adopted and current, the exact approved Commercial Foundation version/hash, Conclusion IDs, qualifications, expiry and reliance ceiling;
- current facts, offer and evidence authorities where applicable; and
- Entry Brief offer form, what the customer is buying, explanatory-dependency answer, existing operating model and its state; and
- Entry Brief run scope and portfolio/offer architecture: the full relevant portfolio, role and status of each offer, primary current offer, material relationships and product-local boundaries; and
- exact IDs, versions, states and approval owners.

Refuse a final render unless the assessment state is `passed`. Missing, partial, stale, unsupported or contradictory material remains visible and routes to its field owner. A non-binding draft may be produced only when explicitly permitted, and it must keep generation and downstream permission blocked.

An adopted Commercial Foundation supplies bounded commercial conclusions; it does not replace M01–M04 field ownership or prove current Product Positioning. Use only named Conclusion IDs inside their qualifications. If the Commercial Foundation is absent or not adopted, record that state and do not infer its conclusions from a candidate or pilot file.

## Generation method

1. Create the Business Definition Input Assessment. First verify the approved Engagement Brief and inherit its factual business identity without strategic reinterpretation. Then test the familiar business form, run scope, current offer and status, full relevant portfolio and offer architecture, payer and user, buying trigger, customer receipt, delivery, commercial model, operating market, practical outcome, founder commitments, distinction, evidence, explanatory mechanism where required and unresolved questions.
2. Classify each input as `sufficient`, `partial`, `missing`, `conflicted` or `not-applicable`, and its basis as fact, approved decision, supported hypothesis, unsupported assertion or unknown.
3. If the assessment does not pass, return focused questions to the owning source. Do not hide the gap inside polished prose.
4. Build and persist per-section lineage mapping each required field to its owning source, exact version, basis and limitation in `_internal/RUN-MANIFEST.md`. Translate only reader-relevant evidence limits into the client Foundation.
5. Resolve no contradiction locally. Return a conflict to the owning authority.
6. Write the factual business identity from the Engagement Brief in ordinary language before deeper belief, commitment, commercial judgement or manifesto material. A new reader must immediately understand who the business is, what kind of company it is, what it does, whom it serves, where it operates, how established it is and what is currently being built or changed.
7. Open with two to four short sentences in `The business in plain terms`, then complete the at-a-glance fields. Do not force purpose, audience, mechanism and outcome into one sentence.
8. Render the template's concise `Portfolio and offer architecture` section. State whether the Foundation covers the whole business, a brand portfolio or an individual offer. For a whole-business or portfolio run, include the full known portfolio and every item's role, current status, primary-current-offer relationship and material boundary. For an individual-offer run, identify the wider portfolio only as far as needed to explain that offer's role and constraints. Do not turn the section into product briefs: keep specifications, detailed scope, delivery design and launch plans in individual product documents.
9. For an unfamiliar or proprietary category, anchor the explanation to a familiar purchase form, customer job or service before introducing the proprietary term.
10. Use the template's reading architecture in order: Executive Overview, strategic foundation and governing decisions, Business Manifesto, exact-version approval.
11. Classify the offer as service, physical product, software, platform, methodology or intellectual system, licensed intellectual property, or hybrid/portfolio. Treat the Entry Brief as a routing signal, then verify the classification against the sources.
12. Run the explanatory-dependency test: `Would a capable new reader misunderstand what the customer is buying or how customer value is created without knowing how the offer works?`
13. When the answer is `yes`, include `How the business works` and keep three layers explicit:
   - **Customer value:** why the customer cares and the practical outcome.
   - **Operating mechanism:** the simplest accurate, memorable model of how the offer creates that value.
   - **Full methodology:** the deeper stages, gates, handoffs, evidence controls or disciplines that make the mechanism reliable.
14. For a methodology, intellectual system, proprietary process, licensed intellectual property or explanatory-dependent hybrid, presume the mechanism is required unless the sources demonstrate that the customer can correctly understand the offer without it.
15. If an exact operating model is source-supported but unapproved, include it as `proposed` for approval in this document. Do not require the model to be approved before the document whose job is to approve the business definition. If the sources do not support one accurate model or contain conflicting models, set it to `unresolved`, explain the decision required and keep the gate blocked.
16. Apply adaptive depth. It controls how much explanation the document needs; it cannot remove a load-bearing mechanism. Give a simple business a short document and a complex portfolio enough space to become intelligible without turning the document into a methodology tour.
17. Keep claims at the strength current evidence supports and keep facts, approved decisions, hypotheses and unknowns visibly separate.
18. Exclude taglines, message hierarchies, campaigns, channels, scripts, page architecture, design direction and execution plans. Do not mistake the required manifesto for permission to add any of them.
19. Before final Foundation prose is formalised, run `Business-Manifesto-Generator-Prompt.md` from the assessed M01–M04 sources and permitted adopted commercial evidence. Produce the Conviction Audit, eight-sentence Manifesto Spine, complete Business Manifesto, three to five Governing Declarations and Foundation Implications.
    - When a current canonical Business Manifesto is an approved source and no source-owner decision changes it, retain that declaration verbatim in the rerender. A Foundation amendment—for example, to portfolio or current-offer architecture—does not license compression, replacement or partial paraphrase of the canonical declaration.
20. If the Conviction Audit finds unsupported sentiment, or the Coherence Test finds a conflict between belief, commercial model, operating model, evidence or business definition, stop final rendering. Return each issue to its owning source. Do not rewrite the manifesto or Foundation locally to conceal it.
21. Use the Foundation Implications to formalise the final Foundation. Confirm that the business definition, purpose, belief, principles, audience, offer, decision rules, operating model and boundaries are compatible with the declaration. Do not let the manifesto invent any of those fields.
22. Reject a manifesto that invents a belief, cause, enemy, audience, offer, outcome, promise, proof claim or route; weakens an evidence qualification; becomes Brand Story or brand positioning copy; or could be published unchanged by a materially opposite competitor.
23. Run FW_14 hostile-reading and load-bearing-minimum checks, the twelve concrete business-definition tests and the Business Manifesto declaration tests in FW_28.
    - Apply FW_28's bounded authoring challenge: one fresh source-aware review, the smallest correction and one fresh recheck of affected meaning. Assess wrong conclusions as well as wording. Keep an honestly open decision separate from a drafting defect and final readiness separate from permitted provisional usefulness. Correct unsupported rendering from settled sources locally; return disputed source meaning and unresolved business choices to their owners. Retain first findings and corrections internally. A persistent material source problem stops finalisation; repeated polishing cannot resolve it. Present joined business choices together, without inventing additional per-field human approvals or representative-reader evidence.
24. Add the compact governed Foundation object, manifesto trace, resolved Foundation Implications, approval and gate state to `_internal/RUN-MANIFEST.md`, with an uncompleted engagement inheritance check. Leave client approval pending until the authorised person confirms both the business definition and the declaration. Leave representative-reader and independent-inheritance validation pending for the separate system-validation track.
25. State the capability created by an approved shared business definition, the routed downstream strategies that may inherit it and what client approval authorises. Do not turn this into public positioning or sales copy.
26. On material change, create an impact record and close generation. Reopen the owning source, rerun assessment, create a new Foundation version and seek exact approval. Never overwrite or silently regenerate a dependant.

## Pass question

Could a new employee, investor, supplier or client read only this document once and accurately explain what kind of business it is, what it sells, who buys it, what causes the purchase, what the customer receives, how it is delivered, its practical outcome, why it exists and what is available now? When explanatory dependency is required, could they also explain how the offer creates value and distinguish the operating mechanism from the fuller methodology?

Structural inspection may record that the inheritance fields are present. The Module 05 delivery operator sets `inheritance-readiness-state` after the engagement inheritance check without inventing or redefining a business field. A separate independent operator owns `independent-inheritance-validation-state`. Do not infer client approval, representative-reader evidence or independent validation.

Run `python3 dev/test-business-foundation-output-contract.py [run-directory]` before presenting the candidate. It must pass before founder review. When input sufficiency, structural tests 1–9, Business Manifesto declaration tests, exact-version client approval and RouteAuthorization pass, set `downstream-gate-state: open` in the internal manifest and permit Module 05. Keep system-validation states truthful and separate. Pending independent validation does not block private client delivery or downstream strategy; it blocks only independent-comprehension or transferability claims and public-exemplar use.

For that selected-client preservation check, persist `_internal/FOUNDATION-DECLARATION-SOURCE.json` as an internal source receipt: `source_path` (absolute or relative to this receipt), `source_sha256` (hash of exact source bytes), `manifesto` (complete selected source text), and `governing_declarations` (the three to five exact source declarations). Bind it to the actual source-owned manifesto candidate or approved source for this run, never to a different client's example or to text invented by the renderer. The cited source is a structured source-owned JSON record with complete `manifesto` and `governing_declarations` fields. For fields nested in an actual module output, add `manifesto_pointer` and `declarations_pointer` as JSON pointers to those complete fields. Do not create a shortened replacement source to satisfy the check. The validator checks current source bytes, complete selected fields and exact text preservation; it does not confer approval or validate the underlying evidence. A `Portfolio amendment` control is required only when the manifest records `change-type: portfolio_amendment`, not for every initial Foundation.

## Version notes

### 12 September 2026: upstream preparation and review

Clarified discovery readiness and bounded preparation under FW_28, with source ownership and human gates retained. Foundation authoring now distinguishes source errors, wording and honest unknowns through a bounded fresh challenge. Evidence and limitations are retained in the upstream proposition execution record.


### Version 2.3 — 24 August 2026

- Required a horizontal rule immediately below every client H2; kept internal and control artifacts outside that presentation convention.

### Version 2.2 — 24 August 2026

- Defined the enforced client Foundation versus internal run-record boundary and required the exact validator before founder review.

### Version 2.1 — 24 August 2026

- Required portfolio and offer-architecture assessment and Foundation rendering from the Entry Brief's run-scope declaration.
- Kept portfolio explanation at business-definition level and reserved product briefs for individual product documents.
- Required a canonical governing manifesto to be carried in full when an amendment does not change its source meaning.

### Version 2.0 — 20 August 2026

- Added one required Business Manifesto between assessed conviction work and final Foundation formalisation.
- Added Conviction Audit, Coherence Test and Foundation Implications as the return loop into the final Foundation.
- Required the same approval event to confirm both `Yes, this is our business` and `Yes, this is where we stand`.
- Added manifesto trace, no-invention, specificity, courage, claims and role-boundary checks.

### Version 1.7 — 24 July 2026

- Added fail-closed assessment states, per-section lineage and controlled change/regeneration.

### Version 1.6 — 20 July 2026

- Split the delivery operator's engagement inheritance check from the independent system-validation repeat.
- Removed representative readers and independent inheritance as recurring client progression gates.

### Version 1.5 — 19 July 2026

- Separated provisional M05 development permission from external release readiness.
- Assigned the Brand Inheritance Test to M05 Phase 0.

### Version 1.4 — 17 July 2026

- Required independent human completion of the Brand Inheritance Test instead of inferring inheritance readiness structurally.
- Expanded input assessment to founder commitments, offer status and explanatory mechanism.

### Version 1.3 — 17 July 2026

- Added the separate input-sufficiency assessment and fail-closed remediation route.
- Replaced the overloaded one-sentence opening with plain terms plus an at-a-glance transaction account.
- Added unfamiliar-category anchoring and the complete concrete business-definition test set.

### Version 1.2 — 17 July 2026

- Added capability-created, downstream-inheritance and approval-effect requirements.

### Version 1.1 — 15 July 2026

- Added offer-form classification and an explicit explanatory-dependency decision.
- Made adaptive depth govern detail rather than permission to omit a load-bearing mechanism.
- Required distinct customer-value, operating-mechanism and full-methodology layers for explanatory-dependent offers.
- Allowed a source-supported proposed model to be decided inside the Business Foundation approval gate.

<!-- Template maintenance 2.8, 2026-10-04: source/reader corrections and HumanWriting pass; see internal remediation record 28. -->
