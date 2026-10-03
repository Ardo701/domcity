/**
 * L'urbanisme : où va chaque élément, et à quelle hauteur.
 *
 * - La ville est plate, posée sur le socle d'une maquette et entourée d'un périphérique.
 * - Chaque conteneur range ses enfants en rangées, dans l'ordre de la page :
 *   de gauche à droite, puis du nord (haut de page) au sud (bas de page).
 * - Des rues séparent les conteneurs voisins et découpent les longues rangées en pâtés
 *   de maisons. Dans un pâté, les éléments se touchent sur un trottoir commun, comme
 *   les immeubles d'une rue. Les rues sont larges entre les grandes parties de la page,
 *   plus étroites en profondeur.
 * - Parcs, listes, formulaires, tableaux, menus, en-tête et pied de page ont leur propre sol.
 * - Une ligne <hr> coupe son quartier par un canal bordé de quais.
 *
 * Résultat : des « lots » numérotés en ordre de document (le sous-arbre d'un lot occupe
 * les numéros id+1 … subtreeEnd-1), plus les rues, les trottoirs et quelques décors.
 */

import { kindOf, type Kind } from "@/format/taxonomy";
import type { CityDoc, CityNode } from "@/format/types";
import { ambianceOf, type Ambiance, type Weather } from "./ambiance";
import { rand } from "./palette";

export interface Panel {
  /** Largeur et hauteur de l'affiche. */
  width: number;
  height: number;
  /** Hauteur du bas de l'affiche au-dessus de la base du lot (sur un toit : ses poteaux, ou le mât d'un drapeau). */
  lift: number;
  /** Petite image : une enseigne, ou un drapeau sur son mât, plutôt qu'une grande affiche. */
  emblem?: Emblem;
  /** Où elle est accrochée sur son bâtiment porteur : une façade, ou le toit. */
  mount: Mount;
}

/** Une façade (celle qui regarde vers le sud, le nord, l'est, l'ouest) ou le toit. */
export type Mount = "south" | "north" | "east" | "west" | "roof";

export type Emblem = "sign" | "flag";

/** Sous cette taille (en pixels), une image est une icône : pas de grand panneau pour elle. */
export const ICON_SIZE = 48;
const FLAG_NAME = /flag|drapeau|bandera|flagge|bandiera|bandeira/i;

/**
 * Petite image : drapeau (son fichier ou son texte de remplacement le dit, et il est plus large
 * que haut) ou simple icône. Rien pour une vraie image, même perdue : elle garde son panneau.
 */
export function emblemOf(node: CityNode): Emblem | undefined {
  const img = node.img;
  const size = Math.max(img?.w ?? 0, img?.h ?? 0);
  const small = size > 0 && size < ICON_SIZE;
  if (!small && (img?.src || size > 0)) return undefined;
  const file = (img?.src ?? "").split(/[?#]/)[0].split("/").pop() ?? "";
  const wide = (img?.w ?? 0) > (img?.h ?? 0) * 1.15;
  return wide && (FLAG_NAME.test(file) || FLAG_NAME.test(img?.alt ?? "")) ? "flag" : "sign";
}

/** Enseigne : la plus grande dimension de la plaque, et la hauteur de son bas sur la façade. */
const SIGN_SIZE = 1;
const SIGN_LIFT = 1.05;
/** Drapeau : sa largeur, et la hauteur de son mât au-dessus du toit. */
const FLAG_WIDTH = 1.6;
const FLAG_MAST = 2.2;
/** Le bas des affiches, au-dessus des vitrines, des enseignes et des graffitis. */
const POSTER_LIFT = 2.2;
const POSTER_GAP = 0.35;
/** Les poteaux d'un panneau sur un toit. */
const ROOF_LIFT = 0.8;
/** Épaisseur d'une affiche sur sa façade. */
const POSTER_DEPTH = 0.12;

/** Ce qui s'accroche à un bâtiment plutôt que de prendre une case au sol : les images, les écrans. */
const MOUNTED = new Set<Kind>(["billboard", "screen"]);
/** Ce qui peut porter des affiches. */
const HOSTS = new Set<Kind>(["tower", "residence", "house", "gallery"]);

export interface Lot {
  id: number;
  parent: number;
  /** Premier numéro après le sous-arbre de ce lot. */
  subtreeEnd: number;
  node: CityNode;
  kind: Kind;
  depth: number;
  container: boolean;
  /** Bâtiment ajouté pour porter le texte écrit directement dans un conteneur. */
  ownText: boolean;
  /** Emprise au sol : coin nord-ouest (x, z), largeur (w, le long de x), profondeur (d, le long de z). */
  x: number;
  z: number;
  w: number;
  d: number;
  /** Altitude de la base. */
  y: number;
  /** Hauteur du bâtiment, ou épaisseur du sol pour un conteneur qui en a un (0 sinon). */
  h: number;
  /** Texte propre + texte de tous les descendants. */
  textTotal: number;
  panel?: Panel;
  /**
   * Posé ailleurs que sur une case au sol : une image accrochée à un bâtiment voisin, ou un
   * conteneur qui n'a que des images (il n'a pas de sol, son emprise est celle de ses images).
   */
  hung?: boolean;
  /** Galerie : le nombre d'images qu'elle a été bâtie pour porter. */
  gallery?: number;
}

/** `highway` : les autoroutes de la mégalopole, entre les villes. */
export type RoadStyle = "ring" | "avenue" | "street" | "lane" | "path" | "highway";
export type GroundStyle = "base" | "sidewalk" | "plaza" | "grass" | "lawn" | "crops" | "dirt" | "wharf" | "quay";

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Road extends Rect {
  /** Sens de la chaussée. */
  axis: "x" | "z";
  style: RoadStyle;
  /** Le conteneur dont c'est une rue : survoler la rue, c'est désigner le conteneur. */
  owner: number;
  y: number;
  /** Tracée sur une pelouse (lotissement, parc) : retirée, elle laisse l'herbe, pas un trou. */
  lawn?: boolean;
}

/** Les côtés d'une case de raccord par lesquels la chaussée en sort. */
export interface Openings {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

/**
 * Case de raccord entre tronçons de chaussée. Deux côtés voisins ouverts font un virage
 * arrondi (les coins du périphérique) ; deux côtés opposés, une ligne droite ; trois ou
 * quatre, un carrefour. Pour brancher une autre route (les autoroutes de la mégalopole),
 * il suffit d'ouvrir un côté de plus : le moteur dessine alors le carrefour.
 */
export interface Joint extends Rect {
  open: Openings;
  style: RoadStyle;
  /** Le sol qui borde la chaussée hors du virage. */
  verge: GroundStyle;
  owner: number;
  y: number;
}

export interface Plate extends Rect {
  style: GroundStyle;
  owner: number;
  y: number;
  h: number;
}

export interface Decor extends Rect {
  /**
   * Le port (bassin et grues) du pied de page, la porte monumentale de l'en-tête, une place publique,
   * un bosquet de la campagne autour de la mégalopole.
   */
  type: "harbor" | "gate" | "square" | "woods";
  owner: number;
  y: number;
}

/** L'arc de la porte de l'en-tête, au milieu de sa place : largeur de l'ouverture et hauteur des piliers. */
export function gateArch(decor: Decor): { span: number; height: number; top: number } {
  const span = Math.min(11, Math.max(4, decor.w * 0.3));
  const height = Math.min(9, Math.max(5, span * 0.85));
  // Piliers, linteau (1,3) et attique (0,7).
  return { span, height, top: decor.y + height + 2 };
}

/** Chenal d'un port : son eau, du bassin jusqu'au bord de la maquette. */
export interface Channel extends Rect {
  /** Sens du chenal : le long de x (bassin prolongé vers l'ouest ou l'est), de z (vers le sud). */
  axis: "x" | "z";
  /** Le port, pour le survol. */
  owner: number;
  /** Base de l'eau : celle du bassin. */
  y: number;
}

/** Le pont d'une rue au-dessus d'un chenal : la partie de la chaussée qui franchit l'eau. */
export interface Bridge extends Rect {
  axis: "x" | "z";
  style: RoadStyle;
  owner: number;
  y: number;
}

/**
 * L'aéroport : les liens de la page vers d'autres sites. Il n'est pas un élément de la page :
 * il est hors les murs, à l'est de la ville, sur une extension du socle, relié au périphérique.
 * Dans la mégalopole, chaque ville garde un petit aérodrome (une piste, un hangar) et le site a
 * son grand aéroport commun.
 */
export interface Airport extends Rect {
  kind: "airport" | "aerodrome";
  /** Numéro de survol : juste après le dernier lot (ce n'est pas un lot). */
  id: number;
  /** Niveau des pistes et du tarmac. */
  y: number;
  /** Liens vers d'autres sites, dans toute la page. */
  external: number;
  runways: Rect[];
  /** Voies de circulation des avions : la grande, parallèle aux pistes, et ses bretelles. */
  taxiways: Array<Rect & { axis: "x" | "z" }>;
  apron: Rect;
  /** Le terminal (le hangar d'un aérodrome). */
  terminal: Rect;
  /** La tour de contrôle (la manche à air d'un aérodrome). */
  tower: Rect;
  /** Avions aux portes du terminal (devant le hangar). */
  planes: number;
  /** Sites visés par les liens, du plus visé au moins visé (relevés récents seulement). */
  destinations: Array<[domain: string, links: number]>;
  /** Un avion en vol vers chacun des premiers sites : il vient de décoller, cap sur sa destination. */
  flights: Flight[];
}

export interface Flight {
  domain: string;
  x: number;
  y: number;
  z: number;
  /** Cap (rotation autour de la verticale, 0 = vers l'est) et cabré. */
  heading: number;
  pitch: number;
}

/** Une usine dans la ceinture verte : un hall et ses cheminées qui fument. */
export interface Factory extends Rect {
  /** Sens du hall : le long de la ceinture. */
  axis: "x" | "z";
  chimneys: number;
  y: number;
}

/** Les usines de la ville : les scripts de la page. Un seul numéro de survol pour toutes. */
export interface Industry {
  id: number;
  scripts: number;
  factories: Factory[];
}

/** Une caméra de surveillance sur son mât, au bord d'une rue. */
export interface Camera {
  x: number;
  y: number;
  z: number;
  /** Où regarde l'objectif (0 = vers l'est, comme un avion). */
  heading: number;
}

/** Les caméras de la ville : les traqueurs publicitaires de la page. */
export interface Surveillance {
  id: number;
  trackers: string[];
  cameras: Camera[];
}

export interface Cloud {
  x: number;
  y: number;
  z: number;
  /** Rayon du gros du nuage. */
  size: number;
}

/** Ce qui ne s'affiche pas dans la page mais se voit dans la ville : météo, usines, caméras. */
export interface CityAmbiance {
  info: Ambiance;
  weather: Weather;
  clouds: Cloud[];
  industry?: Industry;
  surveillance?: Surveillance;
}

export interface CityStats {
  buildings: number;
  districts: number;
  monuments: number;
  billboards: number;
  rivers: number;
  parks: number;
  vacant: number;
  maxAltitude: number;
  maxDepth: number;
}

export interface CityLayout {
  lots: Lot[];
  roads: Road[];
  /** Raccords entre tronçons (coins du périphérique). */
  joints: Joint[];
  plates: Plate[];
  decor: Decor[];
  /** Chenaux des ports vers l'extérieur, et ponts des rues qui les franchissent. */
  channels: Channel[];
  bridges: Bridge[];
  airport?: Airport;
  /** Absent pour la campagne de la mégalopole. */
  ambiance?: CityAmbiance;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };
  stats: CityStats;
}

// ---------------------------------------------------------------------------
// Réglages de l'urbanisme (1 unité ≈ 3 m)
// ---------------------------------------------------------------------------

/** Épaisseur du socle de la maquette, hauteur d'un trottoir, d'un étage. */
export const BASE = 0.4;
export const CURB = 0.14;
export const FLOOR = 1.15;

export const RING = 6;
export const BELT = 7;
const SIDEWALK = 0.75;
/** Une rue où passent les voitures laisse toujours une file dans chaque sens (2,4 unités : 7 m). */
export const DRIVABLE_MIN = 2.4;
/** Le plus petit côté d'un bâtiment : une maison fait au moins 6,6 m, un immeuble 7,8 m. */
const MIN_SIDE: Partial<Record<Kind, number>> = { house: 2.2, residence: 2.6, tower: 2.6, gallery: 6, vacant: 2, counter: 1.4 };
const ALLEY = 0.16;
const RIVER_WIDTH = 3.4;
const QUAY = 1.3;
const GATE_BAND = 7;
const HARBOR_BAND = 10;
/** Part de la bande du port prise par le quai, au nord du bassin. */
const QUAY_SHARE = 0.38;
/** Épaisseur de l'eau : sa surface reste sous le niveau des quais. */
export const WATER_DEPTH = 0.05;
/** Largeur d'une autoroute : deux fois deux voies et un terre-plein central. */
export const HIGHWAY = 7;

type StreetMode = RoadStyle | "none";

/** Largeur d'une rue de ce genre, à cette profondeur dans la page. */
export function roadWidth(style: RoadStyle, depth: number): number {
  switch (style) {
    case "ring": return RING;
    case "avenue": return Math.max(4.6, 7 * 0.88 ** depth);
    case "street": return Math.max(3, 6.4 * 0.84 ** depth);
    case "lane": return 2.4;
    case "path": return 1.4;
    case "highway": return HIGHWAY;
  }
}

/** Espace entre deux éléments voisins sans rue entre eux, quand ils ne se touchent pas. */
function softGap(mode: StreetMode): number {
  return mode === "path" ? 1.6 : mode === "lane" ? 1.1 : 1;
}

/** Longueur et profondeur d'un pâté de maisons avant qu'une rue ne le coupe. */
function blockLength(mode: StreetMode): number {
  return mode === "avenue" ? 28 : mode === "path" ? 18 : mode === "lane" ? 26 : 24;
}
function blockDepth(mode: StreetMode): number {
  return mode === "lane" ? 9 : mode === "path" ? 12 : 16;
}

/** Les conteneurs qui ont leur propre sol, et la façon dont on y circule. */
function groundOf(kind: Kind): GroundStyle | undefined {
  switch (kind) {
    case "park": return "grass";
    case "estate": return "lawn";
    case "townhall": case "gate": case "boulevard": return "plaza";
    case "fields": return "crops";
    case "port": return "wharf";
    default: return undefined;
  }
}
function streetsOf(kind: Kind): StreetMode | undefined {
  switch (kind) {
    case "park": return "path";
    case "estate": return "lane";
    case "townhall": case "gate": case "boulevard": case "fields": case "port": return "none";
    default: return undefined;
  }
}

/** Les grands édifices ont toujours une rue de chaque côté, et leur parvis. */
const LANDMARKS = new Set<Kind>(["monument", "embassy"]);
export const isLandmark = (kind: Kind) => LANDMARKS.has(kind);

function leafArea(kind: Kind, node: CityNode): number {
  const text = node.text ?? 0;
  switch (kind) {
    case "tower": return 10 + 0.42 * text ** 0.72;
    case "residence": return 9 + 0.38 * text ** 0.72;
    case "house": return 6 + 0.18 * text ** 0.6;
    case "vacant": return 7;
    case "monument": return 110;
    case "belfry": return 48;
    case "kiosk": return 16;
    case "bollard": return 5;
    case "billboard": return emblemOf(node) ? 6 : 24;
    case "ruin": return emblemOf(node) ? 6 : 18;
    case "screen": return 30;
    case "embassy": return 44;
    case "sculpture": return 12;
    case "counter": return 6;
    case "fields": return 18 + 0.25 * text ** 0.75;
    case "river": return 0;
    default: return 8;
  }
}

/** Hauteurs logarithmiques : 10 000 caractères ne font pas une tour de 10 km. */
function leafHeight(kind: Kind, node: CityNode): number {
  const text = node.text ?? 0;
  switch (kind) {
    case "tower": return 4 + 5 * Math.log2(1 + text / 25);
    case "residence": return 2.8 + 2.3 * Math.log2(1 + text / 45);
    case "house": return Math.min(5, 2.6 + 0.5 * Math.log2(1 + text / 40));
    case "vacant": return 0.1;
    case "monument": return 36;
    case "belfry": return 19;
    case "kiosk": return 6.5;
    case "bollard": return 3.2;
    case "embassy": return 6.5;
    case "counter": return 2;
    case "fields": return 0.08;
    case "river": return 0.05;
    default: return 3;
  }
}

// ---------------------------------------------------------------------------
// Arbre de travail
// ---------------------------------------------------------------------------

interface Plot {
  node: CityNode;
  kind: Kind;
  container: boolean;
  ownText: boolean;
  depth: number;
  children: Plot[];
  /** Surface demandée, rues comprises. */
  area: number;
  textTotal: number;
  /** Pâté de maisons ajouté par l'urbanisme : il n'existe pas dans la page, il n'a pas de lot. */
  virtual?: boolean;
  /** Rang parmi les enfants de son conteneur, dans l'ordre de la page (-1 : une galerie ajoutée). */
  order: number;
  /** Faux pour une image (accrochée ailleurs) ou un conteneur qui n'a que des images. */
  placed: boolean;
  /** Enfants qui ne prennent pas de case : leurs lots se créent à leur rang, posés ensuite. */
  unplaced: Plot[];
  /** Le sous-arbre a un bâtiment pour porter des images. */
  hosts: boolean;
  /** Images du sous-arbre encore sans porteur, et de combien de niveaux elles sont remontées. */
  orphans: number;
  climb: number;
  gallery?: number;
  /** Le plus petit côté possible : celui de son bâtiment, ou du plus grand bâtiment qu'il contient. */
  least: number;
}

/**
 * Regroupe les éléments simples qui se suivent entre deux conteneurs en un pâté de maisons :
 * il se range comme un conteneur, bordé de rues, au lieu d'aligner de petits bâtiments
 * à côté de quartiers entiers.
 */
function blocksOf(items: Plot[], mode: StreetMode, depth: number): Plot[] {
  const mixed = items.some((item) => item.container) && items.some((item) => !item.container);
  if (!mixed) return items;
  const out: Plot[] = [];
  let run: Plot[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const gap = run.length === 1 ? 0 : unitGap(mode, depth);
    const inner = run.reduce((sum, item) => sum + (Math.sqrt(item.area) + gap) ** 2, 0);
    out.push({
      node: run[0].node,
      kind: "block",
      container: true,
      ownText: false,
      depth,
      children: run,
      area: inner,
      textTotal: run.reduce((sum, item) => sum + item.textTotal, 0),
      virtual: true,
      order: run[0].order,
      placed: true,
      unplaced: [],
      hosts: run.some((item) => item.hosts),
      orphans: 0,
      climb: 0,
      least: Math.max(0, ...run.map((item) => item.least)),
    });
    run = [];
  };
  for (const item of items) {
    if (item.container) {
      flush();
      out.push(item);
    } else {
      run.push(item);
    }
  }
  flush();
  return out;
}

/** Les genres qui sont des bâtiments. */
const BUILDINGS = new Set<Kind>(["tower", "residence", "house", "monument", "belfry", "kiosk", "bollard", "counter"]);

/**
 * Le texte écrit directement dans un conteneur devient un bâtiment de plus, jamais un champ,
 * un lotissement ou un parc posé sur le sien. Dans un tableau (le texte de ses cases), une liste
 * ou un parc : une maison, la ferme au milieu des champs ; ailleurs, un immeuble.
 */
function ownTextKind(tag: string, text: number, container: Kind): Kind {
  const kind = kindOf(tag, false, text);
  if (BUILDINGS.has(kind)) return kind;
  return container === "fields" || container === "estate" || container === "park" ? "house" : "tower";
}

/** Une galerie : un immeuble couvert d'écrans, bâti pour porter les images d'un bloc qui n'a qu'elles. */
function galleryPlot(node: CityNode, depth: number, images: number): Plot {
  const side = clamp(5 + 1.15 * Math.sqrt(images), 6, 16);
  return {
    node, kind: "gallery", container: false, ownText: false, depth, children: [], area: side * side, textTotal: 0,
    order: -1, placed: true, unplaced: [], hosts: true, orphans: 0, climb: 0, gallery: images, least: MIN_SIDE.gallery ?? 0,
  };
}

/** `textOf` : bâtiment du texte écrit directement dans ce conteneur, de ce genre. */
function buildPlot(node: CityNode, depth: number, streets: StreetMode, textOf?: Kind): Plot {
  const ownText = textOf !== undefined;
  const kept = ownText ? [] : node.children ?? [];
  const container = kept.length > 0;
  const text = node.text ?? 0;
  let kind = ownText ? ownTextKind(node.tag, text, textOf) : kindOf(node.tag, container, text);
  // Une image cassée dans la page : son panneau est en ruine.
  if (kind === "billboard" && node.img?.broken) kind = "ruin";
  const plot: Plot = {
    node, kind, container, ownText, depth, children: [], area: 0, textTotal: text,
    order: 0, placed: true, unplaced: [], hosts: false, orphans: 0, climb: 0, least: MIN_SIDE[kind] ?? 0,
  };

  if (!container) {
    plot.area = leafArea(kind, node);
    plot.placed = !MOUNTED.has(kind);
    plot.hosts = HOSTS.has(kind);
    return plot;
  }

  const mode = depth === 0 ? "street" : streetsOf(kind) ?? streets;
  // Texte écrit directement dans le conteneur : un bâtiment de plus, en premier.
  const built: Plot[] = [];
  if (text > 0) built.push(buildPlot(node, depth + 1, mode, kind));
  for (const child of kept) built.push(buildPlot(child, depth + 1, mode));

  // Les images ne prennent pas de case : elles s'accrochent au bâtiment le plus proche dans la page.
  // Celles qui n'en ont pas dans leur bloc remontent ; au bout de deux niveaux (si elles sont au
  // moins trois), ou au bord d'un quartier, une galerie couverte d'écrans est bâtie pour elles.
  let orphans = 0;
  let climb = 0;
  built.forEach((child, i) => {
    child.order = i;
    plot.textTotal += child.ownText ? 0 : child.textTotal;
    plot.hosts ||= child.hosts;
    if (MOUNTED.has(child.kind)) {
      orphans += 1;
      climb = Math.max(climb, 1);
    } else if (child.orphans > 0) {
      orphans += child.orphans;
      climb = Math.max(climb, child.climb + 1);
    }
    if (child.placed) plot.children.push(child);
    else plot.unplaced.push(child);
  });
  // Une ou deux images seules continuent de chercher un vrai bâtiment ; trois font une galerie.
  if (orphans > 0 && !plot.hosts && ((climb >= 2 && orphans >= 3) || depth <= 1 || kind === "district")) {
    plot.children.unshift(galleryPlot(node, depth + 1, orphans));
    plot.hosts = true;
  }
  plot.orphans = plot.hosts ? 0 : orphans;
  plot.climb = plot.hosts ? 0 : climb;
  if (plot.children.length === 0) {
    plot.placed = false;
    return plot;
  }
  plot.least = Math.max(0, ...plot.children.map((child) => child.least));

  const gap = unitGap(mode, depth);
  const road = mode === "none" ? 0 : roadWidth(mode, depth);
  let inner = 0;
  let rivers = 0;
  for (const child of plot.children) {
    if (child.kind === "river") {
      rivers += 1;
      continue;
    }
    // Un enfant unique remplit son parent : pas de rue à prévoir autour (les enveloppes <div> en chaîne).
    const alone = plot.children.length === 1;
    const big = child.container || LANDMARKS.has(child.kind);
    const side = Math.sqrt(child.area) + (alone ? 0 : big && road > 0 ? road + 2 * SIDEWALK : Math.max(gap, accessMargin(mode)));
    inner += side * side;
  }
  if (inner === 0) inner = 9;
  let side = Math.sqrt(inner) + rivers * (RIVER_WIDTH + 2 * QUAY) * 0.6;
  if (kind === "gate") side += GATE_BAND * 0.6;
  if (kind === "port") side += HARBOR_BAND * 0.6;
  if (depth === 0) side += 2 * (BELT + RING);
  plot.area = side * side;
  return plot;
}

/** Espace moyen réservé autour d'un élément : une demi-rue en ville (les voisins se touchent souvent). */
/**
 * Ce qu'un bâtiment réserve autour de lui, là où passent des voitures, pour qu'une rue le longe :
 * la moitié d'une rue à double sens, son trottoir (son accotement sur une pelouse), la moitié de
 * l'écart avec son voisin de derrière.
 */
function accessMargin(mode: StreetMode): number {
  if (mode !== "street" && mode !== "avenue" && mode !== "lane") return 0;
  return DRIVABLE_MIN / 2 + (mode === "lane" ? 0.35 : SIDEWALK) + softGap(mode) / 2;
}

function unitGap(mode: StreetMode, depth: number): number {
  if (mode === "street" || mode === "avenue") return roadWidth(mode, depth) * 0.55;
  if (mode === "none") return softGap(mode);
  // Un lotissement garde de quoi tracer entre deux rangées une ruelle à double sens (ses jardins).
  if (mode === "lane") return roadWidth(mode, depth) * 0.8;
  return Math.max(roadWidth(mode, depth) * 0.6, softGap(mode));
}

// ---------------------------------------------------------------------------
// Rangement en rangées, dans l'ordre
// ---------------------------------------------------------------------------

interface Row {
  z: number;
  d: number;
  items: Array<{ index: number; x: number; w: number }>;
}

function worstRatio(areas: number[], width: number): number {
  const total = areas.reduce((sum, a) => sum + a, 0);
  const rowDepth = total / width;
  let worst = 0;
  for (const area of areas) {
    const itemWidth = area / rowDepth;
    worst = Math.max(worst, itemWidth / rowDepth, rowDepth / itemWidth);
  }
  return worst;
}

/**
 * Profondeur d'une rangée. Une rangée presque vide (un petit élément seul, la fin d'une liste)
 * s'étalerait en une bande très fine : elle garde des cases presque carrées, centrées,
 * et laisse de la place libre de part et d'autre.
 */
function rowShape(scaled: number[], width: number, rigid: boolean, least = 0) {
  const total = scaled.reduce((sum, a) => sum + a, 0);
  const natural = total / width;
  const side = Math.sqrt(Math.max(...scaled));
  // Jamais moins profonde que son plus petit bâtiment possible : pas d'immeuble en lamelle.
  const depth = Math.max(rigid && natural < side * 0.4 ? side * 0.8 : natural, least);
  return { depth, used: Math.min(width, total / depth) };
}

/** Un conteneur s'adapte à n'importe quelle case ; un bâtiment a besoin d'une case à peu près carrée. */
export type Fit = "flexible" | "leaf" | "landmark";

/** Range des surfaces dans un rectangle, par rangées, sans changer leur ordre. */
export function stripRows(areas: number[], rect: Rect, fits: Fit[] = [], mins: number[] = [], cores: number[] = mins): Row[] {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (areas.length === 0 || total <= 0) return [];
  const scale = (rect.w * rect.d) / total;
  const scaled = areas.map((a) => Math.max(a * scale, 1e-6));
  const rigid = (group: number[]) => group.some((j) => (fits[j] ?? "flexible") !== "flexible");
  /** Chaque case garde au moins la largeur de son bâtiment le plus petit possible. */
  const least = (group: number[]) => Math.max(0, ...group.map((j) => mins[j] ?? 0));
  const shapeOf = (group: number[]) => rowShape(group.map((j) => scaled[j]), rect.w, rigid(group), least(group));
  const wideEnough = (group: number[]) => {
    const { depth } = shapeOf(group);
    return group.every((j) => Math.min(scaled[j] / depth, rect.w) >= (mins[j] ?? 0) - 1e-6);
  };

  const groups: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < scaled.length; i += 1) {
    if (current.length === 0) {
      current.push(i);
      continue;
    }
    // Un petit bâtiment ne partage pas la rangée d'un géant : il serait écrasé en lamelle.
    // Un grand édifice encore moins : il lui faut une case presque carrée pour se dresser.
    const fit = (j: number) => fits[j] ?? "flexible";
    let mismatch = false;
    for (const j of current) {
      const [small, large] = scaled[i] < scaled[j] ? [i, j] : [j, i];
      const limit = fit(i) === "landmark" || fit(j) === "landmark" ? 3 : 25;
      if (fit(small) !== "flexible" && scaled[large] / scaled[small] > limit) mismatch = true;
    }
    const before = worstRatio(current.map((j) => scaled[j]), rect.w);
    const after = worstRatio([...current, i].map((j) => scaled[j]), rect.w);
    if (!mismatch && after <= before && wideEnough([...current, i])) current.push(i);
    else {
      groups.push(current);
      current = [i];
    }
  }
  groups.push(current);

  // Les rangées trop peu remplies prennent plus de profondeur : on resserre l'ensemble pour tenir dans le rectangle.
  const shapes = groups.map(shapeOf);
  const depthTotal = shapes.reduce((sum, shape) => sum + shape.depth, 0);
  // Trop de rangées pour le rectangle : on les tasse, d'abord sur ce qu'elles ont en plus de leur
  // minimum ; seulement s'il n'y suffit pas, toutes ensemble.
  const floors = groups.map(least);
  const spare = shapes.reduce((sum, shape, k) => sum + Math.max(0, shape.depth - floors[k]), 0);
  const excess = depthTotal - rect.d;
  const depthOf = (k: number) => {
    const { depth } = shapes[k];
    if (excess <= 0) return depth;
    if (excess <= spare) return depth - (Math.max(0, depth - floors[k]) * excess) / spare;
    return depth * (rect.d / depthTotal);
  };
  // Même tassées au minimum, les rangées ne tiennent pas : on range les cases comme un texte, ligne
  // à ligne, chacune au moins à sa taille minimale, sans laisser de place libre au bout des lignes.
  if (excess > spare && floors.some((floor) => floor > 0)) {
    const dense = denseRows(scaled, rect, mins);
    // Toujours trop serré : on renonce aux marges (et aux rues qu'elles laissaient passer), jamais à
    // la taille des bâtiments.
    return dense.squeezed && cores !== mins ? denseRows(scaled, rect, cores).rows : dense.rows;
  }

  const rows: Row[] = [];
  let z = rect.z;
  groups.forEach((group, k) => {
    const { depth, used } = shapes[k];
    // Une rangée incomplète est centrée : la place libre se partage entre ses deux bouts.
    let x = rect.x + Math.max(0, rect.w - used) / 2;
    const items = group.map((index) => {
      const w = Math.min(scaled[index] / depth, rect.w);
      const item = { index, x, w };
      x += w;
      return item;
    });
    const d = depthOf(k);
    rows.push({ z, d, items });
    z += d;
  });
  return rows;
}

/**
 * Rangement serré, ligne à ligne : les lignes se coupent sur les largeurs minimales des cases, puis
 * la place qui reste se partage selon leurs surfaces. Chaque case garde ainsi sa largeur et sa
 * profondeur minimales tant que le rectangle peut les contenir.
 */
function denseRows(scaled: number[], rect: Rect, mins: number[]): { rows: Row[]; squeezed: boolean } {
  // Une case sans minimum (un conteneur vide de bâtiments, une statue) compte pour une petite largeur.
  const narrow = (j: number) => Math.max(mins[j] ?? 0, Math.sqrt(scaled[j]) * 0.6);
  const groups: number[][] = [];
  let current: number[] = [];
  let width = 0;
  for (let i = 0; i < scaled.length; i += 1) {
    if (current.length > 0 && width + narrow(i) > rect.w + 1e-6) {
      groups.push(current);
      current = [];
      width = 0;
    }
    current.push(i);
    width += narrow(i);
  }
  groups.push(current);

  const floors = groups.map((group) => Math.max(0, ...group.map((j) => mins[j] ?? 0)));
  const areas = groups.map((group) => group.reduce((sum, j) => sum + scaled[j], 0));
  const floorTotal = floors.reduce((sum, f) => sum + f, 0);
  const areaTotal = areas.reduce((sum, a) => sum + a, 0) || 1;
  // La profondeur qui reste après les minimums se partage selon les surfaces ; en dernier recours
  // (le rectangle est vraiment trop petit), tout se tasse ensemble.
  const extra = rect.d - floorTotal;
  const depths = floors.map((floor, k) => (extra >= 0 ? floor + (extra * areas[k]) / areaTotal : (floor * rect.d) / floorTotal));

  const rows: Row[] = [];
  let z = rect.z;
  groups.forEach((group, k) => {
    const base = group.map(narrow);
    const used = base.reduce((sum, w) => sum + w, 0);
    const spare = Math.max(0, rect.w - used);
    const share = areas[k] || 1;
    let x = rect.x;
    const items = group.map((index, n) => {
      const w = Math.min(base[n] + (spare * scaled[index]) / share, rect.w);
      const item = { index, x, w };
      x += w;
      return item;
    });
    rows.push({ z, d: depths[k], items });
    z += depths[k];
  });
  return { rows, squeezed: extra < 0 };
}

/** Un joint de rangée ne va chercher sa ligne de grille qu'à cette fraction de l'espacement. */
const SNAP = 0.3;
/** Pas de ligne de grille si près du bord d'un tronçon : le bout de pâté serait trop court. */
const GRID_MARGIN = 0.4;

/**
 * Lignes de la grille des rues transversales qui traversent un tronçon. La grille est calée sur
 * la ville entière : deux listes l'une au-dessus de l'autre partagent les mêmes lignes.
 */
export function gridLines(x0: number, width: number, spacing: number): number[] {
  const lines: number[] = [];
  const from = x0 + spacing * GRID_MARGIN;
  const to = x0 + width - spacing * GRID_MARGIN;
  // « || 0 » : l'arrondi d'un nombre négatif proche de zéro donne -0.
  for (let k = Math.ceil(from / spacing) || 0; k * spacing < to; k += 1) lines.push(k * spacing);
  return lines;
}
/** Étirement permis aux cases entre deux joints déplacés. */
const STRETCH: [number, number] = [0.7, 1.4];

/**
 * Choisit dans une rangée les joints où passent les rues transversales : ceux qui tombent près
 * d'une grille commune à toutes les rangées. Chaque joint retenu est amené sur sa ligne, en étirant
 * un peu les cases d'entre deux. D'une rangée à l'autre, les rues se prolongent au lieu de se décaler.
 * Renvoie le numéro de la case qui suit chaque joint retenu.
 */
function alignJoints(row: Row, lines: number[], spacing: number): Set<number> {
  const items = row.items;
  const start = items[0].x;
  const end = items[items.length - 1].x + items[items.length - 1].w;
  // Repères : un joint, sa position d'origine et sa place sur la grille. Les deux bouts ne bougent pas.
  const pins = [{ j: 0, from: start, to: start }];
  const fits = (a: { from: number; to: number }, b: { from: number; to: number }) => {
    const scale = (b.to - a.to) / (b.from - a.from);
    return scale >= STRETCH[0] && scale <= STRETCH[1];
  };
  for (const line of lines) {
    const previous = pins[pins.length - 1];
    // Le joint le plus proche de la ligne ; s'il étire trop les cases d'avant, le suivant.
    const candidates: number[] = [];
    for (let j = previous.j + 1; j < items.length; j += 1) {
      if (Math.abs(items[j].x - line) < spacing * SNAP) candidates.push(j);
    }
    candidates.sort((a, b) => Math.abs(items[a].x - line) - Math.abs(items[b].x - line));
    const pin = candidates
      .map((j) => ({ j, from: items[j].x, to: line }))
      .find((candidate) => fits(previous, candidate));
    if (pin) pins.push(pin);
  }
  const last = { j: items.length, from: end, to: end };
  while (pins.length > 1 && !fits(pins[pins.length - 1], last)) pins.pop();
  pins.push(last);

  for (let k = 0; k < pins.length - 1; k += 1) {
    const a = pins[k];
    const b = pins[k + 1];
    const scale = (b.to - a.to) / (b.from - a.from);
    for (let j = a.j; j < b.j; j += 1) {
      items[j].x = a.to + (items[j].x - a.from) * scale;
      items[j].w *= scale;
    }
  }
  return new Set(pins.slice(1, -1).map((pin) => pin.j));
}

/** Les mêmes rangées, à plat : une case par surface. */
export function stripLayout(areas: number[], rect: Rect): Rect[] {
  const cells: Rect[] = areas.map(() => ({ ...rect, w: 0, d: 0 }));
  for (const row of stripRows(areas, rect)) {
    for (const item of row.items) cells[item.index] = { x: item.x, z: row.z, w: item.w, d: row.d };
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

interface Ctx {
  lots: Lot[];
  /** Enfants sans case de chaque conteneur en cours de pose, dans l'ordre de la page. */
  waiting: Map<number, Plot[]>;
  roads: Road[];
  joints: Joint[];
  plates: Plate[];
  decor: Decor[];
  channels: Channel[];
  bridges: Bridge[];
  airport?: Airport;
}

interface Env {
  /** Sol fourni par un conteneur ancêtre (parc, pelouse, place…) : pas de trottoirs à poser. */
  ground?: GroundStyle;
  streets: StreetMode;
  /** Les bords de la case qui donnent sur une rue (tous, si absent : le périphérique entoure la ville). */
  access?: Access;
}

interface Access {
  north: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
}

/** Ce qu'il y a d'un côté d'une case : une rue, un simple écart, un voisin collé, ou le bord du conteneur. */
type Side = "road" | "soft" | "attached" | "edge";

/** Une limite entre deux cases, et la largeur de ce qui la sépare. */
interface Edge {
  side: Side;
  width: number;
}

const EDGE: Edge = { side: "edge", width: 0 };

export interface LayoutOptions {
  /**
   * « aerodrome » dans la mégalopole : le grand aéroport est commun au site, chaque ville garde
   * une petite piste (si elle a assez de liens vers d'autres sites). « none » : rien hors les murs.
   */
  airport?: "airport" | "aerodrome" | "none";
}

/** Côté du socle d'une page, sans la construire : la mégalopole range ses villes avant de les bâtir. */
export function citySide(doc: CityDoc): number {
  return Math.sqrt(buildPlot(doc.root, 0, "street").area);
}

export function layoutCity(doc: CityDoc, options: LayoutOptions = {}): CityLayout {
  const rootPlot = buildPlot(doc.root, 0, "street");
  const ctx: Ctx = { lots: [], waiting: new Map(), roads: [], joints: [], plates: [], decor: [], channels: [], bridges: [] };
  const side = Math.sqrt(rootPlot.area);
  const edge = { x: -side / 2, z: -side / 2, w: side, d: side };
  place(rootPlot, edge, 0, -1, ctx, { streets: "street" });
  hangImages(ctx.lots);
  const kind = options.airport ?? "airport";
  if (kind !== "none") {
    const site: AirportSite = {
      x0: edge.x + edge.w, z: edge.z, d: edge.d, center: edge.z + edge.d / 2,
      access: edge.x + edge.w - BELT, owner: 0, y: BASE,
    };
    const plan = kind === "aerodrome" ? planAerodrome : planAirport;
    ctx.airport = plan(ctx, site, externalLinks(doc.root), doc.linksTo?.sites ?? []);
  }
  openHarbors(ctx, ctx.airport ? { ...edge, w: ctx.airport.x + ctx.airport.w - edge.x } : edge);
  connectRoads(ctx);
  const { lots } = ctx;

  // Le monument (h1) domine toujours la ville.
  let tallest = 0;
  for (const lot of lots) if (lot.kind === "tower" || lot.kind === "residence") tallest = Math.max(tallest, lot.h);
  for (const lot of lots) if (lot.kind === "monument") lot.h = Math.max(lot.h, tallest * 1.15 + 6);

  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, maxY: 0 };
  const stats: CityStats = {
    buildings: 0, districts: 0, monuments: 0, billboards: 0, rivers: 0, parks: 0, vacant: 0,
    maxAltitude: 0, maxDepth: 0,
  };
  for (const lot of lots) {
    bounds.minX = Math.min(bounds.minX, lot.x);
    bounds.maxX = Math.max(bounds.maxX, lot.x + lot.w);
    bounds.minZ = Math.min(bounds.minZ, lot.z);
    bounds.maxZ = Math.max(bounds.maxZ, lot.z + lot.d);
    bounds.maxY = Math.max(bounds.maxY, lot.y + lot.h);
    stats.maxDepth = Math.max(stats.maxDepth, lot.depth);
    if (lot.container) {
      stats.maxAltitude = Math.max(stats.maxAltitude, lot.y + lot.h);
      if (lot.kind === "district") stats.districts += 1;
      if (lot.kind === "park") stats.parks += 1;
      continue;
    }
    switch (lot.kind) {
      case "river": stats.rivers += 1; break;
      case "vacant": stats.vacant += 1; break;
      case "billboard": case "ruin": stats.billboards += 1; break;
      case "monument": case "belfry": case "kiosk": case "bollard": stats.monuments += 1; break;
      default: stats.buildings += 1;
    }
  }
  // L'ambiance : usines dans la ceinture verte, caméras au bord des rues, nuages au-dessus.
  const info = ambianceOf(doc);
  const seed = hashOf(doc.url);
  // Numéros de survol après le dernier lot : l'aéroport, puis les usines, puis les caméras.
  let special = lots.length + (ctx.airport ? 1 : 0);
  const factories = planFactories(ctx, edge, info.factories, seed);
  const cameras = planCameras(ctx, edge, info.cameras, seed);
  const ambiance: CityAmbiance = {
    info,
    weather: info.weather,
    clouds: planClouds(info.weather, edge, bounds.maxY, seed),
    industry: factories.length > 0 ? { id: special++, scripts: info.scripts ?? 0, factories } : undefined,
    surveillance: cameras.length > 0 ? { id: special++, trackers: info.trackers, cameras } : undefined,
  };
  if (ctx.airport) includeAirport(bounds, ctx.airport);
  return {
    lots, roads: ctx.roads, joints: ctx.joints, plates: ctx.plates, decor: ctx.decor,
    channels: ctx.channels, bridges: ctx.bridges, airport: ctx.airport, ambiance, bounds, stats,
  };
}

// ---------------------------------------------------------------------------
// L'ambiance
// ---------------------------------------------------------------------------

/** Tirage stable dans [0, 1[ à partir d'une graine et d'un rang. */
function draw(seed: number, k: number): number {
  const x = Math.sin((seed % 100_003) * 0.0173 + k * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FACTORY_LENGTH = 9;
const FACTORY_GAP = 4;

/**
 * Les usines, dans la ceinture verte : d'abord à l'ouest (l'est est à l'aéroport), puis au sud,
 * puis au nord, groupées au milieu de chaque côté comme une zone industrielle. Jamais près des
 * coins (la mégalopole y branche ses bretelles), ni sur un chenal ou une rue qui traverse.
 */
function planFactories(ctx: Ctx, edge: Rect, count: number, seed: number): Factory[] {
  if (count === 0) return [];
  const b = BELT;
  const across = b - 1.8;
  const margin = BELT + RING + 3;
  const y = BASE + CURB;
  const sides: Array<{ axis: "x" | "z"; from: number; to: number; at: number }> = [
    { axis: "z", from: edge.z + margin, to: edge.z + edge.d - margin, at: edge.x + 0.9 },
    { axis: "x", from: edge.x + margin, to: edge.x + edge.w - margin, at: edge.z + edge.d - b + 0.9 },
    { axis: "x", from: edge.x + margin, to: edge.x + edge.w - margin, at: edge.z + 0.9 },
  ];
  const blockers: Rect[] = [...ctx.channels, ...ctx.bridges, ...ctx.roads, ...ctx.joints];
  const factories: Factory[] = [];
  for (const side of sides) {
    const pitch = FACTORY_LENGTH + FACTORY_GAP;
    const slots = Math.floor((side.to - side.from + FACTORY_GAP) / pitch);
    if (slots <= 0) continue;
    const start = (side.from + side.to) / 2 - (slots * pitch - FACTORY_GAP) / 2;
    const middle = (slots - 1) / 2;
    const order = Array.from({ length: slots }, (_, k) => k).sort((a, b2) => Math.abs(a - middle) - Math.abs(b2 - middle) || a - b2);
    const taken: Factory[] = [];
    for (const k of order) {
      if (factories.length + taken.length >= count) break;
      const along = start + k * pitch;
      const rect: Rect =
        side.axis === "z"
          ? { x: side.at, z: along, w: across, d: FACTORY_LENGTH }
          : { x: along, z: side.at, w: FACTORY_LENGTH, d: across };
      if (blockers.some((block) => overlap(block, rect))) continue;
      const n = factories.length + taken.length;
      taken.push({ ...rect, axis: side.axis, chimneys: draw(seed, 40 + n) < 0.45 ? 2 : 1, y });
    }
    factories.push(...taken.sort((a, b2) => a.x - b2.x || a.z - b2.z));
  }
  return factories;
}

/**
 * Les caméras, au bord des rues de la ville : une par rue tirée au sort (les plus longues
 * d'abord parmi un lot pris au hasard), au milieu du trottoir, l'objectif tourné vers la chaussée.
 */
function planCameras(ctx: Ctx, edge: Rect, count: number, seed: number): Camera[] {
  if (count === 0) return [];
  const inside = { x: edge.x + BELT - 0.01, z: edge.z + BELT - 0.01, w: edge.w - 2 * BELT + 0.02, d: edge.d - 2 * BELT + 0.02 };
  const roads = ctx.roads
    .filter((road) => (road.style === "ring" || road.style === "avenue" || road.style === "street") && inside.x <= road.x && road.x + road.w <= inside.x + inside.w && inside.z <= road.z && road.z + road.d <= inside.z + inside.d)
    .filter((road) => (road.axis === "x" ? road.w : road.d) >= 10)
    .map((road, i) => ({ road, r: draw(seed, 100 + i) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map(({ road }) => road);
  return roads.map((road, i) => {
    const alongX = road.axis === "x";
    const length = alongX ? road.w : road.d;
    const t = length * (0.35 + draw(seed, 200 + i) * 0.3);
    const near = draw(seed, 300 + i) < 0.5;
    const tilt = (draw(seed, 400 + i) - 0.5) * 1.2;
    // Le mât au bord du trottoir ; l'objectif vers la chaussée, un peu de biais.
    if (alongX) {
      const z = near ? road.z - 0.4 : road.z + road.d + 0.4;
      return { x: road.x + t, y: road.y + CURB, z, heading: (near ? -Math.PI / 2 : Math.PI / 2) + tilt };
    }
    const x = near ? road.x - 0.4 : road.x + road.w + 0.4;
    return { x, y: road.y + CURB, z: road.z + t, heading: (near ? 0 : Math.PI) + tilt };
  });
}

/** Nuages : d'autant plus nombreux que la page est lourde, toujours au-dessus des toits. */
const CLOUDS: Record<Weather, { density: number; min: number }> = {
  clear: { density: 0, min: 0 },
  fair: { density: 0.25, min: 1 },
  cloudy: { density: 0.55, min: 2 },
  overcast: { density: 0.9, min: 3 },
  storm: { density: 0.9, min: 3 },
};

function planClouds(weather: Weather, edge: Rect, maxY: number, seed: number): Cloud[] {
  const { density, min } = CLOUDS[weather];
  const count = density === 0 ? 0 : clamp(Math.round((density * edge.w * edge.d) / 10_000), min, 16);
  const base = Math.max(maxY + 14, 34);
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i += 1) {
    const size = (weather === "storm" || weather === "overcast" ? 7 : 5) + draw(seed, 500 + i) * 6;
    clouds.push({
      x: edge.x + size + draw(seed, 600 + i) * Math.max(0, edge.w - 2 * size),
      y: base + draw(seed, 700 + i) * 10,
      z: edge.z + size + draw(seed, 800 + i) * Math.max(0, edge.d - 2 * size),
      size,
    });
  }
  return clouds;
}

/** Liens vers d'autres sites, dans toute la page. */
export function externalLinks(node: CityNode): number {
  let total = node.links?.external ?? 0;
  for (const child of node.children ?? []) total += externalLinks(child);
  return total;
}

/** En dessous, la page est presque fermée sur elle-même : pas d'aéroport. */
export const AIRPORT_MIN = 5;
/** Longueur (et envergure) d'un avion. */
export const PLANE = 8;
const RUNWAY_WIDTH = 6;
const TAXIWAY_WIDTH = 2.4;

/** Pistes : une pour un aérodrome, trois pour une page très ouverte sur le web. */
export function runwaysFor(external: number): number {
  return external >= 300 ? 3 : external >= 50 ? 2 : 1;
}

/** Où poser l'aéroport : à l'est de x0, sur toute la profondeur [z, z + d], centré sur `center`. */
export interface AirportSite {
  x0: number;
  z: number;
  d: number;
  center: number;
  /** Où commence l'avenue d'accès (le périphérique de la ville, l'autoroute de la mégalopole). */
  access: number;
  /** Propriétaire de l'avenue d'accès (le socle de la ville ; -1 dans la mégalopole). */
  owner: number;
  y: number;
}

/** Combien de sites ont leur avion en vol. */
const FLIGHTS = 6;

/**
 * L'aéroport, à l'est de la ceinture verte : terminal et tour de contrôle côté ville, avions
 * aux portes sur le tarmac, puis la voie de circulation et les pistes. Une avenue le relie au
 * périphérique à travers la ceinture.
 */
export function planAirport(
  ctx: Pick<Ctx, "lots" | "roads" | "plates">,
  site: AirportSite,
  external: number,
  sites: Array<[string, number]>,
): Airport | undefined {
  if (external < AIRPORT_MIN) return undefined;
  const runways = runwaysFor(external);
  const { x0 } = site;
  const length = Math.max(30, Math.min(site.d - 8, 55 + 25 * runways));
  // Les pistes restent sur le socle, même quand l'accès n'arrive pas en son milieu.
  const top = clamp(site.center - length / 2, site.z + 4, site.z + site.d - 4 - length);

  let x = x0 + 2;
  const terminalX = x;
  x += 5;
  const apronX = x;
  x += PLANE * 1.4;
  const apronW = x - apronX;
  x += 1.5;
  const taxiway = { x, z: top, w: TAXIWAY_WIDTH, d: length, axis: "z" as const };
  x += TAXIWAY_WIDTH;
  const strips: Rect[] = [];
  for (let k = 0; k < runways; k += 1) {
    x += 4;
    strips.push({ x, z: top, w: RUNWAY_WIDTH, d: length });
    x += RUNWAY_WIDTH;
  }
  x += 4;

  // Une porte par avion, autant que le tarmac en contient.
  const gate = PLANE * 1.15;
  const planes = Math.min(clamp(Math.round(Math.sqrt(external) / 2), 1, 12), Math.floor((length - 6) / gate));
  const apronD = Math.min(length, planes * gate + 6);
  const center = clamp(site.center, top + apronD / 2, top + length - apronD / 2);
  const apron = { x: apronX, z: center - apronD / 2, w: apronW, d: apronD };
  const terminal = { x: terminalX, z: apron.z, w: 5, d: apronD };

  // Bretelles : du tarmac à la grande voie, et de la grande voie à chaque piste.
  const taxiways: Airport["taxiways"] = [taxiway];
  for (const z of [apron.z + 1.5, apron.z + apron.d - 1.5 - TAXIWAY_WIDTH]) {
    taxiways.push({ x: apron.x + apron.w, z, w: taxiway.x - apron.x - apron.w, d: TAXIWAY_WIDTH, axis: "x" });
  }
  let from = taxiway.x + TAXIWAY_WIDTH;
  for (const strip of strips) {
    for (const z of [top + 1, center - TAXIWAY_WIDTH / 2, top + length - 1 - TAXIWAY_WIDTH]) {
      taxiways.push({ x: from, z, w: strip.x - from, d: TAXIWAY_WIDTH, axis: "x" });
    }
    from = strip.x + RUNWAY_WIDTH;
  }

  // L'avenue d'accès, du périphérique au terminal : elle coupe la ceinture verte.
  const avenue = roadWidth("avenue", 0);
  const access: Road = {
    x: site.access, z: site.center - avenue / 2, w: terminalX - site.access, d: avenue,
    axis: "x", style: "avenue", owner: site.owner, y: site.y,
  };
  ctx.plates = ctx.plates.flatMap((plate) => cutRect(plate, access).map((piece) => ({ ...plate, ...piece })));
  ctx.roads.push(access);

  // Les premiers sites visés ont chacun leur avion : parti du bout nord de la piste, il a déjà viré
  // vers l'est, cap sur sa destination (un cap tiré du nom du site, toujours le même).
  const [main] = strips;
  const flights: Flight[] = sites.slice(0, FLIGHTS).map(([domain], i) => {
    const heading = (hashOf(domain) / 0xffffffff - 0.5) * 2.4;
    const distance = 30 + i * 16;
    return {
      domain,
      x: main.x + main.w / 2 + Math.cos(heading) * distance,
      y: BASE + 9 + i * 3.2,
      z: top - Math.sin(heading) * distance,
      heading,
      pitch: 0.12,
    };
  });

  return {
    kind: "airport",
    id: ctx.lots.length,
    x: x0, z: site.z, w: x - x0, d: site.d,
    y: BASE + CURB,
    external,
    runways: strips,
    taxiways,
    apron,
    terminal,
    tower: { x: terminalX + 1.3, z: terminal.z - 3.6, w: 2.4, d: 2.4 },
    planes,
    destinations: sites,
    flights,
  };
}

/** Dans la mégalopole, une ville a son aérodrome dès ce nombre de liens vers d'autres sites. */
export const AERODROME_MIN = 20;
/** Largeur de l'aérodrome, à l'est du socle : la mégalopole lui réserve cette place. */
export const AERODROME = 18;
const STRIP_WIDTH = 3.4;

/** Une ville de la mégalopole a-t-elle son aérodrome ? (avant de la construire, pour la placer) */
export function hasAerodrome(doc: CityDoc): boolean {
  return externalLinks(doc.root) >= AERODROME_MIN;
}

/**
 * L'aérodrome d'une ville de la mégalopole : un hangar au bout d'une rue qui traverse la
 * ceinture verte, un ou trois petits avions devant, une piste courte et sa manche à air. Pas de
 * vols : ils partent du grand aéroport du site. Il tient dans la bande de AERODROME de large.
 */
export function planAerodrome(
  ctx: Pick<Ctx, "lots" | "roads" | "plates">,
  site: AirportSite,
  external: number,
  sites: Array<[string, number]>,
): Airport | undefined {
  if (external < AERODROME_MIN) return undefined;
  const { x0 } = site;
  const length = clamp(site.d - 14, 22, 46);
  const top = clamp(site.center - length / 2, site.z + 4, site.z + site.d - 4 - length);
  const planes = clamp(Math.round(Math.sqrt(external) / 7), 1, 3);
  const gate = PLANE * 0.62;
  const apronD = planes * gate + 3;

  const terminal = { x: x0 + 1.5, z: site.center - 3.2, w: 4.4, d: 6.4 };
  const apron = { x: terminal.x + terminal.w, z: site.center - apronD / 2, w: 5, d: apronD };
  const strip = { x: x0 + AERODROME - 2 - STRIP_WIDTH, z: top, w: STRIP_WIDTH, d: length };
  const taxiway = {
    x: apron.x + apron.w, z: site.center - 0.8, w: strip.x - apron.x - apron.w, d: 1.6, axis: "x" as const,
  };

  // La rue d'accès, du périphérique au hangar : elle coupe la ceinture verte.
  const street = roadWidth("street", 2);
  const access: Road = {
    x: site.access, z: site.center - street / 2, w: terminal.x - site.access, d: street,
    axis: "x", style: "street", owner: site.owner, y: site.y,
  };
  ctx.plates = ctx.plates.flatMap((plate) => cutRect(plate, access).map((piece) => ({ ...plate, ...piece })));
  ctx.roads.push(access);

  return {
    kind: "aerodrome",
    id: ctx.lots.length,
    x: x0, z: site.z, w: AERODROME, d: site.d,
    y: BASE + CURB,
    external,
    runways: [strip],
    taxiways: [taxiway],
    apron,
    terminal,
    // La manche à air, au bout nord de la piste, côté hangar.
    tower: { x: strip.x - 1.6, z: top + 1, w: 0.4, d: 0.4 },
    planes,
    destinations: sites,
    flights: [],
  };
}

/** Les limites de la ville comprennent l'aéroport et les avions en vol. */
export function includeAirport(bounds: CityLayout["bounds"], airport: Airport) {
  bounds.minZ = Math.min(bounds.minZ, airport.z);
  bounds.maxZ = Math.max(bounds.maxZ, airport.z + airport.d);
  bounds.maxX = Math.max(bounds.maxX, airport.x + airport.w);
  for (const flight of airport.flights) {
    bounds.minX = Math.min(bounds.minX, flight.x - PLANE);
    bounds.maxX = Math.max(bounds.maxX, flight.x + PLANE);
    bounds.minZ = Math.min(bounds.minZ, flight.z - PLANE);
    bounds.maxZ = Math.max(bounds.maxZ, flight.z + PLANE);
    bounds.maxY = Math.max(bounds.maxY, flight.y + PLANE);
  }
}

/** Tirage stable à partir d'un nom (FNV-1a). */
function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Le bassin d'un port : le sud de sa bande, au pied du quai. */
export function harborWater(harbor: Rect): Rect {
  const quay = harbor.d * QUAY_SHARE;
  return { x: harbor.x, z: harbor.z + quay, w: harbor.w, d: harbor.d - quay };
}

const overlap = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.z < b.z + b.d + pad && b.z < a.z + a.d + pad;

/** Ce qui reste d'un rectangle quand on en retire un autre : jusqu'à quatre morceaux. */
export function cutRect(a: Rect, b: Rect): Rect[] {
  if (!overlap(a, b)) return [a];
  const z0 = Math.max(a.z, b.z);
  const z1 = Math.min(a.z + a.d, b.z + b.d);
  const pieces = [
    { x: a.x, z: a.z, w: a.w, d: z0 - a.z },
    { x: a.x, z: z1, w: a.w, d: a.z + a.d - z1 },
    { x: a.x, z: z0, w: b.x - a.x, d: z1 - z0 },
    { x: b.x + b.w, z: z0, w: a.x + a.w - b.x - b.w, d: z1 - z0 },
  ];
  return pieces.filter((piece) => piece.w > 0.01 && piece.d > 0.01);
}

/**
 * Un port s'ouvre sur le large : un chenal mène son bassin jusqu'au bord de la maquette, par le
 * plus court chemin libre (le bassin prolongé vers l'ouest ou l'est, ou un chenal vers le sud).
 * Il ne passe sous aucun bâtiment ni le long d'une rue ; les trottoirs et la ceinture verte
 * s'écartent, et les rues qu'il coupe le franchissent sur un pont.
 */
function openHarbors(ctx: Ctx, edge: Rect) {
  for (const harbor of ctx.decor) {
    if (harbor.type !== "harbor") continue;
    const port = ctx.lots[harbor.owner];
    const water = harborWater(harbor);
    const candidates: Array<Rect & { axis: "x" | "z" }> = [
      { x: edge.x, z: water.z, w: water.x - edge.x, d: water.d, axis: "x" },
      { x: water.x + water.w, z: water.z, w: edge.x + edge.w - water.x - water.w, d: water.d, axis: "x" },
    ];
    // Vers le sud : depuis le milieu du bassin, puis de plus en plus près de ses bouts.
    const width = clamp(water.d, 2, 4);
    const south = water.z + water.d;
    const reach = Math.max(0, Math.floor((water.w - width) / 2));
    for (let k = 0; k <= reach; k += 1) {
      for (const sign of k === 0 ? [1] : [-1, 1]) {
        const cx = water.x + water.w / 2 + sign * k;
        candidates.push({ x: cx - width / 2, z: south, w: width, d: edge.z + edge.d - south, axis: "z" });
      }
    }
    const length = (c: Rect & { axis: "x" | "z" }) => (c.axis === "x" ? c.w : c.d);
    const free = (c: Rect & { axis: "x" | "z" }) =>
      length(c) > 0.01 &&
      // Ni bâtiment, ni conteneur qui a son propre sol (parc, place, champs…), hors le socle et le port.
      !ctx.lots.some(
        (lot) =>
          lot.id !== 0 &&
          (lot.id < port.id || lot.id >= port.subtreeEnd) &&
          (!lot.container || lot.h > 0) &&
          overlap(lot, c, 0.15),
      ) &&
      !ctx.joints.some((joint) => overlap(joint, c)) &&
      !ctx.roads.some((road) => road.axis === c.axis && overlap(road, c)) &&
      !ctx.decor.some((decor) => decor.type !== "square" && overlap(decor, c)) &&
      !(ctx.airport && overlap(ctx.airport, c));
    const best = candidates.filter(free).sort((a, b) => length(a) - length(b))[0];
    if (!best) continue;

    const { axis, ...rect } = best;
    ctx.channels.push({ ...rect, axis, owner: port.id, y: port.y });
    ctx.roads = ctx.roads.flatMap((road) => {
      if (!overlap(road, rect)) return [road];
      const x0 = Math.max(road.x, rect.x);
      const z0 = Math.max(road.z, rect.z);
      ctx.bridges.push({
        x: x0, z: z0, w: Math.min(road.x + road.w, rect.x + rect.w) - x0, d: Math.min(road.z + road.d, rect.z + rect.d) - z0,
        axis: road.axis, style: road.style, owner: road.owner, y: road.y,
      });
      return cutRect(road, rect).map((piece) => ({ ...road, ...piece }));
    });
    ctx.plates = ctx.plates.flatMap((plate) => cutRect(plate, rect).map((piece) => ({ ...plate, ...piece })));
  }
}

function newLot(plot: Plot, cell: Rect, y: number, parent: number, ctx: Ctx): Lot {
  const id = ctx.lots.length;
  const lot: Lot = {
    id,
    parent,
    subtreeEnd: id + 1,
    node: plot.node,
    kind: plot.kind,
    depth: plot.depth,
    container: plot.container,
    ownText: plot.ownText,
    x: cell.x,
    z: cell.z,
    w: Math.max(cell.w, 0.01),
    d: Math.max(cell.d, 0.01),
    y,
    h: 0,
    textTotal: plot.textTotal,
  };
  if (plot.gallery !== undefined) lot.gallery = plot.gallery;
  ctx.lots.push(lot);
  return lot;
}

/**
 * Une rue où roulent des voitures mène toujours quelque part : de proche en proche, elle rejoint
 * le périphérique. Celle que rien ne relie au réseau (entre deux rangées sans rue à leurs bouts)
 * s'efface : de l'herbe sur une pelouse, un passage pavé en ville.
 */
function connectRoads(ctx: Ctx) {
  type Way = Rect & { style: RoadStyle };
  const ways: Way[] = [...ctx.roads, ...ctx.joints, ...ctx.bridges].filter((way) => way.style !== "path");
  const size = 10;
  const cells = new Map<string, number[]>();
  const keys = (r: Rect) => {
    const out: string[] = [];
    for (let i = Math.floor((r.x - 0.1) / size); i <= Math.floor((r.x + r.w + 0.1) / size); i += 1) {
      for (let j = Math.floor((r.z - 0.1) / size); j <= Math.floor((r.z + r.d + 0.1) / size); j += 1) out.push(`${i},${j}`);
    }
    return out;
  };
  ways.forEach((way, i) => {
    for (const key of keys(way)) {
      const list = cells.get(key);
      if (list) list.push(i);
      else cells.set(key, [i]);
    }
  });
  const touch = (a: Rect, b: Rect) => a.x <= b.x + b.w + 0.06 && b.x <= a.x + a.w + 0.06 && a.z <= b.z + b.d + 0.06 && b.z <= a.z + a.d + 0.06;
  const reached = new Set<number>();
  const queue: number[] = [];
  ways.forEach((way, i) => {
    if (way.style === "ring" || way.style === "highway") {
      reached.add(i);
      queue.push(i);
    }
  });
  while (queue.length > 0) {
    const i = queue.pop()!;
    for (const key of keys(ways[i])) {
      for (const j of cells.get(key) ?? []) {
        if (reached.has(j) || !touch(ways[i], ways[j])) continue;
        reached.add(j);
        queue.push(j);
      }
    }
  }
  // Une rue que rien ne relie s'efface (son pont avec elle).
  ways.forEach((way, i) => {
    if (reached.has(i)) return;
    if (ctx.roads.includes(way as Road)) eraseRoad(way as Road, ctx);
    const bridge = ctx.bridges.indexOf(way as Bridge);
    if (bridge >= 0) ctx.bridges.splice(bridge, 1);
  });
}

/** Crée, dans l'ordre de la page, les lots des enfants sans case qui précèdent ce rang. */
function hangBefore(parent: number, order: number, y: number, ctx: Ctx) {
  const queue = ctx.waiting.get(parent);
  while (queue && queue.length > 0 && queue[0].order < order) hang(queue.shift()!, parent, y, ctx);
}

// ---------------------------------------------------------------------------
// Les images accrochées aux bâtiments
// ---------------------------------------------------------------------------

interface Placed {
  lot: Lot;
  along: number;
  width: number;
  height: number;
  y: number;
}

interface Shelf {
  y: number;
  h: number;
  used: number;
  items: Placed[];
}

interface Wall {
  mount: Exclude<Mount, "roof">;
  length: number;
  open: boolean;
  shelves: Shelf[];
  signs: Placed[];
  signsUsed: number;
}

interface Host {
  lot: Lot;
  walls: Wall[];
  /** Bande des affiches sur les façades. */
  bottom: number;
  top: number;
  /** Le haut des murs, sous le toit : la base des panneaux de toit. */
  eave: number;
  /** Où plantent les mâts des drapeaux : un toit plat au bord de la façade (null : un toit pentu). */
  mast: number | null;
  /** Prochaine façade à essayer : les affiches font le tour du bâtiment. */
  next: number;
  roof: boolean;
  flags: number;
}

/** Grille des bâtiments, pour savoir si une façade donne sur la rue ou contre un voisin. */
class Solids {
  private readonly cells = new Map<string, Lot[]>();
  constructor(lots: Lot[], private readonly size = 8) {
    for (const lot of lots) {
      for (const key of this.keys(lot)) {
        const list = this.cells.get(key);
        if (list) list.push(lot);
        else this.cells.set(key, [lot]);
      }
    }
  }
  private *keys(r: Rect) {
    for (let i = Math.floor(r.x / this.size); i <= Math.floor((r.x + r.w) / this.size); i += 1) {
      for (let j = Math.floor(r.z / this.size); j <= Math.floor((r.z + r.d) / this.size); j += 1) yield `${i},${j}`;
    }
  }
  hit(r: Rect, except: number): boolean {
    for (const key of this.keys(r)) {
      for (const lot of this.cells.get(key) ?? []) if (lot.id !== except && overlap(lot, r)) return true;
    }
    return false;
  }
}

/**
 * Le toit plat où planter un mât, au bord de la façade : comme la scène le dessine (mêmes tirages).
 * Un gratte-ciel n'a de toit plat jusqu'au bord que sur son socle ; une maison et un petit immeuble
 * à toit pentu n'en ont pas.
 */
function mastOf(lot: Lot): number | null {
  const short = Math.min(lot.w, lot.d);
  if (lot.kind === "house") return null;
  if (lot.kind === "residence" && lot.h <= 9.5 && short >= 2 && rand(lot.id, 4) < 0.55) return null;
  if (lot.kind === "tower" && lot.h >= 20 && short >= 3.6) return lot.y + clamp(lot.h * 0.14, 2.6, 5.5);
  return lot.y + lot.h;
}

/** Taille naturelle d'une affiche : selon l'image (ses pixels, ses proportions), un écran en 16/9. */
function posterSize(lot: Lot): [number, number] {
  if (lot.kind === "screen") return [4, 4 / (16 / 9)];
  const img = lot.node.img;
  const ratio = clamp((img?.w || 4) / (img?.h || 3), 0.45, 3);
  // Une vignette de 250 px : 3 m de large environ ; une grande photo : 13 m au plus.
  let width = img?.w && img?.h ? clamp(Math.sqrt(img.w * img.h) / 80, 1.6, 4.4) : 3;
  let height = width / ratio;
  if (height > 3.4) {
    height = 3.4;
    width = height * ratio;
  }
  return [width, height];
}

/**
 * Accroche les images (et les écrans) au bâtiment le plus proche dans la page : dans leur bloc,
 * sinon un niveau au-dessus, et ainsi de suite. Les affiches font le tour des façades libres
 * (pas celles collées à un voisin), empilées par rangées comme à Times Square ; les enseignes se
 * posent au rez-de-chaussée, les drapeaux sur un mât au toit. Quand toutes les façades sont pleines,
 * un panneau monte sur le toit, puis on passe au bâtiment suivant.
 */
function hangImages(lots: Lot[]) {
  const images = lots.filter((lot) => lot.hung && MOUNTED.has(lot.kind));
  if (images.length === 0) return;
  const hostIds = lots.filter((lot) => !lot.container && !lot.hung && HOSTS.has(lot.kind)).map((lot) => lot.id);
  const solids = new Solids(lots.filter((lot) => !lot.container && !lot.hung && lot.h > 0.4 && lot.kind !== "river"));
  const hosts = new Map<number, Host>();

  const hostOf = (id: number): Host => {
    let host = hosts.get(id);
    if (host) return host;
    const lot = lots[id];
    const short = Math.min(lot.w, lot.d);
    const sky = lot.kind === "tower" && lot.h >= 20 && short >= 3.6;
    // Le haut des murs utilisables : sous le toit pentu, sous le premier retrait d'un gratte-ciel.
    const wallTop =
      lot.kind === "gallery" ? 0.97 : sky ? 0.45 : lot.kind === "house" ? 0.58 : lot.kind === "residence" && lot.h <= 9.5 ? 0.74 : 0.9;
    const e = 0.25;
    const fronts: Array<[Wall["mount"], number, Rect]> = [
      ["south", lot.w, { x: lot.x + e, z: lot.z + lot.d, w: lot.w - 2 * e, d: 0.6 }],
      ["east", lot.d, { x: lot.x + lot.w, z: lot.z + e, w: 0.6, d: lot.d - 2 * e }],
      ["north", lot.w, { x: lot.x + e, z: lot.z - 0.6, w: lot.w - 2 * e, d: 0.6 }],
      ["west", lot.d, { x: lot.x - 0.6, z: lot.z + e, w: 0.6, d: lot.d - 2 * e }],
    ];
    host = {
      lot,
      walls: fronts.map(([mount, length, front]) => ({
        mount, length, open: !solids.hit(front, lot.id), shelves: [], signs: [], signsUsed: 0,
      })),
      bottom: lot.y + Math.min(POSTER_LIFT, Math.max(0.3, lot.h * 0.3)),
      top: lot.y + lot.h * wallTop - 0.15,
      eave: lot.y + (lot.kind === "house" ? lot.h * 0.62 : lot.kind === "residence" && lot.h <= 9.5 ? lot.h * 0.75 : lot.h),
      mast: mastOf(lot),
      next: lot.id % 4,
      roof: false,
      flags: 0,
    };
    hosts.set(id, host);
    return host;
  };

  const poster = (host: Host, lot: Lot): boolean => {
    const [w0, h0] = posterSize(lot);
    for (let k = 0; k < 4; k += 1) {
      const wall = host.walls[(host.next + k) % 4];
      if (!wall.open) continue;
      const usable = wall.length - 0.4;
      const scale = Math.min(1, usable / w0, (host.top - host.bottom) / h0);
      const w = w0 * scale;
      const h = h0 * scale;
      if (w < 0.9 || h < 0.6) continue;
      let placed = false;
      for (const shelf of wall.shelves) {
        const gap = shelf.items.length > 0 ? POSTER_GAP : 0;
        if (h <= shelf.h + 1e-6 && shelf.used + gap + w <= usable) {
          shelf.items.push({ lot, along: shelf.used + gap, width: w, height: h, y: shelf.y + (shelf.h - h) / 2 });
          shelf.used += gap + w;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const last = wall.shelves[wall.shelves.length - 1];
        const y = last ? last.y + last.h + POSTER_GAP : host.bottom;
        if (y + h > host.top) continue;
        wall.shelves.push({ y, h, used: w, items: [{ lot, along: 0, width: w, height: h, y }] });
      }
      host.next = (host.next + k + 1) % 4;
      return true;
    }
    // Les façades sont pleines : un panneau sur le toit (pas sur le toit pentu d'une maison).
    if (host.roof || host.lot.kind === "house") return false;
    const ratio = w0 / h0;
    let width = Math.min(w0, host.lot.w * 0.85);
    let height = width / ratio;
    if (height > 3.2) {
      height = 3.2;
      width = height * ratio;
    }
    if (width < 0.9) return false;
    host.roof = true;
    const L = host.lot;
    Object.assign(lot, { x: L.x + (L.w - width) / 2, z: L.z + L.d / 2 - 0.2, w: width, d: 0.4, y: host.eave, h: ROOF_LIFT + height });
    lot.panel = { width, height, lift: ROOF_LIFT, mount: "roof" };
    return true;
  };

  const sign = (host: Host, lot: Lot): boolean => {
    const img = lot.node.img;
    const ratio = clamp((img?.w || 1) / (img?.h || 1), 0.4, 2.5);
    const w = ratio >= 1 ? SIGN_SIZE : SIGN_SIZE * ratio;
    const h = w / ratio;
    for (let k = 0; k < 4; k += 1) {
      const wall = host.walls[(host.next + k) % 4];
      const gap = wall.signs.length > 0 ? 0.3 : 0;
      if (!wall.open || wall.signsUsed + gap + w > wall.length - 0.4) continue;
      const y = Math.min(host.lot.y + SIGN_LIFT, host.eave - h - 0.1);
      if (y < host.lot.y + 0.2) continue;
      wall.signs.push({ lot, along: wall.signsUsed + gap, width: w, height: h, y });
      wall.signsUsed += gap + w;
      host.next = (host.next + k + 1) % 4;
      return true;
    }
    return false;
  };

  const flag = (host: Host, lot: Lot): boolean => {
    const L = host.lot;
    if (host.mast === null) return false;
    const room = Math.max(1, Math.floor((L.w - 1.4) / (FLAG_WIDTH + 0.3)));
    if (host.flags >= room) return false;
    const img = lot.node.img;
    const height = FLAG_WIDTH / clamp((img?.w || 3) / (img?.h || 2), 1.2, 2.2);
    const x = room === 1 && host.flags === 0 ? L.x + L.w / 2 - FLAG_WIDTH / 2 : L.x + 0.7 + host.flags * (FLAG_WIDTH + 0.3);
    host.flags += 1;
    Object.assign(lot, { x, z: L.z + L.d - 0.7, w: FLAG_WIDTH, d: 0.1, y: host.mast, h: FLAG_MAST + height });
    lot.panel = { width: FLAG_WIDTH, height, lift: FLAG_MAST, emblem: "flag", mount: "roof" };
    return true;
  };

  const attach = (host: Host, lot: Lot): boolean => {
    const emblem = lot.kind === "billboard" ? emblemOf(lot.node) : undefined;
    if (emblem === "flag") return flag(host, lot);
    if (emblem === "sign") return sign(host, lot);
    return poster(host, lot);
  };

  /** Les porteurs dans [lo, hi[ les plus proches de l'image dans l'ordre de la page. */
  const nearest = (target: number, lo: number, hi: number, count: number): number[] => {
    let right = 0;
    let span = hostIds.length;
    while (right < span) {
      const mid = (right + span) >> 1;
      if (hostIds[mid] < target) right = mid + 1;
      else span = mid;
    }
    let left = right - 1;
    const out: number[] = [];
    while (out.length < count) {
      const l = left >= 0 && hostIds[left] >= lo ? hostIds[left] : -1;
      const r = right < hostIds.length && hostIds[right] < hi ? hostIds[right] : -1;
      if (l < 0 && r < 0) break;
      if (r < 0 || (l >= 0 && target - l <= r - target)) {
        out.push(l);
        left -= 1;
      } else {
        out.push(r);
        right += 1;
      }
    }
    return out;
  };

  for (const lot of images) {
    const tried = new Set<number>();
    let done = false;
    for (let a: Lot | undefined = lots[lot.parent]; a && !done; a = a.parent >= 0 ? lots[a.parent] : undefined) {
      for (const id of nearest(lot.id, a.id, a.subtreeEnd, 8)) {
        if (tried.has(id)) continue;
        tried.add(id);
        if (attach(hostOf(id), lot)) {
          done = true;
          break;
        }
      }
    }
    // Plus aucune place nulle part : l'image s'efface (elle reste dans l'inspecteur).
    if (!done) lot.h = 0;
  }

  // Chaque rangée d'affiches, et la rangée d'enseignes, se centre sur sa façade.
  for (const host of hosts.values()) {
    const L = host.lot;
    for (const wall of host.walls) {
      const usable = wall.length - 0.4;
      const rows: Array<[number, Placed[]]> = wall.shelves.map((shelf) => [shelf.used, shelf.items]);
      rows.push([wall.signsUsed, wall.signs]);
      rows.forEach(([used, items]) => {
        const offset = 0.2 + (usable - used) / 2;
        for (const item of items) {
          const along = offset + item.along;
          const { lot } = item;
          if (wall.mount === "south" || wall.mount === "north") {
            lot.x = L.x + along;
            lot.z = wall.mount === "south" ? L.z + L.d : L.z - POSTER_DEPTH;
            lot.w = item.width;
            lot.d = POSTER_DEPTH;
          } else {
            lot.x = wall.mount === "east" ? L.x + L.w : L.x - POSTER_DEPTH;
            lot.z = L.z + along;
            lot.w = POSTER_DEPTH;
            lot.d = item.width;
          }
          lot.y = item.y;
          lot.h = item.height;
          const emblem = items === wall.signs ? ("sign" as const) : undefined;
          lot.panel = { width: item.width, height: item.height, lift: 0, mount: wall.mount, ...(emblem ? { emblem } : {}) };
        }
      });
    }
  }

  // Un conteneur qui n'a que des images prend l'emprise de ses images (pour l'inspecteur).
  for (let i = lots.length - 1; i >= 0; i -= 1) {
    const box = lots[i];
    if (!box.container || !box.hung) continue;
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    let minY = Infinity;
    for (let j = box.id + 1; j < box.subtreeEnd; j += 1) {
      const lot = lots[j];
      if (lot.container || lot.h <= 0) continue;
      minX = Math.min(minX, lot.x);
      minZ = Math.min(minZ, lot.z);
      maxX = Math.max(maxX, lot.x + lot.w);
      maxZ = Math.max(maxZ, lot.z + lot.d);
      minY = Math.min(minY, lot.y);
    }
    if (minX === Infinity) continue;
    Object.assign(box, { x: minX, z: minZ, w: maxX - minX, d: maxZ - minZ, y: minY, h: 0 });
  }
}

/** Un lot sans case : son emprise sera celle de l'affiche (ou de ses images, pour un conteneur). */
function hang(plot: Plot, parent: number, y: number, ctx: Ctx) {
  const lot = newLot(plot, { x: 0, z: 0, w: 0, d: 0 }, y, parent, ctx);
  lot.hung = true;
  for (const child of plot.unplaced) hang(child, lot.id, y, ctx);
  lot.subtreeEnd = ctx.lots.length;
}

function place(plot: Plot, cell: Rect, y: number, parent: number, ctx: Ctx, env: Env): void {
  hangBefore(parent, plot.order, y, ctx);
  const lot = newLot(plot, cell, y, parent, ctx);
  if (!plot.container) {
    shapeLeaf(lot, plot.node);
    return;
  }
  ctx.waiting.set(lot.id, plot.unplaced.slice());

  const root = plot.depth === 0;
  const own = groundOf(plot.kind);
  lot.h = root ? BASE : own ? (env.ground ? 0.05 : CURB) : 0;
  const top = y + lot.h;
  const childEnv: Env = {
    ground: root ? undefined : own ?? env.ground,
    streets: root ? "street" : streetsOf(plot.kind) ?? env.streets,
    access: root ? undefined : env.access,
  };

  let inner: Rect = cell;
  if (root) {
    const m = BELT + RING;
    inner = { x: cell.x + m, z: cell.z + m, w: cell.w - 2 * m, d: cell.d - 2 * m };
    ringAround(inner, top, lot.id, ctx);
  }

  // Bandes réservées : la porte au nord de l'en-tête, le bassin au sud du pied de page.
  let z0 = inner.z;
  let z1 = inner.z + inner.d;
  if (plot.kind === "gate") {
    const band = Math.min(GATE_BAND, inner.d * 0.35);
    ctx.decor.push({ type: "gate", x: inner.x, z: z0, w: inner.w, d: band, y: top, owner: lot.id });
    z0 += band;
  }
  if (plot.kind === "port") {
    const band = Math.min(HARBOR_BAND, inner.d * 0.4);
    ctx.decor.push({ type: "harbor", x: inner.x, z: z1 - band, w: inner.w, d: band, y: top, owner: lot.id });
    z1 -= band;
  }

  // Découpe en tronçons séparés par les canaux.
  const segments: Plot[][] = [[]];
  const rivers: Plot[] = [];
  for (const child of plot.children) {
    if (child.kind === "river") {
      rivers.push(child);
      segments.push([]);
    } else {
      segments[segments.length - 1].push(child);
    }
  }

  const height = z1 - z0;
  const band = Math.min(RIVER_WIDTH + 2 * QUAY, height / (2 * rivers.length + 1));
  const gap = unitGap(childEnv.streets, plot.depth);
  const weights = segments.map((items) => items.reduce((sum, item) => sum + (Math.sqrt(item.area) + gap) ** 2, 0));
  const total = weights.reduce((sum, a) => sum + a, 0) || 1;
  const available = Math.max(height - rivers.length * band, height * 0.2);

  let z = z0;
  segments.forEach((items, s) => {
    const depth = rivers.length === 0 ? height : (available * weights[s]) / total;
    if (items.length > 0 && depth > 0) {
      placeRows(items, { x: inner.x, z, w: inner.w, d: depth }, top, lot.id, ctx, childEnv, plot.depth);
    }
    z += depth;
    const river = rivers[s];
    if (river) {
      // Le canal traverse le conteneur de bord à bord, entre deux quais.
      const water = Math.min(RIVER_WIDTH, band * 0.6);
      const quay = (band - water) / 2;
      const quayTop = childEnv.ground ? top : top + CURB;
      if (quay > 0.05) {
        for (const qz of [z, z + quay + water]) {
          ctx.plates.push({ x: inner.x, z: qz, w: inner.w, d: quay, y: top, h: quayTop - top || 0.05, style: "quay", owner: lot.id });
        }
      }
      place(river, { x: inner.x, z: z + quay, w: inner.w, d: water }, top, lot.id, ctx, childEnv);
      z += band;
    }
  });

  hangBefore(lot.id, Infinity, top, ctx);
  ctx.waiting.delete(lot.id);
  lot.subtreeEnd = ctx.lots.length;
}

/** Le périphérique autour de la ville, et la ceinture verte au-delà. */
function ringAround(inner: Rect, top: number, owner: number, ctx: Ctx) {
  const r = RING;
  const left = inner.x - r;
  const right = inner.x + inner.w;
  const north = inner.z - r;
  const south = inner.z + inner.d;
  const full = inner.w + 2 * r;
  ctx.roads.push(
    { x: inner.x, z: north, w: inner.w, d: r, axis: "x", style: "ring", owner, y: top },
    { x: inner.x, z: south, w: inner.w, d: r, axis: "x", style: "ring", owner, y: top },
    { x: left, z: inner.z, w: r, d: inner.d, axis: "z", style: "ring", owner, y: top },
    { x: right, z: inner.z, w: r, d: inner.d, axis: "z", style: "ring", owner, y: top },
  );
  // Les quatre coins tournent en arrondi ; la mégalopole pourra y ouvrir un côté vers l'extérieur.
  const corner = (x: number, z: number, open: Openings): Joint => ({
    x, z, w: r, d: r, open, style: "ring", verge: "grass", owner, y: top,
  });
  ctx.joints.push(
    corner(left, north, { north: false, east: true, south: true, west: false }),
    corner(right, north, { north: false, east: false, south: true, west: true }),
    corner(left, south, { north: true, east: true, south: false, west: false }),
    corner(right, south, { north: true, east: false, south: false, west: true }),
  );
  const b = BELT;
  const outer = full + 2 * b;
  ctx.plates.push(
    { x: left - b, z: north - b, w: outer, d: b, y: top, h: CURB, style: "grass", owner },
    { x: left - b, z: south + r, w: outer, d: b, y: top, h: CURB, style: "grass", owner },
    { x: left - b, z: north, w: b, d: inner.d + 2 * r, y: top, h: CURB, style: "grass", owner },
    { x: right + r, z: north, w: b, d: inner.d + 2 * r, y: top, h: CURB, style: "grass", owner },
  );
}

/**
 * Range les enfants d'un tronçon en rangées, choisit où passent les rues,
 * pose les trottoirs des pâtés, puis chaque enfant à sa place.
 */
function placeRows(children: Plot[], rect: Rect, top: number, owner: number, ctx: Ctx, env: Env, depth: number) {
  const mode = env.streets;
  const items = mode === "street" || mode === "avenue" ? blocksOf(children, mode, depth) : children;
  const streets = mode !== "none";
  const road = streets ? roadWidth(mode as RoadStyle, depth) : 0;
  const soft = softGap(mode);
  const urban = mode === "street" || mode === "avenue";
  const gap = unitGap(mode, depth);
  const big = (p: Plot) => p.container || LANDMARKS.has(p.kind);
  // Conteneurs et grands édifices ont une vraie rue de chaque côté : on leur réserve sa largeur.
  const alone = items.length === 1;
  const rows = stripRows(
    items.map((item) => (Math.sqrt(item.area) + (alone ? 0 : big(item) && streets ? road + 2 * SIDEWALK : Math.max(gap, accessMargin(mode)))) ** 2),
    rect,
    // Un pâté de maisons ajouté se range comme un conteneur ; s'il porte un grand édifice, comme lui.
    items.map((item): Fit =>
      item.virtual
        ? item.children.some((child) => LANDMARKS.has(child.kind)) ? "landmark" : "flexible"
        : item.container ? "flexible" : LANDMARKS.has(item.kind) ? "landmark" : "leaf",
    ),
    // Taille minimale de chaque case : son plus grand bâtiment et l'écart qui l'entoure. Un bâtiment
    // seul dans sa case, là où passent des voitures, garde de quoi être longé par une rue.
    items.map((item) => {
      if (item.least <= 0) return 0;
      if (alone) return item.least;
      return item.least + Math.max(gap, item.container ? 0 : accessMargin(mode));
    }),
    // Au plus serré : le bâtiment et un simple écart.
    items.map((item) => (item.least > 0 ? item.least + (alone ? 0 : soft) : 0)),
  );
  if (rows.length === 0) return;

  // Un conteneur au bout d'une rangée incomplète prend la place libre : il touche ainsi le bord du
  // tronçon, et la rue qui le longe (ses propres rues y trouvent une issue). La dernière rangée va
  // jusqu'au bord sud.
  for (const row of rows) {
    const first = row.items[0];
    const last = row.items[row.items.length - 1];
    if (items[first.index].container && first.x > rect.x + 0.01) {
      first.w += first.x - rect.x;
      first.x = rect.x;
    }
    if (items[last.index].container && last.x + last.w < rect.x + rect.w - 0.01) last.w = rect.x + rect.w - last.x;
  }
  const lastRow = rows[rows.length - 1];
  if (lastRow.z + lastRow.d < rect.z + rect.d - 0.01) lastRow.d = rect.z + rect.d - lastRow.z;

  const quiet: Edge = urban ? { side: "attached", width: ALLEY } : { side: "soft", width: soft };
  const half = (edge: Edge) => edge.width / 2;
  // Retrait d'un bâtiment : trottoir côté rue et côté bord, presque rien côté voisin.
  // Sur une pelouse (lotissement, parc), pas de trottoir : un simple accotement.
  const verge = env.ground ? 0.35 : SIDEWALK;
  const tight = env.ground ? 0.15 : 0.4;
  const inset = (edge: Edge) =>
    edge.side === "road"
      ? edge.width / 2 + verge
      : edge.side === "edge"
        ? env.ground ? soft / 2 : SIDEWALK
        : edge.width / 2;
  /** Ce que prendra au moins le bord encore inconnu d'une case (un simple écart, ou le bord du tronçon). */
  const leastInset = (last: boolean) => (last ? inset(EDGE) : Math.min(inset(quiet), soft / 2));
  // Une rue trop serrée pour une voiture dans chaque sens n'est pas tracée : les cases restent collées.
  const narrowest = mode === "path" ? 1.2 : DRIVABLE_MIN;
  /**
   * Une rue entre deux cases : jamais plus large que ce qu'elles peuvent céder, ni au point de
   * laisser à leurs bâtiments moins que leur taille minimale (`other` : le retrait de l'autre bord).
   */
  type Cell = { size: number; other: number; need: number };
  const street = (a: Cell, b: Cell, required = false): Edge | null => {
    // En ville, une rue ne prend pas plus de 42 % de la plus petite case (sauf celle qui dessert
    // une rangée sans autre accès) ; sur une pelouse, seule compte la taille minimale des maisons.
    let width = env.ground || required ? road : Math.min(road, 0.42 * Math.min(a.size, b.size));
    // Pour desservir une rangée qui n'a pas d'autre accès, le trottoir (l'accotement) se resserre :
    // les bâtiments mordront dessus plutôt que de rétrécir.
    const margin = required ? tight : verge;
    for (const cell of [a, b]) {
      if (cell.need > 0) width = Math.min(width, 2 * (cell.size - cell.other - margin - cell.need));
    }
    return width >= narrowest - 1e-6 ? { side: "road", width: Math.max(width, narrowest) } : null;
  };
  const rowNeed = rows.map((row) => Math.max(0, ...row.items.map((it) => items[it.index].least)));
  const access: Access = env.access ?? { north: true, south: true, west: true, east: true };

  // Entre les rangées : une rue dès qu'un conteneur est en jeu, ou quand le pâté devient trop profond.
  const between: Edge[] = [];
  let depthSinceRoad = rows[0].d;
  for (let k = 0; k < rows.length - 1; k += 1) {
    const here = rows[k].items.some((it) => big(items[it.index]));
    const next = rows[k + 1].items.some((it) => big(items[it.index]));
    const north = k === 0 ? EDGE : between[k - 1];
    // Chaque bâtiment donne sur une rue : une rangée qui n'en a pas au nord en reçoit une au sud,
    // et la dernière, si son bord sud ne donne sur rien, en reçoit une au nord (les rangées vont
    // par deux, dos à dos, de part et d'autre des rues).
    const homes = (r: number) => rows[r].items.some((it) => !items[it.index].container);
    const reachedNorth = k === 0 ? access.north : north.side === "road";
    const last = k + 1 === rows.length - 1;
    const required =
      streets && mode !== "path" &&
      ((homes(k) && !reachedNorth) || (last && homes(k + 1) && !access.south));
    const wanted = streets && (required || here || next || depthSinceRoad + rows[k + 1].d > blockDepth(mode));
    const sides = (): [Cell, Cell] => [
      { size: rows[k].d, other: inset(north), need: rowNeed[k] },
      { size: rows[k + 1].d, other: leastInset(k + 1 === rows.length - 1), need: rowNeed[k + 1] },
    ];
    let edge = wanted ? street(...sides(), required) : null;
    if (!edge && required) {
      // La rue obligatoire ne tient pas : la limite entre les deux rangées glisse vers celle qui a
      // de la place, si à elles deux elles peuvent la border.
      const [a, b] = sides();
      const room = (cell: Cell) => cell.other + tight + cell.need + narrowest / 2;
      if (a.size + b.size >= room(a) + room(b) - 1e-6) {
        const shift = a.size < room(a) ? room(a) - a.size : b.size < room(b) ? b.size - room(b) : 0;
        rows[k].d += shift;
        rows[k + 1].z += shift;
        rows[k + 1].d -= shift;
        edge = street(...sides(), required);
      }
    }
    if (!streets) between.push({ side: "soft", width: soft });
    else if (edge) {
      between.push(edge);
      depthSinceRoad = rows[k + 1].d;
    } else {
      between.push(here || next ? { side: "soft", width: soft } : quiet);
      depthSinceRoad += rows[k + 1].d;
    }
  }

  // Grille des rues transversales, à la longueur d'un pâté.
  const spacing = blockLength(mode);
  const lines = gridLines(rect.x, rect.w, spacing);
  // Un tronçon dont ni l'ouest ni l'est ne donnent sur une rue : ses rues entre rangées n'auraient
  // pas d'issue. Une rue transversale commune à toutes les rangées les relie au nord ou au sud.
  const enclosed = streets && mode !== "path" && !access.west && !access.east && (access.north || access.south);
  if (enclosed && rows.length > 1 && lines.length === 0) lines.push(rect.x + rect.w / 2);

  const groundTop = env.ground ? top : top + CURB;
  /** Les rues transversales de chaque rangée : à la fin, celles qui butent sur une maison s'effacent. */
  const crossing: Road[][] = rows.map(() => []);

  rows.forEach((row, k) => {
    const north = k === 0 ? EDGE : between[k - 1];
    const south = k === rows.length - 1 ? EDGE : between[k];
    const z0 = row.z + half(north);
    const z1 = row.z + row.d - half(south);

    // La place libre au bout d'une rangée incomplète devient une place publique.
    const first = row.items[0];
    const last = row.items[row.items.length - 1];
    for (const [x0, x1] of [[rect.x, first.x], [last.x + last.w, rect.x + rect.w]]) {
      if (x1 - x0 < 1) continue;
      const square = { x: x0, z: z0, w: x1 - x0, d: z1 - z0 };
      if (!env.ground) ctx.plates.push({ ...square, y: top, h: CURB, style: "plaza", owner });
      ctx.decor.push({ type: "square", ...square, y: groundTop, owner });
    }

    if (south.side === "road") {
      ctx.roads.push({
        x: rect.x, z: row.z + row.d - south.width / 2, w: rect.w, d: south.width,
        axis: "x", style: mode as RoadStyle, owner, y: top, ...(env.ground ? { lawn: true } : {}),
      });
    }

    // Dans la rangée : une rue autour des conteneurs et des grands édifices, et sur la grille commune.
    // Si aucun joint ne s'y prête, une rue coupe quand même un pâté devenu bien trop long.
    const aligned = streets ? alignJoints(row, lines, spacing) : new Set<number>();
    const cross: Edge[] = [];
    let run = row.items[0].w;
    for (let j = 1; j < row.items.length; j += 1) {
      const a = items[row.items[j - 1].index];
      const b = items[row.items[j].index];
      const w = row.items[j].w;
      const wanted = streets && (aligned.has(j) || big(a) || big(b) || run + w > blockLength(mode) * 1.6);
      const west = j === 1 ? EDGE : cross[j - 2];
      const edge = wanted
        ? street(
            { size: row.items[j - 1].w, other: inset(west), need: a.least },
            { size: w, other: leastInset(j === row.items.length - 1), need: b.least },
          )
        : null;
      if (!streets) cross.push({ side: "soft", width: soft });
      else if (edge) {
        cross.push(edge);
        run = w;
      } else {
        cross.push(big(a) || big(b) ? { side: "soft", width: soft } : quiet);
        run += w;
      }
    }

    // Le trottoir d'un pâté : les éléments simples collés entre deux rues.
    let segmentStart = -1;
    const closeSegment = (end: number) => {
      if (segmentStart < 0) return;
      const first = row.items[segmentStart];
      const last = row.items[end];
      const west = segmentStart === 0 ? EDGE : cross[segmentStart - 1];
      const east = end === row.items.length - 1 ? EDGE : cross[end];
      const landmark = end === segmentStart && LANDMARKS.has(items[first.index].kind);
      const x0 = first.x + half(west);
      const x1 = last.x + last.w - half(east);
      ctx.plates.push({ x: x0, z: z0, w: x1 - x0, d: z1 - z0, y: top, h: CURB, style: landmark ? "plaza" : "sidewalk", owner });
      segmentStart = -1;
    };

    row.items.forEach((item, j) => {
      const plot = items[item.index];
      const west = j === 0 ? EDGE : cross[j - 1];
      const east = j === row.items.length - 1 ? EDGE : cross[j];
      if (west.side === "road") {
        const n = north.side === "road" ? north.width / 2 : 0;
        const s = south.side === "road" ? south.width / 2 : 0;
        const road: Road = {
          x: item.x - west.width / 2, z: row.z + n, w: west.width, d: row.d - n - s,
          axis: "z", style: mode as RoadStyle, owner, y: top, ...(env.ground ? { lawn: true } : {}),
        };
        ctx.roads.push(road);
        // Seules les petites rues d'un pâté s'effacent si elles butent sur une maison : celle qui borde
        // un conteneur le dessert (ses propres rues s'y raccordent), quitte à finir en impasse.
        if (!big(plot) && !big(items[row.items[j - 1].index])) crossing[k].push(road);
      }

      if (plot.container) {
        const cell = { x: item.x + half(west), z: z0, w: item.w - half(west) - half(east), d: z1 - z0 };
        // Ce que la case touche : une rue de ce tronçon, ou le bord du tronçon s'il donne lui-même sur une rue.
        const reach: Access = {
          north: north.side === "road" || (row.z <= rect.z + 0.01 && access.north),
          south: south.side === "road" || (row.z + row.d >= rect.z + rect.d - 0.01 && access.south),
          west: west.side === "road" || (item.x <= rect.x + 0.01 && access.west),
          east: east.side === "road" || (item.x + item.w >= rect.x + rect.w - 0.01 && access.east),
        };
        if (plot.virtual) placeRows(plot.children, cell, top, owner, ctx, { ...env, access: reach }, depth);
        else place(plot, cell, top, owner, ctx, { ...env, access: reach });
        return;
      }

      if (!env.ground && segmentStart < 0) segmentStart = j;
      const footprint = {
        x: item.x + inset(west),
        z: row.z + inset(north),
        w: item.w - inset(west) - inset(east),
        d: row.d - inset(north) - inset(south),
      };
      // Un bâtiment ne descend pas sous sa taille minimale pour garder ses trottoirs : il mord dessus,
      // tant que la case (hors chaussée) le permet.
      const need = plot.least;
      if (footprint.w < need) {
        const x0 = item.x + half(west);
        const x1 = item.x + item.w - half(east);
        const w = Math.min(need, x1 - x0);
        footprint.x = clamp(footprint.x - (w - footprint.w) / 2, x0, x1 - w);
        footprint.w = w;
      }
      if (footprint.d < need) {
        const d = Math.min(need, z1 - z0);
        footprint.z = clamp(footprint.z - (d - footprint.d) / 2, z0, z1 - d);
        footprint.d = d;
      }
      // Case trop étroite pour ses trottoirs : le bâtiment se recentre sur la partie hors chaussée.
      if (footprint.w < 0.3) {
        const x0 = item.x + half(west);
        const x1 = item.x + item.w - half(east);
        footprint.w = Math.min(0.3, x1 - x0);
        footprint.x = (x0 + x1 - footprint.w) / 2;
      }
      if (footprint.d < 0.3) {
        footprint.d = Math.min(0.3, z1 - z0);
        footprint.z = (z0 + z1 - footprint.d) / 2;
      }
      place(plot, footprint, groundTop, owner, ctx, env);
      if (east.side !== "attached") closeSegment(j);
    });
  });

  // Une rue transversale qui débouche, à travers un simple écart, sur une maison de la rangée voisine
  // (au lieu de rejoindre la rue de cette rangée) ferait croire que la maison coupe la route : elle
  // s'efface. En ville, sa place devient un passage pavé ; sur une pelouse, de l'herbe.
  const meets = (a: Road, b: Road) => a.x < b.x + b.w - 0.05 && b.x < a.x + a.w - 0.05;
  let changed = true;
  while (changed) {
    changed = false;
    for (let k = 0; k < rows.length - 1; k += 1) {
      if (between[k].side === "road") continue;
      const upper = crossing[k];
      const lower = crossing[k + 1];
      const lost = [
        ...upper.filter((road) => !lower.some((other) => meets(road, other))),
        ...lower.filter((road) => !upper.some((other) => meets(road, other))),
      ];
      for (const road of lost) {
        eraseRoad(road, ctx);
        for (const list of crossing) {
          const at = list.indexOf(road);
          if (at >= 0) list.splice(at, 1);
        }
        changed = true;
      }
    }
  }
}

/** Retire une rue : sur une pelouse, l'herbe reprend sa place ; en ville, un passage pavé. */
function eraseRoad(road: Road, ctx: Pick<Ctx, "roads" | "plates">) {
  const at = ctx.roads.indexOf(road);
  if (at >= 0) ctx.roads.splice(at, 1);
  if (!road.lawn) {
    ctx.plates.push({ x: road.x, z: road.z, w: road.w, d: road.d, y: road.y, h: CURB, style: "sidewalk", owner: road.owner });
  }
}

function shapeLeaf(lot: Lot, node: CityNode): void {
  lot.h = leafHeight(lot.kind, node);
  const cx = lot.x + lot.w / 2;
  const cz = lot.z + lot.d / 2;
  const short = Math.min(lot.w, lot.d);

  const square = (size: number) => {
    lot.x = cx - size / 2;
    lot.z = cz - size / 2;
    lot.w = size;
    lot.d = size;
  };
  const capRatio = (maxRatio: number) => {
    if (lot.w > lot.d * maxRatio) {
      lot.w = lot.d * maxRatio;
      lot.x = cx - lot.w / 2;
    } else if (lot.d > lot.w * maxRatio) {
      lot.d = lot.w * maxRatio;
      lot.z = cz - lot.d / 2;
    }
  };

  switch (lot.kind) {
    case "monument": square(short * 0.72); break;
    case "belfry": square(short * 0.68); break;
    case "kiosk": square(short * 0.7); break;
    case "bollard": square(Math.min(1.6, short * 0.7)); break;
    case "sculpture": {
      square(short * 0.7);
      lot.h = Math.max(2.4, lot.w * 1.2);
      break;
    }
    case "embassy": capRatio(1.6); break;
    case "gallery": {
      // Assez haute pour ses écrans, sur ses quatre façades (une affiche type : 4 × 3).
      capRatio(1.6);
      const across = (length: number) => Math.max(1, Math.floor((length - 0.4 + POSTER_GAP) / (4 + POSTER_GAP)));
      const perRow = 2 * (across(lot.w) + across(lot.d));
      const rows = Math.ceil((lot.gallery ?? 1) / perRow) + 1;
      lot.h = clamp(POSTER_LIFT + rows * (3.4 + POSTER_GAP) + 0.8, 7, 48);
      break;
    }
    case "tower":
    case "residence": {
      capRatio(lot.kind === "tower" ? 2.2 : 3);
      // Variation stable de ±20 % : deux textes de même longueur ne font pas deux immeubles jumeaux.
      const x = Math.sin(lot.id * 91.345 + 7.1) * 43758.5453;
      lot.h *= 0.82 + 0.4 * (x - Math.floor(x));
      break;
    }
    case "house": capRatio(2.4); break;
    case "counter": capRatio(1.7); break;
    case "ruin": {
      capRatio(1.8);
      lot.h = 2.6;
      break;
    }
    default:
      break;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
