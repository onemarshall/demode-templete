// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gsap: {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    utils: {
      random: vi.fn(() => 0),
    },
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
    refresh: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

vi.mock("./gsap", () => ({
  loadGsap: () => Promise.resolve(mocks),
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

import { SplitText } from "gsap/dist/SplitText";
import { splitText } from "./splitText";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("splitText action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("uses a preset to split and animate text", async () => {
    const node = { textContent: "Hello" } as unknown as HTMLElement;
    splitText(node, { preset: "FxType0" });
    await flush();

    const { onEnter } = mocks.ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    expect(mocks.gsap.registerPlugin).toHaveBeenCalledWith(SplitText);
    expect(SplitText).toHaveBeenCalledWith(node, { type: "chars" });
    expect(mocks.gsap.set).toHaveBeenCalled();
    expect(mocks.gsap.to).toHaveBeenCalled();
  });

  it("animates from y with opacity in simple mode", async () => {
    const node = { textContent: "Hello" } as unknown as HTMLElement;
    splitText(node, { type: "chars", y: 50, duration: 1 });
    await flush();

    const { onEnter } = mocks.ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    expect(mocks.gsap.registerPlugin).toHaveBeenCalledWith(SplitText);
    expect(mocks.gsap.from).toHaveBeenCalledWith(
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
    await flush();
    const outerTrigger = mocks.ScrollTrigger.create.mock.results[0].value;

    const { onEnter } = mocks.ScrollTrigger.create.mock.calls[0][0];
    await onEnter();

    const instance = SplitText.mock.results[0].value;
    action.destroy();

    expect(outerTrigger.kill).toHaveBeenCalled();
    expect(instance.revert).toHaveBeenCalled();
  });
});
