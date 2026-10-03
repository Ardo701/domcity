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

describe("megalopolis", () => {
  it("arranges pages by their addresses, folder by folder, without overlap", () => {
    expect(["/b", "/a/b", "/", "/a"].sort(comparePaths)).toEqual(["/", "/a", "/a/b", "/b"]);
    const { placement } = megalopolis(SITE);
    // The home page, then the pages at the root (/blog, /contact), then the /docs folder, largest first.
    expect(placement.order).toEqual([0, 1, 4, 2, 3]);
    // The root at the top left, like the start of a page.
    expect(placement.origins[0]).toEqual({ x: CORRIDOR, z: CORRIDOR });
    // The home page's place includes its airfield (40 links to other sites).
    expect(placement.widths[0]).toBe(placement.sides[0] + AERODROME);
    expect(placement.widths[1]).toBe(placement.sides[1]);
    const slots = placement.origins.map((o, i) => ({ ...o, w: placement.widths[i], d: placement.sides[i] }));
    for (let a = 0; a < slots.length; a += 1) {
      for (let b = a + 1; b < slots.length; b += 1) expect(overlap(slots[a], slots[b])).toBe(false);
      expect(slots[a].x).toBeGreaterThanOrEqual(0);
      expect(slots[a].x + slots[a].w).toBeLessThanOrEqual(placement.width);
    }
  });

  it("links linked pages by highway, and only them", () => {
    const { placement, mega } = megalopolis(SITE);
    expect(mega.links).toEqual([[0, 1], [0, 2], [2, 3]]);
    const { roads, joints } = mega.land;
    const highways = roads.filter((road) => road.style === "highway");
    expect(highways.length).toBeGreaterThan(0);
    // Neither the highway nor its intersections pass over a city.
    placement.origins.forEach((o, i) => {
      const socle = { ...o, w: placement.sides[i], d: placement.sides[i] };
      for (const way of [...highways, ...joints]) expect(overlap(way, socle)).toBe(false);
    });
    // One ramp per linked city, connected to a corner of its ring road opened toward it.
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

  it("keeps cities in place when some are hidden, and leaves fields in their place", () => {
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

  it("puts the site's large airport to the east, linked by the highway, with its flights", () => {
    const { placement, mega } = megalopolis(SITE);
    const airport = mega.land.airport!;
    expect(airport.x).toBeGreaterThanOrEqual(placement.width);
    expect(airport.destinations).toEqual([["github.com", 40]]);
    expect(airport.flights.map((f) => f.domain)).toEqual(["github.com"]);
    // The access avenue leaves from a highway intersection opened toward the east.
    const access = mega.land.roads.find((road) => road.style === "avenue")!;
    const hub = mega.land.joints.find((j) => Math.abs(j.x + j.w - access.x) < 0.01 && j.open.east);
    expect(hub).toBeDefined();
    expect(mega.land.bounds.maxX).toBeGreaterThanOrEqual(airport.x + airport.w);
  });

  it("gives every open enough city its airfield, east of its base, away from the highways", () => {
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
      // In world coordinates: just east of the base, in the reserved space.
      const strip = { x: a.x + part.offset.x, z: a.z + part.offset.z, w: a.w, d: a.d };
      expect(strip.x).toBeCloseTo(origins[page].x + sides[page]);
      expect(strip.x + strip.w).toBeLessThanOrEqual(origins[page].x + widths[page] + 0.01);
      // No highway, intersection or ramp (none heads east) on the airfield.
      for (const way of highways) expect(overlap(way, strip)).toBe(false);
      // Its runways, hangar and planes stay in its strip.
      for (const r of [...a.runways, a.apron, a.terminal]) expect(overlap(r, a)).toBe(true);
      expect(a.runways[0].x + a.runways[0].w).toBeLessThanOrEqual(a.x + a.w);
    });
    // Hidden, its place (airfield included) becomes countryside.
    const hidden = megalopolis(docs, [1, 2]);
    const slot = { ...placement.origins[0], w: placement.widths[0], d: placement.sides[0] };
    expect(hidden.mega.land.plates.some((plate) => plate.style === "base" && overlap(plate, slot))).toBe(true);
  });

  it("stacks small cities under large ones, without overlap", () => {
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

  it("extends a harbor's channel to the edge of the megalopolis, under the highways", () => {
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

  it("always gives the same plan", () => {
    const a = megalopolis(SITE).mega;
    const b = megalopolis(SITE).mega;
    expect(JSON.stringify(a.land)).toBe(JSON.stringify(b.land));
  });
});
