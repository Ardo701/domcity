/** Fiche d'un lot, pour la bulle de survol et l'inspecteur. */

import { KINDS, type Kind } from "@/format/taxonomy";
import type { CityImage, CityLinks } from "@/format/types";
import type { CityLayout, Lot } from "./layout";

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
  /** Sélecteur lisible : div.infobox, section#histoire… */
  selector: string;
  heading?: string;
  /** Bâtiment ajouté pour le texte écrit directement dans un conteneur. */
  ownText: boolean;
  text: number;
  textTotal: number;
  children: number;
  descendants: number;
  links?: CityLinks;
  img?: CityImage;
  depth: number;
  altitude: number;
  height: number;
  path: LotStep[];
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
    if (!current.ownText) {
      path.unshift({ id: current.id, selector: selectorOf(current), name: KINDS[current.kind].name });
    }
    current = current.parent >= 0 ? layout.lots[current.parent] : undefined;
  }

  let children = 0;
  for (let i = lot.id + 1; i < lot.subtreeEnd; i += 1) {
    if (layout.lots[i].parent === lot.id && !layout.lots[i].ownText) children += 1;
  }

  return {
    id,
    kind: lot.kind,
    name: kind.name,
    blurb: lot.ownText
      ? `Le texte écrit directement dans ce ${KINDS[layout.lots[lot.parent].kind].name.toLowerCase()}, sans balise à lui.`
      : kind.blurb,
    color: kind.color,
    selector: selectorOf(lot),
    heading: lot.node.heading,
    ownText: lot.ownText,
    text: lot.node.text ?? 0,
    textTotal: lot.textTotal,
    children,
    descendants: lot.subtreeEnd - lot.id - 1,
    links: lot.ownText ? undefined : lot.node.links,
    img: lot.node.img,
    depth: lot.depth,
    altitude: lot.y,
    height: lot.h,
    path,
  };
}

const numberFormat = new Intl.NumberFormat("fr-FR");

export function formatCount(value: number): string {
  return numberFormat.format(Math.round(value));
}

export function formatChars(value: number): string {
  return `${formatCount(value)} caractère${value > 1 ? "s" : ""}`;
}
