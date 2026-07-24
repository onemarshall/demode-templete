import { describe, it, expect } from "vitest";
import { getImageUuid, getImageObjectPosition } from "./get-image-uuid";

describe("getImageUuid", () => {
  it("returns null for null/undefined", () => {
    expect(getImageUuid(null)).toBeNull();
    expect(getImageUuid(undefined)).toBeNull();
  });

  it("returns a raw string id", () => {
    expect(getImageUuid("abc-123")).toBe("abc-123");
  });

  it("reads id from an object", () => {
    expect(getImageUuid({ id: "obj-123" })).toBe("obj-123");
  });

  it("resolves nested directus_files_id", () => {
    expect(getImageUuid({ directus_files_id: { id: "nested-1" } })).toBe("nested-1");
  });

  it("resolves nested image field", () => {
    expect(getImageUuid({ image: "img-1" })).toBe("img-1");
  });

  it("resolves nested file field", () => {
    expect(getImageUuid({ file: { id: "file-1" } })).toBe("file-1");
  });

  it("returns null when no id is found", () => {
    expect(getImageUuid({})).toBeNull();
    expect(getImageUuid({ image: {} })).toBeNull();
  });
});

describe("getImageObjectPosition", () => {
  it("returns center when focal data is missing", () => {
    expect(getImageObjectPosition(null)).toBe("center");
    expect(getImageObjectPosition({})).toBe("center");
    expect(getImageObjectPosition({ focal_point_x: 50 })).toBe("center");
  });

  it("computes percentage from focal points", () => {
    expect(
      getImageObjectPosition({ focal_point_x: 200, focal_point_y: 100, width: 400, height: 200 }),
    ).toBe("50% 50%");
    expect(
      getImageObjectPosition({ focal_point_x: 100, focal_point_y: 50, width: 400, height: 200 }),
    ).toBe("25% 25%");
  });
});
