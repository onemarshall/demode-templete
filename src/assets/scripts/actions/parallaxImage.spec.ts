// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn(() => ({
      kill: vi.fn(),
      scrollTrigger: { kill: vi.fn() },
    })),
  },
  ScrollTrigger: {
    refresh: vi.fn(),
  },
}));

vi.mock("./gsap", () => ({
  loadGsap: () => Promise.resolve(mocks),
}));

import { parallaxImage } from "./parallaxImage";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("parallaxImage action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeImage() {
    return {
      complete: true,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }

  function makeNode(image: unknown) {
    return {
      querySelector: vi.fn(() => image),
    } as unknown as HTMLElement;
  }

  it("initializes immediately when the image is already loaded", async () => {
    const image = makeImage();
    const node = makeNode(image);

    const action = parallaxImage(node) as unknown as { destroy: () => void };
    await flush();

    expect(mocks.gsap.set).toHaveBeenCalledWith(
      image,
      expect.objectContaining({
        yPercent: -12,
        scale: 1.12,
        transformOrigin: "center center",
      }),
    );
    expect(mocks.gsap.to).toHaveBeenCalledWith(
      image,
      expect.objectContaining({
        yPercent: 12,
        scale: 1.12,
        ease: "none",
        scrollTrigger: expect.objectContaining({
          trigger: node,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        }),
      }),
    );
    expect(mocks.ScrollTrigger.refresh).toHaveBeenCalled();

    action.destroy();
  });

  it("waits for image load when not yet complete", async () => {
    const image = makeImage();
    image.complete = false;
    const node = makeNode(image);

    parallaxImage(node);
    await flush();

    expect(image.addEventListener).toHaveBeenCalledWith("load", expect.any(Function), {
      once: true,
    });
    expect(mocks.gsap.set).not.toHaveBeenCalled();

    const loadHandler = image.addEventListener.mock.calls[0][1];
    loadHandler();
    await flush();

    expect(mocks.gsap.set).toHaveBeenCalledWith(image, expect.any(Object));
    expect(mocks.gsap.to).toHaveBeenCalledWith(image, expect.any(Object));
  });

  it("returns an empty destroy function when no image is found", async () => {
    const node = makeNode(null);
    const action = parallaxImage(node) as unknown as { destroy: () => void };
    await flush();

    expect(mocks.gsap.set).not.toHaveBeenCalled();
    expect(action.destroy).toBeDefined();
  });
});
