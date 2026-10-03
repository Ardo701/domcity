import { describe, expect, it } from "vitest";
import { zoomFor } from "./FitImage";

describe("enlarging small images", () => {
  it("enlarges an icon by a whole number of times, with sharp pixels", () => {
    expect(zoomFor(20, 13, 240)).toEqual({ width: 240, height: 156, sharp: true });
    expect(zoomFor(16, 16, 160)).toEqual({ width: 160, height: 160, sharp: true });
  });

  it("smooths a barely enlarged image, leaves a large image as is", () => {
    expect(zoomFor(100, 60, 240)).toEqual({ width: 200, height: 120, sharp: false });
    expect(zoomFor(130, 90, 240)).toBeNull();
    expect(zoomFor(800, 600, 240)).toBeNull();
  });

  it("does not touch an image without a known size", () => {
    expect(zoomFor(0, 0, 240)).toBeNull();
  });
});
