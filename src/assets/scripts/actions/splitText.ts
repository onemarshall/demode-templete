import { gsap, ScrollTrigger, SplitText } from "./gsap";
import type { Action } from "svelte/action";

type SplitSegment = "chars" | "words" | "lines";

/**
 * Named presets matching the original FxType variants from fx/type/.
 * FxType9 is omitted — it had reference errors in the original source.
 */
export type SplitTextPreset =
  | "FxType0"
  | "FxType1"
  | "FxType2"
  | "FxType3"
  | "FxType4"
  | "FxType5"
  | "FxType6"
  | "FxType7"
  | "FxType8"
  | "FxType10"
  | "FxType11"
  | "FxType12";

interface PresetConfig {
  splitType: SplitSegment;
  initialStyle: Record<string, unknown>;
  animation: Record<string, unknown>;
  scrollTrigger: Record<string, unknown>;
  /** CSS perspective (px) applied to the parent of each split item */
  perspective?: number;
}

const presets: Record<SplitTextPreset, PresetConfig> = {
  // Chars: slide in from left with skew. Fast-scroll safe.
  FxType0: {
    splitType: "chars",
    initialStyle: { willChange: "opacity, transform", opacity: 0, x: -85, skewX: -10 },
    animation: {
      x: 0,
      opacity: 1,
      skewX: 0,
      ease: "circ.out",
      duration: 0.84,
      stagger: { each: 0.016 },
    },
    scrollTrigger: { start: "top 80%", fastScrollEnd: true },
  },
  // Chars: slide in from left with skew. Plays in window between 80%–20%.
  FxType1: {
    splitType: "chars",
    initialStyle: { willChange: "opacity, transform", opacity: 0, x: -85, skewX: -10 },
    animation: {
      x: 0,
      opacity: 1,
      skewX: 0,
      ease: "circ.out",
      duration: 0.84,
      stagger: { each: 0.016 },
    },
    scrollTrigger: { start: "top 80%", end: "bottom 20%" },
  },
  // Chars: scrub — scale squish from below with back.inOut easing.
  FxType2: {
    splitType: "chars",
    initialStyle: {
      willChange: "opacity, transform",
      opacity: 0,
      yPercent: 120,
      scaleY: 2.3,
      scaleX: 0.7,
      transformOrigin: "50% 0%",
    },
    animation: {
      duration: 1,
      ease: "back.inOut(2)",
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      scaleX: 1,
      stagger: 0.03,
    },
    scrollTrigger: { start: "center bottom+=50%", end: "bottom top+=40%", scrub: true },
  },
  // Chars: scrub — scale from scaleY 0 with back ease.
  FxType3: {
    splitType: "chars",
    initialStyle: { willChange: "transform", transformOrigin: "50% 0%", scaleY: 0 },
    animation: { ease: "back", opacity: 1, scaleY: 1, yPercent: 0, stagger: 0.03 },
    scrollTrigger: { start: "center bottom-=5%", end: "top top-=20%", scrub: true },
  },
  // Chars: scrub — converge from outside edges to centre.
  FxType4: {
    splitType: "chars",
    initialStyle: {
      willChange: "opacity, transform",
      x: (i: number, _: unknown, arr: unknown[]) => 150 * (i - arr.length / 2),
    },
    animation: {
      ease: "power1.inOut",
      x: 0,
      stagger: { grid: "auto", from: "center", amount: 0.1 },
    },
    scrollTrigger: { start: "center bottom+=30%", end: "top top+=15%", scrub: true },
  },
  // Chars: scrub — random scatter in from all directions, with perspective.
  FxType5: {
    splitType: "chars",
    initialStyle: {
      willChange: "opacity, transform",
      opacity: 0,
      xPercent: () => gsap.utils.random(-200, 200),
      yPercent: () => gsap.utils.random(-150, 150),
    },
    animation: {
      ease: "power1.inOut",
      opacity: 1,
      xPercent: 0,
      yPercent: 0,
      stagger: { each: 0.05, grid: "auto", from: "random" },
    },
    scrollTrigger: { start: "center bottom+=10%", end: "bottom center", scrub: 3.2 },
    perspective: 1000,
  },
  // Chars: scrub — 3D flip on X axis (rotationX -90°) with perspective.
  FxType6: {
    splitType: "chars",
    initialStyle: { willChange: "opacity, transform", opacity: 0, rotationX: -90, yPercent: 50 },
    animation: {
      ease: "power1.inOut",
      opacity: 1,
      rotationX: 0,
      yPercent: 0,
      stagger: { each: 0.03, from: 0 },
    },
    scrollTrigger: { start: "center bottom+=40%", end: "bottom center-=30%", scrub: 0.9 },
    perspective: 2000,
  },
  // Chars: random 3D tumble in — rotateX and Z from random values, with perspective.
  FxType7: {
    splitType: "chars",
    initialStyle: {
      willChange: "opacity, transform",
      opacity: 0,
      rotateX: () => gsap.utils.random(-120, 120),
      z: () => gsap.utils.random(-200, 200),
    },
    animation: { ease: "power3.out", opacity: 1, rotateX: 0, duration: 1.2, z: 0, stagger: 0.02 },
    scrollTrigger: { start: "top bottom", end: "bottom top" },
    perspective: 1000,
  },
  // Words: slide in from the right with expo ease, with perspective.
  FxType8: {
    splitType: "words",
    initialStyle: { willChange: "transform", transformOrigin: "0% 50%", xPercent: 105 },
    animation: { duration: 1, ease: "expo", xPercent: 0, stagger: 0.042 },
    scrollTrigger: {
      start: "top bottom",
      end: "top top+=10%",
      toggleActions: "play resume resume reset",
    },
    perspective: 1000,
  },
  // Chars: scrub — 3D flip on X axis, identical to FxType6 (perspective 2000).
  FxType10: {
    splitType: "chars",
    initialStyle: { willChange: "opacity, transform", opacity: 0, rotationX: -90, yPercent: 50 },
    animation: {
      ease: "power1.inOut",
      opacity: 1,
      rotationX: 0,
      yPercent: 0,
      stagger: { each: 0.03, from: 0 },
    },
    scrollTrigger: { start: "center bottom+=40%", end: "bottom center-=30%", scrub: 0.9 },
    perspective: 2000,
  },
  // Lines: rise up from below with skewY — dramatic reveal effect.
  FxType11: {
    splitType: "lines",
    initialStyle: { willChange: "transform", transformOrigin: "0% 50%", yPercent: 105, skewY: 7 },
    animation: { duration: 1.4, ease: "power4.out", yPercent: 0, skewY: 0, stagger: 0.042 },
    scrollTrigger: { start: "top 100%", end: "bottom 25%" },
  },
  // Chars: slide in from left with skew — identical to FxType1.
  FxType12: {
    splitType: "chars",
    initialStyle: { willChange: "opacity, transform", opacity: 0, x: -85, skewX: -10 },
    animation: {
      x: 0,
      opacity: 1,
      skewX: 0,
      ease: "circ.out",
      duration: 0.84,
      stagger: { each: 0.016 },
    },
    scrollTrigger: { start: "top 80%", end: "bottom 20%" },
  },
};

export interface SplitTextActionOptions {
  /**
   * Named preset — maps directly to the original FxType animation variants.
   * When set, all other options are ignored.
   *
   * @example
   * <div use:splitText={{ preset: 'FxType8' }}>
   */
  preset?: SplitTextPreset;
  /** What to split into. Default: 'chars' */
  type?: SplitSegment;
  /** Y offset to animate from (simple mode). Default: 60 */
  y?: number;
  /** Animation duration per item in seconds (simple mode). Default: 0.6 */
  duration?: number;
  /** Stagger between items in seconds (simple mode). Default: 0.02 */
  stagger?: number;
  /** GSAP ease (simple mode). Default: 'expo.out' */
  ease?: string;
  /** ScrollTrigger start position (simple mode). Default: 'top 85%' */
  start?: string;
}

/**
 * Splits an element's text and animates each piece in on scroll.
 *
 * Simple mode — fade up with configurable options:
 *   <h2 use:splitText>Title</h2>
 *   <p use:splitText={{ type: 'words', stagger: 0.04 }}>Body text</p>
 *
 * Preset mode — use a named FxType animation:
 *   <h2 use:splitText={{ preset: 'FxType8' }}>Title</h2>
 */
export const splitText: Action<HTMLElement, SplitTextActionOptions | undefined> = (
  node,
  options = {},
) => {
  const {
    preset,
    type = "chars",
    y = 60,
    duration = 0.6,
    stagger = 0.02,
    ease = "expo.out",
    start = "top 85%",
  } = options;

  let split: InstanceType<typeof SplitText> | null = null;
  let outerTrigger: ScrollTrigger | null = null;

  if (preset && presets[preset]) {
    const config = presets[preset];

    outerTrigger = ScrollTrigger.create({
      trigger: node,
      start: "top 90%",
      once: true,
      onEnter: () => {
        split = new SplitText(node, { type: config.splitType });

        const targets =
          config.splitType === "words"
            ? split.words
            : config.splitType === "lines"
              ? split.lines
              : split.chars;

        if (config.perspective) {
          targets.forEach((el) => {
            if (el.parentNode) {
              gsap.set(el.parentNode as Element, { perspective: config.perspective });
            }
          });
        }

        gsap.set(targets, config.initialStyle);
        gsap.to(targets, {
          ...config.animation,
          scrollTrigger: {
            trigger: targets as gsap.DOMTarget,
            ...config.scrollTrigger,
          },
        });
      },
    });
  } else {
    // Simple mode — fade up from y with opacity
    outerTrigger = ScrollTrigger.create({
      trigger: node,
      start,
      once: true,
      onEnter: () => {
        split = new SplitText(node, { type });
        const targets =
          type === "words" ? split.words : type === "lines" ? split.lines : split.chars;

        gsap.from(targets, {
          y,
          opacity: 0,
          duration,
          stagger,
          ease,
          onComplete: () => split?.revert(),
        });
      },
    });
  }

  return {
    destroy() {
      outerTrigger?.kill();
      split?.revert();
    },
  };
};
