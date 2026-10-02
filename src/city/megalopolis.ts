/**
 * La mégalopole : toutes les pages d'un site, chacune sa ville, assemblées en une seule.
 *
 * - Les villes sont rangées selon leurs adresses, comme les éléments dans une page : de gauche
 *   à droite, puis du nord au sud. La page d'accueil ouvre la marche, puis chaque dossier
 *   (« /blog », « /wiki »…) groupe ses pages, de la plus grande ville à la plus petite :
 *   les petites s'empilent sous les grandes.
 * - Le placement tient compte de toutes les pages connues, affichées ou non : cocher ou
 *   décocher une page ne déplace jamais les autres. Une page masquée laisse place à des champs.
 * - Entre les villes courent des couloirs de campagne. Quand deux pages affichées sont liées
 *   (l'une a un lien vers l'autre), une autoroute les relie, par le plus court chemin dans les
 *   couloirs, branchée sur un coin du périphérique de chaque ville. Les autoroutes déjà tracées
 *   servent aux liaisons suivantes : le réseau reste lisible.
 * - Un grand aéroport pour tout le site, à l'est, relié par l'autoroute à la page qui a le plus de
 *   liens vers d'autres sites. Chaque ville qui en a assez garde son aérodrome, à l'est de son
 *   socle : le placement lui réserve cette bande.
 */

import { linkKey } from "@/format/links";
import {
  AERODROME,
  AIRPORT_MIN,
  BASE,
  BELT,
  CURB,
  HIGHWAY,
  RING,
  cutRect,
  includeAirport,
  planAirport,
  type Airport,
  type Bridge,
  type Channel,
  type CityLayout,
  type CityStats,
  type Decor,
  type Joint,
  type Openings,
  type Plate,
  type Rect,
  type Road,
} from "./layout";

/** Largeur d'un couloir de campagne entre deux villes, l'autoroute en son milieu. */
export const CORRIDOR = 16;
/** Une liaison préfère les autoroutes déjà tracées : elles ne coûtent que cette part de leur longueur. */
const REUSE = 0.35;
/** Un virage coûte autant que cette longueur droite : les autoroutes zigzaguent peu. */
const TURN = 24;
/** Une bretelle coûte un peu plus que sa longueur : on n'en ouvre pas sans raison. */
const RAMP = 12;
/** En dessous de cette largeur, une bande libre reste en herbe : pas de champ en lanière. */
const FIELD = 14;

export interface MegaPage {
  path: string;
  /** Côté du socle de sa ville (citySide). */
  side: number;
  /** Sa ville a un aérodrome (hasAerodrome) : une bande de plus à l'est du socle. */
  aerodrome?: boolean;
}

type Axis = "x" | "z";
type Side = keyof Openings;

/** Un couloir de campagne entre des villes : l'autoroute peut y passer, en son milieu. */
export interface Segment {
  /** Le long de x (couloir horizontal) ou de z. */
  axis: Axis;
  /** Sa ligne médiane : z pour un couloir horizontal, x pour un vertical. */
  at: number;
  from: number;
  to: number;
}

export interface Placement {
  /** Coin nord-ouest du socle de chaque page, dans l'ordre donné. */
  origins: Array<{ x: number; z: number }>;
  /** Côté du socle de chaque page. */
  sides: number[];
  /** Largeur de la place de chaque page : son socle, et son aérodrome à l'est s'il en a un. */
  widths: number[];
  /** Les pages dans l'ordre de pose : l'accueil, puis dossier par dossier. */
  order: number[];
  /** Les couloirs de campagne. */
  segments: Segment[];
  /** Les couloirs qui bordent chaque page (rangs dans `segments`). */
  around: Array<Record<Side, number>>;
  /** Les couloirs qui traversent toute la mégalopole d'ouest en est, du nord au sud. */
  mains: number[];
  /** Ce qui n'est à aucune page : le bas des colonnes, à côté d'une ville étroite, le bout des rangées. */
  fillers: Rect[];
  width: number;
  depth: number;
}

/** « /a/b » avant « /a/c », « /a » avant « /a/b », la racine d'abord. */
export function comparePaths(a: string, b: string): number {
  const pa = a.split("/").filter(Boolean);
  const pb = b.split("/").filter(Boolean);
  for (let i = 0; i < Math.min(pa.length, pb.length); i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return pa.length - pb.length || (a < b ? -1 : a > b ? 1 : 0);
}

/** Le dossier d'une page : « /wiki » pour « /wiki/Paris », « / » pour « /contact » et pour la racine. */
function folderOf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return `/${parts.slice(0, -1).join("/")}`;
}

/**
 * L'ordre de pose : la page d'accueil d'abord, puis dossier par dossier (dans l'ordre des
 * adresses) ; dans un dossier, de la plus grande ville à la plus petite, pour que les petites
 * s'empilent sous les grandes au lieu de laisser des champs vides.
 */
function compareForPlacement(a: MegaPage, b: MegaPage): number {
  const rootA = a.path === "/" ? 0 : 1;
  const rootB = b.path === "/" ? 0 : 1;
  if (rootA !== rootB) return rootA - rootB;
  const folders = comparePaths(folderOf(a.path), folderOf(b.path));
  if (folders !== 0) return folders;
  return b.side - a.side || comparePaths(a.path, b.path);
}

interface Column {
  pages: number[];
  width: number;
  height: number;
}

/**
 * Range une rangée en colonnes : une petite ville s'empile sous la précédente quand la plus
 * grande de la rangée lui laisse la place (et qu'elle n'est pas nettement plus large).
 */
function columnsOf(row: number[], widths: number[], sides: number[]) {
  const g = CORRIDOR;
  const height = Math.max(...row.map((i) => sides[i]));
  const columns: Column[] = [];
  for (const i of row) {
    const last = columns[columns.length - 1];
    if (last && last.height + g + sides[i] <= height && widths[i] <= last.width * 1.15) {
      last.pages.push(i);
      last.height += g + sides[i];
      last.width = Math.max(last.width, widths[i]);
    } else {
      columns.push({ pages: [i], width: widths[i], height: sides[i] });
    }
  }
  return { columns, height, width: g + columns.reduce((sum, column) => sum + column.width + g, 0) };
}

export function placePages(pages: MegaPage[]): Placement {
  const g = CORRIDOR;
  const sides = pages.map((page) => page.side);
  const widths = pages.map((page) => page.side + (page.aerodrome ? AERODROME : 0));
  const order = pages.map((_, i) => i).sort((a, b) => compareForPlacement(pages[a], pages[b]) || a - b);
  // Une mégalopole à peu près carrée.
  const area = sides.reduce((sum, side, i) => sum + (widths[i] + g) * (side + g), 0);
  const target = Math.max(...widths.map((width) => width + 2 * g), Math.sqrt(area) * 1.05);

  const rows: Array<ReturnType<typeof columnsOf>> = [];
  for (let start = 0; start < order.length; ) {
    let row = [order[start]];
    let packed = columnsOf(row, widths, sides);
    for (let j = start + 1; j < order.length; j += 1) {
      const next = columnsOf([...row, order[j]], widths, sides);
      if (next.width > target) break;
      row = [...row, order[j]];
      packed = next;
    }
    rows.push(packed);
    start += row.length;
  }

  const width = Math.max(g, ...rows.map((row) => row.width));
  const origins = pages.map(() => ({ x: 0, z: 0 }));
  const around: Placement["around"] = pages.map(() => ({ north: -1, south: -1, west: -1, east: -1 }));
  const segments: Segment[] = [];
  const fillers: Rect[] = [];
  const mains: number[] = [];
  const line = (axis: Axis, at: number, from: number, to: number) => segments.push({ axis, at, from, to }) - 1;

  let top = line("x", g / 2, g / 2, width - g / 2);
  mains.push(top);
  let z = g;
  for (const row of rows) {
    const bottomAt = z + row.height + g / 2;
    const bottom = line("x", bottomAt, g / 2, width - g / 2);
    mains.push(bottom);
    let x = g;
    let west = line("z", x - g / 2, z - g / 2, bottomAt);
    for (const column of row.columns) {
      const east = line("z", x + column.width + g / 2, z - g / 2, bottomAt);
      let north = top;
      let cz = z;
      column.pages.forEach((page, k) => {
        const side = sides[page];
        origins[page] = { x, z: cz };
        const south = k === column.pages.length - 1 ? bottom : line("x", cz + side + g / 2, x - g / 2, x + column.width + g / 2);
        around[page] = { north, south, west, east };
        if (column.width - widths[page] > FIELD) {
          fillers.push({ x: x + widths[page] + 1.5, z: cz, w: column.width - widths[page] - 1.5, d: side });
        }
        north = south;
        cz += side + g;
      });
      if (row.height - column.height > FIELD) {
        fillers.push({ x, z: z + column.height + 1.5, w: column.width, d: row.height - column.height - 1.5 });
      }
      west = east;
      x += column.width + g;
    }
    if (width - x > FIELD) fillers.push({ x, z, w: width - x - 1, d: row.height });
    top = bottom;
    z += row.height + g;
  }
  return { origins, sides, widths, order, segments, around, mains, fillers, width, depth: z };
}

// ---------------------------------------------------------------------------
// Les villes affichées, et le réseau qui les relie
// ---------------------------------------------------------------------------

export interface MegaCity {
  /** Rang de la page dans la liste donnée à placePages. */
  page: number;
  path: string;
  /** Sa ville, construite avec son aérodrome (ou sans rien hors les murs), en coordonnées locales (socle centré sur l'origine). */
  layout: CityLayout;
  /** Empreintes des pages visées par ses liens. */
  linksTo: string[];
  /** Liens vers d'autres sites, et les sites visés. */
  external: number;
  sites: Array<[string, number]>;
}

export interface Megalopolis {
  /** Chaque ville affichée et le décalage qui la pose à sa place. */
  parts: Array<{ city: MegaCity; offset: { x: number; z: number } }>;
  /** La campagne, les autoroutes et l'aéroport, en coordonnées du monde (aucun lot). */
  land: CityLayout;
  /** Paires de pages affichées reliées par une autoroute. */
  links: Array<[number, number]>;
}

interface GraphNode {
  x: number;
  z: number;
  /** Ville et coin pour un bout de bretelle, côté ville. */
  exit?: { city: number; joint: Rect; side: Side };
}

interface GraphEdge {
  a: number;
  b: number;
  axis: Axis;
  length: number;
  /** Bretelle entre une ville et une autoroute (sinon : un tronçon d'autoroute). */
  ramp: boolean;
}

const key = (x: number, z: number) => `${Math.round(x * 100)},${Math.round(z * 100)}`;

/** Côté d'une case par lequel on part de a vers b. */
function sideTowards(a: { x: number; z: number }, b: { x: number; z: number }): Side {
  if (Math.abs(a.x - b.x) > Math.abs(a.z - b.z)) return b.x > a.x ? "east" : "west";
  return b.z > a.z ? "south" : "north";
}

/** Tas binaire minimal pour Dijkstra. */
class Heap {
  private items: Array<[number, number]> = [];
  get size() {
    return this.items.length;
  }
  push(cost: number, state: number) {
    const items = this.items;
    items.push([cost, state]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] < cost || (items[parent][0] === cost && items[parent][1] <= state)) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }
  pop(): [number, number] {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        const less = (p: number, q: number) => items[p][0] < items[q][0] || (items[p][0] === items[q][0] && items[p][1] < items[q][1]);
        if (l < items.length && less(l, m)) m = l;
        if (r < items.length && less(r, m)) m = r;
        if (m === i) break;
        [items[i], items[m]] = [items[m], items[i]];
        i = m;
      }
    }
    return top;
  }
}

export function buildMegalopolis(placement: Placement, cities: MegaCity[]): Megalopolis {
  const g = CORRIDOR;
  const { origins, sides, widths, segments, around } = placement;
  const socleOf = (page: number): Rect => ({ x: origins[page].x, z: origins[page].z, w: sides[page], d: sides[page] });
  const slotOf = (page: number): Rect => ({ x: origins[page].x, z: origins[page].z, w: widths[page], d: sides[page] });

  // --- Le graphe des couloirs ------------------------------------------------
  const nodes: GraphNode[] = [];
  const index = new Map<string, number>();
  const nodeAt = (x: number, z: number): number => {
    const k = key(x, z);
    let id = index.get(k);
    if (id === undefined) {
      id = nodes.length;
      nodes.push({ x, z });
      index.set(k, id);
    }
    return id;
  };
  const onSegment: number[][] = segments.map(() => []);
  const pointOn = (s: number, along: number) => {
    const segment = segments[s];
    const id = segment.axis === "x" ? nodeAt(along, segment.at) : nodeAt(segment.at, along);
    onSegment[s].push(id);
    return id;
  };
  // Les bouts des couloirs, et leurs croisements.
  segments.forEach((segment, s) => {
    pointOn(s, segment.from);
    pointOn(s, segment.to);
  });
  const eps = 0.01;
  segments.forEach((h, i) => {
    if (h.axis !== "x") return;
    segments.forEach((v, j) => {
      if (v.axis !== "z") return;
      if (v.at < h.from - eps || v.at > h.to + eps || h.at < v.from - eps || h.at > v.to + eps) return;
      pointOn(i, v.at);
      pointOn(j, h.at);
    });
  });

  // Les bretelles possibles : chaque coin du périphérique, vers le couloir au-dessus, en dessous, à côté.
  const edges: GraphEdge[] = [];
  const cityNode: number[] = [];
  cities.forEach((city, c) => {
    const side = sides[city.page];
    const { x, z } = origins[city.page];
    const near = BELT + RING / 2;
    const corners: Array<{ cx: number; cz: number; ns: Side; ew: Side }> = [
      { cx: x + near, cz: z + near, ns: "north", ew: "west" },
      { cx: x + side - near, cz: z + near, ns: "north", ew: "east" },
      { cx: x + near, cz: z + side - near, ns: "south", ew: "west" },
      { cx: x + side - near, cz: z + side - near, ns: "south", ew: "east" },
    ];
    const hub = nodes.length;
    nodes.push({ x: x + side / 2, z: z + side / 2 });
    cityNode[c] = hub;
    for (const corner of corners) {
      const joint = { x: corner.cx - RING / 2, z: corner.cz - RING / 2, w: RING, d: RING };
      addRamp(c, hub, joint, corner.ns, pointOn(around[city.page][corner.ns], corner.cx), "z");
      // Une bretelle vers l'est passerait sur l'aérodrome.
      if (corner.ew === "west" || !city.layout.airport) {
        addRamp(c, hub, joint, corner.ew, pointOn(around[city.page][corner.ew], corner.cz), "x");
      }
    }
  });

  function addRamp(c: number, hub: number, joint: Rect, side: Side, landing: number, axis: Axis) {
    const exit = nodes.length;
    nodes.push({ x: joint.x + joint.w / 2, z: joint.z + joint.d / 2, exit: { city: c, joint, side } });
    edges.push({ a: hub, b: exit, axis, length: 0, ramp: false });
    const to = nodes[landing];
    edges.push({ a: exit, b: landing, axis, length: Math.abs(to.x - nodes[exit].x) + Math.abs(to.z - nodes[exit].z), ramp: true });
  }

  // L'aéroport : au bout est du grand couloir le plus proche du milieu.
  const external = cities.reduce((sum, city) => sum + city.external, 0);
  let airportNode = -1;
  let airportAt = 0;
  if (external >= AIRPORT_MIN && cities.length > 0) {
    const middle = placement.depth / 2;
    const main = placement.mains.reduce((best, s) =>
      Math.abs(segments[s].at - middle) < Math.abs(segments[best].at - middle) ? s : best,
    );
    airportAt = segments[main].at;
    airportNode = pointOn(main, segments[main].to);
  }

  // Les tronçons d'autoroute : entre deux points voisins d'un même couloir.
  segments.forEach((segment, s) => {
    const coord = (id: number) => (segment.axis === "x" ? nodes[id].x : nodes[id].z);
    const ids = [...new Set(onSegment[s])].sort((a, b) => coord(a) - coord(b));
    for (let i = 1; i < ids.length; i += 1) {
      edges.push({ a: ids[i - 1], b: ids[i], axis: segment.axis, length: coord(ids[i]) - coord(ids[i - 1]), ramp: false });
    }
  });

  const adjacency: number[][] = nodes.map(() => []);
  edges.forEach((edge, e) => {
    adjacency[edge.a].push(e);
    adjacency[edge.b].push(e);
  });

  // --- Les liaisons --------------------------------------------------------------
  const keys = cities.map((city) => linkKey(city.path));
  const pairs: Array<[number, number]> = [];
  for (let a = 0; a < cities.length; a += 1) {
    const targets = new Set(cities[a].linksTo);
    for (let b = a + 1; b < cities.length; b += 1) {
      if (targets.has(keys[b]) || cities[b].linksTo.includes(keys[a])) pairs.push([a, b]);
    }
  }
  const used = new Set<number>();
  const hubs = new Set(cityNode);
  const cityOfHub = new Map(cityNode.map((node, c) => [node, c]));
  const states = nodes.length * 3;
  /** Plus court chemin d'une ville à une autre (ou à l'aéroport). Les tronçons empruntés rejoignent le réseau. */
  const route = (from: number, to: number): boolean => {
    // États : (nœud, sens d'arrivée : 0 le long de x, 1 de z, 2 aucun), pour compter les virages.
    const cost = new Float64Array(states).fill(Infinity);
    const viaState = new Int32Array(states).fill(-1);
    const viaEdge = new Int32Array(states).fill(-1);
    const ends = new Set([cityOfHub.get(from), cityOfHub.get(to)]);
    const heap = new Heap();
    const start = from * 3 + 2;
    cost[start] = 0;
    heap.push(0, start);
    let goal = -1;
    while (heap.size > 0) {
      const [c, state] = heap.pop();
      if (c > cost[state]) continue;
      const node = Math.floor(state / 3);
      if (node === to) {
        goal = state;
        break;
      }
      const arrived = state % 3;
      for (const e of adjacency[node]) {
        const edge = edges[e];
        const next = edge.a === node ? edge.b : edge.a;
        // On ne traverse pas une autre ville : ses bretelles ne mènent qu'à elle.
        const exit = nodes[next].exit;
        if (exit && !ends.has(exit.city)) continue;
        if (hubs.has(next) && next !== to) continue;
        const dir = edge.axis === "x" ? 0 : 1;
        const moving = edge.length > 0;
        const turn = moving && arrived !== 2 && arrived !== dir ? TURN : 0;
        const length = edge.length + (edge.ramp ? RAMP : 0);
        const step = (used.has(e) ? length * REUSE : length) + turn;
        const nextState = next * 3 + (moving ? dir : arrived);
        if (c + step < cost[nextState]) {
          cost[nextState] = c + step;
          viaState[nextState] = state;
          viaEdge[nextState] = e;
          heap.push(c + step, nextState);
        }
      }
    }
    if (goal < 0) return false;
    for (let state = goal; viaState[state] >= 0; state = viaState[state]) used.add(viaEdge[state]);
    return true;
  };
  const links: Array<[number, number]> = [];
  for (const [a, b] of pairs) if (route(cityNode[a], cityNode[b])) links.push([cities[a].page, cities[b].page]);

  // L'aéroport rejoint la page la plus ouverte sur le web.
  if (airportNode >= 0) {
    const busiest = cities.reduce((best, city, c) => (city.external > cities[best].external ? c : best), 0);
    route(cityNode[busiest], airportNode);
  }

  // --- Ce qui se dessine --------------------------------------------------------
  const roads: Road[] = [];
  const joints: Joint[] = [];
  const plates: Plate[] = [];
  const decor: Decor[] = [];
  const channels: Channel[] = [];
  const bridges: Bridge[] = [];
  const half = HIGHWAY / 2;

  // Les carrefours de l'autoroute, et ce qui en sort.
  const openings = new Map<number, Openings>();
  const open = (node: number, side: Side) => {
    const o = openings.get(node) ?? { north: false, east: false, south: false, west: false };
    o[side] = true;
    openings.set(node, o);
  };
  for (const e of used) {
    const edge = edges[e];
    if (edge.length === 0) continue;
    const a = nodes[edge.a];
    const b = nodes[edge.b];
    if (edge.ramp) {
      // La bretelle part du coin du périphérique (côté ville) jusqu'au bord de l'autoroute.
      const [exitId, landingId] = a.exit ? [edge.a, edge.b] : [edge.b, edge.a];
      const exit = nodes[exitId].exit!;
      const landing = nodes[landingId];
      open(landingId, sideTowards(landing, nodes[exitId]));
      const j = exit.joint;
      const ramp: Rect =
        exit.side === "north"
          ? { x: j.x, z: landing.z + half, w: RING, d: j.z - landing.z - half }
          : exit.side === "south"
            ? { x: j.x, z: j.z + j.d, w: RING, d: landing.z - half - j.z - j.d }
            : exit.side === "west"
              ? { x: landing.x + half, z: j.z, w: j.x - landing.x - half, d: RING }
              : { x: j.x + j.w, z: j.z, w: landing.x - half - j.x - j.w, d: RING };
      roads.push({ ...ramp, axis: edge.axis, style: "ring", owner: -1, y: BASE });
      openRing(cities[exit.city], exit.joint, exit.side, ramp);
      continue;
    }
    open(edge.a, sideTowards(a, b));
    open(edge.b, sideTowards(b, a));
    const rect: Rect =
      edge.axis === "x"
        ? { x: Math.min(a.x, b.x) + half, z: a.z - half, w: Math.abs(b.x - a.x) - HIGHWAY, d: HIGHWAY }
        : { x: a.x - half, z: Math.min(a.z, b.z) + half, w: HIGHWAY, d: Math.abs(b.z - a.z) - HIGHWAY };
    if (rect.w > 0.01 && rect.d > 0.01) roads.push({ ...rect, axis: edge.axis, style: "highway", owner: -1, y: BASE });
  }
  if (airportNode >= 0 && openings.has(airportNode)) open(airportNode, "east");
  for (const [node, o] of openings) {
    const n = nodes[node];
    joints.push({ x: n.x - half, z: n.z - half, w: HIGHWAY, d: HIGHWAY, open: o, style: "highway", verge: "grass", owner: -1, y: BASE });
  }

  /** Ouvre le coin du périphérique vers la bretelle, et écarte la ceinture verte. */
  function openRing(city: MegaCity, joint: Rect, side: Side, ramp: Rect) {
    const { x: ox, z: oz } = offsetOf(city);
    const local = { x: joint.x - ox, z: joint.z - oz };
    const ring = city.layout.joints.find((j) => Math.abs(j.x - local.x) < 0.01 && Math.abs(j.z - local.z) < 0.01);
    if (ring) ring.open[side] = true;
    const cut = { x: ramp.x - ox, z: ramp.z - oz, w: ramp.w, d: ramp.d };
    city.layout.plates = city.layout.plates.flatMap((plate) => cutRect(plate, cut).map((piece) => ({ ...plate, ...piece })));
  }
  function offsetOf(city: MegaCity) {
    // Le socle local va de -side/2 à side/2.
    return { x: origins[city.page].x + sides[city.page] / 2, z: origins[city.page].z + sides[city.page] / 2 };
  }

  // --- L'aéroport ----------------------------------------------------------------------
  let airport: Airport | undefined;
  if (airportNode >= 0) {
    const sites = new Map<string, number>();
    for (const city of cities) for (const [domain, n] of city.sites) sites.set(domain, (sites.get(domain) ?? 0) + n);
    const ranked = [...sites.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 60);
    const ctx = { lots: [], roads, plates };
    airport = planAirport(
      ctx,
      {
        x0: placement.width,
        z: 0,
        d: placement.depth,
        center: airportAt,
        access: placement.width - g / 2 + half,
        owner: -1,
        y: BASE,
      },
      external,
      ranked,
    );
  }

  // --- Les ports ouverts sur le large --------------------------------------------------
  // Le chenal d'un port sort de sa ville par le bord du socle : il continue tout droit à travers
  // la campagne jusqu'au bord de la mégalopole, sous les autoroutes qu'il croise. Une autre
  // ville (ou son aérodrome), un carrefour ou une route qui court le long de lui l'arrêtent avant.
  // Ce que chaque ville occupe : son socle, et son aérodrome qui dessine son propre sol.
  const footprints = cities.map((city) => {
    const socle = socleOf(city.page);
    const strip = city.layout.airport;
    return strip ? { ...socle, w: socle.w + strip.w } : socle;
  });
  const socleRects = cities.map((city) => socleOf(city.page));
  for (const [c, city] of cities.entries()) {
    const { x: ox, z: oz } = offsetOf(city);
    const socle = socleRects[c];
    for (const channel of city.layout.channels) {
      const water = { x: channel.x + ox, z: channel.z + oz, w: channel.w, d: channel.d };
      let band: Rect | null = null;
      let dir: Side = "south";
      if (channel.axis === "x" && Math.abs(water.x - socle.x) < 0.05) {
        dir = "west";
        band = { x: 0, z: water.z, w: socle.x, d: water.d };
      } else if (channel.axis === "x" && Math.abs(water.x + water.w - socle.x - socle.w) < 0.05) {
        dir = "east";
        band = { x: socle.x + socle.w, z: water.z, w: placement.width - socle.x - socle.w, d: water.d };
      } else if (channel.axis === "z" && Math.abs(water.z + water.d - socle.z - socle.d) < 0.05) {
        band = { x: water.x, z: socle.z + socle.d, w: water.w, d: placement.depth - socle.z - socle.d };
      }
      if (!band) continue;
      const stops: Rect[] = [
        ...footprints.filter((_, k) => k !== c).map((r) => ({ x: r.x - 1.5, z: r.z - 1.5, w: r.w + 3, d: r.d + 3 })),
        ...joints,
        ...roads.filter((road) => road.axis === channel.axis),
      ];
      for (const stop of stops) {
        if (!overlaps(stop, band)) continue;
        if (dir === "west") {
          const x0 = stop.x + stop.w;
          band = { ...band, x: x0, w: band.x + band.w - x0 };
        } else if (dir === "east") {
          band = { ...band, w: stop.x - band.x };
        } else {
          band = { ...band, d: stop.z - band.z };
        }
      }
      if (band.w < 1 || band.d < 1) continue;
      const rect = band;
      channels.push({ ...rect, axis: channel.axis, owner: -1, y: channel.y });
      const crossed = roads.flatMap((road) => {
        if (!overlaps(road, rect)) return [road];
        const x0 = Math.max(road.x, rect.x);
        const z0 = Math.max(road.z, rect.z);
        bridges.push({
          x: x0, z: z0, w: Math.min(road.x + road.w, rect.x + rect.w) - x0, d: Math.min(road.z + road.d, rect.z + rect.d) - z0,
          axis: road.axis, style: road.style, owner: road.owner, y: road.y,
        });
        return cutRect(road, rect).map((piece) => ({ ...road, ...piece }));
      });
      roads.splice(0, roads.length, ...crossed);
    }
  }

  // --- La campagne ---------------------------------------------------------------------
  const shown = new Set(cities.map((city) => city.page));
  const whole: Rect = { x: 0, z: 0, w: placement.width, d: placement.depth };
  let land: Rect[] = [whole];
  for (const footprint of footprints) land = land.flatMap((piece) => cutRect(piece, footprint));
  for (const piece of land) plates.push({ ...piece, y: 0, h: BASE, style: "base", owner: -1 });

  // La campagne : les places des pages masquées et ce qui n'est à aucune page, en parcelles.
  const zones: Rect[] = [...placement.fillers];
  placement.order.forEach((page) => {
    if (!shown.has(page)) zones.push(slotOf(page));
  });
  const blockers: Rect[] = [...roads, ...joints, ...channels, ...bridges];
  let grass: Rect[] = land;
  for (const block of blockers) grass = grass.flatMap((piece) => cutRect(piece, block));
  for (const piece of grass) plates.push({ ...piece, y: BASE, h: CURB, style: "grass", owner: -1 });
  zones.forEach((zone, z) => {
    const parcels: Array<{ rect: Rect; seed: number }> = [];
    split(zone, 7919 * (z + 1), parcels);
    for (const { rect, seed } of parcels) {
      // Une haie entre deux parcelles : un peu d'herbe tout autour.
      const parcel = { x: rect.x + 0.7, z: rect.z + 0.7, w: rect.w - 1.4, d: rect.d - 1.4 };
      if (parcel.w < 3 || parcel.d < 3) continue;
      const r = noise(seed + 5);
      if (r >= 0.68 && r < 0.86) {
        decor.push({ ...parcel, type: "woods", owner: -1, y: BASE + CURB });
        continue;
      }
      if (r >= 0.86) continue; // un pré : l'herbe suffit
      const style = r < 0.38 ? "crops" : r < 0.55 ? "lawn" : "dirt";
      let pieces = [parcel];
      for (const block of blockers) pieces = pieces.flatMap((piece) => cutRect(piece, block));
      for (const piece of pieces) plates.push({ ...piece, y: BASE + CURB, h: 0.06, style, owner: -1 });
    }
  });

  const bounds = { minX: 0, maxX: placement.width, minZ: 0, maxZ: placement.depth, maxY: 0 };
  if (airport) includeAirport(bounds, airport);
  const stats: CityStats = {
    buildings: 0, districts: 0, monuments: 0, billboards: 0, rivers: 0, parks: 0, vacant: 0, maxAltitude: 0, maxDepth: 0,
  };

  return {
    parts: cities.map((city) => ({ city, offset: offsetOf(city) })),
    land: { lots: [], roads, joints, plates, decor, channels, bridges, airport, bounds, stats },
    links,
  };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

/** Découpe une zone en parcelles de tailles inégales, comme un cadastre de campagne. */
function split(zone: Rect, seed: number, out: Array<{ rect: Rect; seed: number }>) {
  const area = zone.w * zone.d;
  if (zone.w < 8 || zone.d < 8 || area < 260 || (area < 900 && noise(seed) < 0.4)) {
    out.push({ rect: zone, seed });
    return;
  }
  const alongX = zone.w > zone.d * (0.75 + noise(seed + 1) * 0.5);
  const t = 0.3 + noise(seed + 2) * 0.4;
  const a = (seed * 31 + 7) % 1_000_003;
  const b = (seed * 37 + 11) % 1_000_003;
  if (alongX) {
    const w = zone.w * t;
    split({ ...zone, w }, a, out);
    split({ ...zone, x: zone.x + w, w: zone.w - w }, b, out);
  } else {
    const d = zone.d * t;
    split({ ...zone, d }, a, out);
    split({ ...zone, z: zone.z + d, d: zone.d - d }, b, out);
  }
}

/** Tirage stable dans [0, 1[. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
