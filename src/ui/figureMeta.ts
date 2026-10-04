import type { CityLayout } from "@/city/layout";

/**
 * The sheet's figures (the home page, the Create a city page) are real images from the 3D engine,
 * rendered in development (/dev/figure) and versioned: the page stays light, without Three.js.
 * They come with their camera's matrix, to put the markers in the right place,
 * and with the fingerprint of the urban plan they show: a test fails if the engine has changed
 * since (the image must then be regenerated).
 */
export interface FigureMeta {
  src: string;
  width: number;
  height: number;
  /** Camera projection (view × projection, column-major, like Three.js). */
  matrix: readonly number[];
  /** Fingerprint of the rendered urban plan (`figureKey`). */
  layout: string;
}

/** Fingerprint (FNV-1a, 32 bits) of what the urban plan placed: lots, streets, grounds. */
export function figureKey(layout: CityLayout): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  const parts = [
    ...layout.lots.map((l) => [l.kind, l.x, l.y, l.z, l.w, l.h, l.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
    ...layout.roads.map((r) => [r.style, r.x, r.z, r.w, r.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
    ...layout.plates.map((p) => [p.style, p.x, p.z, p.w, p.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
  ];
  const text = parts.join(";");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** A point of the city on the image, in pixels. */
export function projectOn(figure: Pick<FigureMeta, "matrix" | "width" | "height">, x: number, y: number, z: number): [number, number] {
  const m = figure.matrix;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return [((nx + 1) / 2) * figure.width, ((1 - ny) / 2) * figure.height];
}
