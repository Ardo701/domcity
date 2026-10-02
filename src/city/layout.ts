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

export type RoadStyle = "ring" | "avenue" | "street" | "lane" | "path";
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
  /** Le port (bassin et grues) du pied de page, la porte monumentale de l'en-tête, une place publique. */
  type: "harbor" | "gate" | "square";
  owner: number;
  y: number;
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

const RING = 6;
const BELT = 7;
const SIDEWALK = 0.75;
const ALLEY = 0.16;
const RIVER_WIDTH = 3.4;
const QUAY = 1.3;
const GATE_BAND = 7;
const HARBOR_BAND = 10;

type StreetMode = RoadStyle | "none";

/** Largeur d'une rue de ce genre, à cette profondeur dans la page. */
export function roadWidth(style: RoadStyle, depth: number): number {
  switch (style) {
    case "ring": return RING;
    case "avenue": return Math.max(4.6, 7 * 0.88 ** depth);
    case "street": return Math.max(3, 6.4 * 0.84 ** depth);
    case "lane": return 2.4;
    case "path": return 1.4;
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
  const kind = ownText ? ownTextKind(node.tag, text, textOf) : kindOf(node.tag, container, text);
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

export function layoutCity(doc: CityDoc): CityLayout {
  const rootPlot = buildPlot(doc.root, 0, "street");
  const ctx: Ctx = { lots: [], roads: [], joints: [], plates: [], decor: [] };
  const side = Math.sqrt(rootPlot.area);
  place(rootPlot, { x: -side / 2, z: -side / 2, w: side, d: side }, 0, -1, ctx, { streets: "street" });
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
      case "billboard": stats.billboards += 1; break;
      case "monument": case "belfry": case "kiosk": case "bollard": stats.monuments += 1; break;
      default: stats.buildings += 1;
    }
  }
  return { lots, roads: ctx.roads, joints: ctx.joints, plates: ctx.plates, decor: ctx.decor, bounds, stats };
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
    default:
      break;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
