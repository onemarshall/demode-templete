# Performance Review — SvelteKit / Cloudflare Codebase

## Method

This review is based on the latest `kit/performance` documentation from the Svelte MCP server and a targeted read of:

- `src/routes/+layout.svelte`
- `vite.config.ts`
- `src/app.html`
- `wrangler.toml`
- `src/assets/css/app.css`
- `src/assets/scripts/actions/cursix.ts`
- `src/assets/scripts/actions/smoothScroll.ts`
- `src/lib/shared/utils/core/CmsMeta.svelte`
- `package.json`

## What is already fast

- **Svelte 5 runes mode** is forced in `vite.config.ts` — Svelte 5 is smaller and faster than Svelte 4.
- **Cloudflare Pages adapter** puts the worker at the edge.
- **`data-sveltekit-preload-data="hover"`** in `src/app.html` enables link/data preloading on hover.
- SvelteKit gives you **code-splitting, request coalescing, parallel loading, data inlining, and conservative invalidation** by default.

## Major concerns

### 1. Main content is invisible until JavaScript hydrates

**File:** `src/routes/+layout.svelte`

`isPageReady` starts as `false`, so the real page content is hidden (`class:invisible`) behind a `<Loader />` until `onMount` runs `revealPage()`. `revealPage()` then waits for `tick()` plus **two** `requestAnimationFrame` callbacks before setting `isPageReady = true`.

Impact:

- Content is already in the SSR DOM but not visible until JS runs.
- This delays **FCP/LCP** and creates a SPA-style paint delay.
- The SvelteKit `kit/performance` docs explicitly warn against this pattern: enabling SPA behavior causes waterfalls and extra round-trips before any pixel can be displayed.

### 2. Heavy animation libraries run on every route

**Files:**

- `src/assets/scripts/actions/cursix.ts`
- `src/assets/scripts/actions/smoothScroll.ts`
- `src/routes/+layout.svelte`

`+layout.svelte` applies `use:cursix` and `use:smoothScroll` to the root wrapper. Both use GSAP (`cursix.ts` imports `gsap`, `smoothScroll.ts` imports `ScrollSmoother`).

`cursix.ts`:

- Queries every `a`, `button`, and `[data-cursor]` element on the page and attaches `mouseenter`/`mouseleave` listeners.
- Initializes immediately, with no guard for `prefers-reduced-motion` or touch devices.
- Imports and registers GSAP globally.

`smoothScroll.ts`:

- Creates a GSAP `ScrollSmoother` instance on every route.
- The default wrapper selector is `#smooth-wrapper`, but `+layout.svelte` only provides `#smooth-content` (no `#smooth-wrapper` ID).
- No `prefers-reduced-motion` or touch detection.
- Hijacks native scroll, which can cause scroll jank and accessibility issues.

### 3. Render-blocking external font CSS

**File:** `src/routes/+layout.svelte`

```svelte
<svelte:head>
  <link rel="stylesheet" href="https://use.typekit.net/tck6tzf.css" />
</svelte:head>
```

Adobe Typekit CSS is loaded from a third party without `preconnect`, `dns-prefetch`, or `preload as="style"`. It blocks first paint. The `kit/performance` docs recommend preloading fonts correctly and subsetting them.

### 4. Large local font surface

**Files:** `src/assets/css/app.css`, `package.json`

`app.css` imports `darkmode-on.css`, `ivypresto.css`, and `package.json` lists many `@fontsource-variable/*` packages. Without subsetting and `font-display: swap`, these delay text rendering. You are likely loading weights that are never used on a given page.

### 5. Third-party CSS bundled into the main stylesheet

**File:** `src/assets/css/app.css`

```css
@import "vanilla-cookieconsent/dist/cookieconsent.css";
```

This pulls cookie-consent CSS into the critical render path. It could be loaded conditionally or only when consent is actually shown.

### 6. `CmsMeta` defers `baseOrigin` to `onMount`

**File:** `src/lib/shared/utils/core/CmsMeta.svelte`

```svelte
onMount(() => {
  baseOrigin = window.location.origin;
});
```

`baseOrigin` is empty during SSR, so all Open Graph and Twitter card URLs are wrong in the server-rendered HTML. The component must then re-render on the client. Not a raw timing issue, but it causes unnecessary client-side work and worse SEO.

### 7. Directus images should use responsive sizing and lazy loading

Images are served from Directus, but the reviewed files did not confirm use of Directus transform parameters (e.g., `width`, `height`, `quality`, `fit`, `format`) for responsive `srcset`/`sizes` or `loading="lazy"` for below-the-fold images. SvelteKit docs recommend responsive images with `srcset`/`sizes` and lazy loading to avoid large, unoptimized downloads.

### 8. Heavy dependencies in the main dependency tree

`package.json` includes `gsap`, `bits-ui`, `@lucide/svelte`, `sveltekit-superforms`, `cursix`, and many `@fontsource-*` packages. Without a bundle analyzer (`rollup-plugin-visualizer`) it is unclear which ones are tree-shaken effectively or bloating the initial chunk.

## Recommendations (prioritized)

1. **Remove or restructure the layout loader**
   - Do not `class:invisible` the main content.
   - If you need an intro animation, gate the animation classes, not visibility, and start content visible.
   - Respect `prefers-reduced-motion`.

2. **Lazy-load and gate the cursor / smooth scroll**
   - Load `cursix` and `ScrollSmoother` with `await import(...)` only on pointer/desktop devices and when `prefers-reduced-motion` is not set.
   - Skip `cursix` entirely on touch devices.

3. **Fix `smoothScroll` selectors or remove it**
   - Add `id="smooth-wrapper"` to the wrapping `div` or remove GSAP smooth scroll if not strictly required.

4. **Preconnect/preload Typekit and other third-party assets**
   - Add `<link rel="preconnect" href="https://use.typekit.net" crossorigin />` in `src/app.html`.
   - Use a `preload` filter in `src/hooks.server.ts` for fonts, as described in `kit/performance`.

5. **Subset and self-host fonts**
   - Remove unused `@fontsource-*` packages from `package.json`.
   - Ensure all font faces use `font-display: swap`.
   - Subset variable fonts to the glyphs/weights you actually use.

6. **Audit the bundle**
   - Add `rollup-plugin-visualizer` to `vite.config.ts`.
   - Run `bun run build` and inspect the generated chunks to find the largest contributors.

7. **Improve Directus image delivery**
   - Use Directus transform parameters to generate multiple sizes (`width`, `height`, `quality`, `fit`, `format`) and provide `srcset`/`sizes` attributes.
   - Add `loading="lazy"` and `decoding="async"` for below-the-fold images.
   - If `@zerodevx/svelte-img` is unused, remove it from `package.json` and `bun.lock`.

8. **Fix `CmsMeta` SSR**
   - Derive `baseOrigin` from `event.url.origin` in a server `load` function or use `page.url.origin` directly instead of `window.location.origin` inside `onMount`.

9. **Respect reduced motion across the app**
   - Wrap `cursix`, `smoothScroll`, the page transition, and the progress bar behind `prefers-reduced-motion` checks.

10. **Move `vanilla-cookieconsent` CSS out of the main bundle**
    - Load it only when the banner is shown, or use a dynamic import for the consent script.

## Bundle audit results

`rollup-plugin-visualizer` was added to `vite.config.ts` (registered in `build.rollupOptions.plugins`) and `bun run build` generated `stats.md` in the project root.

### Summary

- Total client bundle: 1.84 MiB rendered, 561.64 KiB gzip, 484.50 KiB brotli.
- No duplicated modules across bundles.
- Largest chunk: `_app/immutable/chunks/D1EhI5RW.js` — 815.63 KiB rendered (236.93 KiB gzip).
- Second largest: `_app/immutable/chunks/COEZmzHS.js` — 443.47 KiB rendered (129.40 KiB gzip).

### Top packages by rendered size

1. `gsap` — 325.56 KiB (~17% of total)
2. `bits-ui` — 267.92 KiB
3. `svelte` — 188.59 KiB
4. `zod` — 112.90 KiB
5. `@sveltejs/kit` — 92.00 KiB
6. `sveltekit-superforms` — 80.57 KiB
7. `tailwind-merge` — 56.84 KiB
8. `svelte-meta-tags` — 34.54 KiB
9. `vanilla-cookieconsent` — 27.66 KiB
10. `formsnap` — 22.58 KiB

### Notable observations

- `D1EhI5RW.js` is now the largest chunk, containing `TypoTemplete`, `sveltekit-superforms`, `zod`, `bits-ui/select`, `Books`, `FellowsList`, and `Videos`.
- `COEZmzHS.js` is now the leaner GSAP chunk: `gsap-core`, `ScrollTrigger`, `CSSPlugin`, plus `tailwind-merge`.
- `D5v76wTS.js` is the lazy-loaded `GSAP Flip` chunk (48.60 KiB rendered).
- `Cxjcez3o.js` is the lazy-loaded `GSAP ScrollSmoother` chunk (27.10 KiB rendered).
- `D156XvCZ.js` is the lazy-loaded `GSAP SplitText` chunk (23.00 KiB rendered).
- `markdown-it`/`entities` is no longer in the client bundle. Markdown is now rendered server-side in `page-fetcher.ts`, `post-fetcher.ts`, and `static.ts` before it reaches `Text.svelte` / `TextUnstyles.svelte`.
- `vanilla-cookieconsent` now splits into its own lazy chunk (`2o2HOC1r.js`, 31.66 KiB) after removing the static re-export from `cookie-consent/index.ts`. The `INEFFECTIVE_DYNAMIC_IMPORT` warning is gone.
- `@vinejs/vine` is no longer bundled for the browser after aliasing it to a stub in `vite.config.ts`.
- `0.Xw8pAlNY.css` is now 201.50 KiB (gzip 30.05 KiB) — the biggest CSS file. The `cookies.css` overrides have been moved to the lazy-loaded `vanilla-cookieconsent` chunk, but `colour.css` and the Tailwind v4 base/theme still dominate.

### Optimizations applied since the audit

1. **Central `gsap.ts` module trimmed** — removed the wildcard re-export and dropped unused `Observer`.
2. **Lazy-loaded GSAP plugins** — `ScrollSmoother`, `Flip`, and `SplitText` are now imported on demand inside their actions, splitting ~91 KiB of plugin code out of the initial GSAP chunk.
3. **Fixed `@vinejs/vine` client leak** — added a stub module and `resolve.alias` in `vite.config.ts` so the optional `sveltekit-superforms` validator is not bundled for the browser.
4. **Moved `markdown-it` to the server** — created `src/lib/server/markdown.ts` and wired `page-fetcher.ts`, `post-fetcher.ts`, and `static.ts` to render all `content` fields to HTML before serialization. `Text.svelte` and `TextUnstyles.svelte` now render pre-rendered HTML. `markdown-it` no longer appears in the client bundle.
5. **Moved `cookies.css` out of the main bundle** — the cookie-consent custom overrides now load with the lazy `vanilla-cookieconsent` chunk in `client.ts`, shaving ~2.7 KiB off the main stylesheet.
6. **Removed dead hand-rolled color utilities from `colour.css`** — grepped every `.svelte` file for the `.color-primary`/`.bg-accent`/`.bg-primary-light`-style classes (~336 lines) and found zero usages; every component uses Tailwind's own generated utilities (`bg-primary-800`, `bg-white/20`, `border-primary/20`) instead, which also support opacity modifiers the hand-rolled classes lacked. Kept the `:root` custom properties (required by Tailwind's `@theme` mapping) and the `.color-contrast-*` / `.bg-contrast-*` classes (5 real usages, no Tailwind equivalent since `--color-contrast-*` isn't mapped into `@theme`). Main stylesheet dropped from 201.50 KiB to 194.80 KiB rendered.
7. **Deleted 55 orphaned CSS files (~398 KB) from `src/assets/css/`** — traced the full `@import` graph and found only `app.css`, `base/colour.css`, `fonts/darkmode-on.css`, `fonts/ivypresto.css`, `lib/cookies.css`, and `lib/components/ui/cursix/styles.css` were ever referenced anywhere in the codebase. Everything else — `base/util.css` (185 KB), all of `components/` (34 files), `theme/` (22 files), `forms/` (6 files), `props/`, `style/`, most of `base/`, most of `lib/`, and 2 unused font files — was leftover from a pre-Tailwind CSS codebase with zero imports anywhere. These files had no effect on the shipped bundle (Vite never bundles unimported files) but were pure workspace clutter. Deleted after confirming zero references via grep.
8. **Fixed broken `--font-primary`/`--font-secondary` theme mapping** — `app.css`'s `@theme` block self-referenced undefined variables (`--font-primary: var(--font-primary)`), so the `font-primary`/`font-secondary` Tailwind classes used in ~10 components (`Stats.svelte`, `Books.svelte`, `FellowsList.svelte`, news pages, etc.) silently resolved to nothing. Fixed to point at the actual font vars (`--font-sans` from `darkmode-on.css`, `--font-serif` from `ivypresto.css`). Also removed the dead `--leading-*`/`--max-width-*`/`--z-*` lines in the same block — they referenced undefined `--line-height-*`/`--max-width-*`/`--z-index-*` vars (defined only in the now-deleted `util.css`) and had zero component usage.

### Remaining high-impact recommendations

1. **CSS size** — after removing dead utility classes and the orphaned files, the main stylesheet is 194.51 KiB. The remaining bulk is the `colour.css` `:root` custom properties and the Tailwind v4 base/theme (emitted regardless of usage). Tried `@import "tailwindcss" theme(static)` to drop unused theme vars — it made things worse (213.69 KiB) because it forces _all_ theme vars to be emitted; reverted. A real reduction would require ejecting the default theme (`tailwindcss/theme.css` + `preflight.css` + `utilities.css` as separate layers) and forking/subsetting `theme.css`. Font CSS is small; the referenced local `InterVariable.woff2` and `ivypresto-display.woff2` files are not present in `static/assets/fonts`.
2. **bits-ui surface** — `bits-ui` is tree-shakeable (`sideEffects: false`), so the 267 KiB is the used set of components. Reducing it requires removing or replacing components such as `Select` and `NavigationMenu`.
