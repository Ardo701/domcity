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

export interface Panel {
  /** Largeur et hauteur de l'affiche. */
  width: number;
  height: number;
  /** Hauteur du bas de l'affiche au-dessus du sol. */
  lift: number;
  /** Petite image : un panonceau ou un drapeau sur son mât, plutôt qu'un grand panneau. */
  emblem?: Emblem;
}

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

/** Panonceau : la plus grande dimension de la plaque, et la hauteur de son bas. */
const SIGN_SIZE = 1;
const SIGN_LIFT = 1.4;
/** Drapeau : sa largeur, et la hauteur de son haut sur le mât. */
const FLAG_WIDTH = 1.6;
const FLAG_TOP = 5;

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

/** `textOf` : bâtiment du texte écrit directement dans ce conteneur, de ce genre. */
function buildPlot(node: CityNode, depth: number, streets: StreetMode, textOf?: Kind): Plot {
  const ownText = textOf !== undefined;
  const kept = ownText ? [] : node.children ?? [];
  const container = kept.length > 0;
  const text = node.text ?? 0;
  let kind = ownText ? ownTextKind(node.tag, text, textOf) : kindOf(node.tag, container, text);
  // Une image cassée dans la page : son panneau est en ruine.
  if (kind === "billboard" && node.img?.broken) kind = "ruin";
  const plot: Plot = { node, kind, container, ownText, depth, children: [], area: 0, textTotal: text };

  if (!container) {
    plot.area = leafArea(kind, node);
    return plot;
  }

  const mode = depth === 0 ? "street" : streetsOf(kind) ?? streets;
  // Texte écrit directement dans le conteneur : un bâtiment de plus, en premier.
  if (text > 0) plot.children.push(buildPlot(node, depth + 1, mode, kind));
  for (const child of kept) plot.children.push(buildPlot(child, depth + 1, mode));

  const gap = unitGap(mode, depth);
  const road = mode === "none" ? 0 : roadWidth(mode, depth);
  let inner = 0;
  let rivers = 0;
  for (const child of plot.children) {
    plot.textTotal += child.ownText ? 0 : child.textTotal;
    if (child.kind === "river") {
      rivers += 1;
      continue;
    }
    // Un enfant unique remplit son parent : pas de rue à prévoir autour (les enveloppes <div> en chaîne).
    const alone = plot.children.length === 1;
    const big = child.container || LANDMARKS.has(child.kind);
    const side = Math.sqrt(child.area) + (alone ? 0 : big && road > 0 ? road + 2 * SIDEWALK : gap);
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
function unitGap(mode: StreetMode, depth: number): number {
  if (mode === "street" || mode === "avenue") return roadWidth(mode, depth) * 0.55;
  if (mode === "none") return softGap(mode);
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
function rowShape(scaled: number[], width: number, rigid: boolean) {
  const total = scaled.reduce((sum, a) => sum + a, 0);
  const natural = total / width;
  const side = Math.sqrt(Math.max(...scaled));
  const depth = rigid && natural < side * 0.4 ? side * 0.8 : natural;
  return { depth, used: Math.min(width, total / depth) };
}

/** Un conteneur s'adapte à n'importe quelle case ; un bâtiment a besoin d'une case à peu près carrée. */
export type Fit = "flexible" | "leaf" | "landmark";

/** Range des surfaces dans un rectangle, par rangées, sans changer leur ordre. */
export function stripRows(areas: number[], rect: Rect, fits: Fit[] = []): Row[] {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (areas.length === 0 || total <= 0) return [];
  const scale = (rect.w * rect.d) / total;
  const scaled = areas.map((a) => Math.max(a * scale, 1e-6));

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
    if (!mismatch && after <= before) current.push(i);
    else {
      groups.push(current);
      current = [i];
    }
  }
  groups.push(current);

  // Les rangées trop peu remplies prennent plus de profondeur : on resserre l'ensemble pour tenir dans le rectangle.
  const shapes = groups.map((group) =>
    rowShape(group.map((j) => scaled[j]), rect.w, group.some((j) => (fits[j] ?? "flexible") !== "flexible")),
  );
  const depthTotal = shapes.reduce((sum, shape) => sum + shape.depth, 0);
  const fit = depthTotal > rect.d ? rect.d / depthTotal : 1;

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
    rows.push({ z, d: depth * fit, items });
    z += depth * fit;
  });
  return rows;
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
  const ctx: Ctx = { lots: [], roads: [], joints: [], plates: [], decor: [], channels: [], bridges: [] };
  const side = Math.sqrt(rootPlot.area);
  const edge = { x: -side / 2, z: -side / 2, w: side, d: side };
  place(rootPlot, edge, 0, -1, ctx, { streets: "street" });
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
  ctx.lots.push(lot);
  return lot;
}

function place(plot: Plot, cell: Rect, y: number, parent: number, ctx: Ctx, env: Env): void {
  const lot = newLot(plot, cell, y, parent, ctx);
  if (!plot.container) {
    shapeLeaf(lot, plot.node);
    return;
  }

  const root = plot.depth === 0;
  const own = groundOf(plot.kind);
  lot.h = root ? BASE : own ? (env.ground ? 0.05 : CURB) : 0;
  const top = y + lot.h;
  const childEnv: Env = {
    ground: root ? undefined : own ?? env.ground,
    streets: root ? "street" : streetsOf(plot.kind) ?? env.streets,
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
    items.map((item) => (Math.sqrt(item.area) + (alone ? 0 : big(item) && streets ? road + 2 * SIDEWALK : gap)) ** 2),
    rect,
    // Un pâté de maisons ajouté se range comme un conteneur ; s'il porte un grand édifice, comme lui.
    items.map((item): Fit =>
      item.virtual
        ? item.children.some((child) => LANDMARKS.has(child.kind)) ? "landmark" : "flexible"
        : item.container ? "flexible" : LANDMARKS.has(item.kind) ? "landmark" : "leaf",
    ),
  );
  if (rows.length === 0) return;

  const quiet: Edge = urban ? { side: "attached", width: ALLEY } : { side: "soft", width: soft };
  /** Une rue entre deux cases, jamais plus large que ce qu'elles peuvent céder. */
  const street = (a: number, b: number): Edge | null => {
    const width = Math.min(road, 0.42 * Math.min(a, b));
    return width >= 1.2 ? { side: "road", width } : null;
  };

  // Entre les rangées : une rue dès qu'un conteneur est en jeu, ou quand le pâté devient trop profond.
  const between: Edge[] = [];
  let depthSinceRoad = rows[0].d;
  for (let k = 0; k < rows.length - 1; k += 1) {
    const here = rows[k].items.some((it) => big(items[it.index]));
    const next = rows[k + 1].items.some((it) => big(items[it.index]));
    const wanted = streets && (here || next || depthSinceRoad + rows[k + 1].d > blockDepth(mode));
    const edge = wanted ? street(rows[k].d, rows[k + 1].d) : null;
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

  const half = (edge: Edge) => edge.width / 2;
  const groundTop = env.ground ? top : top + CURB;
  // Retrait d'un bâtiment : trottoir côté rue et côté bord, presque rien côté voisin.
  const inset = (edge: Edge) =>
    edge.side === "road"
      ? edge.width / 2 + SIDEWALK
      : edge.side === "edge"
        ? env.ground ? soft / 2 : SIDEWALK
        : edge.width / 2;

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
        axis: "x", style: mode as RoadStyle, owner, y: top,
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
      const edge = wanted ? street(row.items[j - 1].w, w) : null;
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
        ctx.roads.push({
          x: item.x - west.width / 2, z: row.z + n, w: west.width, d: row.d - n - s,
          axis: "z", style: mode as RoadStyle, owner, y: top,
        });
      }

      if (plot.container) {
        const cell = { x: item.x + half(west), z: z0, w: item.w - half(west) - half(east), d: z1 - z0 };
        if (plot.virtual) placeRows(plot.children, cell, top, owner, ctx, env, depth);
        else place(plot, cell, top, owner, ctx, env);
        return;
      }

      if (!env.ground && segmentStart < 0) segmentStart = j;
      const footprint = {
        x: item.x + inset(west),
        z: row.z + inset(north),
        w: item.w - inset(west) - inset(east),
        d: row.d - inset(north) - inset(south),
      };
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
    case "billboard":
    case "screen": {
      const ratio =
        lot.kind === "screen" ? 16 / 9 : clamp((node.img?.w || 4) / (node.img?.h || 3), 0.45, 3);
      const emblem = lot.kind === "billboard" ? emblemOf(node) : undefined;
      let width = lot.w * 0.92;
      let height = width / ratio;
      let lift = lot.kind === "screen" ? 2.2 : 1.6;
      if (emblem === "flag") {
        width = FLAG_WIDTH;
        height = width / clamp(ratio, 1.2, 2.2);
        lift = FLAG_TOP - height;
      } else if (emblem === "sign") {
        width = Math.min(lot.w * 0.92, ratio >= 1 ? SIGN_SIZE : SIGN_SIZE * ratio);
        height = width / ratio;
        lift = SIGN_LIFT;
      } else {
        const maxHeight = Math.max(2, lot.d * 2.2, 3);
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ratio;
        }
      }
      lot.panel = emblem ? { width, height, lift, emblem } : { width, height, lift };
      lot.x = cx - width / 2;
      lot.w = width;
      lot.z = cz - 0.2;
      lot.d = 0.4;
      lot.h = lift + height;
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
