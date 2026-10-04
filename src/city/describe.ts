/** A lot's card, for the hover tooltip and the inspector. */

import { KINDS, type Kind } from "@/format/taxonomy";
import type { CityImage, CityLinks } from "@/format/types";
import type { Locale } from "@/i18n/locale";
import { KINDS_TEXT } from "@/i18n/messages/kinds";
import { FLOOR, type CityLayout, type Lot } from "./layout";

export interface LotStep {
  id: number;
  selector: string;
  name: string;
}

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

/** Building added by the city: for a container's direct text, or to carry its images. */
const added = (lot: Lot) => lot.ownText || lot.gallery !== undefined;

/**
 * Name and sentence of a lot: those of its kind, except small images, and text written
 * directly in a container (in a table, the text of its cells: a farm).
 */
function nameOf(lot: Lot, locale: Locale, layout?: CityLayout): { name: string; blurb: string } {
  const m = KINDS_TEXT[locale];
  if (lot.panel?.emblem) return m.emblems[lot.panel.emblem];
  if (lot.gallery !== undefined && layout) {
    const where = `<${selectorOf(layout.lots[lot.parent])}>`;
    return { name: m.kinds.gallery.name, blurb: m.galleryBlurb(lot.gallery, where) };
  }
  if (lot.ownText && layout) {
    const parent = layout.lots[lot.parent];
    const where = `<${selectorOf(parent)}>`;
    return parent.kind === "fields"
      ? { name: m.farm, blurb: m.farmBlurb(where) }
      : { name: m.kinds[lot.kind].name, blurb: m.ownTextBlurb(where) };
  }
  return m.kinds[lot.kind];
}

export function selectorOf(lot: Lot): string {
  return `${lot.node.tag}${lot.node.label ?? ""}`;
}

export function describeLot(layout: CityLayout, id: number, locale: Locale): LotInfo {
  const lot = layout.lots[id];
  const kind = KINDS[lot.kind];
  const path: LotStep[] = [];
  let current: Lot | undefined = lot;
  while (current) {
    if (!added(current)) {
      path.unshift({ id: current.id, selector: selectorOf(current), name: nameOf(current, locale).name });
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
    ...nameOf(lot, locale, layout),
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
