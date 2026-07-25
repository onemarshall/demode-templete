// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("cursix", () => {
  const cursor = {
    destroy: vi.fn(),
    addState: vi.fn(),
    removeState: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
  };
  const Cursix = vi.fn(function () {
    return cursor;
  });
  Cursix.registerGSAP = vi.fn();
  return { default: Cursix };
});

vi.mock("./gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
  },
}));

import { gsap } from "./gsap";
import Cursix from "cursix";
import { cursix } from "./cursix";

describe("cursix action", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let hero: { addEventListener: any; removeEventListener: any };
  let interactive: { addEventListener: any; removeEventListener: any };

  beforeEach(() => {
    vi.clearAllMocks();

    hero = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    interactive = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (globalThis as any).window = {
      matchMedia: vi.fn(() => ({ matches: false })),
    };
    (globalThis as any).document = {
      body: { classList: {} },
      querySelector: vi.fn((selector: string) => (selector === ".fx-hero" ? hero : null)),
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  it("registers GSAP and creates the cursor with merged options", () => {
    const node = {
      querySelector: vi.fn((selector: string) => (selector === ".fx-hero" ? hero : null)),
      querySelectorAll: vi.fn(() => [interactive]),
    } as unknown as HTMLElement;

    cursix(node, { speed: 0.8 });

    expect(Cursix.registerGSAP).toHaveBeenCalledWith(gsap);
    expect(Cursix).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0.8, className: "mf-cursor" }),
    );
  });

  it("adds pointer state on interactive element hover", () => {
    const node = {
      querySelector: vi.fn((selector: string) => (selector === ".fx-hero" ? hero : null)),
      querySelectorAll: vi.fn(() => [interactive]),
    } as unknown as HTMLElement;

    cursix(node);
    const instance = Cursix.mock.results[0].value;

    const enter = interactive.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === "mouseenter",
    )?.[1];
    const leave = interactive.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === "mouseleave",
    )?.[1];

    enter?.();
    expect(instance.addState).toHaveBeenCalledWith("-pointer");

    leave?.();
    expect(instance.removeState).toHaveBeenCalledWith("-pointer");
  });

  it("cleans up listeners and destroys the cursor on destroy", () => {
    const node = {
      querySelector: vi.fn((selector: string) => (selector === ".fx-hero" ? hero : null)),
      querySelectorAll: vi.fn(() => [interactive]),
    } as unknown as HTMLElement;

    const action = cursix(node) as unknown as { destroy: () => void };
    const instance = Cursix.mock.results[0].value;
    action.destroy();

    expect(hero.removeEventListener).toHaveBeenCalledTimes(2);
    expect(interactive.removeEventListener).toHaveBeenCalledTimes(2);
    expect(instance.destroy).toHaveBeenCalled();
  });
});
