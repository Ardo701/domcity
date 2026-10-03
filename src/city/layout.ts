/**
 * Urban planning: where each element goes, and how tall it is.
 *
 * - The city is flat, laid on the base of a model and surrounded by a ring road.
 * - Each container arranges its children in rows, in page order:
 *   left to right, then from north (top of the page) to south (bottom of the page).
 * - Streets separate neighboring containers and cut long rows into city
 *   blocks. In a block, elements touch each other on a shared sidewalk, like
 *   the buildings of a street. Streets are wide between the large parts of the page,
 *   narrower deeper down.
 * - Parks, lists, forms, tables, menus, header and footer have their own ground.
 * - An <hr> line cuts its district with a canal lined with quays.
 *
 * Result: "lots" numbered in document order (a lot's subtree takes
 * the numbers id+1 ... subtreeEnd-1), plus streets, sidewalks and some decor.
 */

import { kindOf, type Kind } from "@/format/taxonomy";
import type { CityDoc, CityNode } from "@/format/types";
import { ambianceOf, type Ambiance, type Weather } from "./ambiance";
import { rand } from "./palette";

export interface Panel {
  /** Width and height of the poster. */
  width: number;
  height: number;
  /** Height of the bottom of the poster above the lot's base (on a roof: its posts, or a flag's pole). */
  lift: number;
  /** Small image: a sign, or a flag on its pole, rather than a large poster. */
  emblem?: Emblem;
  /** Where it hangs on its carrier building: a facade, or the roof. */
  mount: Mount;
}

/** A facade (the one facing south, north, east, west) or the roof. */
export type Mount = "south" | "north" | "east" | "west" | "roof";

export type Emblem = "sign" | "flag";

/** Below this size (in pixels), an image is an icon: no large billboard for it. */
export const ICON_SIZE = 48;
const FLAG_NAME = /flag|drapeau|bandera|flagge|bandiera|bandeira/i;

/**
 * Small image: a flag (its file or its alt text says so, and it is wider
 * than tall) or a simple icon. Nothing for a real image, even a lost one: it keeps its billboard.
 */
export function emblemOf(node: CityNode): Emblem | undefined {
  const img = node.img;
  const size = Math.max(img?.w ?? 0, img?.h ?? 0);
  const small = size > 0 && size < ICON_SIZE;
  // An image from a refused site has lost its address, not its place: it stays a poster.
  if (!small && (img?.src || img?.refused || size > 0)) return undefined;
  const file = (img?.src ?? "").split(/[?#]/)[0].split("/").pop() ?? "";
  const wide = (img?.w ?? 0) > (img?.h ?? 0) * 1.15;
  return wide && (FLAG_NAME.test(file) || FLAG_NAME.test(img?.alt ?? "")) ? "flag" : "sign";
}

/** Sign: the largest dimension of the plate, and the height of its bottom on the facade. */
const SIGN_SIZE = 1;
const SIGN_LIFT = 1.05;
/** Flag: its width, and the height of its pole above the roof. */
const FLAG_WIDTH = 1.6;
const FLAG_MAST = 2.2;
/** The bottom of posters, above shop windows, signs and graffiti. */
const POSTER_LIFT = 2.2;
const POSTER_GAP = 0.35;
/** The posts of a billboard on a roof. */
const ROOF_LIFT = 0.8;
/** Thickness of a poster on its facade. */
const POSTER_DEPTH = 0.12;

/** What hangs on a building rather than taking a cell on the ground: images, screens. */
const MOUNTED = new Set<Kind>(["billboard", "screen"]);
/** What can carry posters. */
const HOSTS = new Set<Kind>(["tower", "residence", "house", "gallery"]);

export interface Lot {
  id: number;
  parent: number;
  /** First number after this lot's subtree. */
  subtreeEnd: number;
  node: CityNode;
  kind: Kind;
  depth: number;
  container: boolean;
  /** Building added to carry the text written directly in a container. */
  ownText: boolean;
  /** Footprint: northwest corner (x, z), width (w, along x), depth (d, along z). */
  x: number;
  z: number;
  w: number;
  d: number;
  /** Altitude of the base. */
  y: number;
  /** Height of the building, or thickness of the ground for a container that has one (0 otherwise). */
  h: number;
  /** Own text + text of all descendants. */
  textTotal: number;
  panel?: Panel;
  /**
   * Placed somewhere other than on a ground cell: an image hung on a neighboring building, or a
   * container that only has images (it has no ground, its footprint is that of its images).
   */
  hung?: boolean;
  /** Gallery: the number of images it was built to carry. */
  gallery?: number;
}

/** `highway`: the megalopolis highways, between cities. */
export type RoadStyle = "ring" | "avenue" | "street" | "lane" | "path" | "highway";
export type GroundStyle = "base" | "sidewalk" | "plaza" | "grass" | "lawn" | "crops" | "dirt" | "wharf" | "quay";

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Road extends Rect {
  /** Direction of the roadway. */
  axis: "x" | "z";
  style: RoadStyle;
  /** The container this street belongs to: hovering the street points at the container. */
  owner: number;
  y: number;
  /** Drawn on a lawn (housing estate, park): when removed, it leaves grass, not a hole. */
  lawn?: boolean;
}

/** The sides of a joint cell through which the roadway leaves it. */
export interface Openings {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

/**
 * Joint cell between roadway sections. Two adjacent open sides make a rounded
 * curve (the corners of the ring road); two opposite sides, a straight line; three or
 * four, an intersection. To connect another road (the megalopolis highways),
 * opening one more side is enough: the engine then draws the intersection.
 */
export interface Joint extends Rect {
  open: Openings;
  style: RoadStyle;
  /** The ground that lines the roadway outside the curve. */
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
   * The footer's harbor (basin and cranes), the header's monumental gate, a public square,
   * a grove in the countryside around the megalopolis.
   */
  type: "harbor" | "gate" | "square" | "woods";
  owner: number;
  y: number;
}

/** The arch of the header's gate, in the middle of its square: width of the opening and height of the pillars. */
export function gateArch(decor: Decor): { span: number; height: number; top: number } {
  const span = Math.min(11, Math.max(4, decor.w * 0.3));
  const height = Math.min(9, Math.max(5, span * 0.85));
  // Pillars, lintel (1.3) and attic (0.7).
  return { span, height, top: decor.y + height + 2 };
}

/** A harbor's channel: its water, from the basin to the edge of the model. */
export interface Channel extends Rect {
  /** Direction of the channel: along x (basin extended west or east), along z (toward the south). */
  axis: "x" | "z";
  /** The harbor, for hovering. */
  owner: number;
  /** Base of the water: that of the basin. */
  y: number;
}

/** A street's bridge over a channel: the part of the roadway that crosses the water. */
export interface Bridge extends Rect {
  axis: "x" | "z";
  style: RoadStyle;
  owner: number;
  y: number;
}

/**
 * The airport: the page's links to other sites. It is not an element of the page:
 * it is outside the walls, east of the city, on an extension of the base, linked to the ring road.
 * In the megalopolis, each city keeps a small airfield (a runway, a hangar) and the site has
 * its large shared airport.
 */
export interface Airport extends Rect {
  kind: "airport" | "aerodrome";
  /** Hover number: right after the last lot (it is not a lot). */
  id: number;
  /** Level of the runways and the tarmac. */
  y: number;
  /** Links to other sites, across the whole page. */
  external: number;
  runways: Rect[];
  /** Aircraft taxiways: the main one, parallel to the runways, and its links. */
  taxiways: Array<Rect & { axis: "x" | "z" }>;
  apron: Rect;
  /** The terminal (an airfield's hangar). */
  terminal: Rect;
  /** The control tower (an airfield's windsock). */
  tower: Rect;
  /** Aircraft at the terminal gates (in front of the hangar). */
  planes: number;
  /** Sites targeted by the links, from most to least targeted (recent captures only). */
  destinations: Array<[domain: string, links: number]>;
  /** A plane in flight toward each of the top sites: it has just taken off, heading for its destination. */
  flights: Flight[];
}

export interface Flight {
  domain: string;
  x: number;
  y: number;
  z: number;
  /** Heading (rotation around the vertical, 0 = east) and pitch. */
  heading: number;
  pitch: number;
}

/** A factory in the green belt: a hall and its smoking chimneys. */
export interface Factory extends Rect {
  /** Direction of the hall: along the belt. */
  axis: "x" | "z";
  chimneys: number;
  y: number;
}

/** The city's factories: the page's scripts. A single hover number for all of them. */
export interface Industry {
  id: number;
  scripts: number;
  factories: Factory[];
}

/** A surveillance camera on its pole, at the edge of a street. */
export interface Camera {
  x: number;
  y: number;
  z: number;
  /** Where the lens looks (0 = east, like a plane). */
  heading: number;
}

/** The city's cameras: the page's ad trackers. */
export interface Surveillance {
  id: number;
  trackers: string[];
  cameras: Camera[];
}

export interface Cloud {
  x: number;
  y: number;
  z: number;
  /** Radius of the main body of the cloud. */
  size: number;
}

/** What does not show in the page but shows in the city: weather, factories, cameras. */
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
  /** Joints between sections (corners of the ring road). */
  joints: Joint[];
  plates: Plate[];
  decor: Decor[];
  /** Harbor channels to the outside, and bridges of the streets that cross them. */
  channels: Channel[];
  bridges: Bridge[];
  airport?: Airport;
  /** Absent for the megalopolis countryside. */
  ambiance?: CityAmbiance;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };
  stats: CityStats;
}

// ---------------------------------------------------------------------------
// Urban planning settings (1 unit ≈ 3 m)
// ---------------------------------------------------------------------------

/** Thickness of the model's base, height of a sidewalk, of a floor. */
export const BASE = 0.4;
export const CURB = 0.14;
export const FLOOR = 1.15;

export const RING = 6;
export const BELT = 7;
const SIDEWALK = 0.75;
/** A street that cars use always leaves one lane in each direction (2.4 units: 7 m). */
export const DRIVABLE_MIN = 2.4;
/** The smallest side of a building: a house is at least 6.6 m, an apartment building 7.8 m. */
const MIN_SIDE: Partial<Record<Kind, number>> = { house: 2.2, residence: 2.6, tower: 2.6, gallery: 6, vacant: 2, counter: 1.4 };
const ALLEY = 0.16;
const RIVER_WIDTH = 3.4;
const QUAY = 1.3;
const GATE_BAND = 7;
const HARBOR_BAND = 10;
/** Share of the harbor strip taken by the quay, north of the basin. */
const QUAY_SHARE = 0.38;
/** Thickness of the water: its surface stays below quay level. */
export const WATER_DEPTH = 0.05;
/** Width of a highway: two lanes each way and a central median. */
export const HIGHWAY = 7;

type StreetMode = RoadStyle | "none";

/** Width of a street of this kind, at this depth in the page. */
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

/** Space between two neighboring elements with no street between them, when they do not touch. */
function softGap(mode: StreetMode): number {
  return mode === "path" ? 1.6 : mode === "lane" ? 1.1 : 1;
}

/** Length and depth of a city block before a street cuts it. */
function blockLength(mode: StreetMode): number {
  return mode === "avenue" ? 28 : mode === "path" ? 18 : mode === "lane" ? 26 : 24;
}
function blockDepth(mode: StreetMode): number {
  return mode === "lane" ? 9 : mode === "path" ? 12 : 16;
}

/** Containers that have their own ground, and how people move around in them. */
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

/** Large buildings always have a street on each side, and their forecourt. */
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

/** Logarithmic heights: 10,000 characters do not make a 10 km tower. */
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
// Working tree
// ---------------------------------------------------------------------------

interface Plot {
  node: CityNode;
  kind: Kind;
  container: boolean;
  ownText: boolean;
  depth: number;
  children: Plot[];
  /** Requested area, streets included. */
  area: number;
  textTotal: number;
  /** City block added by urban planning: it does not exist in the page, it has no lot. */
  virtual?: boolean;
  /** Rank among its container's children, in page order (-1: an added gallery). */
  order: number;
  /** False for an image (hung elsewhere) or a container that only has images. */
  placed: boolean;
  /** Children that take no cell: their lots are created at their rank, placed afterwards. */
  unplaced: Plot[];
  /** The subtree has a building to carry images. */
  hosts: boolean;
  /** Images of the subtree still without a carrier, and how many levels they have moved up. */
  orphans: number;
  climb: number;
  gallery?: number;
  /** The smallest possible side: that of its building, or of the largest building it contains. */
  least: number;
}

/**
 * Groups the simple elements that follow each other between two containers into a city block:
 * it is arranged like a container, lined with streets, instead of lining up small buildings
 * next to whole districts.
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

/** The kinds that are buildings. */
const BUILDINGS = new Set<Kind>(["tower", "residence", "house", "monument", "belfry", "kiosk", "bollard", "counter"]);

/**
 * Text written directly in a container becomes one more building, never a field,
 * a housing estate or a park laid on its own. In a table (the text of its cells), a list
 * or a park: a house, the farm in the middle of the fields; elsewhere, an apartment building.
 */
function ownTextKind(tag: string, text: number, container: Kind): Kind {
  const kind = kindOf(tag, false, text);
  if (BUILDINGS.has(kind)) return kind;
  return container === "fields" || container === "estate" || container === "park" ? "house" : "tower";
}

/** A gallery: a building covered with screens, built to carry the images of a block that has nothing else. */
function galleryPlot(node: CityNode, depth: number, images: number): Plot {
  const side = clamp(5 + 1.15 * Math.sqrt(images), 6, 16);
  return {
    node, kind: "gallery", container: false, ownText: false, depth, children: [], area: side * side, textTotal: 0,
    order: -1, placed: true, unplaced: [], hosts: true, orphans: 0, climb: 0, gallery: images, least: MIN_SIDE.gallery ?? 0,
  };
}

/** `textOf`: building for the text written directly in this container, of this kind. */
function buildPlot(node: CityNode, depth: number, streets: StreetMode, textOf?: Kind): Plot {
  const ownText = textOf !== undefined;
  const kept = ownText ? [] : node.children ?? [];
  const container = kept.length > 0;
  const text = node.text ?? 0;
  let kind = ownText ? ownTextKind(node.tag, text, textOf) : kindOf(node.tag, container, text);
  // A broken image in the page: its billboard is in ruins.
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
  // Text written directly in the container: one more building, first.
  const built: Plot[] = [];
  if (text > 0) built.push(buildPlot(node, depth + 1, mode, kind));
  for (const child of kept) built.push(buildPlot(child, depth + 1, mode));

  // Images take no cell: they hang on the nearest building in the page.
  // Those that have none in their block move up; after two levels (if there are at
  // least three), or at the edge of a district, a gallery covered with screens is built for them.
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
  // One or two lone images keep looking for a real building; three make a gallery.
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
    // An only child fills its parent: no street to plan around it (chains of <div> wrappers).
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

/** Average space reserved around an element: half a street in town (neighbors often touch). */
/**
 * What a building reserves around itself, where cars pass, so that a street can run along it:
 * half a two-way street, its sidewalk (its verge on a lawn), half of the
 * gap with its neighbor behind.
 */
function accessMargin(mode: StreetMode): number {
  if (mode !== "street" && mode !== "avenue" && mode !== "lane") return 0;
  return DRIVABLE_MIN / 2 + (mode === "lane" ? 0.35 : SIDEWALK) + softGap(mode) / 2;
}

function unitGap(mode: StreetMode, depth: number): number {
  if (mode === "street" || mode === "avenue") return roadWidth(mode, depth) * 0.55;
  if (mode === "none") return softGap(mode);
  // A housing estate keeps enough room to draw a two-way lane between two rows (its gardens).
  if (mode === "lane") return roadWidth(mode, depth) * 0.8;
  return Math.max(roadWidth(mode, depth) * 0.6, softGap(mode));
}

// ---------------------------------------------------------------------------
// Arrangement in rows, in order
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
 * Depth of a row. An almost empty row (a small lone element, the end of a list)
 * would spread into a very thin strip: it keeps almost square cells, centered,
 * and leaves free space on either side.
 */
function rowShape(scaled: number[], width: number, rigid: boolean, least = 0) {
  const total = scaled.reduce((sum, a) => sum + a, 0);
  const natural = total / width;
  const side = Math.sqrt(Math.max(...scaled));
  // Never shallower than its smallest possible building: no sliver-thin buildings.
  const depth = Math.max(rigid && natural < side * 0.4 ? side * 0.8 : natural, least);
  return { depth, used: Math.min(width, total / depth) };
}

/** A container adapts to any cell; a building needs a roughly square cell. */
export type Fit = "flexible" | "leaf" | "landmark";

/** Arranges areas in a rectangle, in rows, without changing their order. */
export function stripRows(areas: number[], rect: Rect, fits: Fit[] = [], mins: number[] = [], cores: number[] = mins): Row[] {
  const total = areas.reduce((sum, a) => sum + a, 0);
  if (areas.length === 0 || total <= 0) return [];
  const scale = (rect.w * rect.d) / total;
  const scaled = areas.map((a) => Math.max(a * scale, 1e-6));
  const rigid = (group: number[]) => group.some((j) => (fits[j] ?? "flexible") !== "flexible");
  /** Each cell keeps at least the width of its smallest possible building. */
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
    // A small building does not share a row with a giant: it would be squashed into a sliver.
    // A large landmark even less: it needs an almost square cell to rise.
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

  // Underfilled rows take more depth: we tighten the whole to fit in the rectangle.
  const shapes = groups.map(shapeOf);
  const depthTotal = shapes.reduce((sum, shape) => sum + shape.depth, 0);
  // Too many rows for the rectangle: we compress them, first on what they have beyond their
  // minimum; only if that is not enough, all together.
  const floors = groups.map(least);
  const spare = shapes.reduce((sum, shape, k) => sum + Math.max(0, shape.depth - floors[k]), 0);
  const excess = depthTotal - rect.d;
  const depthOf = (k: number) => {
    const { depth } = shapes[k];
    if (excess <= 0) return depth;
    if (excess <= spare) return depth - (Math.max(0, depth - floors[k]) * excess) / spare;
    return depth * (rect.d / depthTotal);
  };
  // Even compressed to the minimum, the rows do not fit: cells are laid out like text, line
  // by line, each at least at its minimum size, without leaving free space at the end of lines.
  if (excess > spare && floors.some((floor) => floor > 0)) {
    const dense = denseRows(scaled, rect, mins);
    // Still too tight: we give up the margins (and the streets they let through), never
    // the size of the buildings.
    return dense.squeezed && cores !== mins ? denseRows(scaled, rect, cores).rows : dense.rows;
  }

  const rows: Row[] = [];
  let z = rect.z;
  groups.forEach((group, k) => {
    const { depth, used } = shapes[k];
    // An incomplete row is centered: the free space is split between its two ends.
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
 * Tight arrangement, line by line: lines break on the minimum widths of the cells, then
 * the remaining space is shared according to their areas. Each cell thus keeps its minimum width and
 * depth as long as the rectangle can hold them.
 */
function denseRows(scaled: number[], rect: Rect, mins: number[]): { rows: Row[]; squeezed: boolean } {
  // A cell without a minimum (a container without buildings, a statue) counts as a small width.
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
  // The depth left after the minimums is shared according to the areas; as a last resort
  // (the rectangle really is too small), everything is compressed together.
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

/** A row joint only reaches for its grid line within this fraction of the spacing. */
const SNAP = 0.3;
/** No grid line this close to the edge of a section: the end of the block would be too short. */
const GRID_MARGIN = 0.4;

/**
 * Lines of the cross-street grid that cross a section. The grid is aligned on
 * the whole city: two lists one above the other share the same lines.
 */
export function gridLines(x0: number, width: number, spacing: number): number[] {
  const lines: number[] = [];
  const from = x0 + spacing * GRID_MARGIN;
  const to = x0 + width - spacing * GRID_MARGIN;
  // "|| 0": rounding a negative number close to zero gives -0.
  for (let k = Math.ceil(from / spacing) || 0; k * spacing < to; k += 1) lines.push(k * spacing);
  return lines;
}
/** Stretch allowed for the cells between two moved joints. */
const STRETCH: [number, number] = [0.7, 1.4];

/**
 * Picks the joints of a row where cross streets pass: those that fall near
 * a grid shared by all rows. Each kept joint is moved onto its line, stretching
 * the cells in between a little. From one row to the next, streets continue instead of shifting.
 * Returns the index of the cell that follows each kept joint.
 */
function alignJoints(row: Row, lines: number[], spacing: number): Set<number> {
  const items = row.items;
  const start = items[0].x;
  const end = items[items.length - 1].x + items[items.length - 1].w;
  // Markers: a joint, its original position and its place on the grid. The two ends do not move.
  const pins = [{ j: 0, from: start, to: start }];
  const fits = (a: { from: number; to: number }, b: { from: number; to: number }) => {
    const scale = (b.to - a.to) / (b.from - a.from);
    return scale >= STRETCH[0] && scale <= STRETCH[1];
  };
  for (const line of lines) {
    const previous = pins[pins.length - 1];
    // The joint closest to the line; if it stretches the cells before it too much, the next one.
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

/** The same rows, flattened: one cell per area. */
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
  /** Children without a cell of each container being laid out, in page order. */
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
  /** Ground provided by an ancestor container (park, lawn, square...): no sidewalks to lay. */
  ground?: GroundStyle;
  streets: StreetMode;
  /** The edges of the cell that face a street (all of them if absent: the ring road surrounds the city). */
  access?: Access;
}

interface Access {
  north: boolean;
  south: boolean;
  west: boolean;
  east: boolean;
}

/** What lies on one side of a cell: a street, a simple gap, an adjoining neighbor, or the container's edge. */
type Side = "road" | "soft" | "attached" | "edge";

/** A boundary between two cells, and the width of what separates them. */
interface Edge {
  side: Side;
  width: number;
}

const EDGE: Edge = { side: "edge", width: 0 };

export interface LayoutOptions {
  /**
   * "aerodrome" in the megalopolis: the large airport is shared by the site, each city keeps
   * a small runway (if it has enough links to other sites). "none": nothing outside the walls.
   */
  airport?: "airport" | "aerodrome" | "none";
}

/** Side of a page's base, without building it: the megalopolis arranges its cities before building them. */
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

  // The monument (h1) always dominates the city.
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
  // The ambiance: factories in the green belt, cameras at the edge of streets, clouds above.
  const info = ambianceOf(doc);
  const seed = hashOf(doc.url);
  // Hover numbers after the last lot: the airport, then the factories, then the cameras.
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
// The ambiance
// ---------------------------------------------------------------------------

/** Stable draw in [0, 1[ from a seed and a rank. */
function draw(seed: number, k: number): number {
  const x = Math.sin((seed % 100_003) * 0.0173 + k * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FACTORY_LENGTH = 9;
const FACTORY_GAP = 4;

/**
 * Factories, in the green belt: first to the west (the east belongs to the airport), then south,
 * then north, grouped in the middle of each side like an industrial zone. Never near the
 * corners (the megalopolis connects its ramps there), nor on a channel or a crossing street.
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
 * Cameras, at the edge of the city's streets: one per randomly drawn street (the longest
 * first among a random batch), in the middle of the sidewalk, the lens turned toward the roadway.
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
    // The pole at the edge of the sidewalk; the lens toward the roadway, slightly at an angle.
    if (alongX) {
      const z = near ? road.z - 0.4 : road.z + road.d + 0.4;
      return { x: road.x + t, y: road.y + CURB, z, heading: (near ? -Math.PI / 2 : Math.PI / 2) + tilt };
    }
    const x = near ? road.x - 0.4 : road.x + road.w + 0.4;
    return { x, y: road.y + CURB, z: road.z + t, heading: (near ? 0 : Math.PI) + tilt };
  });
}

/** Clouds: more of them the heavier the page, always above the roofs. */
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

/** Links to other sites, across the whole page. */
export function externalLinks(node: CityNode): number {
  let total = node.links?.external ?? 0;
  for (const child of node.children ?? []) total += externalLinks(child);
  return total;
}

/** Below this, the page is almost closed on itself: no airport. */
export const AIRPORT_MIN = 5;
/** Length (and wingspan) of a plane. */
export const PLANE = 8;
const RUNWAY_WIDTH = 6;
const TAXIWAY_WIDTH = 2.4;

/** Runways: one for an airfield, three for a page very open to the web. */
export function runwaysFor(external: number): number {
  return external >= 300 ? 3 : external >= 50 ? 2 : 1;
}

/** Where to put the airport: east of x0, over the full depth [z, z + d], centered on `center`. */
export interface AirportSite {
  x0: number;
  z: number;
  d: number;
  center: number;
  /** Where the access avenue starts (the city's ring road, the megalopolis highway). */
  access: number;
  /** Owner of the access avenue (the city's base; -1 in the megalopolis). */
  owner: number;
  y: number;
}

/** How many sites have their plane in flight. */
const FLIGHTS = 6;

/**
 * The airport, east of the green belt: terminal and control tower on the city side, planes
 * at the gates on the tarmac, then the taxiway and the runways. An avenue links it to the
 * ring road across the belt.
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
  // The runways stay on the base, even when the access does not arrive in its middle.
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

  // One gate per plane, as many as the tarmac holds.
  const gate = PLANE * 1.15;
  const planes = Math.min(clamp(Math.round(Math.sqrt(external) / 2), 1, 12), Math.floor((length - 6) / gate));
  const apronD = Math.min(length, planes * gate + 6);
  const center = clamp(site.center, top + apronD / 2, top + length - apronD / 2);
  const apron = { x: apronX, z: center - apronD / 2, w: apronW, d: apronD };
  const terminal = { x: terminalX, z: apron.z, w: 5, d: apronD };

  // Links: from the tarmac to the main taxiway, and from the main taxiway to each runway.
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

  // The access avenue, from the ring road to the terminal: it cuts through the green belt.
  const avenue = roadWidth("avenue", 0);
  const access: Road = {
    x: site.access, z: site.center - avenue / 2, w: terminalX - site.access, d: avenue,
    axis: "x", style: "avenue", owner: site.owner, y: site.y,
  };
  ctx.plates = ctx.plates.flatMap((plate) => cutRect(plate, access).map((piece) => ({ ...plate, ...piece })));
  ctx.roads.push(access);

  // The top targeted sites each have their plane: it left from the north end of the runway and has already turned
  // east, heading for its destination (a heading drawn from the site's name, always the same).
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

/** In the megalopolis, a city has its airfield from this number of links to other sites. */
export const AERODROME_MIN = 20;
/** Width of the airfield, east of the base: the megalopolis reserves this space for it. */
export const AERODROME = 18;
const STRIP_WIDTH = 3.4;

/** Does a megalopolis city have its airfield? (before building it, to place it) */
export function hasAerodrome(doc: CityDoc): boolean {
  return externalLinks(doc.root) >= AERODROME_MIN;
}

/**
 * The airfield of a megalopolis city: a hangar at the end of a street that crosses the
 * green belt, one to three small planes in front, a short runway and its windsock. No
 * flights: they leave from the site's large airport. It fits in the AERODROME-wide strip.
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

  // The access street, from the ring road to the hangar: it cuts through the green belt.
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
    // The windsock, at the north end of the runway, on the hangar side.
    tower: { x: strip.x - 1.6, z: top + 1, w: 0.4, d: 0.4 },
    planes,
    destinations: sites,
    flights: [],
  };
}

/** The city's bounds include the airport and the planes in flight. */
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

/** Stable draw from a name (FNV-1a). */
function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A harbor's basin: the south of its strip, at the foot of the quay. */
export function harborWater(harbor: Rect): Rect {
  const quay = harbor.d * QUAY_SHARE;
  return { x: harbor.x, z: harbor.z + quay, w: harbor.w, d: harbor.d - quay };
}

const overlap = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.z < b.z + b.d + pad && b.z < a.z + a.d + pad;

/** What remains of a rectangle when another is removed from it: up to four pieces. */
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
 * A harbor opens onto the open sea: a channel leads its basin to the edge of the model, by the
 * shortest free path (the basin extended west or east, or a channel toward the south).
 * It passes under no building and does not run along a street; sidewalks and the green belt
 * move aside, and the streets it cuts cross it on a bridge.
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
    // Toward the south: from the middle of the basin, then closer and closer to its ends.
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
      // Neither a building nor a container with its own ground (park, square, fields...), apart from the base and the harbor.
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
 * A street with cars always leads somewhere: step by step, it reaches
 * the ring road. One that nothing connects to the network (between two rows with no street at their ends)
 * disappears: grass on a lawn, a paved passage in town.
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
  // A street that nothing connects disappears (its bridge with it).
  ways.forEach((way, i) => {
    if (reached.has(i)) return;
    if (ctx.roads.includes(way as Road)) eraseRoad(way as Road, ctx);
    const bridge = ctx.bridges.indexOf(way as Bridge);
    if (bridge >= 0) ctx.bridges.splice(bridge, 1);
  });
}

/** Creates, in page order, the lots of the cell-less children that precede this rank. */
function hangBefore(parent: number, order: number, y: number, ctx: Ctx) {
  const queue = ctx.waiting.get(parent);
  while (queue && queue.length > 0 && queue[0].order < order) hang(queue.shift()!, parent, y, ctx);
}

// ---------------------------------------------------------------------------
// Images hung on buildings
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
  /** Band of posters on the facades. */
  bottom: number;
  top: number;
  /** The top of the walls, under the roof: the base of roof billboards. */
  eave: number;
  /** Where flag poles are planted: a flat roof at the edge of the facade (null: a sloped roof). */
  mast: number | null;
  /** Next facade to try: posters go around the building. */
  next: number;
  roof: boolean;
  flags: number;
}

/** Grid of buildings, to know whether a facade faces the street or a neighbor. */
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
 * The flat roof where a pole is planted, at the edge of the facade: as the scene draws it (same draws).
 * A skyscraper only has a flat roof reaching the edge on its base; a house and a small building
 * with a sloped roof have none.
 */
function mastOf(lot: Lot): number | null {
  const short = Math.min(lot.w, lot.d);
  if (lot.kind === "house") return null;
  if (lot.kind === "residence" && lot.h <= 9.5 && short >= 2 && rand(lot.id, 4) < 0.55) return null;
  if (lot.kind === "tower" && lot.h >= 20 && short >= 3.6) return lot.y + clamp(lot.h * 0.14, 2.6, 5.5);
  return lot.y + lot.h;
}

/** Natural size of a poster: according to the image (its pixels, its proportions), a 16:9 screen. */
function posterSize(lot: Lot): [number, number] {
  if (lot.kind === "screen") return [4, 4 / (16 / 9)];
  const img = lot.node.img;
  const ratio = clamp((img?.w || 4) / (img?.h || 3), 0.45, 3);
  // A 250 px thumbnail: about 3 m wide; a large photo: 13 m at most.
  let width = img?.w && img?.h ? clamp(Math.sqrt(img.w * img.h) / 80, 1.6, 4.4) : 3;
  let height = width / ratio;
  if (height > 3.4) {
    height = 3.4;
    width = height * ratio;
  }
  return [width, height];
}

/**
 * Hangs images (and screens) on the nearest building in the page: in their block,
 * otherwise one level up, and so on. Posters go around the free facades
 * (not those adjoining a neighbor), stacked in rows like in Times Square; signs go
 * on the ground floor, flags on a pole on the roof. When all facades are full,
 * a billboard goes up on the roof, then we move on to the next building.
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
    // The top of the usable walls: under the sloped roof, under a skyscraper's first setback.
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
    // The facades are full: a billboard on the roof (not on a house's sloped roof).
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

  /** The carriers in [lo, hi[ closest to the image in page order. */
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
    // No room left anywhere: the image disappears (it stays in the inspector).
    if (!done) lot.h = 0;
  }

  // Each row of posters, and the row of signs, is centered on its facade.
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

  // A container that only has images takes the footprint of its images (for the inspector).
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

/** A lot without a cell: its footprint will be that of the poster (or of its images, for a container). */
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

  // Reserved strips: the gate north of the header, the basin south of the footer.
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

  // Split into sections separated by the canals.
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
      // The canal crosses the container from edge to edge, between two quays.
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

/** The ring road around the city, and the green belt beyond. */
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
  // The four corners turn in an arc; the megalopolis can open a side toward the outside there.
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
 * Arranges the children of a section in rows, chooses where streets pass,
 * lays the sidewalks of the blocks, then each child in its place.
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
  // Containers and large landmarks have a real street on each side: its width is reserved for them.
  const alone = items.length === 1;
  const rows = stripRows(
    items.map((item) => (Math.sqrt(item.area) + (alone ? 0 : big(item) && streets ? road + 2 * SIDEWALK : Math.max(gap, accessMargin(mode)))) ** 2),
    rect,
    // An added city block is arranged like a container; if it carries a large landmark, like that landmark.
    items.map((item): Fit =>
      item.virtual
        ? item.children.some((child) => LANDMARKS.has(child.kind)) ? "landmark" : "flexible"
        : item.container ? "flexible" : LANDMARKS.has(item.kind) ? "landmark" : "leaf",
    ),
    // Minimum size of each cell: its largest building and the gap around it. A building
    // alone in its cell, where cars pass, keeps enough room for a street to run along it.
    items.map((item) => {
      if (item.least <= 0) return 0;
      if (alone) return item.least;
      return item.least + Math.max(gap, item.container ? 0 : accessMargin(mode));
    }),
    // At the tightest: the building and a simple gap.
    items.map((item) => (item.least > 0 ? item.least + (alone ? 0 : soft) : 0)),
  );
  if (rows.length === 0) return;

  // A container at the end of an incomplete row takes the free space: it thus touches the edge of the
  // section, and the street that runs along it (its own streets find an outlet there). The last row goes
  // to the south edge.
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
  // Setback of a building: sidewalk on the street side and the edge side, almost nothing on the neighbor side.
  // On a lawn (housing estate, park), no sidewalk: a simple verge.
  const verge = env.ground ? 0.35 : SIDEWALK;
  const tight = env.ground ? 0.15 : 0.4;
  const inset = (edge: Edge) =>
    edge.side === "road"
      ? edge.width / 2 + verge
      : edge.side === "edge"
        ? env.ground ? soft / 2 : SIDEWALK
        : edge.width / 2;
  /** What the still unknown edge of a cell will take at least (a simple gap, or the section's edge). */
  const leastInset = (last: boolean) => (last ? inset(EDGE) : Math.min(inset(quiet), soft / 2));
  // A street too tight for one car in each direction is not drawn: the cells stay adjoining.
  const narrowest = mode === "path" ? 1.2 : DRIVABLE_MIN;
  /**
   * A street between two cells: never wider than what they can give up, nor so wide as to
   * leave their buildings less than their minimum size (`other`: the setback of the other edge).
   */
  type Cell = { size: number; other: number; need: number };
  const street = (a: Cell, b: Cell, required = false): Edge | null => {
    // In town, a street takes no more than 42% of the smallest cell (except one that serves
    // a row with no other access); on a lawn, only the minimum size of the houses counts.
    let width = env.ground || required ? road : Math.min(road, 0.42 * Math.min(a.size, b.size));
    // To serve a row with no other access, the sidewalk (the verge) narrows:
    // buildings will overlap it rather than shrink.
    const margin = required ? tight : verge;
    for (const cell of [a, b]) {
      if (cell.need > 0) width = Math.min(width, 2 * (cell.size - cell.other - margin - cell.need));
    }
    return width >= narrowest - 1e-6 ? { side: "road", width: Math.max(width, narrowest) } : null;
  };
  const rowNeed = rows.map((row) => Math.max(0, ...row.items.map((it) => items[it.index].least)));
  const access: Access = env.access ?? { north: true, south: true, west: true, east: true };

  // Between rows: a street as soon as a container is involved, or when the block gets too deep.
  const between: Edge[] = [];
  let depthSinceRoad = rows[0].d;
  for (let k = 0; k < rows.length - 1; k += 1) {
    const here = rows[k].items.some((it) => big(items[it.index]));
    const next = rows[k + 1].items.some((it) => big(items[it.index]));
    const north = k === 0 ? EDGE : between[k - 1];
    // Every building faces a street: a row without one to the north gets one to the south,
    // and the last one, if its south edge faces nothing, gets one to the north (rows go
    // in pairs, back to back, on either side of the streets).
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
      // The required street does not fit: the boundary between the two rows slides toward the one that has
      // room, if together they can line it.
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

  // Cross-street grid, at the length of a block.
  const spacing = blockLength(mode);
  const lines = gridLines(rect.x, rect.w, spacing);
  // A section where neither the west nor the east faces a street: its streets between rows would have
  // no outlet. A cross street shared by all rows links them to the north or the south.
  const enclosed = streets && mode !== "path" && !access.west && !access.east && (access.north || access.south);
  if (enclosed && rows.length > 1 && lines.length === 0) lines.push(rect.x + rect.w / 2);

  const groundTop = env.ground ? top : top + CURB;
  /** The cross streets of each row: at the end, those that run into a house disappear. */
  const crossing: Road[][] = rows.map(() => []);

  rows.forEach((row, k) => {
    const north = k === 0 ? EDGE : between[k - 1];
    const south = k === rows.length - 1 ? EDGE : between[k];
    const z0 = row.z + half(north);
    const z1 = row.z + row.d - half(south);

    // The free space at the end of an incomplete row becomes a public square.
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

    // In the row: a street around containers and large landmarks, and on the shared grid.
    // If no joint lends itself to it, a street still cuts a block that has become far too long.
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

    // A block's sidewalk: the simple elements adjoining between two streets.
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
        // Only a block's small streets disappear if they run into a house: the one that lines
        // a container serves it (its own streets connect to it), even if it ends up a dead end.
        if (!big(plot) && !big(items[row.items[j - 1].index])) crossing[k].push(road);
      }

      if (plot.container) {
        const cell = { x: item.x + half(west), z: z0, w: item.w - half(west) - half(east), d: z1 - z0 };
        // What the cell touches: a street of this section, or the section's edge if it faces a street itself.
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
      // A building does not go below its minimum size to keep its sidewalks: it overlaps them,
      // as long as the cell (minus the roadway) allows it.
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
      // Cell too narrow for its sidewalks: the building recenters on the part outside the roadway.
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

  // A cross street that opens, through a simple gap, onto a house of the neighboring row
  // (instead of joining that row's street) would make it look as if the house cuts the road: it
  // disappears. In town, its place becomes a paved passage; on a lawn, grass.
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

/** Removes a street: on a lawn, grass takes its place back; in town, a paved passage. */
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
      // Tall enough for its screens, on its four facades (a typical poster: 4 × 3).
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
      // Stable ±20% variation: two texts of the same length do not make twin buildings.
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
