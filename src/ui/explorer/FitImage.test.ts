import { describe, expect, it } from "vitest";
import { zoomFor } from "./FitImage";

describe("agrandissement des petites images", () => {
  it("agrandit une icône d'un nombre entier de fois, pixels nets", () => {
    expect(zoomFor(20, 13, 240)).toEqual({ width: 240, height: 156, sharp: true });
    expect(zoomFor(16, 16, 160)).toEqual({ width: 160, height: 160, sharp: true });
  });

  it("lisse une image à peine grossie, laisse une grande image telle quelle", () => {
    expect(zoomFor(100, 60, 240)).toEqual({ width: 200, height: 120, sharp: false });
    expect(zoomFor(130, 90, 240)).toBeNull();
    expect(zoomFor(800, 600, 240)).toBeNull();
  });

  it("ne touche pas une image sans taille connue", () => {
    expect(zoomFor(0, 0, 240)).toBeNull();
  });
});
