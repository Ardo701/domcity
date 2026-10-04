/**
 * The ambiance of a city: what the page does without showing it, made visible.
 *
 * - Weather: the weight of the page (loaded bytes, elements). Bright sun for a light page,
 *   storm for a very heavy one.
 * - Smoking factories: the page's scripts (the JavaScript).
 * - Surveillance cameras: the ad trackers among the third-party sites it calls.
 * - Graffiti: the comments left in the HTML.
 * - Ruins: broken images.
 * - True colors: the captured background colors, as an option.
 *
 * The bookmarklet captures all of this (`page`, `img.broken`, `bg`). A Wikipedia city or an old capture
 * only knows part of it: the weather is then computed on the captured elements, the rest is missing.
 */

import { trackersIn } from "@/format/trackers";
import type { CityDoc, CityNode } from "@/format/types";

export type Weather = "clear" | "fair" | "cloudy" | "overcast" | "storm";

export interface Ambiance {
  weather: Weather;
  /** Bytes loaded by the page (bookmarklet, at least). */
  bytes?: number;
  /** Elements: those of the whole document (bookmarklet), otherwise the captured ones. */
  elements: number;
  /** Where the element count comes from. */
  measured: "dom" | "captured";
  /** <script> tags (bookmarklet). */
  scripts?: number;
  factories: number;
  /** Trackers among the third-party sites (bookmarklet). */
  trackers: string[];
  /** Are the third-party sites known? (bookmarklet) */
  thirdParty: boolean;
  cameras: number;
  /** HTML comments (bookmarklet). */
  comments?: number;
  graffiti: number;
  /** Images broken at capture time (bookmarklet). */
  ruins: number;
  /** Captured background colors: the city can take the site's true colors. */
  colors: boolean;
  /** Background color of the whole page (bookmarklet). */
  background?: string;
}

/** Weight thresholds: beyond each one, the weather gets one notch worse. */
const BYTES = [600_000, 1_500_000, 3_000_000, 6_000_000];
const ELEMENTS = [800, 1_500, 3_000, 6_000];
const SKIES: Weather[] = ["clear", "fair", "cloudy", "overcast", "storm"];

export const MAX_FACTORIES = 12;
/** One factory per six scripts (the first one from a single script). */
const SCRIPTS_PER_FACTORY = 6;
export const CAMERAS_PER_TRACKER = 3;
export const MAX_CAMERAS = 36;
export const MAX_GRAFFITI = 40;

const level = (value: number, steps: number[]) => steps.filter((step) => value >= step).length;

function walk(node: CityNode, visit: (node: CityNode) => void) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

export function ambianceOf(doc: CityDoc): Ambiance {
  const page = doc.page;
  let captured = 0;
  let ruins = 0;
  let painted = false;
  walk(doc.root, (node) => {
    captured += 1;
    if (node.img?.broken) ruins += 1;
    if (node.bg) painted = true;
  });
  const elements = page?.domSize ?? captured;
  const heavy = Math.max(level(elements, ELEMENTS), page?.bytes !== undefined ? level(page.bytes, BYTES) : 0);
  const scripts = page?.scripts;
  const trackers = trackersIn(page?.thirdParty ?? []);
  return {
    weather: SKIES[heavy],
    bytes: page?.bytes,
    elements,
    measured: page?.domSize !== undefined ? "dom" : "captured",
    scripts,
    factories: scripts ? Math.min(MAX_FACTORIES, Math.ceil(scripts / SCRIPTS_PER_FACTORY)) : 0,
    trackers,
    thirdParty: page?.thirdParty !== undefined,
    cameras: Math.min(MAX_CAMERAS, trackers.length * CAMERAS_PER_TRACKER),
    comments: page?.comments,
    graffiti: Math.min(MAX_GRAFFITI, page?.comments ?? 0),
    ruins,
    colors: painted || page?.colors?.background !== undefined,
    background: page?.colors?.background,
  };
}
