/** Fiche d'un lot, pour la bulle de survol et l'inspecteur. */

import { KINDS, type Kind } from "@/format/taxonomy";
import type { CityImage, CityLinks } from "@/format/types";
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
  /** Fond réel sous l'élément (le sien ou celui d'un parent), quand le favori l'a relevé. */
  background?: string;
  /** Position sur la page réelle [x, y, largeur, hauteur]. */
  rect?: [number, number, number, number];
  depth: number;
  /** Étages d'un bâtiment (pas d'un conteneur ni d'un équipement). */
  floors?: number;
  path: LotStep[];
}

const STOREYED = new Set<Kind>(["tower", "residence", "house", "monument", "belfry", "embassy"]);

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

  // La couleur n'est notée que là où elle change : on remonte jusqu'au dernier fond connu.
  let background: string | undefined;
  for (let c: Lot | undefined = lot; c && !background; c = c.parent >= 0 ? layout.lots[c.parent] : undefined) {
    background = c.node.bg;
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
    background,
    rect: lot.ownText ? undefined : lot.node.rect,
    depth: lot.depth,
    floors: STOREYED.has(lot.kind) ? Math.max(1, Math.round(lot.h / FLOOR)) : undefined,
    path,
  };
}

const numberFormat = new Intl.NumberFormat("fr-FR");

export function formatCount(value: number): string {
  return numberFormat.format(Math.round(value));
}

/** Poids lisible : 840 Ko, 2,4 Mo. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatCount(bytes)} o`;
  if (bytes < 1024 * 1024) return `${formatCount(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

export function formatChars(value: number): string {
  return `${formatCount(value)} caractère${value > 1 ? "s" : ""}`;
}
