/**
 * L'urbanisme : où va chaque élément, et à quelle hauteur.
 *
 * - Chaque conteneur devient un socle (quartier, îlot…) posé sur son parent :
 *   plus un élément est profond dans la page, plus il est haut. D'où le relief.
 * - Les enfants sont rangés en bandes, dans l'ordre de la page :
 *   de gauche à droite, puis du nord (haut de page) au sud (bas de page).
 * - Les rues se resserrent à mesure qu'on s'enfonce.
 * - Une ligne <hr> coupe son quartier par une rivière.
 *
 * Résultat : une liste plate de « lots », numérotés en ordre de document.
 * Le sous-arbre d'un lot occupe les numéros id+1 … subtreeEnd-1.
 */

import { kindOf, type Kind } from "@/format/taxonomy";
import type { CityDoc, CityNode } from "@/format/types";

export interface Panel {
  /** Largeur et hauteur de l'affiche. */
  width: number;
  height: number;
  /** Hauteur du bas de l'affiche au-dessus du sol. */
  lift: number;
}

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
  /** Hauteur du bâtiment, ou épaisseur du socle pour un conteneur. */
  h: number;
  /** Texte propre + texte de tous les descendants. */
  textTotal: number;
  panel?: Panel;
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
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };
  stats: CityStats;
}

// ---------------------------------------------------------------------------
// Réglages de l'urbanisme
// ---------------------------------------------------------------------------

/** Largeur des rues entre les enfants d'un conteneur à cette profondeur. */
export function streetWidth(depth: number): number {
  return Math.max(0.9, 4.2 * 0.78 ** depth);
}

/** Trottoir entre le bord d'un socle et ses enfants. */
function margin(depth: number): number {
  return streetWidth(depth) * 0.8;
}

const RIVER_WIDTH = 2.6;

function slabThickness(kind: Kind, depth: number): number {
  if (depth === 0) return 1.2;
  switch (kind) {
    case "district": return 0.8;
    case "block": return 0.6;
    default: return 0.35;
  }
}

/** Surface au sol d'une feuille, selon son genre et son texte. */
function leafArea(kind: Kind, node: CityNode): number {
  const text = node.text ?? 0;
  switch (kind) {
    case "tower": return 10 + 0.42 * text ** 0.72;
    case "residence": return 9 + 0.38 * text ** 0.72;
    case "house": return 5 + 0.18 * text ** 0.6;
    case "vacant": return 6;
    case "monument": return 64;
    case "belfry": return 30;
    case "kiosk": return 14;
    case "bollard": return 5;
    case "billboard": {
      const size = Math.max(node.img?.w ?? 0, node.img?.h ?? 0);
      return size > 0 && size < 48 ? 6 : 24;
    }
    case "screen": return 28;
    case "embassy": return 30;
    case "sculpture": return 9;
    case "counter": return 6;
    case "fields": return 18 + 0.25 * text ** 0.75;
    case "river": return 0;
    default: return 8;
  }
}

/** Hauteur d'une feuille. Les échelles sont logarithmiques : 10 000 caractères ne font pas une tour de 10 km. */
function leafHeight(kind: Kind, node: CityNode): number {
  const text = node.text ?? 0;
  switch (kind) {
    case "tower": return 3 + 4.2 * Math.log2(1 + text / 30);
    case "residence": return 2.2 + 2.8 * Math.log2(1 + text / 45);
    case "house": return Math.min(4.5, 1.9 + 0.5 * Math.log2(1 + text / 40));
    case "vacant": return 0.16;
    case "monument": return 34;
    case "belfry": return 18;
    case "kiosk": return 7;
    case "bollard": return 2.2;
    case "embassy": return 7;
    case "counter": return 1.6;
    case "fields": return 0.35;
    case "river": return 0.12;
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
  /** Surface demandée, rue comprise autour de la parcelle. */
  area: number;
  textTotal: number;
}

function buildPlot(node: CityNode, depth: number, ownText = false): Plot {
  const kept = ownText ? [] : node.children ?? [];
  const container = kept.length > 0;
  const text = node.text ?? 0;
  const kind = kindOf(node.tag, container, text);
  const plot: Plot = {
    node,
    kind,
    container,
    ownText,
    depth,
    children: [],
    area: 0,
    textTotal: text,
  };

  if (!container) {
    plot.area = leafArea(kind, node);
    return plot;
  }

  // Texte écrit directement dans le conteneur : un bâtiment de plus, en premier.
  if (text > 0) plot.children.push(buildPlot(node, depth + 1, true));
  for (const child of kept) plot.children.push(buildPlot(child, depth + 1));

  const gap = streetWidth(depth);
  let inner = 0;
  let rivers = 0;
  for (const child of plot.children) {
    plot.textTotal += child.ownText ? 0 : child.textTotal;
    if (child.kind === "river") {
      rivers += 1;
      continue;
    }
    const side = Math.sqrt(child.area) + gap;
    inner += side * side;
  }
  if (inner === 0) inner = 4;
  const core = Math.sqrt(inner);
  const side = core + rivers * (RIVER_WIDTH + gap) * 0.5 + 2 * margin(depth);
  plot.area = side * side;
  return plot;
}

// ---------------------------------------------------------------------------
// Rangement en bandes, dans l'ordre
// ---------------------------------------------------------------------------

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
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

/** Range des surfaces dans un rectangle, par bandes horizontales, sans changer leur ordre. */
export function stripLayout(areas: number[], rect: Rect): Rect[] {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (areas.length === 0 || total <= 0) return areas.map(() => ({ ...rect, w: 0, d: 0 }));
  const scale = (rect.w * rect.d) / total;
  const scaled = areas.map((a) => Math.max(a * scale, 1e-6));

  const rows: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < scaled.length; i += 1) {
    if (current.length === 0) {
      current.push(i);
      continue;
    }
    const before = worstRatio(current.map((j) => scaled[j]), rect.w);
    const after = worstRatio([...current, i].map((j) => scaled[j]), rect.w);
    if (after <= before) current.push(i);
    else {
      rows.push(current);
      current = [i];
    }
  }
  rows.push(current);

  const cells: Rect[] = new Array(areas.length);
  let z = rect.z;
  for (const row of rows) {
    const rowArea = row.reduce((sum, j) => sum + scaled[j], 0);
    const rowDepth = rowArea / rect.w;
    let x = rect.x;
    for (const j of row) {
      const width = scaled[j] / rowDepth;
      cells[j] = { x, z, w: width, d: rowDepth };
      x += width;
    }
    z += rowDepth;
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------

export function layoutCity(doc: CityDoc): CityLayout {
  const rootPlot = buildPlot(doc.root, 0);
  const lots: Lot[] = [];
  const side = Math.sqrt(rootPlot.area);
  place(rootPlot, { x: -side / 2, z: -side / 2, w: side, d: side }, 0, -1, lots);

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
  return { lots, bounds, stats };
}

function place(plot: Plot, cell: Rect, y: number, parent: number, lots: Lot[]): void {
  const id = lots.length;
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
    w: cell.w,
    d: cell.d,
    y,
    h: 0,
    textTotal: plot.textTotal,
  };
  lots.push(lot);

  if (!plot.container) {
    shapeLeaf(lot, plot.node);
    return;
  }

  lot.h = slabThickness(plot.kind, plot.depth);
  const top = y + lot.h;
  const m = Math.min(margin(plot.depth), cell.w / 4, cell.d / 4);
  const inner: Rect = { x: cell.x + m, z: cell.z + m, w: cell.w - 2 * m, d: cell.d - 2 * m };
  const gap = streetWidth(plot.depth);

  // Découpe en tronçons séparés par les rivières.
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

  const band = Math.min(RIVER_WIDTH + gap, inner.d / (2 * rivers.length + 1));
  const segmentArea = segments.map((items) =>
    items.reduce((sum, item) => sum + (Math.sqrt(item.area) + gap) ** 2, 0),
  );
  const totalArea = segmentArea.reduce((sum, a) => sum + a, 0) || 1;
  const available = Math.max(inner.d - rivers.length * band, inner.d * 0.2);

  let z = inner.z;
  segments.forEach((items, s) => {
    const depth = rivers.length === 0 ? inner.d : (available * segmentArea[s]) / totalArea;
    if (items.length > 0 && depth > 0) {
      const cells = stripLayout(
        items.map((item) => (Math.sqrt(item.area) + gap) ** 2),
        { x: inner.x, z, w: inner.w, d: depth },
      );
      items.forEach((item, i) => {
        const c = cells[i];
        const inset = Math.min(gap / 2, c.w / 4, c.d / 4);
        place(item, { x: c.x + inset, z: c.z + inset, w: c.w - 2 * inset, d: c.d - 2 * inset }, top, id, lots);
      });
    }
    z += depth;
    const river = rivers[s];
    if (river) {
      const riverDepth = Math.min(RIVER_WIDTH, band);
      // L'eau affleure à la surface du socle et le traverse de bord à bord.
      place(river, { x: cell.x, z: z + (band - riverDepth) / 2, w: cell.w, d: riverDepth }, top, id, lots);
      z += band;
    }
  });

  lot.subtreeEnd = lots.length;
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

  switch (lot.kind) {
    case "monument": square(short * 0.5); break;
    case "belfry": square(short * 0.55); break;
    case "kiosk": square(short * 0.72); break;
    case "bollard": square(Math.min(1.4, short * 0.6)); break;
    case "sculpture": {
      square(short * 0.6);
      lot.h = lot.w * 1.1;
      break;
    }
    case "embassy": square(short * 0.75); break;
    case "billboard":
    case "screen": {
      const ratio =
        lot.kind === "screen"
          ? 16 / 9
          : clamp((node.img?.w ?? 4) / (node.img?.h ?? 3), 0.45, 3);
      let width = lot.w * 0.92;
      let height = width / ratio;
      const maxHeight = Math.max(2, lot.d * 2.2, 3);
      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }
      const lift = 1.4;
      lot.panel = { width, height, lift };
      lot.x = cx - width / 2;
      lot.w = width;
      lot.z = cz - 0.2;
      lot.d = 0.4;
      lot.h = lift + height;
      break;
    }
    case "tower":
    case "residence":
    case "house":
    case "counter": {
      // Pas de barres de 80 m de long : au-delà d'un rapport 1,7, on recentre un bâtiment plus trapu.
      const maxRatio = 1.7;
      if (lot.w > lot.d * maxRatio) {
        lot.w = lot.d * maxRatio;
        lot.x = cx - lot.w / 2;
      } else if (lot.d > lot.w * maxRatio) {
        lot.d = lot.w * maxRatio;
        lot.z = cz - lot.d / 2;
      }
      break;
    }
    default:
      break;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
