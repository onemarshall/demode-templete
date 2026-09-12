// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  gsap: {
    registerPlugin: vi.fn(),
  },
}));

vi.mock("./gsap", () => ({
  loadGsap: () => Promise.resolve(mocks),
}));

vi.mock("gsap/dist/ScrollSmoother", () => ({
  ScrollSmoother: {
    create: vi.fn(() => ({ kill: vi.fn() })),
  },
}));

import { smoothScroll } from "./smoothScroll";

describe("smoothScroll action", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).window = {
      matchMedia: vi.fn((query: string) => ({
        matches: false,
        media: query,
      })),
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it("creates the smoother with defaults when conditions are met", async () => {
    const node = {} as unknown as HTMLElement;
    const { ScrollSmoother } = await import("gsap/dist/ScrollSmoother");
    smoothScroll(node);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.gsap.registerPlugin).toHaveBeenCalledWith(ScrollSmoother);
    expect(ScrollSmoother.create).toHaveBeenCalledWith({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.5,
      effects: true,
    });
  });

  it("skips when reduced motion is preferred", () => {
    (globalThis as any).window.matchMedia = vi.fn(() => ({ matches: true }));
    const node = {} as unknown as HTMLElement;
    const action = smoothScroll(node);

    expect(action.destroy).toBeDefined();
    expect(mocks.gsap.registerPlugin).not.toHaveBeenCalled();
  });

  it("skips on touch/pointer coarse devices", async () => {
    (globalThis as any).window.matchMedia = vi.fn((query: string) => ({
      matches: query === "(pointer: coarse)",
    }));
    const node = {} as unknown as HTMLElement;
    smoothScroll(node);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.gsap.registerPlugin).not.toHaveBeenCalled();
  });
});
