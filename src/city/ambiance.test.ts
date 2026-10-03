import { describe, expect, it } from "vitest";
import { trackersIn } from "@/format/trackers";
import type { CityDoc, CityNode, CityPage } from "@/format/types";
import { ambianceOf } from "./ambiance";
import { BELT, layoutCity, type Rect } from "./layout";
import { assembleWorld, singleWorld } from "./world";

function page(size: number, facts?: CityPage, extra: CityNode[] = []): CityDoc {
  const children: CityNode[] = [];
  for (let i = 0; i < size; i += 1) children.push({ tag: "p", text: 200 + (i % 7) * 60 });
  return {
    format: 1,
    source: facts ? "bookmarklet" : "wikipedia",
    url: "https://exemple.org/page",
    title: "Page",
    capturedAt: "2026-10-03T12:00:00.000Z",
    page: facts,
    root: {
      tag: "body",
      children: [
        { tag: "section", children: [...children.slice(0, size / 2), ...extra] },
        { tag: "section", children: children.slice(size / 2) },
        { tag: "footer", children: [{ tag: "p", text: 80 }, { tag: "p", text: 60 }] },
      ],
    },
  };
}

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

describe("ambiance", () => {
  it("reconnaît les traqueurs parmi les sites tiers, sous-domaines compris", () => {
    expect(
      trackersIn(["www.googletagmanager.com", "cdn.exemple.org", "stats.g.doubleclick.net", "bat.bing.com", "www.bing.com", "googletagmanager.com"]),
    ).toEqual(["googletagmanager.com", "doubleclick.net", "bat.bing.com"]);
  });

  it("fait la météo selon le poids de la page, et compte usines, caméras, graffitis, ruines", () => {
    expect(ambianceOf(page(10)).weather).toBe("clear");
    expect(ambianceOf(page(10, { domSize: 2_000 })).weather).toBe("cloudy");
    expect(ambianceOf(page(10, { domSize: 500, bytes: 8_000_000 })).weather).toBe("storm");

    const broken: CityNode = { tag: "img", img: { src: "https://exemple.org/a.jpg", w: 300, h: 200, broken: true } };
    const info = ambianceOf(
      page(10, { domSize: 900, scripts: 13, comments: 5, thirdParty: ["www.google-analytics.com", "connect.facebook.net", "fonts.gstatic.com"] }, [broken]),
    );
    expect(info).toMatchObject({ weather: "fair", measured: "dom", factories: 3, cameras: 6, graffiti: 5, ruins: 1 });
    expect(info.trackers).toEqual(["google-analytics.com", "facebook.net"]);

    // Une ville Wikipédia ne sait que ses éléments relevés.
    const wiki = ambianceOf(page(10));
    expect(wiki).toMatchObject({ measured: "captured", factories: 0, cameras: 0, graffiti: 0, thirdParty: false, colors: false });
    expect(wiki.scripts).toBeUndefined();
  });

  it("pose les usines dans la ceinture verte, les caméras au bord des rues, les ruines à la place des images cassées", () => {
    const broken: CityNode = { tag: "img", img: { src: "https://exemple.org/a.jpg", w: 300, h: 200, broken: true } };
    const doc = page(60, { domSize: 7_000, scripts: 40, comments: 3, thirdParty: ["www.googletagmanager.com", "static.hotjar.com"] }, [broken]);
    const city = layoutCity(doc);
    const ambiance = city.ambiance!;
    expect(ambiance.weather).toBe("storm");
    expect(ambiance.clouds.length).toBeGreaterThan(2);
    const socle = city.lots[0];
    for (const cloud of ambiance.clouds) expect(cloud.y).toBeGreaterThan(city.bounds.maxY);

    const factories = ambiance.industry!.factories;
    expect(factories.length).toBeGreaterThan(0);
    expect(factories.length).toBeLessThanOrEqual(7);
    const inner = { x: socle.x + BELT, z: socle.z + BELT, w: socle.w - 2 * BELT, d: socle.d - 2 * BELT };
    for (const f of factories) {
      // Dans le socle, hors du périphérique : dans la ceinture.
      expect(f.x).toBeGreaterThanOrEqual(socle.x);
      expect(f.z + f.d).toBeLessThanOrEqual(socle.z + socle.d);
      expect(overlap(f, inner)).toBe(false);
      for (const way of [...city.roads, ...city.joints, ...city.channels]) expect(overlap(f, way)).toBe(false);
    }

    const cameras = ambiance.surveillance!.cameras;
    expect(cameras).toHaveLength(6);
    expect(ambiance.surveillance!.trackers).toEqual(["googletagmanager.com", "hotjar.com"]);
    for (const camera of cameras) {
      const near = city.roads.some((road) => overlap({ x: camera.x - 0.5, z: camera.z - 0.5, w: 1, d: 1 }, road));
      expect(near).toBe(true);
    }
    expect(city.lots.filter((lot) => lot.kind === "ruin")).toHaveLength(1);
  });

  it("donne aux usines et aux caméras leurs numéros de survol, après les lots, seule ou dans le monde", () => {
    const doc = page(30, { domSize: 900, scripts: 8, thirdParty: ["www.googletagmanager.com"] });
    const a = layoutCity(doc);
    const ids = [a.airport?.id, a.ambiance!.industry!.id, a.ambiance!.surveillance!.id].filter((id) => id !== undefined);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toBeGreaterThanOrEqual(a.lots.length);
    expect(singleWorld(a).specials.map((s) => s.special.kind)).toEqual(
      a.airport ? ["airport", "industry", "surveillance"] : ["industry", "surveillance"],
    );

    // Deux villes assemblées : des numéros tous différents, que chaque scène retrouve avec sa base.
    const b = layoutCity(doc, { airport: "none" });
    const c = layoutCity(doc, { airport: "none" });
    const land = { ...b, lots: [], roads: [], joints: [], plates: [], decor: [], channels: [], bridges: [], airport: undefined, ambiance: undefined };
    const world = assembleWorld([{ layout: b, offset: { x: 0, z: 0 } }, { layout: c, offset: { x: 200, z: 0 } }], land);
    const global = world.specials.map((s) => s.id);
    expect(new Set(global).size).toBe(4);
    for (const id of global) expect(id).toBeGreaterThanOrEqual(world.layout.lots.length);
    for (const entry of world.specials) {
      const part = world.parts[entry.part];
      const local = entry.special.kind === "industry" ? part.layout.ambiance!.industry!.id : part.layout.ambiance!.surveillance!.id;
      expect(local + part.base).toBe(entry.id);
    }
  });
});
