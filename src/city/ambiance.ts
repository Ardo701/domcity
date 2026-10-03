/**
 * L'ambiance d'une ville : ce que la page fait sans le montrer, rendu visible.
 *
 * - Météo : le poids de la page (octets chargés, éléments). Grand soleil pour une page légère,
 *   orage pour une page très lourde.
 * - Usines qui fument : les scripts de la page (le JavaScript).
 * - Caméras de surveillance : les traqueurs publicitaires parmi les sites tiers qu'elle sollicite.
 * - Graffitis : les commentaires laissés dans le HTML.
 * - Ruines : les images cassées.
 * - Vraies couleurs : les couleurs de fond relevées, en option.
 *
 * Le favori relève tout cela (`page`, `img.broken`, `bg`). Une ville Wikipédia ou un ancien relevé
 * n'en savent qu'une partie : la météo se calcule alors sur les éléments relevés, le reste manque.
 */

import { trackersIn } from "@/format/trackers";
import type { CityDoc, CityNode } from "@/format/types";

export type Weather = "clear" | "fair" | "cloudy" | "overcast" | "storm";

export const WEATHER_NAMES: Record<Weather, string> = {
  clear: "Grand soleil",
  fair: "Beau temps",
  cloudy: "Nuageux",
  overcast: "Couvert",
  storm: "Orage",
};

export interface Ambiance {
  weather: Weather;
  /** Octets chargés par la page (favori, au moins). */
  bytes?: number;
  /** Éléments : ceux de tout le document (favori), sinon ceux relevés. */
  elements: number;
  /** D'où vient le compte des éléments. */
  measured: "dom" | "captured";
  /** Balises <script> (favori). */
  scripts?: number;
  factories: number;
  /** Traqueurs parmi les sites tiers (favori). */
  trackers: string[];
  /** Les sites tiers sont-ils connus ? (favori) */
  thirdParty: boolean;
  cameras: number;
  /** Commentaires HTML (favori). */
  comments?: number;
  graffiti: number;
  /** Images cassées au moment du relevé (favori). */
  ruins: number;
  /** Couleurs de fond relevées : la ville peut prendre les vraies couleurs du site. */
  colors: boolean;
  /** Couleur de fond de la page entière (favori). */
  background?: string;
}

/** Seuils de poids : au-delà de chacun, le temps se gâte d'un cran. */
const BYTES = [600_000, 1_500_000, 3_000_000, 6_000_000];
const ELEMENTS = [800, 1_500, 3_000, 6_000];
const SKIES: Weather[] = ["clear", "fair", "cloudy", "overcast", "storm"];

export const MAX_FACTORIES = 12;
/** Une usine pour six scripts (la première dès un script). */
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
