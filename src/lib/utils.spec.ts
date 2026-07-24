import { describe, it, expect, vi } from "vitest";
import { cn, debounce } from "./utils";

describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
  });

  it("handles conditional classes and objects", () => {
    expect(cn("btn", { hidden: false, block: true })).toBe("btn block");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("debounce", () => {
  it("delays function calls", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a");
    debounced("b");
    debounced("c");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith("c");
    vi.useRealTimers();
  });
});
