import type { CityLayout, Lot, Rect } from "@/city/layout";

/** La partie commune de deux rectangles, ou null. */
function clip(rect: Rect, region: Rect): Rect | null {
  const x = Math.max(rect.x, region.x);
  const z = Math.max(rect.z, region.z);
  const w = Math.min(rect.x + rect.w, region.x + region.w) - x;
  const d = Math.min(rect.z + rect.d, region.z + region.d) - z;
  return w > 0.01 && d > 0.01 ? { x, z, w, d } : null;
}

const inside = (rect: Rect, region: Rect) =>
  rect.x >= region.x - 0.01 &&
  rect.z >= region.z - 0.01 &&
  rect.x + rect.w <= region.x + region.w + 0.01 &&
  rect.z + rect.d <= region.z + region.d + 0.01;

const centerIn = (rect: Rect, region: Rect) => {
  const cx = rect.x + rect.w / 2;
  const cz = rect.z + rect.d / 2;
  return cx >= region.x && cx <= region.x + region.w && cz >= region.z && cz <= region.z + region.d;
};

/**
 * Un morceau de la ville, découpé comme une maquette d'architecte : les sols et les rues sont
 * coupés net au bord, les bâtiments gardés entiers s'ils sont dedans, retirés sinon.
 * Les numéros des lots ne changent pas (le moteur les retrouve par leur place dans la liste) :
 * un lot retiré devient un îlot sans sol, que le moteur ne dessine pas.
 */
export function excerpt(layout: CityLayout, region: Rect): CityLayout {
  const lots: Lot[] = layout.lots.map((lot) => {
    // Les sols (conteneurs, canal, champs) se coupent ; les bâtiments, non.
    if (lot.container || lot.kind === "river" || lot.kind === "fields") {
      const part = clip(lot, region);
      return part ? { ...lot, ...part } : { ...lot, kind: "block", container: true, h: 0, panel: undefined };
    }
    return centerIn(lot, region) ? lot : { ...lot, kind: "block", container: true, h: 0, panel: undefined };
  });
  const cut = <T extends Rect>(items: T[]) =>
    items.flatMap((item) => {
      const part = clip(item, region);
      return part ? [{ ...item, ...part }] : [];
    });
  const ambiance = layout.ambiance && {
    ...layout.ambiance,
    clouds: layout.ambiance.clouds.filter((c) => centerIn({ x: c.x, z: c.z, w: 0, d: 0 }, region)),
    industry: layout.ambiance.industry && {
      ...layout.ambiance.industry,
      factories: layout.ambiance.industry.factories.filter((f) => inside(f, region)),
    },
    surveillance: layout.ambiance.surveillance && {
      ...layout.ambiance.surveillance,
      cameras: layout.ambiance.surveillance.cameras.filter((c) => centerIn({ x: c.x, z: c.z, w: 0, d: 0 }, region)),
    },
  };
  const kept = lots.filter((lot) => !(lot.container && lot.h === 0));
  return {
    ...layout,
    lots,
    roads: cut(layout.roads),
    joints: layout.joints.filter((joint) => inside(joint, region)),
    plates: cut(layout.plates),
    decor: layout.decor.filter((decor) => inside(decor, region)),
    channels: cut(layout.channels),
    bridges: layout.bridges.filter((bridge) => inside(bridge, region)),
    airport: layout.airport && inside(layout.airport, region) ? layout.airport : undefined,
    ambiance,
    bounds: {
      minX: region.x,
      maxX: region.x + region.w,
      minZ: region.z,
      maxZ: region.z + region.d,
      maxY: Math.max(1, ...kept.map((lot) => lot.y + lot.h)),
    },
  };
}
