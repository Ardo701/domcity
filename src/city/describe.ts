/** Fiche d'un lot, pour la bulle de survol et l'inspecteur. */

import { KINDS, type Kind } from "@/format/taxonomy";
import type { CityImage, CityLinks } from "@/format/types";
import { FLOOR, type CityLayout, type Lot, type RoadStyle } from "./layout";

export interface LotStep {
  id: number;
  selector: string;
  name: string;
}

/**
 * Les rues ne sont pas dans la page : la ville les trace entre les éléments d'un conteneur.
 * Au survol, elles portent le nom de leur genre, et la fiche est celle de ce conteneur.
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

/** Les petites images ne sont pas des panneaux : elles ont leur propre nom. */
const EMBLEMS = {
  sign: { name: "Panonceau", blurb: "Une icône du site (moins de 48 px), sur un petit panneau à son image." },
  flag: { name: "Drapeau", blurb: "Un petit drapeau du site (moins de 48 px), hissé sur son mât." },
} as const;

/**
 * Nom et phrase d'un lot : ceux de son genre, sauf les petites images, et le texte écrit
 * directement dans un conteneur (dans un tableau, le texte de ses cases : une ferme).
 */
function nameOf(lot: Lot, layout?: CityLayout): { name: string; blurb: string } {
  if (lot.panel?.emblem) return EMBLEMS[lot.panel.emblem];
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
    if (!current.ownText) {
      path.unshift({ id: current.id, selector: selectorOf(current), name: nameOf(current).name });
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
    name: nameOf(lot, layout).name,
    blurb: nameOf(lot, layout).blurb,
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
