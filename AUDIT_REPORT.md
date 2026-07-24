# Code & Design Audit Report

This audit focuses on design-system consistency, build hygiene, accessibility, and maintainability for the SvelteKit / Tailwind v4 / shadcn-svelte codebase. It builds on `PERFORMANCE_REVIEW.md` and assumes the recent Tailwind/font/loader cleanup is already in place.

## 1. Executive Summary

- **`svelte-check` and `oxlint` are now green.** The 6 type errors, broken oxlint config, competing Tailwind entry points, and related quick-wins have been resolved.
- **172 Svelte components** are in `src/lib/components`; the `blocks/` and `ui/` layers overlap and risk drift.
- **Bundle is dominated by `gsap` (325 KiB), `bits-ui` (267 KiB), and `zod` (112 KiB).** `bits-ui` and `zod` are harder to shrink without feature removal.

## 3. Design-System & Token Issues (High Priority)

### 3.2 Self-referencing CSS custom property

Resolved. `colour.css` now defines raw source tokens as `--brand-primary`, `--brand-accent`, `--brand-sec`, `--brand-success`, `--brand-warning`, and `--brand-error` (plus their lighter/dark/darker steps). `app.css` `@theme` exposes them to Tailwind as `--color-primary: var(--brand-primary)`, etc. The circular self-reference is gone and `bg-primary`, `text-primary`, `text-error`, etc. continue to work.

### 3.4 shadcn-svelte base colour mismatch

Resolved. The shadcn-svelte semantic tokens are now mapped to the custom palette in `app.css` `@theme`: `background`, `foreground`, `card`, `popover`, `primary-foreground`, `secondary`, `muted`, `accent-foreground`, `destructive`, `border`, `input`, and `ring` all resolve to the existing `colour.css` variables. `baseColor: "neutral"` in `components.json` only matters for future `shadcn-svelte` installs; at runtime the components use the custom colours.

## 4. Component Architecture (Medium Priority)

### 4.1 172 Svelte components, high surface area

- `src/lib/components/blocks` contains page-section components (Hero, Books, Videos, etc.).
- `src/lib/components/ui` contains shadcn/primitive components.
- Some blocks are large (`TypoTemplete.svelte` 39 KiB, `Books.svelte` 25 KiB, `FellowsList.svelte` 21 KiB).

**Status / recent changes:**

1. `TypoTemplete.svelte` partially refactored: the inline `videoPlayer`, `eventSubtitle`, `eventPartner`, and `eventResources` snippets were extracted into `MediaPlayer`, `TypoEventDetails`, and `TypoEventResources` in `src/lib/components/shared/`. The six layout variants still live in one file and can be split further if they keep growing.
2. Shared media components created: `HeroMedia` owns the `Hero` background image / autoplay video, and `MediaPlayer` handles YouTube/Vimeo embeds and Directus videos for `TypoTemplete`.
3. Non-shadcn components `SearchModal.svelte`, `ShareDialog.svelte`, and `SvgIcon.svelte` were moved from `ui/` to `shared/`. Generic primitives such as `Container`, `Headline`, `Tagline`, `Text`, `Title`, and `TextUnstyles` remain in `ui/` and should also be relocated.

### 4.3 `LoadingAndNavbar.ts` is dead code

Resolved. `LoadingAndNavbar.ts` has been removed and the unused `LoadingNavbar` export has been removed from `$lib/shared/utils/index.ts`.

## 5. Accessibility & Motion (High Priority)

### 5.3 Loader / intro animation

Resolved. Changes applied:

- `prefers-reduced-motion: reduce` is now respected. `CoreLoader.svelte` disables the fade transition and hides the loader immediately; `+layout.svelte` skips `waitForNextPaint()` so content is revealed right away.
- The loader sets `aria-hidden="true"` and adds `display: none` once `body.is-loaded` is present (or instantly under reduced motion).
- `fade` and `staggerFade` actions now short-circuit under reduced motion, leaving content visible.
- The loader overlay contains no focusable elements and uses `pointer-events: none` when hidden, so focus is not trapped.

## 6. Dependencies & Bundle (Medium Priority)

### 6.1 Heavy packages

From `stats.md`:

- `gsap` — 325 KiB rendered.
- `bits-ui` — 267 KiB rendered.
- `zod` — 112 KiB rendered.
- `sveltekit-superforms` — 80 KiB rendered.
- `svelte-meta-tags` — 34 KiB rendered.

`gsap` is the only one that cannot easily be reduced (plugins already lazy-loaded). `bits-ui` can only shrink by removing/replacing components. `zod` + `sveltekit-superforms` are tightly coupled to forms; removing unused forms would help.

### 6.2 Unused fontsource packages

Resolved. A project-wide grep for `@fontsource` in `src/` returned no imports; fonts are loaded from `darkmode-on.css`, `ivypresto.css`, and Adobe Typekit. Removed the 14 unused `@fontsource-variable/*` and `@fontsource/*` packages from `package.json` and ran `bun install` to clean `node_modules`.

### 6.3 `markdown-it` in `dependencies`

Resolved. `markdown-it` is only imported by `src/lib/server/markdown.ts`, so it has been moved from `dependencies` to `devDependencies`.

## 7. SEO / SSR (Medium Priority)

### 7.2 Typekit render-blocking

Resolved. The Typekit CSS is now loaded with `rel="preload" as="style"` and a Svelte `onload` handler that switches `rel` to `stylesheet` once loaded. A `<noscript>` fallback keeps the stylesheet available when JavaScript is disabled.

## 8. Testing & Tooling (Low/Medium Priority)

**Resolved.** Server-side unit tests now cover the high-value utilities:

- `src/lib/shared/utils/date.ts` / `date.spec.ts` — `formatDate` helper (extracted from inline component functions).
- `src/lib/shared/utils/directus-links.spec.ts` — `resolveDirectusLink`.
- `src/lib/shared/utils/get-image-uuid.spec.ts` — `getImageUuid` and `getImageObjectPosition`.
- `src/lib/features/directus/asset-utils.spec.ts` — `getDirectusAssetURL`, `getDirectusResponsiveWidths`, `getDirectusDefaultSrcWidth`.
- `src/lib/utils.spec.ts` — `cn` and `debounce`.
- `src/assets/scripts/actions/fade.spec.ts` — `fade` and `staggerFade` actions with mocked GSAP/ScrollTrigger.
- `src/lib/features/cookie-consent/store.svelte.spec.ts` — cookie-consent state flow.

`vitest` already has browser (Playwright) and server projects; the server suite passes. The browser suite requires `npx playwright install` to be run once to download Chromium.

- `worker-configuration.d.ts` is 550 KiB generated code; keep it in `.gitignore` if it is auto-generated and regenerate in CI.

## 9. Recommended Next Steps (Priority Order)

1. **Run `npx playwright install` and verify the browser project** (`bunx vitest --run --project client`).
2. **Start a `DESIGN.md` or design-token spec** documenting the colour, typography, spacing, and z-index system.

## 10. Quick Wins

No quick wins remaining.
