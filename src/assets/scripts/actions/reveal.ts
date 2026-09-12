import { loadGsap } from "./gsap";
import type { Action } from "svelte/action";

interface RevealOptions {
  /** Direction the container slides in from. Default: 'left' */
  direction?: "left" | "right";
  /** Animation duration in seconds. Default: 1.4 */
  duration?: number;
  /** Image scale at start of animation. Default: 1.3 */
  scale?: number;
}

/**
 * Clip-reveal effect for image containers.
 * The wrapper slides in from one side while the inner image
 * counter-translates to stay visually in place.
 *
 * Usage:
 *   <div use:reveal={{ direction: 'left' }}>
 *     <img src="..." alt="..." />
 *   </div>
 */
export const reveal: Action<HTMLElement, RevealOptions | undefined> = (node, options = {}) => {
  const { direction = "left", duration = 1.4, scale = 1.3 } = options;

  const xPercent = direction === "left" ? -100 : 100;
  const imgXPercent = direction === "left" ? 100 : -100;
  const image = node.querySelector("img");

  let tl: { kill(): void } | null = null;
  let cancelled = false;

  void loadGsap().then(({ gsap }) => {
    if (cancelled) return;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: node,
        start: "clamp(top +=100%)",
        toggleActions: "play none none none",
      },
    });
    tl = timeline;

    gsap.set(node, { autoAlpha: 1 });
    timeline.from(node, { xPercent, ease: "circ.out", duration });

    if (image) {
      timeline.from(
        image,
        { xPercent: imgXPercent, scale, ease: "circ.out", duration },
        `-=${duration}`,
      );
    }
  });

  return {
    destroy() {
      cancelled = true;
      tl?.kill();
    },
  };
};
