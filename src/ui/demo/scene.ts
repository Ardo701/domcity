/**
 * The bookmarklet demo (Créer une ville page): what the server prepares and what the browser animates.
 * The scene is a drawn 640 × 480 browser; under its bars, the page window is 640 × 388.
 */

export const SCENE = { width: 640, height: 480 };
/** The browser bars: tabs, address, bookmarks. The page starts below. */
export const BARS = { tabs: 32, toolbar: 34, bookmarks: 26 };
export const VIEW = { top: BARS.tabs + BARS.toolbar + BARS.bookmarks, width: 640, height: 388 };

export interface PageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The look of an element in the sample page, before it becomes a building. */
export type Look =
  | { type: "words"; text: string }
  | { type: "title"; text: string; size: number }
  | { type: "lines"; footer?: boolean }
  | { type: "image"; src: string }
  | { type: "rule" }
  | { type: "bullet"; width: number }
  | { type: "empty" }
  | { type: "embed" }
  | { type: "none" };

/** An element of the sample page and the lot the urban plan made of it (city coordinates). */
export interface DemoLot {
  tag: string;
  page: PageRect;
  look: Look;
  /** The label shown during the capture (`<h1>`...), for a few elements only. */
  label?: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Colors of the top and the two visible sides (west, south). */
  top: string;
  west: string;
  south: string;
  /** Order of rising from the ground, from lowest to highest (buildings only). */
  rank: number;
  /** A poster hung on a facade: its image and the side it faces. */
  panel?: { src: string; mount: "west" | "south" };
}

/** A ground of the model: base, sidewalks, squares, lawns, water. */
export interface DemoSlab {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Altitude of the top. */
  y: number;
  color: string;
}

export interface DemoCamera {
  /** Rotation around the vertical, in radians (0: north at the top). */
  theta: number;
  /** Viewing height, in radians (π/2: seen from above, like a plan). */
  elevation: number;
  /** Scene pixels per city unit. */
  scale: number;
  /** Where the city's origin falls, in the page window. */
  ox: number;
  oy: number;
}

export interface DemoCity {
  /** The buildings, ordered from back to front (drawing order). */
  buildings: DemoLot[];
  /** The containers (header, sections, list...), drawn in dotted lines during the capture. */
  containers: DemoLot[];
  panels: DemoLot[];
  /** The base, then the grounds laid on it. */
  base: DemoSlab;
  ground: DemoSlab[];
  /** The plan seen from above, then the camera of the image rendered by the engine. */
  plan: DemoCamera;
  final: DemoCamera;
  image: { src: string; x: number; y: number; width: number; height: number };
  /** The hovered point on the monument, in the page window. */
  hover: [number, number];
}

/** A point of the city seen by an orthographic camera, in pixels of the page window. */
export function viewPoint(cam: DemoCamera, x: number, y: number, z: number): [number, number] {
  const cos = Math.cos(cam.theta);
  const sin = Math.sin(cam.theta);
  const a = x * cos - z * sin;
  const b = x * sin + z * cos;
  return [cam.ox + cam.scale * a, cam.oy + cam.scale * (b * Math.sin(cam.elevation) - y * Math.cos(cam.elevation))];
}

export function lerpCamera(from: DemoCamera, to: DemoCamera, k: number): DemoCamera {
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    theta: mix(from.theta, to.theta),
    elevation: mix(from.elevation, to.elevation),
    scale: mix(from.scale, to.scale),
    ox: mix(from.ox, to.ox),
    oy: mix(from.oy, to.oy),
  };
}

const channels = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const toHex = (rgb: number[]) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;

/** A color lightened (factor > 1) or darkened (< 1). */
export const tone = (hex: string, factor: number) => toHex(channels(hex).map((c) => c * factor));

/** The mix of two colors (k = 0: the first one). */
export function mixColor(a: string, b: string, k: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * k));
}
