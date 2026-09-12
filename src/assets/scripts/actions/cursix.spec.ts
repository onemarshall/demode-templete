// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const gsapMock = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
}));

vi.mock("./gsap", () => ({
  loadGsap: () => Promise.resolve({ gsap: gsapMock }),
}));

vi.mock("cursix", () => {
  const mockCursor = {
    destroy: vi.fn(),
    animate: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
    addState: vi.fn(),
    removeState: vi.fn(),
  };

  const MockCursix = vi.fn(function () {
    return mockCursor;
  });
  MockCursix.registerGSAP = vi.fn();

  return {
    default: MockCursix,
  };
});

import { cursix } from "./cursix";
import Cursix from "cursix";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("cursix action", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).document = {
      body: {},
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };
    (globalThis as any).window = {
      matchMedia: vi.fn(() => ({ matches: false })),
    };
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
    (globalThis as any).window = originalWindow;
  });

  it("initializes Cursix with registered GSAP", async () => {
    const node = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      ownerDocument: { querySelectorAll: vi.fn(() => []) },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const action = cursix(node);
    await flush();

    expect(Cursix.registerGSAP).toHaveBeenCalledWith(gsapMock);
    expect(Cursix).toHaveBeenCalled();

    action.destroy();
  });

  it("registers hero and interactive element listeners", async () => {
    const hero = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const interactive = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const node = {
      querySelector: vi.fn((selector: string) => (selector === ".fx-hero" ? hero : null)),
      querySelectorAll: vi.fn(() => [interactive]),
      ownerDocument: { querySelectorAll: vi.fn(() => [interactive]) },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const action = cursix(node);
    await flush();

    expect(hero.addEventListener).toHaveBeenCalledWith("mouseenter", expect.any(Function));
    expect(interactive.addEventListener).toHaveBeenCalledWith("mouseenter", expect.any(Function));

    action.destroy();

    expect(hero.removeEventListener).toHaveBeenCalledWith("mouseenter", expect.any(Function));
    expect(interactive.removeEventListener).toHaveBeenCalledWith(
      "mouseenter",
      expect.any(Function),
    );
  });

  it("destroys the cursor instance on destroy", async () => {
    const node = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      ownerDocument: { querySelectorAll: vi.fn(() => []) },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const action = cursix(node);
    await flush();

    const cursorInstance = Cursix.mock.results[0].value;
    action.destroy();

    expect(cursorInstance.destroy).toHaveBeenCalled();
  });
});
