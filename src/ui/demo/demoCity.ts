import { layoutCity, type Lot } from "@/city/layout";
import { BRICK, CONCRETE, GLASS, GROUND_COLORS, HOUSES, ROOFS, SIGNAL, STONE, STUCCO, WATER, pick, rand } from "@/city/palette";
import { projectOn } from "@/ui/figureMeta";
import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import { HERO_SAMPLE } from "@/ui/samples";
import { VIEW, tone, viewPoint, type DemoCamera, type DemoCity, type DemoLot, type DemoSlab, type Look, type PageRect } from "./scene";

/**
 * The home page's sample page (HERO_SAMPLE) as a browser would display it, element by element,
 * in page order (that of the urban plan's lots). Each element becomes its real building.
 */
const PAGE: Array<{ tag: string; rect: [number, number, number, number]; look?: Look; label?: string }> = [
  { tag: "body", rect: [0, 0, 640, 388] },
  { tag: "header", rect: [0, 0, 640, 44], label: "<header>" },
  { tag: "img", rect: [28, 10, 66, 24], look: { type: "image", src: "/figures/sample-logo.svg" } },
  { tag: "nav", rect: [436, 13, 176, 18] },
  { tag: "li", rect: [440, 17, 52, 10], look: { type: "words", word: "history" } },
  { tag: "li", rect: [498, 17, 46, 10], look: { type: "words", word: "places" } },
  { tag: "li", rect: [550, 17, 58, 10], look: { type: "words", word: "contact" } },
  { tag: "main", rect: [28, 52, 372, 282] },
  { tag: "h1", rect: [28, 54, 372, 34], look: { type: "title", word: "example", size: 30 }, label: "<h1>" },
  { tag: "section", rect: [28, 94, 372, 116] },
  { tag: "h2", rect: [28, 94, 372, 16], look: { type: "title", word: "history", size: 14 } },
  { tag: "p", rect: [28, 114, 222, 34], look: { type: "lines" }, label: "<p>" },
  { tag: "img", rect: [262, 114, 138, 92], look: { type: "image", src: "/figures/sample-poster.svg" }, label: "<img>" },
  { tag: "p", rect: [28, 152, 222, 12], look: { type: "lines" } },
  { tag: "div", rect: [28, 168, 222, 38], look: { type: "lines" } },
  { tag: "hr", rect: [28, 214, 372, 8], look: { type: "rule" }, label: "<hr>" },
  { tag: "section", rect: [28, 228, 372, 104] },
  { tag: "h2", rect: [28, 228, 372, 16], look: { type: "title", word: "places", size: 14 } },
  { tag: "ul", rect: [28, 250, 172, 58], label: "<ul>" },
  { tag: "li", rect: [32, 252, 164, 8], look: { type: "bullet", width: 78 } },
  { tag: "li", rect: [32, 261.5, 164, 8], look: { type: "bullet", width: 112 } },
  { tag: "li", rect: [32, 271, 164, 8], look: { type: "bullet", width: 64 } },
  { tag: "li", rect: [32, 280.5, 164, 8], look: { type: "bullet", width: 130 } },
  { tag: "li", rect: [32, 290, 164, 8], look: { type: "bullet", width: 56 } },
  { tag: "li", rect: [32, 299.5, 164, 8], look: { type: "bullet", width: 94 } },
  { tag: "div", rect: [212, 250, 188, 72] },
  { tag: "div", rect: [212, 250, 188, 46] },
  { tag: "div", rect: [212, 250, 188, 30], look: { type: "lines" } },
  { tag: "div", rect: [212, 284, 188, 10], look: { type: "lines" } },
  { tag: "div", rect: [212, 302, 188, 20], look: { type: "empty" } },
  { tag: "aside", rect: [420, 52, 192, 282], label: "<aside>" },
  { tag: "p", rect: [420, 54, 192, 30], look: { type: "lines" } },
  { tag: "iframe", rect: [420, 92, 192, 112], look: { type: "embed" }, label: "<iframe>" },
  { tag: "footer", rect: [0, 342, 640, 46], label: "<footer>" },
  { tag: "p", rect: [28, 356, 280, 8], look: { type: "lines", footer: true } },
  { tag: "div", rect: [28, 370, 120, 8], look: { type: "lines", footer: true } },
];

/** A container's own ground (header, list, park, harbor), when it has one. */
const CONTAINER_GROUND: Partial<Record<Lot["kind"], string>> = {
  gate: GROUND_COLORS.plaza,
  boulevard: GROUND_COLORS.sidewalk,
  estate: GROUND_COLORS.lawn,
  park: GROUND_COLORS.grass,
  port: GROUND_COLORS.wharf,
};

/** Colors close to the engine's, enough for the model to blend into its rendering. */
function colorsOf(lot: Lot): { body: string; top: string } {
  const r = (salt: number) => rand(lot.id, salt);
  switch (lot.kind) {
    case "monument":
      return { body: SIGNAL, top: tone(SIGNAL, 1.08) };
    case "belfry":
    case "embassy":
      return { body: STONE, top: tone(STONE, 0.92) };
    case "residence": {
      const body = pick([...BRICK, ...STUCCO, ...CONCRETE], r(1));
      return { body, top: pick(CONCRETE, r(2)) };
    }
    case "tower":
      return { body: pick(GLASS, r(1)), top: tone(pick(CONCRETE, r(2)), 0.95) };
    case "house":
      return { body: pick(HOUSES, r(1)), top: pick(ROOFS, r(2)) };
    case "vacant":
      return { body: GROUND_COLORS.dirt, top: GROUND_COLORS.dirt };
    case "river":
      return { body: WATER, top: WATER };
    default:
      return { body: CONCRETE[0], top: CONCRETE[0] };
  }
}

/** The camera of an engine image, recovered from its matrix (orthographic projection). */
function figureCamera(): Omit<DemoCamera, "ox" | "oy"> & { origin: [number, number] } {
  const origin = projectOn(HERO_FIGURE, 0, 0, 0);
  const px = projectOn(HERO_FIGURE, 1, 0, 0);
  const py = projectOn(HERO_FIGURE, 0, 1, 0);
  const pz = projectOn(HERO_FIGURE, 0, 0, 1);
  const dx = px[0] - origin[0];
  const dz = pz[0] - origin[0];
  const scale = Math.hypot(dx, dz);
  return {
    theta: Math.atan2(-dz, dx),
    elevation: Math.acos((origin[1] - py[1]) / scale),
    scale,
    origin,
  };
}

export function demoCity(): DemoCity {
  const city = layoutCity(HERO_SAMPLE);
  if (city.lots.length !== PAGE.length || city.lots.some((lot, i) => lot.node.tag !== PAGE[i].tag)) {
    throw new Error("The demo page no longer matches HERO_SAMPLE");
  }

  // The engine's image, framed in the page window with a margin.
  const camera = figureCamera();
  const corners = city.lots.flatMap((lot) =>
    [0, 1].flatMap((i) =>
      [0, 1].flatMap((j) =>
        [0, 1].map((n) => projectOn(HERO_FIGURE, lot.x + i * lot.w, lot.y + j * lot.h, lot.z + n * lot.d)),
      ),
    ),
  );
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const margin = 18;
  const k = Math.min((VIEW.width - margin * 2) / (maxX - minX), (VIEW.height - margin * 2) / (maxY - minY));
  const imageX = VIEW.width / 2 - k * (minX + maxX) / 2;
  const imageY = VIEW.height / 2 - k * (minY + maxY) / 2;
  const final: DemoCamera = {
    theta: camera.theta,
    elevation: camera.elevation,
    scale: camera.scale * k,
    ox: imageX + camera.origin[0] * k,
    oy: imageY + camera.origin[1] * k,
  };
  const body = city.lots[0];
  const plan: DemoCamera = {
    theta: 0,
    elevation: Math.PI / 2,
    scale: (VIEW.height - 48) / body.d,
    ox: VIEW.width / 2 - ((body.x + body.w / 2) * (VIEW.height - 48)) / body.d,
    oy: VIEW.height / 2 - ((body.z + body.d / 2) * (VIEW.height - 48)) / body.d,
  };

  const lots: DemoLot[] = city.lots.map((lot, i) => {
    const entry = PAGE[i];
    const [x, y, w, h] = entry.rect;
    const page: PageRect = { x, y, w, h };
    const { body: color, top } = colorsOf(lot);
    return {
      tag: lot.node.tag,
      page,
      look: entry.look ?? { type: "none" },
      label: entry.label,
      x: lot.x,
      y: lot.y,
      z: lot.z,
      w: lot.w,
      h: lot.h,
      d: lot.d,
      top,
      west: tone(color, 0.9),
      south: tone(color, 0.74),
      rank: 0,
      panel:
        lot.hung && lot.node.img && (lot.panel?.mount === "west" || lot.panel?.mount === "south")
          ? { src: lot.node.img.src, mount: lot.panel.mount }
          : undefined,
    };
  });

  const isBuilding = (lot: Lot) => !lot.container && !lot.hung;
  const buildings = city.lots.map((lot, i) => ({ lot, demo: lots[i] })).filter(({ lot }) => isBuilding(lot));
  // From lowest to highest: the monument rises from the ground last.
  [...buildings].sort((a, b) => a.lot.h - b.lot.h).forEach(({ demo }, rank) => (demo.rank = rank));
  // From back to front, seen from the southwest: the east and the north first.
  buildings.sort((a, b) => b.lot.x + b.lot.w / 2 - (b.lot.z + b.lot.d / 2) - (a.lot.x + a.lot.w / 2 - (a.lot.z + a.lot.d / 2)));

  const slab = (rect: { x: number; z: number; w: number; d: number }, y: number, color: string): DemoSlab => ({
    x: rect.x,
    z: rect.z,
    w: rect.w,
    d: rect.d,
    y,
    color,
  });
  const ground = [
    ...city.plates.map((plate) => slab(plate, plate.y + plate.h, GROUND_COLORS[plate.style])),
    ...city.lots
      .filter((lot) => lot.container && lot.h > 0 && CONTAINER_GROUND[lot.kind])
      .map((lot) => slab(lot, lot.y + lot.h, CONTAINER_GROUND[lot.kind]!)),
  ];

  const monument = city.lots.find((lot) => lot.kind === "monument")!;
  return {
    buildings: buildings.map(({ demo }) => demo),
    containers: lots.filter((_, i) => i > 0 && city.lots[i].container),
    panels: lots.filter((lot) => lot.panel),
    base: slab(body, body.y + body.h, GROUND_COLORS.base),
    ground,
    plan,
    final,
    image: { src: HERO_FIGURE.src, x: imageX, y: imageY, width: HERO_FIGURE.width * k, height: HERO_FIGURE.height * k },
    hover: viewPoint(final, monument.x + monument.w / 2, monument.y + monument.h * 0.42, monument.z + monument.d / 2),
  };
}
