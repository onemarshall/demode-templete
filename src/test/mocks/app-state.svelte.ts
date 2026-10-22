// Reactive stand-in for `$app/state`'s `page` for browser tests.
// Mirrors SvelteKit 3 semantics: pushState/replaceState (deprecated shallow-routing
// aliases) update `page.shallow` — NOT `page.url`, which only changes on real
// navigations and popstate.

let href = $state("https://example.test/admin/security");
let shallowHref = $state<string | null>(null);

export const reactivePage = {
  get url() {
    return new URL(href, "https://example.test");
  },
  get shallow() {
    return shallowHref === null
      ? null
      : { params: null, route: null, url: new URL(shallowHref, "https://example.test") };
  },
  get state() {
    return {};
  },
};

export function getHref(): string {
  return shallowHref ?? href;
}

/** Simulate a real navigation (full goto/popstate): url updates, shallow resets. */
export function setHref(next: string): void {
  href = next;
  shallowHref = null;
}

/** Simulate pushState/replaceState shallow routing: only `page.shallow` updates. */
export function pushShallow(next: string): void {
  shallowHref = next;
}
