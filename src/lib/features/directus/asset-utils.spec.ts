import { describe, it, expect } from "vitest";
import {
  getDirectusAssetURL,
  getDirectusResponsiveWidths,
  getDirectusDefaultSrcWidth,
} from "./asset-utils";

describe("getDirectusAssetURL", () => {
  it("returns an empty string for null/undefined/empty input", () => {
    expect(getDirectusAssetURL("")).toBe("");
    expect(getDirectusAssetURL(null)).toBe("");
    expect(getDirectusAssetURL(undefined)).toBe("");
  });

  it("returns a full HTTP URL unchanged", () => {
    expect(getDirectusAssetURL("https://cdn.example.com/image.jpg")).toBe(
      "https://cdn.example.com/image.jpg",
    );
  });

  it("builds a URL from a string id", () => {
    expect(getDirectusAssetURL("uuid-1")).toMatch(/\/assets\/uuid-1$/);
  });

  it("builds a URL from a DirectusFile object with filename", () => {
    const file = { id: "uuid-2", filename_download: "image.png" } as unknown as Parameters<
      typeof getDirectusAssetURL
    >[0];
    expect(getDirectusAssetURL(file)).toMatch(/\/assets\/uuid-2\/image\.png$/);
  });

  it("appends transform query parameters", () => {
    const url = getDirectusAssetURL("uuid-3", {
      width: 400,
      height: 300,
      fit: "cover",
      format: "webp",
      quality: 80,
      withoutEnlargement: true,
    });
    expect(url).toContain("width=400");
    expect(url).toContain("height=300");
    expect(url).toContain("fit=cover");
    expect(url).toContain("format=webp");
    expect(url).toContain("quality=80");
    expect(url).toContain("withoutEnlargement=true");
  });
});

describe("getDirectusResponsiveWidths", () => {
  it("returns the configured breakpoints by default", () => {
    const widths = getDirectusResponsiveWidths();
    expect(widths).toEqual([320, 480, 640, 768, 960, 1200, 1600, 1920, 2560, 3200]);
  });

  it("filters widths by width and maxWidth for constrained layout", () => {
    const widths = getDirectusResponsiveWidths({ width: 800, maxWidth: 1000 });
    expect(widths[widths.length - 1]).toBe(800);
  });

  it("returns a single width for fixed layout", () => {
    expect(getDirectusResponsiveWidths({ layout: "fixed", width: 600 })).toEqual([600]);
  });

  it("limits widths by maxWidth for fullWidth layout", () => {
    const widths = getDirectusResponsiveWidths({ layout: "fullWidth", maxWidth: 1200 });
    expect(widths[widths.length - 1]).toBe(1200);
  });
});

describe("getDirectusDefaultSrcWidth", () => {
  it("returns the last responsive width for constrained layout", () => {
    expect(getDirectusDefaultSrcWidth({ responsiveWidths: [320, 640, 960] })).toBe(960);
  });

  it("returns the fixed width for fixed layout", () => {
    expect(
      getDirectusDefaultSrcWidth({ layout: "fixed", responsiveWidths: [320, 640], width: 400 }),
    ).toBe(400);
  });
});
