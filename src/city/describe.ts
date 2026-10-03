/** A lot's card, for the hover tooltip and the inspector. */

import { KINDS, type Kind } from "@/format/taxonomy";
import type { CityImage, CityLinks } from "@/format/types";
import { FLOOR, type CityLayout, type Lot, type RoadStyle } from "./layout";

export interface LotStep {
  id: number;
  selector: string;
  name: string;
}

/**
 * Streets are not in the page: the city draws them between the elements of a container.
 * On hover, they carry the name of their kind, and the card is that of the container.
 */
export const ROAD_NAMES: Record<RoadStyle, string> = {
  ring: "Périphérique",
  avenue: "Avenue",
  street: "Rue",
  lane: "Ruelle",
  path: "Allée",
  highway: "Autoroute",
};

export interface LotInfo {
  id: number;
  kind: Kind;
  name: string;
  blurb: string;
  color: string;
  /** Readable selector: div.infobox, section#histoire... */
  selector: string;
  heading?: string;
  /** Building added for the text written directly in a container. */
  ownText: boolean;
  /** Gallery added to carry the images of a container that has nothing else. */
  gallery: boolean;
  text: number;
  textTotal: number;
  children: number;
  descendants: number;
  links?: CityLinks;
  img?: CityImage;
  /** Real background under the element (its own or a parent's), when the bookmarklet captured it. */
  background?: string;
  /** Position on the real page [x, y, width, height]. */
  rect?: [number, number, number, number];
  depth: number;
  /** Floors of a building (not of a container or a facility). */
  floors?: number;
  path: LotStep[];
}

const STOREYED = new Set<Kind>(["tower", "residence", "house", "monument", "belfry", "embassy"]);

/** Small images are not posters: they have their own name. */
const EMBLEMS = {
  sign: { name: "Enseigne", blurb: "Une icône du site (moins de 48 px), en enseigne au rez-de-chaussée du bâtiment le plus proche dans la page." },
  flag: { name: "Drapeau", blurb: "Un petit drapeau du site (moins de 48 px), hissé sur un mât, au toit du bâtiment le plus proche dans la page." },
} as const;

/** Building added by the city: for a container's direct text, or to carry its images. */
const added = (lot: Lot) => lot.ownText || lot.gallery !== undefined;

/**
 * Name and sentence of a lot: those of its kind, except small images, and text written
 * directly in a container (in a table, the text of its cells: a farm).
 */
function nameOf(lot: Lot, layout?: CityLayout): { name: string; blurb: string } {
  if (lot.panel?.emblem) return EMBLEMS[lot.panel.emblem];
  if (lot.gallery !== undefined && layout) {
    const where = `<${selectorOf(layout.lots[lot.parent])}>`;
    return {
      name: KINDS.gallery.name,
      blurb: `${lot.gallery > 1 ? `Les ${lot.gallery} images` : "L'image"} de ${where}, sans texte à côté pour les porter : un immeuble couvert d'écrans.`,
    };
  }
  if (lot.ownText && layout) {
    const parent = layout.lots[lot.parent];
    const where = `<${selectorOf(parent)}>`;
    return parent.kind === "fields"
      ? { name: "Ferme", blurb: `Le texte des cases du tableau ${where} : une ferme au milieu de ses champs.` }
      : { name: KINDS[lot.kind].name, blurb: `Le texte écrit directement dans ${where}, sans balise à lui.` };
  }
  return KINDS[lot.kind];
}

export function selectorOf(lot: Lot): string {
  return `${lot.node.tag}${lot.node.label ?? ""}`;
}

export function describeLot(layout: CityLayout, id: number): LotInfo {
  const lot = layout.lots[id];
  const kind = KINDS[lot.kind];
  const path: LotStep[] = [];
  let current: Lot | undefined = lot;
  while (current) {
    if (!added(current)) {
      path.unshift({ id: current.id, selector: selectorOf(current), name: nameOf(current).name });
    }
    current = current.parent >= 0 ? layout.lots[current.parent] : undefined;
  }

  // The color is only noted where it changes: we walk up to the last known background.
  let background: string | undefined;
  for (let c: Lot | undefined = lot; c && !background; c = c.parent >= 0 ? layout.lots[c.parent] : undefined) {
    background = c.node.bg;
  }

  let children = 0;
  for (let i = lot.id + 1; i < lot.subtreeEnd; i += 1) {
    if (layout.lots[i].parent === lot.id && !added(layout.lots[i])) children += 1;
  }

  return {
    id,
    kind: lot.kind,
    name: nameOf(lot, layout).name,
    blurb: nameOf(lot, layout).blurb,
    color: kind.color,
    selector: selectorOf(lot),
    heading: lot.node.heading,
    ownText: lot.ownText,
    gallery: lot.gallery !== undefined,
    text: lot.gallery !== undefined ? 0 : lot.node.text ?? 0,
    textTotal: lot.textTotal,
    children,
    descendants: lot.subtreeEnd - lot.id - 1,
    links: added(lot) ? undefined : lot.node.links,
    img: lot.node.img,
    background,
    rect: added(lot) ? undefined : lot.node.rect,
    depth: lot.depth,
    floors: STOREYED.has(lot.kind) ? Math.max(1, Math.round(lot.h / FLOOR)) : undefined,
    path,
  };
}

const numberFormat = new Intl.NumberFormat("fr-FR");

export function formatCount(value: number): string {
  return numberFormat.format(Math.round(value));
}

/** Readable weight: 840 Ko, 2,4 Mo. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatCount(bytes)} o`;
  if (bytes < 1024 * 1024) return `${formatCount(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export function formatChars(value: number): string {
  return `${formatCount(value)} caractère${value > 1 ? "s" : ""}`;
}
