// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
    refresh: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

vi.mock("gsap/dist/SplitText", () => ({
  SplitText: vi.fn(function () {
    return {
      chars: [{}, {}, {}],
      words: [{}],
      lines: [{}],
      revert: vi.fn(),
    };
  }),
}));

import { gsap, ScrollTrigger } from "./gsap";
import { SplitText } from "gsap/dist/SplitText";
import { splitText } from "./splitText";

describe("splitText action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("uses a preset to split and animate text", async () => {
    const node = { textContent: "Hello" } as unknown as HTMLElement;
    splitText(node, { preset: "FxType0" });

    const { onEnter } = ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    expect(gsap.registerPlugin).toHaveBeenCalledWith(SplitText);
    expect(SplitText).toHaveBeenCalledWith(node, { type: "chars" });
    expect(gsap.set).toHaveBeenCalled();
    expect(gsap.to).toHaveBeenCalled();
  });

  it("animates from y with opacity in simple mode", async () => {
    const node = { textContent: "Hello" } as unknown as HTMLElement;
    splitText(node, { type: "chars", y: 50, duration: 1 });

    const { onEnter } = ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    expect(gsap.registerPlugin).toHaveBeenCalledWith(SplitText);
    expect(gsap.from).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "expo.out",
      }),
    );
  });

  it("kills the trigger and reverts the split on destroy", async () => {
    const node = { textContent: "Hello" } as unknown as HTMLElement;
    const action = splitText(node) as unknown as { destroy: () => void };
    const outerTrigger = ScrollTrigger.create.mock.results[0].value;

    const { onEnter } = ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    const instance = SplitText.mock.results[0].value;
    action.destroy();

    expect(outerTrigger.kill).toHaveBeenCalled();
    expect(instance.revert).toHaveBeenCalled();
  });
});
