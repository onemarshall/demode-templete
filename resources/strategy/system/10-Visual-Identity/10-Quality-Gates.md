---
id: 10-Quality-Gates
title: Module 10 Quality Gates
description: Client-language translation gate - Apply FW_27 before passing any client-facing output.
type: module-doc
version: 4.2
last-updated: '2026-10-02'
status: active
depends-on:
- framework/FW_41-Strategy-to-Action-Starter-Plan-Contract.md
- 10-Prompt
- 10-Strategy-Schema
- 10-Visual-Style-Framework
- 10-Visual-Practitioner-Brief-Prompt
- 10-Visual-Exploration-Pack-Prompt
- 09-Handoff-Pack
- 09-Strategy-Schema
- 05-Handoff-Pack
- 05-Strategy-Schema
- 04-Handoff-Pack
- framework/00-Shared-Contracts
- framework/FW_25-Consultancy-Judgement-Contract
- FW_08-Suite-QA-Gates
- FW_15-Upstream-Inputs-Hard-Gate
- FW_16-Discovery-vs-Translation-Modules
- FW_17-Cross-Module-Quality-Gates
feeds-into:
- 10-Handoff-Pack
- 10-README
- 10B-Visual-Asset-Generator
- 11-README
---

# Quality Gates

## Strategy-to-action starter plans

Apply `FW_41`. A relevant accepted strategy's output set includes its recommended source-derived Starter Plan, exact opening and eleven sections, current hash/decision/consequence/evidence trace, separate recommendation class and human lifecycle, supported roles/dependencies/assets, conditional campaign requirements and specialist handoff. Reject generic tasks, invented budget/capacity/owners/calendar precision, missing qualifications or strategy changes hidden in planning. A required recommendation class does not mean the plan has been adopted. Record non-applicability rather than filling an irrelevant section. Existing gates and release permissions remain in force; local structural passes do not prove specialist usefulness or client comprehension.

> **Client-language translation gate:** Apply `FW_27` before passing any client-facing output. Preserve the visual decisions but translate framework labels into plain business language; fail if a capable client cannot state what has been decided, why, what it changes and what would make it return.

## Visual translation gate — required

Before M10 passes, a competent designer must be able to explain the intended experience after one reading of the Canonical Strategy, without further explanation from the strategist. The direction must also leave room for different designers to produce materially different solutions.

Pass only when the document contains creative idea, immediate plain-language translation, one-sentence designer brief, intended experience, Brand derivation, characteristic translations, visual behaviours, tensions/anti-territories, creative freedom and practitioner handoff. For each characteristic, require intended feeling, Brand-specific meaning, Think and Not this. Fail adjective lists that leave the reader to decode meaning, literal treatment of an analogy, prescribed imagery masquerading as an example, faux-SaaS delivery surfaces, anonymous-minimal restraint or a rough/documentary reading of `working material`.

## FW_32 accountability gate

For every material accepted decision, require an exact decision ID, complete Implementation Consequences, non-monetary Cost Drivers and a Decision Measurement Contract with intended effect, implementation proof, baseline requirement, evidence, attribution ceiling, evidence owner, review decisions, stop condition and narrowest return point. Fail a monetary estimate or `derivable` driver when concept, application set or production standard is unresolved; fail revenue/conversion causation or collapsed direction/production/publication/budget/spend states.

## Editorial Readability Gate

Apply `FW_27`. Pass only when practical visual meaning precedes the client's direction and device labels, every creative tension has a use/avoid application and Layer 1–7 remains outside the primary path. A designer must be able to identify fixed choices, freedom and stop conditions without decoding methodology. Record structural evidence; keep cold-client and cold-designer checks `pending`.

The final-refinement concept gate requires unlabelled recognition of the client's accepted direction, purposeful devices, the scoped priority applications, accessible non-colour state cues where relevant and the client's intended character. A named style, device, media set or consultancy character from a worked example cannot govern another client. Strategy text alone cannot pass these concept-dependent checks; keep them `pending` until designed work exists.

## Runtime Derivation Boundary Gate

Pass only when the response uses exact accepted Module 05 anchors and the current RouteAuthorization, derives only the requested layer or artefact, and distinguishes fixed, flexible and unresolved decisions. Fail silent completion of later layers, a final style system, production specification or image prompts.

Aspirational or unapproved identity remains explicitly exploratory and cannot lock direction or brief production. Fail any visual choice presented as proof of quality, any unsupported proof claim, or category convention substituted for accepted identity. A compliant refusal returns to evidence-derived visual direction.

Stop and return language must state the boundary, reason and next decision plainly. Exposed internal gate names or a newly introduced method label fail the client-facing response.

## Strategy Multi-View Gate

For each routed Visual view, apply `FW_26`: verify standard metadata and state inheritance; preserve the creative recommendation, inherited obligations, visual ranges, operating modes, proof honesty, trade-off and accepted decision; require the Executive View to support leadership understanding without a second approval request; require a 7–10-slide narrative with speaker notes and source trace. Reject any implication that creative direction is final visual production.

Verify the visual direction reflects every fixed business-definition field in the approved Business Foundation, remains compatible with its Business Manifesto and expresses the canonical Module 05 strategy without redefining the business. It must give the worldview form rather than literalise declarations or create a competing belief system. A missing, stale or mismatched Business Foundation blocks the module and returns to the owning source.

## Module 10: Visual Identity

## Consultancy Judgement Gate

Pass only when the first page states the visual-investment recommendation; evidence and confidence are explicit; credible design routes have been compared; the accepted trade-off, client decision, conditions, owner, progression and invalidation are clear; and the complete Consultancy Decision Record has been checked transiently with its final state recorded compactly in `RUN-MANIFEST.md`. A moodboard menu, premature asset programme or blurred direction/production state fails `CMQG_05`.

Quality Gates check that outputs derive from conviction before they pass to the next module. They catch generic work before other modules build on it.

These gates track the **seven-layer derivation chain** (see `10-Visual-Style-Framework.md`). Each gate verifies one layer's output and confirms it traces to a verbatim upstream anchor. There is no "style selection" gate — selecting a visual position from the 12 named styles instead of deriving it is an automatic fail.

---

## How to Use Quality Gates

1. **Complete the layer** -- Run the relevant part of `10-Prompt.md`, generate the layer output
2. **Run the Quality Gate** -- Check all items for that gate
3. **If all pass** -- Proceed to the next layer
4. **If any fail** -- Revise before proceeding

**Complete every gate.** Check each layer’s derivation before downstream work makes corrections more costly.

## Client Output Gate

Before lock, verify the exact practical Visual Strategy headings in `FW_26`, the transient seven-layer derivation check and complete evaluation contract exist. Record only the compact pass/fail result and source hash in `RUN-MANIFEST.md`. A client must pass the ninety-second comprehension test without decoding layer names. Do not render approved derivatives before the canonical strategy is accepted and locked. After acceptance, `10-visual-strategy-practitioner-brief.md` must use Practitioner Brief V3 (`view-version: 3.0.0`, `format: Langfell-hybrid-practitioner-brief`) and apply `10-Visual-Practitioner-Brief-Prompt.md`: it must preserve the common spine and let a cold competent designer teach back the assignment, governing rule, six project-specific Visual Contract commitments, fixed/flexible/unresolved decisions, creative latitude, scope-appropriate routes, derived applications, evaluation, stop and change-control rules in five minutes. It must pass project-specificity, Visual Contract integration, no-new-strategy and shared-lock checks. `creative-direction-locked` must not be presented as `visual-system-locked`, production approval or publication approval. Internal control material in the primary client body or a default standalone internal file fails the gate.

### Visual Exploration Pack gate

After Visual Strategy lock, `<brand-or-project>-visual-exploration-pack.md` must apply `10-Visual-Exploration-Pack-Prompt.md`. Pass only when it inherits the exact primary source, version, lock and approval event; uses this client's six Visual Contract positions; derives categories and applications from current scope; supplies a reusable global prefix, two to four prompts per selected category, organising-device exploration where applicable, anti-reference prompts, a proportionate generation plan, keep/reject curation criteria, stylescape assembly and concept handoff; and clearly excludes final design and automatic image generation. Run source-fidelity, Visual Contract, client-specificity, exploration-not-execution, application-relevance, anti-reference, designer-usefulness, copyright-safety and stale-view checks. Generic “modern, clean, premium” prompts, named-artist imitation, copyrighted branded material, another client's vocabulary or any final-logo/final-identity request fails the gate.

**Response Path note:** under a Module 04 `RouteAuthorization` `Accept the Constraint` (lighter version) path, Gates 2–3 (Layers 4–5 numeric narrowing) are marked **N/A** — the module runs Layers 2–3 at principle level only, declares Expressive by default, and does not scale up 10B. Gates 1, 4, 5, 6, 7, 8 still apply.

---

## Cross-Module Canonical Gates Applied Here

The following canonical Quality Gates from `framework/FW_17-Cross-Module-Quality-Gates.md` apply to this module:

- **CMQG_01 Conviction Trace** — **yes.** Every layer output must trace back to Module 05's Brand Strategy (which carries Module 01 lineage via Module 03). Trace through the locked Module 05 Handoff Pack; do not read Module 01 directly.
- **CMQG_02 Claims Boundary Compliance** — **yes.** Every visual element that makes a public claim (proof imagery, certification marks, before/after compositions, results-display chrome, comparison visuals, photography subject choices) must fall within Module 01 / Module 05 Claims Boundaries. Visual overclaim is permanent.
- **CMQG_03 Upstream Acknowledgment Satisfaction** — **— (not applicable).** Per FW_17 per-module table, no R-pattern Acknowledgments from Module 02 Gate 5 are routed to Module 10. Any Acknowledgments inherited via the upstream chain pass through unchanged.
- **CMQG_04 Translation Trace** — **yes.** Every layer output (Layers 2–7 + Exploration Layer + Layer 7 artefact) must pair with a verbatim upstream anchor per the Per-Layer Source-Anchor Mapping table in `10-Prompt.md` Translation Discipline section. The seven-layer derivation chain is itself a structured implementation of CMQG_04.

Module-specific Quality Gates (below) cover tests unique to Module 10.

---

## Gate 0: Governance Check (Before Starting)

This gate has three parts. **Part A** (Completeness) checks that Module 05 has produced all required outputs. **Part B** (Anchoring) checks that those outputs are genuinely anchored rather than aspirational. **Part C** (RouteAuthorization) checks that the approved route and `generation_permission` permit the visual work. See `10-README.md` Gate 0 for the anchoring check in detail.

### Part A: Completeness (Is Module 05 Done?)

| Check | Pass | Fail |
| --- | --- | --- |
| Module 05 Brand Strategy complete (carries translated Core Belief + Positioning) | Strategy statement written | Missing or generic |
| Module 05 Brand Personality complete | 3-5 traits defined | Missing or generic |
| Module 05 Values complete | 3-5 values with meanings | Missing or generic |
| Module 05 Voice complete | Voice characteristics defined | Missing |
| Module 05 Filter complete | For/Not For defined | Missing |

### Part C: RouteAuthorization (Is the route approved and scope clear?)

| Check | Pass | Fail |
| --- | --- | --- |
| Module 04 RouteAuthorization present | `route`, `status`, `capability_profile`, `authorised_human_decision`, `decision_owner`, `closure_conditions`, `permitted_*`, `generation_permission` documented | Missing |
| `status` is `Approved` or `Overridden` | Visual system can lock | Route not approved — draft only |
| `generation_permission` matches intent | `publish-ready` for public 10B outputs; `draft-only` for non-public | Publish attempted without permission |

### Part B: Anchoring (Is Module 05 Anchored or Aspirational?)

| Check | Pass | Fail |
| --- | --- | --- |
| Brand Personality describes actual behaviour | Traits evidenced in operations/delivery | Traits the business wishes it had |
| Values describe actual operations | Values evidenced in how business behaves | Values the business aspires to |
| Voice reflects actual writing today | How the business actually sounds | How the business wishes it sounded |
| Filter reflects real trade-offs | Business has actually disqualified "Not For" group | Filter written but never applied |
| Brand Strategy references demonstrations | Specific operations/results cited | Manifesto without proof |

### Reading the Anchoring Verdict (Ternary, not Binary)

The five rows in Part B each produce a per-row signal: **Anchored** or **Aspirational**. Aggregate them:

| Pattern | Verdict | What to do |
| --- | --- | --- |
| All 5 rows Anchored | **Anchored** | Proceed. The visual identity derived will express real character — and to the extent the underlying conviction is itself distinctive, competitors can't copy it without adopting that conviction. Gate 0 confirms anchoring, not distinctiveness: a brand can be honestly anchored to generic convictions, and the chain will translate generic-in to generic-out. Distinctiveness comes from Module 01, not from Module 10. |
| 1–2 rows Aspirational, rest Anchored | **Partial** | Proceed **only** by deriving visual identity from the anchored rows. Aspirational territory is omitted from visual expression entirely — not flagged-and-shipped. The resulting visual identity will be quieter than ambition wants; that is the correct outcome. If that is not acceptable, treat as Aspirational. |
| 3+ rows Aspirational | **Aspirational** | **Stop.** Return to Modules 01–04, complete the gates properly, re-lock Module 05. |

**If Part A fails (Completeness):** Cannot proceed. Return to Module 05 and complete the missing outputs.

**If Part B verdict is Aspirational:** Cannot proceed. Do not build visual identity on aspirational brand identity — it is the most publicly damaging form of overclaim the framework can produce. Visual identity ships as a single unitary expression; there is no seam between the anchored and aspirational parts when the audience sees it.

**If Part B verdict is Partial:** Proceed under the strict scoping rule above. Visual identity must not overclaim what the business hasn't yet demonstrated. See `10-README.md` Gate 0 for the matching verdict structure.

---

## \* Gate 1: Layers 2–3 (Spatial Logic + Resonance Position)

### Layer 2 — Spatial Logic

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Focal logic stated as principle | Not jumped to specifics | [ ] |
| Containment stated as principle | How the brand holds/frames | [ ] |
| Breathing stated as principle | How the brand uses space/rhythm | [ ] |
| Each property opens with a verbatim Module 05 anchor | Quote precedes the derived statement | [ ] |
| Each statement names the quoted word(s) it derives from | Visible trace, not "captured in spirit" | [ ] |

### Layer 3 — Resonance Position (six binary pairs)

| Axis | Binary commitment made? | Names the quoted word(s) that compelled it? |
| --- | --- | --- |
| Warm / Cool | [ ] | [ ] |
| Spacious / Dense | [ ] | [ ] |
| Calm / Energetic | [ ] | [ ] |
| Restrained / Expressive | [ ] | [ ] |
| Clean / Raw | [ ] | [ ] |
| Focused / Layered | [ ] | [ ] |

**No-spectrum guardrail:**

> "Did any axis come out as 'kind of warm' or 'somewhat spacious'?"

- [ ] No spectrum language — every axis is a clean binary commitment

**If spectrum language appears:** Module 05 is under-specified, or the Step 1 quotation is missing the discriminating phrase. Return to Module 05 — do not split the difference with the named-style menu.

---

## \* Gate 2: Layer 4 (Design Behaviour Translation)

*N/A under Module 04 Accept-the-Constraint (lighter version).*

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Every commitment translated | Intent, behaviours, verification, failure signals and retained freedom | [ ] |
| Behaviours trace to a Layer 3 position and Module 05 anchor | Translation follows strategy, not preference | [ ] |
| Structure precedes styling | Hierarchy, sequence and relationships do not rely on colour, imagery or motion to work | [ ] |
| No premature specification | No typeface, colour, grid, spacing value or finished asset is selected without production authority | [ ] |

---

## \* Gate 3: Layer 5 (Context Narrowing)

*N/A under Module 04 Accept-the-Constraint (lighter version).*

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Sub-Input 5a (Sector) applied | Own reasoning recorded | [ ] |
| Sub-Input 5b (Medium) applied | Own reasoning recorded | [ ] |
| Sub-Input 5c (Audience reading pattern) applied | Own reasoning recorded | [ ] |
| External Constraints noted | Accessibility / regulatory / platform — or "none applicable" | [ ] |
| Contextual guidance recorded for material behaviours | Per-sub-input reasoning preserved, not collapsed into one justification | [ ] |

---

## \* Gate 4: Layer 6 (Operating Model Declared)

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Operating Model declared | Expressive **or** Controlled — explicit, not implicit | [ ] |
| Decision criteria stated | Sector trust, audience trust sensitivity, conviction posture, distribution | [ ] |
| Rationale recorded | Why this declaration follows from the criteria | [ ] |
| Secondary Mode Zones scoped (if hybrid) | Named surfaces only, bounded by the Visual Signature Label | [ ] |

**The fork test:**

> "Does Layer 7's output structure follow from this declaration (Style System if Controlled, Operating Constitution if Expressive)?"

- [ ] Yes — the declaration is load-bearing, not decorative

---

## \* Gate 5: Exploration Layer (Three Variation Strategies)

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Three variation strategies authored | Not one direction with colour swaps | [ ] |
| Locked axes vs free axes named | Each strategy explores only the free axes | [ ] |
| Each strategy stays coherent with locked axes | No strategy invents a new axis position | [ ] |
| Each strategy is meaningfully distinct | Three genuine routes through the free axes | [ ] |

**Human Confirmation Required (non-negotiable):**

- [ ] Builder has reviewed the three strategies and **selected one** before proceeding
- [ ] The two rejected strategies are documented

**If not confirmed:** Do not proceed to Layer 7 or 10B.

---

## \* Gate 6: Layer 7 Artefact

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Correct artefact for the Operating Model | Style System if Controlled, Operating Constitution if Expressive | [ ] |
| Visual Signature Label present | 2–4 owned words, not one of the 12 named styles or a synonym | [ ] |
| Signature Label is traceable | Lists the Layer 3 positions + Layer 1 inputs that produced it | [ ] |
| All required components included | Per the framework's Layer 7 component list | [ ] |
| Derivation Chain Record complete | Every Layer 7 decision traceable to a Layer 1 input through the intermediate layers | [ ] |
| Claims Boundaries cross-check passed | Every public-claim visual verified against Module 01 / 05 Claims Boundaries | [ ] |

### Derivation Verification (layer trace)

| Layer 7 element | Traces back through | Verified? |
| --- | --- | --- |
| Spatial Logic | Module 05 Personality / Values / Filter / Voice (Layer 2) | [ ]/[ ] |
| Resonance Position | Module 05 Personality / Values / Voice / Filter (Layer 3) | [ ]/[ ] |
| Behaviour and contextual guidance | Layer 3 → Layer 4 → Layer 5 | [ ]/[ ] |
| Operating Model | Module 03 positioning + Module 05 Brand Strategy / Personality / Audience + Module 04 Response Path (Layer 6) | [ ]/[ ] |
| Boundary statements ("never does") | Module 03 COMMIT row via Module 05 + Filter (Not For) | [ ]/[ ] |
| Visual Signature Label | Layer 1 conviction + Layer 3 positions | [ ]/[ ] |

---

## \* Gate 7: Two-Part Coherence Test

Before completing Module 10, run both parts of the Ultimate Test. Each checks a different failure and has its own repair path.

**Part 1 — Expression:** "If someone saw only the visual identity (no words), would they sense _any_ specific conviction at all?"

- [ ] Yes — visual expresses _a_ conviction
- [ ] No — visual reads as decoration, generic, or empty

**Part 2 — Correctness:** "If yes to Part 1, is the conviction they would sense _this brand's_ conviction (the Module 05 anchor) — not a different one?"

- [ ] Yes — visual expresses _this_ conviction
- [ ] No — visual expresses _a_ conviction but it's the wrong one

| Result | Diagnosis | Fix |
| --- | --- | --- |
| Part 1 No | Visual is decoration, not derivation | Re-derive from Module 05 inputs — add expression where it's missing |
| Part 1 Yes, Part 2 No | Visual expresses a conviction, but the wrong one | Identify which conviction the visuals currently express, then replace expression — adding more won't fix this; only replacement will |
| Both Yes | Visual proves conviction | Pass |

**Why split:** the binary form ("yes/no, does this work?") conflated two different failures with different repair paths. Adding more visual signal cannot fix the wrong-signal case, and replacing signal is the wrong move when no signal exists at all. A reader who answers "kind of" to the old binary test is almost always in the wrong-conviction case, not the no-conviction case.

**Test only the dimensions in use.** Some brands use no motion or no imagery beyond a logo. Exclude absent dimensions from the test, as defined in `10-Philosophy.md` v3.4 *Visual Identity Is Five Distinct Dimensions*.

### Layer 7 Output Artefact Check

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Style System or Operating Constitution declared | Locked or principled output present | [ ] |
| Principles / Tokens / Implementation separated | Three distinct sections in the artefact | [ ] |
| Tokens are named and platform-agnostic | `colour-primary`, `type-scale-1`, `space-4`, etc. | [ ] |
| Implementation examples reference tokens, not redefine them | Web / print / motion / packaging examples use token names | [ ] |
| Accessibility notes included | Contrast, readable sizes, focus states, reduced-motion preference | [ ] |
| RouteAuthorization field copied from M04 | `route`, `status`, `capability_profile`, `generation_permission` recorded | [ ] |

### Accessibility Check

- [ ] Minimum contrast ratio for text/UI components meets WCAG 2.1 AA (4.5:1 normal text, 3:1 large text/UI)
- [ ] Type scale includes a readable body size and accessible heading hierarchy
- [ ] Focus states and reduced-motion preference are addressed for digital implementation
- [ ] No visual claim (proof imagery, certification marks, etc.) oversteps Module 05 Claims Boundaries

If any accessibility check fails, the Layer 7 artefact cannot lock for public implementation.

---

## \* Gate 8: Ready for 10B + Visual Contract Outputs

| Criterion | Evidence | Pass |
| --- | --- | --- |
| Layer 7 artefact locked | Critique Loop passed; artefact is canonical source | [ ] |
| All 10B generations will derive from the Layer 7 artefact | Never from upstream layers directly | [ ] |
| Visual Contract Brief generated | From the six locked Layer 3 positions | [ ] |
| Evaluation Companion generated | From the six locked Layer 3 positions | [ ] |
| Ready for Pilot Phase / Module 11 | Handoff Pack complete (see `10-Handoff-Pack.md`) | [ ] |

---

## Fail Conditions

### Automatic Fail

| Condition | Result |
| --- | --- |
| A layer was skipped (output is a disguised selection) | FAIL -- return to the skipped layer and re-derive downward |
| Visual position selected from the 12 named-style menu, not derived | FAIL -- derive through the layers; named styles are reference vocabulary only |
| Spectrum language smuggled into Layer 3 ("kind of warm") | FAIL -- return to Module 05; commit to a binary |
| A layer output can't be traced to a verbatim upstream anchor | FAIL -- push the source quotation back in (CMQG_04) |
| Operating Model left implicit | FAIL -- declare Expressive or Controlled explicitly |
| Derivation Chain Record incomplete | FAIL -- every Layer 7 decision must trace to a Layer 1 input |
| Builder hasn't selected a variation strategy | FAIL -- get sign-off before Layer 7 / 10B |
| Visual element overclaims beyond Claims Boundaries | FAIL -- visual overclaim is permanent; cut it |
| Two-Part Coherence Test: Part 1 No or Part 2 No | FAIL -- see the diagnosis-and-fix table |

### Recovery

| Failure | Recovery |
| --- | --- |
| Layer skipped | Return to that layer, complete it, re-derive downward |
| Selected from style menu | Re-run `10-Prompt.md` with full inputs; derive through the layers |
| Spectrum language | Return to Module 05 — find the discriminating phrase |
| Missing trace | Quote the upstream anchor verbatim, then re-derive the layer output |
| Operating Model implicit | Run the Layer 6 decision matrix and declare |
| Part 1 No | Add expression where missing — re-derive from Module 05 |
| Part 1 Yes, Part 2 No | Replace expression — identify the wrong conviction, swap it for this brand's |

---

## Failure-Mode Catalogue

These examples show the failures the existing gates are designed to catch.

### 1. Gate 0: The Aspirational Identity Ships

**What happened:** a founder says the brand is "clinical, evidence-led, and precise," but the business still sells mostly through warm founder trust and undocumented delivery.

**What breaks:** the designer builds a visual identity that looks like a regulated medical product. Prospects expect clinical proof the business cannot provide.

**How it is caught:** Gate 0 marks Brand Personality and Values as Aspirational. Module 10 stops before visual work starts.

**Recovery cost:** high if already shipped. Re-lock Module 05, remove unsupported proof signals, and replace public assets that created the overclaim.

### 2. Gate 1: Spectrum Language Gets Through

**What happened:** the Resonance Position reads "somewhat warm, fairly clean, a little expressive."

**What breaks:** one designer makes it friendly, another makes it restrained, and both can defend their choice because the source never committed.

**How it is caught:** Gate 1 fails the no-spectrum guardrail.

**Recovery cost:** moderate before Layer 7, high after design production. Return to Module 05 and find the phrase that forces the binary.

### 3. Gate 3: Context Narrowing Was Skipped

**What happened:** the website spacing works on desktop, then the same spacious system is applied to mobile reports and sales decks.

**What breaks:** the brand still looks "on strategy" but becomes hard to use where the audience scans under pressure.

**How it is caught:** Gate 3 shows Sector, Medium, and Audience reasoning collapsed into one generic rationale.

**Recovery cost:** low to medium. Re-run Layer 5 for the affected media and regenerate the relevant 10B outputs.

### 4. Gate 4: Operating Model Was Left Implicit

**What happened:** the website is tightly controlled, social posts are expressive, slide decks drift between the two, and nobody knows which one is correct.

**What breaks:** the brand starts to look inconsistent even though individual pieces are well designed.

**How it is caught:** Gate 4 has no explicit Expressive or Controlled declaration, or no scoped Secondary Mode Zones.

**Recovery cost:** medium. Declare the Primary Operating Model, name any Secondary Mode Zones, and re-issue the Layer 7 artefact.

### 5. Gate 7: The Visuals Express the Wrong Conviction

**What happened:** the identity is distinctive and memorable, but it signals rebellion when the brand's actual conviction is careful repair.

**What breaks:** adding more polish makes the problem worse, because the wrong signal is being strengthened.

**How it is caught:** Gate 7 Part 1 passes but Part 2 fails.

**Recovery cost:** high. Replace the expression. Do not add more visual devices to it.

### 6. Claims Boundary: Visual Proof Overclaims

**What happened:** a proof-heavy visual system uses before/after imagery, result badges, or certification-style marks the business cannot support.

**What breaks:** the visual identity creates a public claim the copy would never be allowed to make.

**How it is caught:** CMQG_02 and Gate 6 Claims Boundaries cross-check fail.

**Recovery cost:** variable. Remove the unsupported proof signal immediately; if the asset has shipped widely, log the correction in Module 11/12 tracking.

---

## Summary: All Gates

| Gate  | Layer / Stage | Key Question |
| ----- | ------------- | ------------ |
| 0     | Before starting | Is Module 05 complete and Anchored (or Partial)? |
| 1     | Layers 2–3 | Spatial Logic + six Resonance commitments, each traced to a verbatim anchor? |
| 2     | Layer 4 | Design behaviours, verification and retained freedom derived from the Layer 3 positions? |
| 3     | Layer 5 | Sector × medium × audience adaptations recorded per material behaviour? |
| 4     | Layer 6 | Operating Model declared Expressive or Controlled? |
| 5     | Exploration | Three distinct coherent strategies; builder selected one? |
| 6     | Layer 7 | Correct artefact + Visual Signature Label + complete Derivation Chain Record? |
| 7     | Coherence | Two-Part Test: visual expresses _this_ brand's conviction? |
| 8     | Ready for 10B | Layer 7 locked; Visual Contract outputs generated; handoff ready? |

---

## Quality Criteria — Not All Equal Weight

Three gates are non-negotiable. Failing any one fails the module, regardless of how many other criteria pass.

| Gate | Non-Negotiable? |
| --- | --- |
| Gate 0: Governance | **Yes** — an Aspirational verdict stops the module |
| Gate 1: Layers 2–3 | No (diagnostic) |
| Gate 2: Layer 4 | No (diagnostic; N/A under lighter path) |
| Gate 3: Layer 5 | No (diagnostic; N/A under lighter path) |
| Gate 4: Layer 6 | No (diagnostic) |
| Gate 5: Exploration | **Yes** — builder selection of a variation strategy is required before Layer 7 / 10B |
| Gate 6: Layer 7 | No (diagnostic) — but Derivation Chain Record completeness is checked here |
| Gate 7: Two-Part Coherence | **Yes** — both parts must pass; Part 1 No or Part 2 No fails the module |
| Gate 8: Ready for 10B | No (diagnostic) |

The diagnostic gates help locate the source of a failure. Passing them cannot compensate for failure at any of the three non-negotiable gates.

---

## Founder, catalyst and execution gate

Pass only when applicable founder cues derive from Module 05 or carry a reasoned `not-applicable` state; every used Visual Catalyst has been traced and rederived rather than copied; the custom style is documented well enough to execute consistently; and material visual decisions pass the visual referenceability test. Fail moodboard authority, aesthetic mimicry, generic founder imagery or literal citation marks imposed on visual outputs.

## Version Notes

**Version 3.9** — 17 August 2026

- Added the Practitioner Brief V3 format and common-spine checks without weakening the Visual Contract actionability gate.

**Version 3.8** — 27 July 2026

- Added a plain-language stop/return check to prevent internal gate-name leakage.

**Version 3.7** — 27 July 2026

- Added bounded-layer, decision-state and accepted-anchor checks.
- Added explicit exploratory-state and visual-proof boundaries.

**Version 3.2** — 15 July 2026

- Added Canonical Client Explanation recognisability, authority and upstream-return checks.

**Version 3.1** — 19 June 2026

- **Added Failure-Mode Catalogue.** The gates now include six concrete failure stories keyed to Gate 0, Gate 1, Gate 3, Gate 4, Gate 7, and Claims Boundary failure, with recovery costs named.

**Version 3.0** — 29 May 2026

- **Restructured the gates around the seven-layer derivation chain.** v2.x kept the old per-output gate set (Visual Strategy → Colour Philosophy → Typography Philosophy → Imagery Direction → Design Principles → **Style Recommendation** → Design Philosophy → Handoff Pack) even after the framework, prompt, and Handoff Pack moved to the seven layers. The gates now track Layers 2–7 + Exploration + Ready-for-10B, matching `10-Handoff-Pack.md` v4.x gate numbering exactly.
- **Removed the "Style Recommendation / Style Selection" gate.** Selecting a position from the 12 named styles instead of deriving it is now an automatic fail, not a gate.
- **Added Visual Contract outputs** (Brief + Evaluation Companion) to Gate 8.
- **Preserved** Gate 0 (ternary anchoring verdict), the CMQG mapping, the two-part Ultimate Test (now Gate 7), the surface-conditional caveat, and the non-negotiable-weighting principle.

**Version 2.2** — May 2026

- **Reconciled Gate 0 with README.** Previous version had binary anchored/aspirational outcomes; README has ternary (Anchored / Partial / Aspirational). Coherence test surfaced the cross-document disagreement. Added aggregation rule for the five-row Part B table and Partial verdict with strict scoping. Now matches `10-README.md`.
- **Split the binary Ultimate Test into two parts.** Coherence test surfaced that the binary form conflated two different failures (no conviction vs wrong conviction) with different repair paths. Restructured as Part 1 (Expression) + Part 2 (Correctness) with a diagnosis-and-fix table and a surface-conditional caveat aligning with Philosophy v3.4.
- **Annotated the criteria count** to flag the three non-negotiable gates against the diagnostic rest.

**Version 2.1** -- February 2026

- Added Gate 7: Design Philosophy; renumbered Handoff Pack gate; updated Derivation Verification and Fail Conditions. [Superseded by v3.0, which reframes the entire gate set around the seven layers.]

**Version 2.0** -- February 2026

- Applied Langfell™ Voice Guide standards; fixed character encoding; corrected internal file references (08-_.md -> 10-_.md); terminology alignment; added "If stuck" guidance.

**Version 1.0/1.1** -- January 2026

- Initial release

---

Langfell™ is a trademark of Langfell.
Part of the Langfell™ 12-module framework.
