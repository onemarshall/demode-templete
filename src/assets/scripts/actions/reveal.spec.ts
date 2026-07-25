// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./gsap", () => ({
  gsap: {
    set: vi.fn(),
    timeline: vi.fn(() => ({
      from: vi.fn(function () {
        return this;
      }),
      kill: vi.fn(),
    })),
  },
}));

import { gsap } from "./gsap";
import { reveal } from "./reveal";

describe("reveal action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets initial visibility and builds the timeline from the left", () => {
    const image = {};
    const node = {
      querySelector: vi.fn(() => image),
    } as unknown as HTMLElement;

    const action = reveal(node) as unknown as { destroy: () => void };

    expect(gsap.set).toHaveBeenCalledWith(node, { autoAlpha: 1 });
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({
          trigger: node,
          start: "clamp(top +=100%)",
          toggleActions: "play none none none",
        }),
      }),
    );

    const tl = gsap.timeline.mock.results[0].value;
    expect(tl.from).toHaveBeenCalledWith(node, expect.objectContaining({ xPercent: -100 }));
    expect(tl.from).toHaveBeenCalledWith(
      image,
      expect.objectContaining({ xPercent: 100, scale: 1.3 }),
      expect.stringContaining("-="),
    );

    action.destroy();
    expect(tl.kill).toHaveBeenCalled();
  });

  it("uses a positive xPercent when direction is right", () => {
    const image = {};
    const node = {
      querySelector: vi.fn(() => image),
    } as unknown as HTMLElement;

    reveal(node, { direction: "right" });

    const tl = gsap.timeline.mock.results[0].value;
    expect(tl.from).toHaveBeenCalledWith(node, expect.objectContaining({ xPercent: 100 }));
    expect(tl.from).toHaveBeenCalledWith(
      image,
      expect.objectContaining({ xPercent: -100 }),
      expect.stringContaining("-="),
    );
  });

  it("skips the image tween when no image is present", () => {
    const node = { querySelector: vi.fn(() => null) } as unknown as HTMLElement;

    reveal(node);

    const tl = gsap.timeline.mock.results[0].value;
    expect(tl.from).toHaveBeenCalledOnce();
  });
});
