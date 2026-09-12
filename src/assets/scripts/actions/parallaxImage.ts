import { loadGsap, type GsapModules } from "./gsap";
import type { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import type { Action } from "svelte/action";

interface ParallaxImageOptions {
  yPercent?: number;
  fromYPercent?: number;
  toYPercent?: number;
  scale?: number;
  start?: string;
  end?: string;
  scrub?: boolean | number;
}

/**
 * Parallax image effect. Apply to an image container — the inner image
 * animates vertically and scales as you scroll through the viewport.
 *
 * Usage: `use:parallaxImage` or `use:parallaxImage={{ yPercent: 15, scale: 1.1 }}`
 */
export const parallaxImage: Action<HTMLElement, ParallaxImageOptions | undefined> = (
  node,
  options = {},
) => {
  const {
    yPercent = 12,
    fromYPercent = -yPercent,
    toYPercent = yPercent,
    scale = 1.12,
    start = "top bottom",
    end = "bottom top",
    scrub = true,
  } = options;

  let tween: gsap.core.Tween | null = null;
  let trigger: ScrollTrigger | null = null;
  let gsapModules: GsapModules | null = null;
  let loadHandler: (() => void) | null = null;
  let cancelled = false;

  const image = node.querySelector<HTMLImageElement>("img");

  if (!image) {
    return { destroy() {} };
  }

  const init = () => {
    if (cancelled || trigger || tween) return;

    void loadGsap().then((modules) => {
      if (cancelled || trigger || tween) return;
      gsapModules = modules;
      const { gsap, ScrollTrigger } = modules;

      gsap.set(image, {
        yPercent: fromYPercent,
        scale,
        transformOrigin: "center center",
        willChange: "transform",
      });

      tween = gsap.to(image, {
        yPercent: toYPercent,
        scale,
        ease: "none",
        overwrite: "auto",
        scrollTrigger: {
          trigger: node,
          start,
          end,
          scrub,
        },
      });

      trigger = tween.scrollTrigger ?? null;
      ScrollTrigger.refresh();
    });
  };

  if (image.complete) {
    init();
  } else {
    loadHandler = () => {
      init();
    };
    image.addEventListener("load", loadHandler, { once: true });
  }

  return {
    destroy() {
      cancelled = true;
      if (loadHandler) {
        image.removeEventListener("load", loadHandler);
      }
      trigger?.kill();
      tween?.kill();
      gsapModules?.gsap.set(image, { clearProps: "transform,transformOrigin,willChange" });
    },
  };
};
