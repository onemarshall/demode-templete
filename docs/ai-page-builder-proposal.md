# AI-Assisted Page Building — Design Proposal

**Status:** Draft — not yet implemented
**Date:** 2026-07-24
**Context:** Exploring how an LLM could assist directors/editors in composing pages from the block library (`src/lib/components/blocks/`), choosing block order, and picking variants — without producing bad layouts.

---

## 1. Problem statement

Directors currently build pages visually in Directus: pick a block, drop it in, reorder it, pick a variant (e.g. `layout: v1|v2|v3`). We want an LLM to be able to do the same thing — propose or edit a page's block composition — but:

- The LLM has no visual understanding of what a block or variant *looks like* from reading Svelte/Tailwind source.
- Block ordering and pairing (what goes well after what) is a design judgment, not something encoded in the schema.
- Directus schema gives us the *hard constraints* (what's allowed) but not the *soft guidance* (what's good).

## 2. What already exists (current architecture)

| Layer | Location | Role |
|---|---|---|
| Block components | `src/lib/components/blocks/*.svelte` | Render each block type |
| Block registry | `src/lib/components/blocks/BaseBlock.svelte` | Maps `block_*` collection name → Svelte component |
| Page renderer | `src/lib/components/layout/PageBuilder.svelte` | Sorts + renders blocks for a page |
| Block schema (app-side) | `src/lib/content/schema.ts` | Zod types for block shapes, mostly `z.any()` for `item` |
| Content provider | `src/lib/server/content/{directus,static}.ts` | Abstracts Directus vs static JSON pages |
| Static page defs | `src/lib/static/pages/**/*.page.ts` | ~40 real, human-authored page compositions (JSON-in-TS) |
| Directus schema | `pages`, `page_blocks`, `block_*` collections | Source of truth: allowed block types, fields, choices, `sort` order |

Key finding from Directus schema inspection: `pages.blocks` (M2A field) has an explicit `one_allowed_collections` array — this is the authoritative palette of block types for a page. `page_blocks` junction carries `sort`, `hide_block`, `background`. Field-level `note`s already exist on many block fields (e.g. `block_hero.layout`: "top, middle, or bottom").

## 3. Options considered

### 3.1 Block manifest (`design-manifest.ts`)
Hand-author a catalog describing each block's purpose, typical position, and variant meanings, separate from component code.

- **Pros:** Explicit, versionable, cheap to write.
- **Cons:** Untested whether it improves LLM output over well-written prompt text. Risk of encoding guesses as if they were rules. Variant descriptions in prose are lossy for genuinely visual differences.

### 3.2 Page templates (slot-based)
Define named templates (`landing`, `listing`, etc.) with ordered "slots" and candidate block types per slot.

- **Pros:** Encodes real structural patterns (hero → statement → proof → CTA).
- **Cons:** Another artifact to maintain; only as good as the slots we define; still guesswork unless derived from real data.

### 3.3 Few-shot from existing pages (recommended first step)
Use the ~40 existing `*.page.ts` files as real examples of block composition, ordering, and pairing. Feed a handful of representative ones + the Directus schema (block list, fields, choices) directly into the LLM's context per request.

- **Pros:** Zero new infrastructure. Uses real, human-validated compositions instead of authored guesses. Directly testable today.
- **Cons:** Depends on having enough good example pages; may need curation to avoid propagating one-off/legacy patterns (e.g. `blocks.page.ts` looks like a kitchen-sink demo page, not a good example).

### 3.4 Visual grounding for variants (`v1/v2/v3`, layout choices)
Where variants are meaningfully different *visually* (not just structurally), text descriptions are unreliable. Options:
- Render each variant once, screenshot it, run through a multimodal model to generate the description automatically (then cache the description).
- Store annotated reference screenshots in Directus, tied to variant values, for a human or multimodal LLM to compare against.

- **Pros:** Grounds variant selection in what the block actually looks like, not a guess.
- **Cons:** Requires a render/screenshot pipeline; more infrastructure; only worth it if 3.3 proves variant selection is actually a failure point.

## 4. Recommendation — phased approach

**Phase 1 (no new infra, test the hypothesis):**
1. Select 3–5 strong existing pages from `src/lib/static/pages/` as few-shot examples (avoid demo/kitchen-sink pages like `blocks.page.ts`).
2. Combine with the Directus schema output for `pages`, `page_blocks`, and all `block_*` collections (allowed types, fields, notes, choices).
3. Prompt the LLM to compose or edit a page using only that context — no manifest, no template layer.
4. Evaluate: does it get ordering and pairing right? Does it pick reasonable variants?

**Phase 2 (only if Phase 1 shows specific, repeatable failures):**
- If ordering/pairing fails → build the slot-based page template (3.2), derived from patterns actually observed in the example pages, not invented from scratch.
- If variant selection fails → build the visual grounding pipeline (3.4) for just the variants shown to be problematic.

**Explicitly deferred / not recommended yet:**
- Hand-authoring a full `design-manifest.ts` with prose descriptions of "purpose" and "useAfter" rules before testing whether few-shot examples alone are sufficient. This is speculative infrastructure — build it only in response to an observed, specific failure.

## 5. Open questions

- How many of the 40 existing pages are actually "good" examples vs. legacy/demo/test pages that would poison few-shot prompting?
- Should the Directus schema fetch (block list + fields + choices) be cached/exported as a build artifact, or fetched live via MCP each time?
- Is there a role for the `ai_prompts` Directus collection here (e.g. storing the curated few-shot example set or the schema summary) so it's editable without a code deploy?
- If Phase 2 is triggered, should slot templates live in code (`src/lib/...`) or in Directus (as data directors can adjust)?

## 6. Next step

Run Phase 1 as a manual test: assemble the few-shot context (schema + 3-5 example pages) and try a real page-composition request. Judge the output against what a director would actually build before investing in any of the deferred infrastructure.
