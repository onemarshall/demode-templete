import { describe, it, expect, vi } from "vitest";

vi.mock("$app/env/public", () => ({
  PUBLIC_DIRECTUS_URL: "https://cms.test",
}));

import {
  getDirectusAssetURL,
  getDirectusResponsiveWidths,
  getDirectusDefaultSrcWidth,
  scaleDirectusHeight,
  getDirectusSrcset,
  isDirectusTransformableImage,
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

describe("scaleDirectusHeight", () => {
  it("scales height proportionally to the target width", () => {
    expect(scaleDirectusHeight(800, 1920, 320)).toBe(133);
  });

  it("returns undefined when height or width is missing", () => {
    expect(scaleDirectusHeight(800, undefined, 320)).toBeUndefined();
    expect(scaleDirectusHeight(undefined, 1920, 320)).toBeUndefined();
  });
});

describe("getDirectusSrcset", () => {
  it("scales height per candidate for fullWidth layout", () => {
    const srcset = getDirectusSrcset("abc", {
      layout: "fullWidth",
      widths: [320, 1920],
      width: 1920,
      height: 800,
      fit: "cover",
    });
    expect(srcset).toContain("width=320&height=133");
    expect(srcset).toContain("width=1920&height=800");
    expect(srcset).toMatch(/1920w$/);
  });

  it("drops height when no intrinsic width is given", () => {
    const srcset = getDirectusSrcset("abc", {
      layout: "constrained",
      widths: [320],
      height: 800,
    });
    expect(srcset).not.toContain("height=");
  });

  it("returns density descriptors for fixed layout", () => {
    expect(
      getDirectusSrcset("abc", { layout: "fixed", widths: [48], width: 48, height: 48 }),
    ).toBe(
      "https://cms.test/assets/abc?width=48&height=48 1x, https://cms.test/assets/abc?width=96&height=96 2x",
    );
  });

  it("appends the format parameter to each candidate URL", () => {
    const srcset = getDirectusSrcset("abc", {
      layout: "constrained",
      widths: [320],
      format: "avif",
    });
    expect(srcset).toContain("format=avif");
  });
});

describe("isDirectusTransformableImage", () => {
  it("returns false for svg and gif", () => {
    expect(isDirectusTransformableImage("image/svg+xml")).toBe(false);
    expect(isDirectusTransformableImage("image/gif")).toBe(false);
  });

  it("returns true for raster image types", () => {
    expect(isDirectusTransformableImage("image/png")).toBe(true);
    expect(isDirectusTransformableImage("image/jpeg")).toBe(true);
  });

  it("returns false for null/undefined/non-image types", () => {
    expect(isDirectusTransformableImage(null)).toBe(false);
    expect(isDirectusTransformableImage(undefined)).toBe(false);
    expect(isDirectusTransformableImage("application/pdf")).toBe(false);
  });
});
