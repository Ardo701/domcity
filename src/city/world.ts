/**
 * Ce que montre la vue 3D : une ville seule, ou plusieurs assemblées (la mégalopole).
 *
 * Chaque ville se construit dans ses propres coordonnées et avec ses propres numéros de lots :
 * ses tirages au sort (formes, couleurs, arbres, voitures) dépendent de ces numéros et de ces
 * positions, elle est donc identique seule et dans la mégalopole. La vue la pose à sa place
 * (`offset`) et décale ses numéros (`base`) dans un plan commun, qui sert au survol et à
 * l'inspecteur.
 */

import type { Airport, CityLayout, CityStats, Lot } from "./layout";

export interface WorldPart {
  /** En coordonnées locales, numéros de lots locaux. */
  layout: CityLayout;
  offset: { x: number; z: number };
  /** Numéro, dans le plan commun, du premier lot de cette partie. */
  base: number;
  /** Une ville de la mégalopole : elle se simplifie de loin. Faux pour la campagne et les autoroutes. */
  city: boolean;
}

export interface World {
  /** Le plan commun : lots, rues et aéroport en coordonnées du monde, numéros décalés. */
  layout: CityLayout;
  parts: WorldPart[];
}

/** Une ville seule : le plan commun est le sien. */
export function singleWorld(layout: CityLayout): World {
  return { layout, parts: [{ layout, offset: { x: 0, z: 0 }, base: 0, city: false }] };
}

const shift = <T extends { x: number; z: number }>(item: T, dx: number, dz: number): T => ({ ...item, x: item.x + dx, z: item.z + dz });

/**
 * Assemble les villes (à leur place) et le pays qui les relie (déjà en coordonnées du monde,
 * sans lots : l'aéroport y prend le numéro qui suit le dernier lot).
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
    // Le survol cherche la rue sous le pointeur parmi celles du lot touché.
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
  // L'aéroport du pays prend le numéro qui suit le dernier lot.
  if (land.airport) {
    const airport: Airport = { ...land.airport, id: lots.length };
    land.airport = airport;
    merged.airport = airport;
  }
  parts.push({ layout: land, offset: { x: 0, z: 0 }, base: 0, city: false });
  return { layout: merged, parts };
}

/** La partie (ville) d'un lot du plan commun, ou -1. */
export function partOf(world: World, lotId: number): number {
  for (let i = world.parts.length - 1; i >= 0; i -= 1) {
    const part = world.parts[i];
    if (part.city && lotId >= part.base && lotId < part.base + part.layout.lots.length) return i;
  }
  return -1;
}
