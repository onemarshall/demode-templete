import { gsap, ScrollTrigger } from "./gsap";
import type { Action } from "svelte/action";

export interface FlipScrollOptions {
  /** GSAP Flip config. Defaults: scale true, simple true */
  flip?: {
    absoluteOnLeave?: boolean;
    absolute?: boolean;
    scale?: boolean;
    simple?: boolean;
  };
  /** ScrollTrigger config. Defaults: start 'center center', end '+=300%' */
  scrollTrigger?: {
    start?: string;
    end?: string;
  };
  /** Stagger between flipped items. Default: 0 */
  stagger?: number;
  /** Selector for items inside the gallery node. Default: '.item' */
  itemsSelector?: string;
  /** Selector for the caption element. Default: '.caption' */
  captionSelector?: string;
  /** Class toggled onto the node to capture end state. Default: 'gallery--switch' */
  switchClass?: string;
}

/**
 * GSAP Flip scroll animation for gallery elements.
 * Captures the element's end-state layout (via a toggled class), then
 * animates from the initial layout to the end state as the user scrolls.
 *
 * Usage:
 *   <div class="gallery" use:flipScroll>...</div>
 *   <div class="gallery" use:flipScroll={{ flip: { absoluteOnLeave: true, scale: false }, scrollTrigger: { end: '+=900%' }, stagger: 0.05 }}>...</div>
 */
export const flipScroll: Action<HTMLElement, FlipScrollOptions | undefined> = (
  node,
  options = {},
) => {
  const {
    flip = {},
    scrollTrigger = {},
    stagger = 0,
    itemsSelector = ".item",
    captionSelector = ".caption",
    switchClass = "gallery--switch",
  } = options;

  const flipConfig = {
    absoluteOnLeave: false,
    absolute: false,
    scale: true,
    simple: true,
    ...flip,
  };
  const stConfig = { start: "center center", end: "+=300%", ...scrollTrigger };

  const caption = node.querySelector<HTMLElement>(captionSelector);
  const items = node.querySelectorAll<HTMLElement>(itemsSelector);

  if (!items.length) {
    console.warn("flipScroll: no items found with selector", itemsSelector);
    return { destroy() {} };
  }

  // Wait for any background-image assets to load before measuring layout
  const bgImages = Array.from(node.querySelectorAll<HTMLElement>('[style*="background-image"]'));
  const imagePromises = bgImages.map((el) => {
    const url = el.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, "$1");
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  });

  let tl: { kill(): void } | null = null;

  Promise.all(imagePromises).then(async () => {
    const { Flip } = await import("gsap/dist/Flip");
    gsap.registerPlugin(Flip);
    // Temporarily apply end-state class to capture target positions
    node.classList.add(switchClass);
    const targets: Element[] = [...Array.from(items), ...(caption ? [caption] : [])];
    const flipstate = Flip.getState(targets, {
      props: "filter, opacity, translate",
      simple: true,
    });
    node.classList.remove(switchClass);

    // Pin the containing section so the whole block stays in view during scrub
    const pinTarget = node.closest("section") ?? node.parentElement ?? node;

    tl = Flip.to(flipstate, {
      ease: "none",
      ...flipConfig,
      scrollTrigger: {
        trigger: node,
        start: stConfig.start,
        end: stConfig.end,
        pin: pinTarget,
        scrub: true,
      },
      stagger,
    });

    ScrollTrigger.refresh();
  });

  return {
    destroy() {
      tl?.kill();
    },
  };
};
