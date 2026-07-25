// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./gsap", () => ({
  gsap: {
    set: vi.fn(),
    to: vi.fn(),
    utils: { toArray: vi.fn() },
  },
}));

import { gsap } from "./gsap";
import { links } from "./links";

describe("links action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("animates main and bottom nav links on click", () => {
    const main = [{ id: "a" }, { id: "b" }];
    const bottom = [{ id: "c" }];
    gsap.utils.toArray.mockImplementation(((selector: string) => {
      if (selector === ".js-links") return main;
      if (selector === ".js-links-bottom") return bottom;
      return [];
    }) as any);

    const node = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;
    const action = links(node) as unknown as { destroy: () => void };

    const mockNode = node as unknown as {
      addEventListener: { mock: { calls: [string, () => void][] } };
      removeEventListener: { mock: { calls: [string, () => void][] } };
    };
    const clickHandler = mockNode.addEventListener.mock.calls.find(
      (call) => call[0] === "click",
    )?.[1];
    expect(clickHandler).toBeDefined();

    clickHandler!();

    expect(gsap.set).toHaveBeenCalledWith(main, expect.objectContaining({ autoAlpha: 0, x: 30 }));
    expect(gsap.to).toHaveBeenCalledWith(
      main,
      expect.objectContaining({ autoAlpha: 1, x: 0, duration: 0.6 }),
    );
    expect(gsap.set).toHaveBeenCalledWith(bottom, expect.objectContaining({ autoAlpha: 0, y: 10 }));
    expect(gsap.to).toHaveBeenCalledWith(
      bottom,
      expect.objectContaining({ autoAlpha: 1, y: 0, duration: 0.6 }),
    );

    action.destroy();
    expect(node.removeEventListener).toHaveBeenCalledWith("click", clickHandler!);
  });

  it("uses custom selectors when provided", () => {
    const nav = [{ id: "1" }];
    const footer = [{ id: "2" }];
    gsap.utils.toArray.mockImplementation(((selector: string) => {
      if (selector === ".nav-item") return nav;
      if (selector === ".nav-footer-item") return footer;
      return [];
    }) as any);

    const node = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;
    links(node, { linksSelector: ".nav-item", bottomLinksSelector: ".nav-footer-item" });

    const mockNode = node as unknown as {
      addEventListener: { mock: { calls: [string, () => void][] } };
    };
    const clickHandler = mockNode.addEventListener.mock.calls[0][1];
    clickHandler();

    expect(gsap.utils.toArray).toHaveBeenCalledWith(".nav-item");
    expect(gsap.utils.toArray).toHaveBeenCalledWith(".nav-footer-item");
    expect(gsap.to).toHaveBeenCalledWith(nav, expect.any(Object));
    expect(gsap.to).toHaveBeenCalledWith(footer, expect.any(Object));
  });

  it("does nothing when no matching links are found", () => {
    gsap.utils.toArray.mockReturnValue([]);

    const node = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;
    const action = links(node) as unknown as { destroy: () => void };

    const mockNode = node as unknown as {
      addEventListener: { mock: { calls: [string, () => void][] } };
    };
    const clickHandler = mockNode.addEventListener.mock.calls[0][1];
    clickHandler();

    expect(gsap.set).not.toHaveBeenCalled();
    expect(gsap.to).not.toHaveBeenCalled();

    action.destroy();
  });
});
