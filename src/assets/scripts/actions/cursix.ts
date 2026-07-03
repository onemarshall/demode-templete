import { gsap } from "./gsap";
import type { Action } from "svelte/action";
import Cursix from "cursix";

/** https://github.com/WaqasIshaque1/Cursix?tab=readme-ov-file */

export interface CursixOptions {
  /** Container element or selector. Default: document.body */
  container?: string | HTMLElement;
  /** CSS class for the cursor. Default: 'mf-cursor' */
  className?: string;
  /** CSS class for the cursor inner. Default: 'mf-cursor-inner' */
  innerClassName?: string;
  /** CSS class for text cursor. Default: 'mf-cursor-text' */
  textClassName?: string;
  /** CSS class for media cursor. Default: 'mf-cursor-media' */
  mediaClassName?: string;
  /** CSS class for media box. Default: 'mf-cursor-media-box' */
  mediaBoxClassName?: string;
  /** CSS class for icon SVG. Default: 'mf-svgsprite' */
  iconSvgClassName?: string;
  /** Prefix for icon SVG names. Default: '-' */
  iconSvgNamePrefix?: string;
  /** Source for icon SVG. Default: '' */
  iconSvgSrc?: string;
  /** Data attribute for cursor. Default: 'cursor' */
  dataAttr?: string;
  /** CSS class for hidden state. Default: '-hidden' */
  hiddenState?: string;
  /** CSS class for text state. Default: '-text' */
  textState?: string;
  /** CSS class for icon state. Default: '-icon' */
  iconState?: string;
  /** CSS class for active state. Default: '-active' */
  activeState?: string;
  /** CSS class for media state. Default: '-media' */
  mediaState?: string;
  /** State detection configuration */
  stateDetection?: Record<string, string>;
  /** Whether cursor is visible. Default: true */
  visible?: boolean;
  /** Whether cursor is visible on state. Default: false */
  visibleOnState?: boolean;
  /** Cursor speed. Default: 0.65 */
  speed?: number;
  /** GSAP easing. Default: 'expo.out' */
  ease?: string;
  /** GSAP overwrite mode. Default: true */
  overwrite?: boolean;
  /** Skewing amount. Default: 0 */
  skewing?: number;
  /** Skewing for text. Default: 2 */
  skewingText?: number;
  /** Skewing for icon. Default: 2 */
  skewingIcon?: number;
  /** Skewing for media. Default: 2 */
  skewingMedia?: number;
  /** Skewing delta. Default: 0.001 */
  skewingDelta?: number;
  /** Max skewing delta. Default: 0.15 */
  skewingDeltaMax?: number;
  /** Stick delta. Default: 0.15 */
  stickDelta?: number;
  /** Show timeout. Default: 20 */
  showTimeout?: number;
  /** Hide on leave. Default: true */
  hideOnLeave?: boolean;
  /** Hide timeout. Default: 300 */
  hideTimeout?: number;
}

/**
 * Creates a custom cursor effect using the Cursix library.
 *
 * Usage:
 *   <div use:cursix>Content</div>
 *   <div use:cursix={{ speed: 0.8, className: 'custom-cursor' }}>Content</div>
 */

export const cursix: Action<HTMLElement, CursixOptions | undefined> = (node, options = {}) => {
  const {
    container = document.body,
    className = "mf-cursor",
    innerClassName = "mf-cursor-inner",
    textClassName = "mf-cursor-text",
    mediaClassName = "mf-cursor-media",
    mediaBoxClassName = "mf-cursor-media-box",
    iconSvgClassName = "mf-svgsprite",
    iconSvgNamePrefix = "-",
    iconSvgSrc = "",
    dataAttr = "cursor",
    hiddenState = "-hidden",
    textState = "-text",
    iconState = "-icon",
    activeState = "-active",
    mediaState = "-media",
    stateDetection = {
      "-pointer": "a,button",
      "-hidden": "iframe",
    },
    visible = true,
    visibleOnState = false,
    speed = 0.65,
    ease = "expo.out",
    overwrite = true,
    skewing = 0,
    skewingText = 2,
    skewingIcon = 2,
    skewingMedia = 2,
    skewingDelta = 0.001,
    skewingDeltaMax = 0.15,
    stickDelta = 0.15,
    showTimeout = 20,
    hideOnLeave = true,
    hideTimeout = 300,
  } = options;

  let cursor: Cursix | null = null;
  let heroElement: Element | null = null;
  const interactiveElements = new Set<Element>();

  function initializeCursor() {
    try {
      // Ensure GSAP is registered
      Cursix.registerGSAP(gsap);

      // Determine container element
      let containerEl: HTMLElement;
      if (typeof container === "string") {
        const el = document.querySelector(container) as HTMLElement;
        if (!el) {
          console.warn(`Cursix: Container selector "${container}" not found`);
          return;
        }
        containerEl = el;
      } else {
        containerEl = container;
      }

      // Create cursor instance
      cursor = new Cursix({
        el: null,
        container: containerEl,
        className,
        innerClassName,
        textClassName,
        mediaClassName,
        mediaBoxClassName,
        iconSvgClassName,
        iconSvgNamePrefix,
        iconSvgSrc,
        dataAttr,
        hiddenState,
        textState,
        iconState,
        activeState,
        mediaState,
        stateDetection,
        visible,
        visibleOnState,
        speed,
        ease,
        overwrite,
        skewing,
        skewingText,
        skewingIcon,
        skewingMedia,
        skewingDelta,
        skewingDeltaMax,
        stickDelta,
        showTimeout,
        hideOnLeave,
        hideTimeout,
      });

      // Setup hero behavior
      setupHeroBehavior();

      // Setup interactive elements
      setupInteractiveElements();
    } catch (error) {
      console.error("Cursix initialization failed:", error);
    }
  }

  function setupHeroBehavior() {
    // Try to find hero element within the node's container
    heroElement = node.querySelector(".fx-hero") || document.querySelector(".fx-hero");

    if (heroElement && cursor) {
      const handleMouseEnter = () => {
        if (cursor) cursor.hide();
      };

      const handleMouseLeave = () => {
        if (cursor) cursor.show();
      };

      heroElement.addEventListener("mouseenter", handleMouseEnter);
      heroElement.addEventListener("mouseleave", handleMouseLeave);

      // Store cleanup function
      (heroElement as HTMLElement & { _cursixHeroCleanup?: () => void })._cursixHeroCleanup =
        () => {
          heroElement?.removeEventListener("mouseenter", handleMouseEnter);
          heroElement?.removeEventListener("mouseleave", handleMouseLeave);
        };
    }
  }

  function setupInteractiveElements() {
    if (!cursor) return;

    try {
      // Find interactive elements within the node
      const elements = node.querySelectorAll("a, button, [data-cursor]");

      elements.forEach((element) => {
        if (element && typeof element.addEventListener === "function") {
          const handleMouseEnter = () => {
            if (cursor && typeof cursor.addState === "function") {
              cursor.addState("-pointer");
            }
          };

          const handleMouseLeave = () => {
            if (cursor && typeof cursor.removeState === "function") {
              cursor.removeState("-pointer");
            }
          };

          element.addEventListener("mouseenter", handleMouseEnter);
          element.addEventListener("mouseleave", handleMouseLeave);

          // Store cleanup function
          interactiveElements.add(element);
          (element as HTMLElement & { _cursixCleanup?: () => void })._cursixCleanup = () => {
            element.removeEventListener("mouseenter", handleMouseEnter);
            element.removeEventListener("mouseleave", handleMouseLeave);
          };
        }
      });
    } catch (error) {
      console.warn("Cursix: Could not set up interactive elements:", error);
    }
  }

  function cleanup() {
    // Cleanup hero behavior
    if (
      heroElement &&
      (heroElement as HTMLElement & { _cursixHeroCleanup?: () => void })._cursixHeroCleanup
    ) {
      const heroCleanup = (heroElement as HTMLElement & { _cursixHeroCleanup?: () => void })
        ._cursixHeroCleanup;
      if (heroCleanup) {
        heroCleanup();
      }
      heroElement = null;
    }

    // Cleanup interactive elements
    interactiveElements.forEach((element) => {
      const elementCleanup = (element as HTMLElement & { _cursixCleanup?: () => void })
        ._cursixCleanup;
      if (elementCleanup) {
        elementCleanup();
      }
    });
    interactiveElements.clear();

    // Destroy cursor instance
    if (cursor && typeof cursor.destroy === "function") {
      cursor.destroy();
    }
    cursor = null;
  }

  // Initialize cursor
  initializeCursor();

  return {
    destroy() {
      cleanup();
    },
  };
};
