import { describe, expect, it } from "vitest";
import { linkKey } from "@/format/links";
import type { CityDoc, CityNode } from "@/format/types";
import { AERODROME, citySide, externalLinks, hasAerodrome, layoutCity, type Rect } from "./layout";
import { CORRIDOR, buildMegalopolis, comparePaths, placePages, type MegaCity } from "./megalopolis";

function page(path: string, size: number, links: string[] = [], external = 0): CityDoc {
  const children: CityNode[] = [];
  for (let i = 0; i < size; i += 1) children.push({ tag: "p", text: 300 + i * 40 });
  if (external > 0) children.push({ tag: "p", text: 20, links: { internal: 0, external } });
  return {
    format: 1,
    source: "bookmarklet",
    url: `https://exemple.org${path}`,
    title: path,
    capturedAt: "2026-10-03T12:00:00.000Z",
    linksTo: { pages: links.map(linkKey), sites: external > 0 ? [["github.com", external]] : undefined },
    root: { tag: "body", children: [{ tag: "section", children }] },
  };
}

const overlap = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.z < b.z + b.d - pad && b.z < a.z + a.d - pad;

function megalopolis(docs: CityDoc[], shown = docs.map((_, i) => i)) {
  const paths = docs.map((d) => new URL(d.url).pathname);
  const placement = placePages(docs.map((d, i) => ({ path: paths[i], side: citySide(d), aerodrome: hasAerodrome(d) })));
  const cities: MegaCity[] = shown.map((i) => ({
    page: i,
    path: paths[i],
    layout: layoutCity(docs[i], { airport: "aerodrome" }),
    linksTo: docs[i].linksTo?.pages ?? [],
    external: externalLinks(docs[i].root),
    sites: docs[i].linksTo?.sites ?? [],
  }));
  return { placement, mega: buildMegalopolis(placement, cities) };
}

const SITE = [
  page("/", 14, ["/blog", "/docs/a"], 40),
  page("/blog", 6, ["/"]),
  page("/docs/a", 9, ["/docs/b"]),
  page("/docs/b", 4),
  page("/contact", 3),
];

describe("mégalopole", () => {
  it("range les pages selon leurs adresses, dossier par dossier, sans chevauchement", () => {
    expect(["/b", "/a/b", "/", "/a"].sort(comparePaths)).toEqual(["/", "/a", "/a/b", "/b"]);
    const { placement } = megalopolis(SITE);
    // L'accueil, puis les pages à la racine (/blog, /contact), puis le dossier /docs, les plus grandes d'abord.
    expect(placement.order).toEqual([0, 1, 4, 2, 3]);
    // La racine en haut à gauche, comme le début d'une page.
    expect(placement.origins[0]).toEqual({ x: CORRIDOR, z: CORRIDOR });
    // La place de l'accueil comprend son aérodrome (40 liens vers d'autres sites).
    expect(placement.widths[0]).toBe(placement.sides[0] + AERODROME);
    expect(placement.widths[1]).toBe(placement.sides[1]);
    const slots = placement.origins.map((o, i) => ({ ...o, w: placement.widths[i], d: placement.sides[i] }));
    for (let a = 0; a < slots.length; a += 1) {
      for (let b = a + 1; b < slots.length; b += 1) expect(overlap(slots[a], slots[b])).toBe(false);
      expect(slots[a].x).toBeGreaterThanOrEqual(0);
      expect(slots[a].x + slots[a].w).toBeLessThanOrEqual(placement.width);
    }
  });

  it("relie par l'autoroute les pages liées, et seulement elles", () => {
    const { placement, mega } = megalopolis(SITE);
    expect(mega.links).toEqual([[0, 1], [0, 2], [2, 3]]);
    const { roads, joints } = mega.land;
    const highways = roads.filter((road) => road.style === "highway");
    expect(highways.length).toBeGreaterThan(0);
    // Ni l'autoroute ni ses carrefours ne passent sur une ville.
    placement.origins.forEach((o, i) => {
      const socle = { ...o, w: placement.sides[i], d: placement.sides[i] };
      for (const way of [...highways, ...joints]) expect(overlap(way, socle)).toBe(false);
    });
    // Une bretelle par ville liée, branchée sur un coin de son périphérique ouvert vers elle.
    const ramps = roads.filter((road) => road.style === "ring");
    const touched = new Set<number>();
    for (const part of mega.parts) {
      const socle = { x: part.offset.x - placement.sides[part.city.page] / 2, z: part.offset.z - placement.sides[part.city.page] / 2 };
      const box = { ...socle, w: placement.sides[part.city.page], d: placement.sides[part.city.page] };
      if (ramps.some((ramp) => overlap(ramp, box))) touched.add(part.city.page);
      const corners = part.city.layout.joints.filter((j) => j.style === "ring");
      const opened = corners.filter((j) => Object.values(j.open).filter(Boolean).length > 2);
      expect(opened.length > 0).toBe(touched.has(part.city.page));
    }
    expect([...touched].sort()).toEqual([0, 1, 2, 3]);
  });

  it("garde les villes à leur place quand on en masque, et laisse des champs à la place", () => {
    const all = megalopolis(SITE);
    const some = megalopolis(SITE, [0, 2, 3]);
    expect(some.mega.parts.map((p) => p.offset)).toEqual(
      all.mega.parts.filter((p) => [0, 2, 3].includes(p.city.page)).map((p) => p.offset),
    );
    expect(some.mega.links).toEqual([[0, 2], [2, 3]]);
    const blog = { ...all.placement.origins[1], w: all.placement.sides[1], d: all.placement.sides[1] };
    const fields = some.mega.land.plates.filter((plate) => plate.y > 0.5 && overlap(plate, blog));
    const woods = some.mega.land.decor.filter((decor) => overlap(decor, blog));
    expect(fields.length + woods.length).toBeGreaterThan(0);
  });

  it("pose le grand aéroport du site à l'est, relié par l'autoroute, avec ses vols", () => {
    const { placement, mega } = megalopolis(SITE);
    const airport = mega.land.airport!;
    expect(airport.x).toBeGreaterThanOrEqual(placement.width);
    expect(airport.destinations).toEqual([["github.com", 40]]);
    expect(airport.flights.map((f) => f.domain)).toEqual(["github.com"]);
    // L'avenue d'accès part d'un carrefour d'autoroute ouvert vers l'est.
    const access = mega.land.roads.find((road) => road.style === "avenue")!;
    const hub = mega.land.joints.find((j) => Math.abs(j.x + j.w - access.x) < 0.01 && j.open.east);
    expect(hub).toBeDefined();
    expect(mega.land.bounds.maxX).toBeGreaterThanOrEqual(airport.x + airport.w);
  });

  it("garde à chaque ville assez ouverte son aérodrome, à l'est de son socle, à l'écart des autoroutes", () => {
    const docs = [page("/", 14, ["/a", "/b"], 40), page("/a", 9, ["/", "/b"], 25), page("/b", 6, ["/"], 3)];
    const { placement, mega } = megalopolis(docs);
    const aerodromes = mega.parts.map((part) => part.city.layout.airport);
    expect(aerodromes.map((a) => a?.kind)).toEqual(["aerodrome", "aerodrome", undefined]);
    expect(aerodromes[0]!.destinations).toEqual([["github.com", 40]]);
    expect(aerodromes[0]!.flights).toEqual([]);
    const highways = [...mega.land.roads.filter((road) => road.style !== "avenue"), ...mega.land.joints];
    mega.parts.forEach((part, i) => {
      const a = aerodromes[i];
      if (!a) return;
      const { origins, sides, widths } = placement;
      const page = part.city.page;
      // En coordonnées du monde : juste à l'est du socle, dans la place réservée.
      const strip = { x: a.x + part.offset.x, z: a.z + part.offset.z, w: a.w, d: a.d };
      expect(strip.x).toBeCloseTo(origins[page].x + sides[page]);
      expect(strip.x + strip.w).toBeLessThanOrEqual(origins[page].x + widths[page] + 0.01);
      // Ni autoroute, ni carrefour, ni bretelle (aucune ne part vers l'est) sur l'aérodrome.
      for (const way of highways) expect(overlap(way, strip)).toBe(false);
      // Ses pistes, son hangar et ses avions restent dans sa bande.
      for (const r of [...a.runways, a.apron, a.terminal]) expect(overlap(r, a)).toBe(true);
      expect(a.runways[0].x + a.runways[0].w).toBeLessThanOrEqual(a.x + a.w);
    });
    // Masquée, sa place (aérodrome compris) devient campagne.
    const hidden = megalopolis(docs, [1, 2]);
    const slot = { ...placement.origins[0], w: placement.widths[0], d: placement.sides[0] };
    expect(hidden.mega.land.plates.some((plate) => plate.style === "base" && overlap(plate, slot))).toBe(true);
  });

  it("empile les petites villes sous les grandes, sans chevauchement", () => {
    const docs = [page("/", 30), ...Array.from({ length: 8 }, (_, i) => page(`/p${i}`, 2, [`/p${(i + 3) % 8}`, "/"]))];
    const { placement, mega } = megalopolis(docs);
    const socles = placement.origins.map((o, i) => ({ ...o, w: placement.sides[i], d: placement.sides[i] }));
    for (let a = 0; a < socles.length; a += 1) {
      for (let b = a + 1; b < socles.length; b += 1) expect(overlap(socles[a], socles[b])).toBe(false);
    }
    const stacked = new Set(placement.origins.slice(1).map((o) => o.x));
    expect(stacked.size).toBeLessThan(8);
    expect(mega.links.length).toBe(16);
    for (const way of [...mega.land.roads.filter((r) => r.style === "highway"), ...mega.land.joints]) {
      for (const socle of socles) expect(overlap(way, socle)).toBe(false);
    }
  });

  it("prolonge le chenal d'un port jusqu'au bord de la mégalopole, sous les autoroutes", () => {
    const port = page("/", 10, ["/b"]);
    port.root.children!.push({ tag: "footer", children: [{ tag: "p", text: 200 }, { tag: "p", text: 300 }, { tag: "p", text: 250 }] });
    const { placement, mega } = megalopolis([port, page("/b", 8, ["/"]), page("/c", 5)]);
    const [channel] = mega.land.channels;
    expect(channel).toBeDefined();
    const edge = Math.min(channel.x, channel.z, placement.width - channel.x - channel.w, placement.depth - channel.z - channel.d);
    expect(edge).toBeLessThan(0.01);
    for (const road of mega.land.roads) expect(overlap(road, channel)).toBe(false);
    for (const plate of mega.land.plates.filter((p) => p.y > 0.3)) expect(overlap(plate, channel)).toBe(false);
  });

  it("donne toujours le même plan", () => {
    const a = megalopolis(SITE).mega;
    const b = megalopolis(SITE).mega;
    expect(JSON.stringify(a.land)).toBe(JSON.stringify(b.land));
  });
});
