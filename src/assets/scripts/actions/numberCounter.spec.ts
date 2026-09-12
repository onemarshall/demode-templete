// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn(),
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

vi.mock("./gsap", () => ({
  loadGsap: () => Promise.resolve(mocks),
}));

import { numberCounter } from "./numberCounter";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("numberCounter action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the initial value and creates a ScrollTrigger", async () => {
    const node = { textContent: "" } as unknown as HTMLElement;
    const action = numberCounter(node, { value: 1000 });
    await flush();

    expect(node.textContent).toBe("0");
    expect(mocks.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: node,
        start: "top 80%",
        once: true,
      }),
    );

    action.destroy();
    expect(mocks.ScrollTrigger.create.mock.results[0].value.kill).toHaveBeenCalled();
  });

  it("formats with prefix, suffix, decimals and separator", async () => {
    const node = { textContent: "" } as unknown as HTMLElement;
    numberCounter(node, {
      value: 1234.5,
      from: 0,
      prefix: "$",
      suffix: "+",
      decimals: 1,
      separator: ",",
    });
    await flush();

    expect(node.textContent).toBe("$0.0+");

    const { onEnter } = mocks.ScrollTrigger.create.mock.calls[0][0];
    onEnter();

    expect(mocks.gsap.to).toHaveBeenCalledWith(
      expect.objectContaining({ v: 0 }),
      expect.objectContaining({
        v: 1234.5,
        duration: 2,
        ease: "power2.out",
      }),
    );

    const { onUpdate } = mocks.gsap.to.mock.calls[0][1];
    onUpdate.call({ targets: () => [{ v: 617.25 }] });
    expect(node.textContent).toBe("$617.3+");
  });

  it("uses custom start and once values", async () => {
    const node = { textContent: "" } as unknown as HTMLElement;
    numberCounter(node, { value: 100, start: "top 90%", once: false });
    await flush();

    expect(mocks.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ start: "top 90%", once: false }),
    );
  });
});
