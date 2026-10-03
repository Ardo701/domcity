/**
 * What the 3D view shows: a single city, or several assembled (the megalopolis).
 *
 * Each city is built in its own coordinates and with its own lot numbers:
 * its random draws (shapes, colors, trees, cars) depend on these numbers and these
 * positions, so it is identical alone and in the megalopolis. The view puts it in its place
 * (`offset`) and shifts its numbers (`base`) into a shared plan, used for hovering and by
 * the inspector.
 */

import type { Airport, CityLayout, CityStats, Industry, Lot, Surveillance } from "./layout";

/**
 * What hovering points at without it being an element of the page: an airport or an airfield
 * (the links to other sites), the factories (the scripts), the cameras (the trackers). Their
 * numbers follow the last lot.
 */
export type Special =
  | { kind: "airport"; airport: Airport }
  | { kind: "industry"; industry: Industry }
  | { kind: "surveillance"; surveillance: Surveillance };

export interface WorldPart {
  /** In local coordinates, local lot numbers. */
  layout: CityLayout;
  offset: { x: number; z: number };
  /** Number, in the shared plan, of this part's first lot. */
  base: number;
  /** A megalopolis city: it simplifies from afar. False for the countryside and the highways. */
  city: boolean;
}

export interface World {
  /** The shared plan: lots, streets and airport in world coordinates, shifted numbers. */
  layout: CityLayout;
  parts: WorldPart[];
  /** Airports, airfields, factories and cameras: their number in the shared plan and their part. */
  specials: Array<{ id: number; part: number; special: Special }>;
}

/** What a city has outside its lots, with its own numbers. */
function specialsOf(layout: CityLayout): Special[] {
  const list: Special[] = [];
  if (layout.airport) list.push({ kind: "airport", airport: layout.airport });
  if (layout.ambiance?.industry) list.push({ kind: "industry", industry: layout.ambiance.industry });
  if (layout.ambiance?.surveillance) list.push({ kind: "surveillance", surveillance: layout.ambiance.surveillance });
  return list;
}

/** Does hovering point at something other than an element of the page (airport, factories, cameras)? */
export const isSpecial = (part: { kind: string } | null): part is Special => part !== null && part.kind !== "road";

const idOf = (special: Special) =>
  special.kind === "airport" ? special.airport.id : special.kind === "industry" ? special.industry.id : special.surveillance.id;

/** A single city: the shared plan is its own. */
export function singleWorld(layout: CityLayout): World {
  return {
    layout,
    parts: [{ layout, offset: { x: 0, z: 0 }, base: 0, city: false }],
    specials: specialsOf(layout).map((special) => ({ id: idOf(special), part: 0, special })),
  };
}

const shift = <T extends { x: number; z: number }>(item: T, dx: number, dz: number): T => ({ ...item, x: item.x + dx, z: item.z + dz });

/** A moved airport, with everything it contains. */
const shiftAirport = (a: Airport, dx: number, dz: number, id: number): Airport => ({
  ...shift(a, dx, dz),
  id,
  runways: a.runways.map((r) => shift(r, dx, dz)),
  taxiways: a.taxiways.map((t) => shift(t, dx, dz)),
  apron: shift(a.apron, dx, dz),
  terminal: shift(a.terminal, dx, dz),
  tower: shift(a.tower, dx, dz),
  flights: a.flights.map((f) => shift(f, dx, dz)),
});

/**
 * Assembles the cities (in their place) and the country that links them (already in world coordinates,
 * without lots). Neither the airport, nor the airfields, nor the factories, nor the cameras are lots:
 * they take the numbers that follow the last lot, the country's airport first.
 */
export function assembleWorld(cities: Array<{ layout: CityLayout; offset: { x: number; z: number } }>, land: CityLayout): World {
  const lots: Lot[] = [];
  const merged: CityLayout = {
    lots,
    roads: [...land.roads],
    joints: [...land.joints],
    plates: [],
    decor: [],
    channels: [...land.channels],
    bridges: [...land.bridges],
    bounds: { ...land.bounds },
    stats: { ...land.stats },
  };
  const parts: WorldPart[] = [];
  for (const { layout, offset } of cities) {
    const base = lots.length;
    const { x: dx, z: dz } = offset;
    const owner = (id: number) => (id >= 0 ? id + base : id);
    for (const lot of layout.lots) {
      lots.push({
        ...lot,
        id: lot.id + base,
        parent: lot.parent >= 0 ? lot.parent + base : -1,
        subtreeEnd: lot.subtreeEnd + base,
        x: lot.x + dx,
        z: lot.z + dz,
      });
    }
    // Hovering looks for the street under the pointer among those of the lot it touches.
    for (const road of layout.roads) merged.roads.push({ ...shift(road, dx, dz), owner: owner(road.owner) });
    for (const channel of layout.channels) merged.channels.push({ ...shift(channel, dx, dz), owner: owner(channel.owner) });
    const b = layout.bounds;
    merged.bounds.minX = Math.min(merged.bounds.minX, b.minX + dx);
    merged.bounds.maxX = Math.max(merged.bounds.maxX, b.maxX + dx);
    merged.bounds.minZ = Math.min(merged.bounds.minZ, b.minZ + dz);
    merged.bounds.maxZ = Math.max(merged.bounds.maxZ, b.maxZ + dz);
    merged.bounds.maxY = Math.max(merged.bounds.maxY, b.maxY);
    for (const k of Object.keys(merged.stats) as Array<keyof CityStats>) {
      merged.stats[k] = k === "maxAltitude" || k === "maxDepth" ? Math.max(merged.stats[k], layout.stats[k]) : merged.stats[k] + layout.stats[k];
    }
    parts.push({ layout, offset, base, city: true });
  }
  // The country's airport takes the number that follows the last lot.
  const specials: World["specials"] = [];
  if (land.airport) {
    const airport: Airport = { ...land.airport, id: lots.length };
    land.airport = airport;
    merged.airport = airport;
    specials.push({ id: airport.id, part: parts.length, special: { kind: "airport", airport } });
  }
  // Then those of each city, in city order. A city's scene adds its base to the
  // numbers: each one is therefore stored minus its base.
  let next = lots.length + 1;
  parts.forEach((part, i) => {
    const { layout } = part;
    for (const special of specialsOf(layout)) {
      const id = next;
      next += 1;
      const local = id - part.base;
      if (special.kind === "airport") {
        layout.airport = { ...special.airport, id: local };
        const airport = shiftAirport(special.airport, part.offset.x, part.offset.z, id);
        specials.push({ id, part: i, special: { kind: "airport", airport } });
      } else if (special.kind === "industry") {
        layout.ambiance = { ...layout.ambiance!, industry: { ...special.industry, id: local } };
        specials.push({ id, part: i, special: { kind: "industry", industry: { ...special.industry, id } } });
      } else {
        layout.ambiance = { ...layout.ambiance!, surveillance: { ...special.surveillance, id: local } };
        specials.push({ id, part: i, special: { kind: "surveillance", surveillance: { ...special.surveillance, id } } });
      }
    }
  });
  parts.push({ layout: land, offset: { x: 0, z: 0 }, base: 0, city: false });
  return { layout: merged, parts, specials };
}

/** The part (city) of a lot of the shared plan, or -1. */
export function partOf(world: World, lotId: number): number {
  for (let i = world.parts.length - 1; i >= 0; i -= 1) {
    const part = world.parts[i];
    if (part.city && lotId >= part.base && lotId < part.base + part.layout.lots.length) return i;
  }
  return -1;
}
