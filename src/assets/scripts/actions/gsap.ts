/**
 * Shared lazy loader for GSAP + ScrollTrigger.
 *
 * gsap and ScrollTrigger together are ~200KB of code. Loading them
 * dynamically keeps them out of the initial bundle — they're fetched in
 * parallel the first time a scroll/animation action mounts, and not at all
 * for reduced-motion or touch users guarded upstream.
 */

export interface GsapModules {
  gsap: (typeof import("gsap"))["gsap"];
  ScrollTrigger: (typeof import("gsap/dist/ScrollTrigger"))["ScrollTrigger"];
}

let loading: Promise<GsapModules> | null = null;

export function loadGsap(): Promise<GsapModules> {
  loading ??= Promise.all([import("gsap"), import("gsap/dist/ScrollTrigger")]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return loading;
}
