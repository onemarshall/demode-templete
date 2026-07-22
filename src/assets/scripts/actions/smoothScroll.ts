import { gsap } from "./gsap";
import type { Action } from "svelte/action";

interface SmoothScrollOptions {
  smooth?: number;
  effects?: boolean;
  wrapper?: string;
  content?: string;
}

export const smoothScroll: Action<HTMLElement, SmoothScrollOptions | undefined> = (
  node,
  options = {},
) => {
  const {
    smooth = 1.5,
    effects = true,
    wrapper = "#smooth-wrapper",
    content = "#smooth-content",
  } = options;

  // Skip on touch devices and for users who prefer reduced motion
  const shouldRun =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(pointer: coarse)").matches;

  if (!shouldRun) {
    return { destroy() {} };
  }

  let smoother: { kill(): void } | null = null;

  import("gsap/dist/ScrollSmoother").then(({ ScrollSmoother }) => {
    gsap.registerPlugin(ScrollSmoother);
    smoother = ScrollSmoother.create({
      wrapper,
      content,
      smooth,
      effects,
    });

    if (import.meta.env.DEV) {
      console.log("✅ Smooth scrolling action initialized");
    }
  });

  return {
    destroy() {
      smoother?.kill();
      if (import.meta.env.DEV) {
        console.log("🔚 Smooth scrolling action destroyed");
      }
    },
  };
};
