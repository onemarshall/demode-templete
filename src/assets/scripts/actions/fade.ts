import { gsap, ScrollTrigger } from "./gsap";
import type { Action } from "svelte/action";

interface FadeOptions {
  /** Vertical offset to animate from. Ignored if x is set. Default: 24 */
  y?: number;
  /** Horizontal offset to animate from. Takes priority over y. */
  x?: number;
  /** Animation duration in seconds. Default: 1 */
  duration?: number;
  /** Delay before animation starts in seconds. Default: 0 */
  delay?: number;
  /** ScrollTrigger start position. Default: 'top 80%' */
  start?: string;
  /** Only fire once. Default: true */
  once?: boolean;
  /** GSAP ease for movement. Default: 'power2.out' */
  ease?: string;
}

/**
 * Single-element fade reveal. For staggered groups, use `staggerFade` on the parent instead.
 */
export const fade: Action<HTMLElement, FadeOptions | undefined> = (node, options = {}) => {
  const {
    y = 24,
    x = 0,
    duration = 1,
    delay = 0,
    start = "top 80%",
    once = true,
    ease = "power2.out",
  } = options;

  const dir = x !== 0 ? "x" : "y";
  const val = x !== 0 ? x : y;

  gsap.set(node, { autoAlpha: 0, [dir]: val, willChange: "opacity, transform" });

  const trigger = ScrollTrigger.create({
    trigger: node,
    start,
    once,
    onEnter: () =>
      gsap.to(node, {
        autoAlpha: 1,
        [dir]: 0,
        duration,
        delay,
        ease,
        onComplete() {
          gsap.set(node, { clearProps: "opacity,visibility,x,y,willChange" });
        },
      }),
  });

  return {
    destroy() {
      trigger.kill();
    },
  };
};

/* -------------------------------------------------------------------------- */
/*  Stagger fade — apply to a parent, animates direct children as a group     */
/* -------------------------------------------------------------------------- */

interface StaggerFadeOptions {
  /** CSS selector for child elements. Default: ':scope > *' (direct children) */
  children?: string;
  /** Vertical offset per child. Default: 20 */
  y?: number;
  /** Horizontal offset per child. Default: 0 */
  x?: number;
  /** Duration per child in seconds. Default: 0.8 */
  duration?: number;
  /** Time between each child starting in seconds. Default: 0.1 */
  stagger?: number;
  /** ScrollTrigger start position. Default: 'top 85%' */
  start?: string;
  /** Only fire once. Default: true */
  once?: boolean;
  /** GSAP ease. Default: 'power2.out' */
  ease?: string;
}

/**
 * Staggered fade reveal. Apply to a container — all matching children
 * animate together as a coordinated group with proper GSAP stagger.
 *
 * Usage: `use:staggerFade` or `use:staggerFade={{ stagger: 0.12, y: 16 }}`
 */
export const staggerFade: Action<HTMLElement, StaggerFadeOptions | undefined> = (
  node,
  options = {},
) => {
  const {
    children = ":scope > *",
    y = 50,
    x = 0,
    duration = 0.5,
    stagger = 0.3,
    start = "top 85%",
    once = false,
    ease,
  } = options;

  const targets = node.querySelectorAll(children);
  if (targets.length === 0) return;

  const dir = x !== 0 ? "x" : "y";
  const val = x !== 0 ? x : y;
  const resolvedEase = ease ?? (x !== 0 ? "power1.inOut" : "circ.out");

  const initialState = {
    [dir]: val,
    opacity: 0,
    willChange: "transform, opacity",
  };

  // Set initial hidden state
  gsap.set(targets, initialState);

  // Use ScrollTrigger.batch — groups elements entering the viewport
  // together and fires them as one coordinated staggered animation
  const triggers = ScrollTrigger.batch(targets, {
    start,
    once,
    onEnter: (batch: Element[]) =>
      gsap.to(batch, {
        opacity: 1,
        [dir]: 0,
        duration,
        ease: resolvedEase,
        clearProps: true,
        stagger: {
          amount: stagger,
          from: "start",
        },
      }),
  });

  // Re-apply initial state on ScrollTrigger refresh (e.g. resize)
  const onRefresh = (): void => {
    gsap.set(targets, initialState);
  };
  ScrollTrigger.addEventListener("refreshInit", onRefresh);

  return {
    destroy() {
      if (Array.isArray(triggers)) {
        triggers.forEach((t: { kill: () => void }) => t.kill());
      }
      ScrollTrigger.removeEventListener("refreshInit", onRefresh);
    },
  };
};
