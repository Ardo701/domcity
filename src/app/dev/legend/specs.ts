import type { CityLayout, Lot, Rect } from "@/city/layout";
import type { Kind } from "@/format/taxonomy";
import type { CityDoc, CityNode, CityPage } from "@/format/types";

/** A legend thumbnail: a small page, and the piece of its city to show. */
export interface LegendSpec {
  key: Kind | "road";
  doc: CityDoc;
  region: (city: CityLayout) => Rect;
  /** Where it is seen from (usually the southwest, like the home page figure), and from what height. */
  from?: "south-west" | "south-east";
  elevation?: number;
  /** A touch-up of the city before the cut (turning a camera toward the inside of the thumbnail). */
  prepare?: (city: CityLayout) => void;
}

const page = (children: CityNode[], extra: { page?: CityPage } = {}): CityDoc => ({
  format: 1,
  source: "bookmarklet",
  url: "https://exemple.org/",
  title: "Légende",
  capturedAt: "2026-10-03T00:00:00.000Z",
  root: { tag: "body", children },
  ...extra,
});

const p = (text: number): CityNode => ({ tag: "p", text });
const div = (text: number): CityNode => ({ tag: "div", text });
const li = (text: number): CityNode => ({ tag: "li", text });
const POSTER = { src: "/figures/sample-poster.svg", alt: "Paysage", w: 420, h: 280 };

/** A square centered on this rectangle, with a margin around it. */
function around(rect: Rect, pad: number): Rect {
  const side = Math.max(rect.w, rect.d) + pad * 2;
  return { x: rect.x + rect.w / 2 - side / 2, z: rect.z + rect.d / 2 - side / 2, w: side, d: side };
}

const point = (x: number, z: number, side: number): Rect => ({ x: x - side / 2, z: z - side / 2, w: side, d: side });

function lot(city: CityLayout, kind: Kind, nth = 0): Lot {
  const found = city.lots.filter((l) => l.kind === kind)[nth];
  if (!found) throw new Error(`no ${kind} in the sample`);
  return found;
}

const show = (kind: Kind, pad: number, nth = 0) => (city: CityLayout) => around(lot(city, kind, nth), pad);

export const LEGEND_SPECS: LegendSpec[] = [
  {
    key: "terrain",
    doc: page([p(900), div(3200), p(500), p(700)]),
    // The southwest corner of the base, facing us: its edge, the ring road turning, the green belt.
    // Without the buildings: the terrain is what we show.
    prepare: (city) => {
      for (const l of city.lots) if (l.depth > 0 && !l.container) Object.assign(l, { kind: "block", container: true, h: 0 });
    },
    region: (city) => {
      const root = city.lots[0];
      return { x: root.x, z: root.z + root.d - 20, w: 20, d: 20 };
    },
  },
  {
    key: "district",
    doc: page([{ tag: "section", children: [{ tag: "h2", text: 8, heading: "Partie" }, p(900), p(400), div(2000), p(300)] }]),
    region: show("district", 0.6),
  },
  {
    key: "block",
    doc: page([{ tag: "div", children: [p(700), p(300), div(1500), p(500)] }]),
    region: show("block", 0.6),
  },
  {
    key: "boulevard",
    // Statues along the alley rather than houses: the paved square and its trees show.
    doc: page([{ tag: "nav", children: [{ tag: "h6", text: 5 }, { tag: "h6", text: 5 }, { tag: "h6", text: 5 }] }]),
    region: show("boulevard", 0.6),
  },
  {
    key: "gate",
    // A single counter on the square: nothing hides the arch at the back.
    doc: page([{ tag: "header", children: [{ tag: "button", text: 6 }] }, p(600)]),
    region: show("gate", 0.6),
  },
  {
    key: "port",
    doc: page([p(600), { tag: "footer", children: [p(160), div(60)] }]),
    region: show("port", 0.6),
  },
  {
    key: "park",
    doc: page([{ tag: "aside", children: [{ tag: "h6", text: 5 }, { tag: "h6", text: 5 }, { tag: "h6", text: 5 }, { tag: "h6", text: 5 }] }]),
    region: show("park", 0.6),
  },
  {
    key: "estate",
    doc: page([{ tag: "ul", children: [li(40), li(70), li(30), li(90), li(25), li(55)] }]),
    region: show("estate", 0.6),
  },
  {
    key: "townhall",
    doc: page([{ tag: "form", children: [{ tag: "input" }, { tag: "input" }, { tag: "select" }, { tag: "button", text: 8 }] }]),
    region: show("townhall", 0.6),
  },
  {
    key: "fields",
    doc: page([{ tag: "table", text: 600 }]),
    region: show("fields", 0.6),
  },
  { key: "tower", doc: page([div(5200)]), region: show("tower", 2) },
  { key: "vacant", doc: page([p(300), { tag: "div" }, p(200)]), region: show("vacant", 1.6) },
  { key: "residence", doc: page([p(1900)]), region: show("residence", 2) },
  {
    key: "gallery",
    doc: page([{ tag: "div", children: Array.from({ length: 8 }, () => ({ tag: "img", img: POSTER })) }]),
    region: show("gallery", 3),
  },
  { key: "house", doc: page([{ tag: "ul", children: [li(40), li(70), li(30)] }]), region: show("house", 1.4, 1) },
  { key: "monument", doc: page([{ tag: "h1", text: 7, heading: "Exemple" }]), region: show("monument", 2) },
  { key: "belfry", doc: page([{ tag: "h2", text: 8, heading: "Histoire" }]), region: show("belfry", 2) },
  { key: "kiosk", doc: page([{ tag: "h3", text: 6, heading: "Lieux" }]), region: show("kiosk", 1.6) },
  { key: "bollard", doc: page([{ tag: "h4", text: 6 }]), region: show("bollard", 1.4) },
  {
    key: "billboard",
    // Three images: one on each free facade, including the south and west ones, which we see.
    doc: page([{ tag: "div", children: [p(1200), ...Array.from({ length: 3 }, () => ({ tag: "img", img: POSTER }))] }]),
    region: show("residence", 2.4),
  },
  {
    key: "ruin",
    doc: page([p(400), { tag: "img", img: { src: "https://exemple.org/disparue.jpg", alt: "Image", w: 400, h: 300, broken: true } }]),
    region: show("ruin", 1.6),
  },
  {
    key: "screen",
    doc: page([{ tag: "div", children: [p(1200), { tag: "video" }, { tag: "video" }, { tag: "video" }] }]),
    region: show("residence", 2.4),
  },
  { key: "embassy", doc: page([{ tag: "iframe" }]), region: show("embassy", 2) },
  { key: "sculpture", doc: page([{ tag: "svg" }]), region: show("sculpture", 1.6) },
  { key: "counter", doc: page([{ tag: "button", text: 8 }]), region: show("counter", 1.6) },
  {
    key: "river",
    doc: page([{ tag: "section", children: [p(600), p(400)] }, { tag: "hr" }, { tag: "section", children: [p(500), p(300)] }]),
    region: (city) => {
      const river = lot(city, "river");
      return point(river.x + river.w / 2, river.z + river.d / 2, 16);
    },
  },
  {
    key: "airport",
    doc: page([{ ...p(800), links: { internal: 4, external: 60 } }, p(600)]),
    region: (city) => {
      if (!city.airport) throw new Error("no airport in the sample");
      return around(city.airport, 1);
    },
  },
  {
    key: "factory",
    doc: page([p(900), div(2000), p(400)], { page: { scripts: 12 } }),
    region: (city) => {
      const factory = city.ambiance?.industry?.factories[0];
      if (!factory) throw new Error("no factory in the sample");
      return around(factory, 2);
    },
  },
  {
    key: "camera",
    doc: page([p(150), p(150), p(150), p(150)], { page: { thirdParty: ["google-analytics.com"] } }),
    // It looks northeast, away from us: its field of view stays on the thumbnail.
    // Alone at the edge of its street, with no building around, turned toward us: its field of view
    // spreads across the foreground.
    prepare: (city) => {
      const camera = city.ambiance?.surveillance?.cameras[0];
      if (camera) camera.heading = (Math.PI * 5) / 4;
      for (const l of city.lots) if (!l.container) Object.assign(l, { kind: "block", container: true, h: 0 });
    },
    region: (city) => {
      const camera = city.ambiance?.surveillance?.cameras[0];
      if (!camera) throw new Error("no camera in the sample");
      return point(camera.x - 1.9, camera.z + 1.9, 7.5);
    },
  },
  {
    key: "graffiti",
    // A low building seen up close and from fairly low: the tag at the foot of its south facade counts in the thumbnail.
    doc: page([p(150)], { page: { comments: 40 } }),
    // A small building: the tag covers a good part of its facade.
    prepare: (city) => {
      for (const l of city.lots) {
        if (l.kind !== "residence") continue;
        Object.assign(l, { x: l.x + l.w / 2 - 1.4, z: l.z + l.d / 2 - 1.4, w: 2.8, d: 2.8, h: 2.5 });
      }
    },
    region: show("residence", 0.7),
    elevation: 14,
  },
  {
    key: "weather",
    doc: page([p(900), div(2000), p(400), p(600)], { page: { bytes: 9_000_000, domSize: 9000 } }),
    region: (city) => {
      const cloud = city.ambiance?.clouds[0];
      if (!cloud) throw new Error("no cloud in the sample");
      return point(cloud.x, cloud.z, Math.max(10, cloud.size * 3.2));
    },
  },
  {
    key: "road",
    doc: page([{ tag: "div", children: [p(700), p(300), div(1500), p(500)] }]),
    region: (city) => {
      const road = city.roads.find((r) => r.style === "street") ?? city.roads[0];
      return point(road.x + road.w / 2, road.z + road.d / 2, 9);
    },
  },
];
