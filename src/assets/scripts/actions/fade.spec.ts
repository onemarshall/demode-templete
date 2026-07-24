import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./gsap", () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn(),
  },
  ScrollTrigger: {
    create: vi.fn(() => ({ kill: vi.fn() })),
    batch: vi.fn(() => [{ kill: vi.fn() }]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

import { gsap, ScrollTrigger } from "./gsap";
import { fade, staggerFade } from "./fade";

describe("fade action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    };
    (globalThis as any).document = { body: { classList: { contains: () => true } } };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("sets initial hidden state and creates a ScrollTrigger", () => {
    const node = { style: {} } as unknown as HTMLElement;
    const action = fade(node, { y: 30 }) as { destroy: () => void };

    expect(gsap.set).toHaveBeenCalledWith(node, expect.objectContaining({ autoAlpha: 0, y: 30 }));
    expect(ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: node, start: "top 80%", once: true }),
    );

    action.destroy();
    expect((ScrollTrigger.create as any).mock.results[0].value.kill).toHaveBeenCalled();
  });

  it("respects prefers-reduced-motion and skips ScrollTrigger creation", () => {
    (globalThis as any).window.matchMedia = vi.fn(() => ({ matches: true }));
    const node = { style: {} } as unknown as HTMLElement;
    const action = fade(node) as { destroy: () => void };

    expect(gsap.set).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ autoAlpha: 1, clearProps: "opacity,visibility,transform" }),
    );
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    action.destroy();
  });
});

describe("staggerFade action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = {
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    };
    (globalThis as any).document = { body: { classList: { contains: () => true } } };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("sets initial hidden state and batches matching children", () => {
    const child1 = { style: {} };
    const child2 = { style: {} };
    const node = { querySelectorAll: () => [child1, child2] } as unknown as HTMLElement;
    const action = staggerFade(node, { y: 20, children: ":scope > li" }) as { destroy: () => void };

    expect(gsap.set).toHaveBeenCalled();
    expect(ScrollTrigger.batch).toHaveBeenCalledWith([child1, child2], expect.any(Object));
    action.destroy();
    expect((ScrollTrigger.batch as any).mock.results[0].value[0].kill).toHaveBeenCalled();
  });
});
