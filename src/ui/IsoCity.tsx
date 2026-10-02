import { BASE, CURB, WATER_DEPTH, cutRect, layoutCity, type Airport, type Lot, type Rect } from "@/city/layout";
import { BRICK, CONCRETE, COPPER, GLASS, GROUND_COLORS, HOUSES, ROOFS, STUCCO, WATER, pick, rand } from "@/city/palette";
import { KINDS } from "@/format/taxonomy";
import type { CityDoc } from "@/format/types";
import { isoBox, project, type IsoFace } from "./iso";

export interface IsoAnnotation {
  match: (lot: Lot) => boolean;
  tag: string;
  name: string;
}

/** L'aéroport hors les murs, au trait : socle, pelouse, tarmac, pistes, terminal et tour. */
function airportFaces(a: Airport, roads: Rect[]): { ground: IsoFace[]; buildings: IsoFace[] } {
  let lawn: Rect[] = [a];
  for (const road of roads) lawn = lawn.flatMap((piece) => cutRect(piece, road));
  const t = a.terminal;
  return {
    ground: [
      ...isoBox(a.x, 0, a.z, a.w, BASE, a.d, GROUND_COLORS.base),
      ...lawn.flatMap((p) => isoBox(p.x, BASE, p.z, p.w, CURB, p.d, GROUND_COLORS.grass)),
      ...isoBox(a.apron.x, a.y, a.apron.z, a.apron.w, 0.03, a.apron.d, GROUND_COLORS.sidewalk),
      ...[...a.taxiways, ...a.runways].flatMap((r) => isoBox(r.x, a.y, r.z, r.w, 0.03, r.d, "#3b3c41")),
    ],
    buildings: [
      ...isoBox(t.x, a.y, t.z, t.w, 2.6, t.d, GLASS[0]),
      ...isoBox(a.tower.x + 0.5, a.y, a.tower.z + 0.5, 1.4, 10, 1.4, "#e2dccf"),
      ...isoBox(a.tower.x, a.y + 10, a.tower.z, a.tower.w, 1.4, a.tower.d, "#6f93a8"),
    ],
  };
}

const CONTAINER_GROUND: Partial<Record<Lot["kind"], keyof typeof GROUND_COLORS>> = {
  park: "grass", estate: "lawn", townhall: "plaza", gate: "plaza", boulevard: "plaza", fields: "crops", port: "wharf",
};

/** La couleur dominante d'un bâtiment, tirée comme dans la 3D. */
function buildingColor(lot: Lot): string {
  switch (lot.kind) {
    case "tower":
      return lot.h >= 20 ? pick(GLASS, rand(lot.id, 2)) : rand(lot.id, 2) < 0.5 ? pick(CONCRETE, rand(lot.id, 3)) : pick(BRICK, rand(lot.id, 3));
    case "residence":
      return rand(lot.id, 2) < 0.38 ? pick(BRICK, rand(lot.id, 3)) : pick(STUCCO, rand(lot.id, 3));
    case "house":
      return pick(HOUSES, rand(lot.id, 2));
    case "monument":
    case "embassy":
      return "#e6ddc9";
    case "belfry":
      return "#d8cbb0";
    default:
      return KINDS[lot.kind].color;
  }
}

function facesOf(lot: Lot): IsoFace[] {
  if (lot.container) {
    if (lot.depth === 0) return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, GROUND_COLORS.base);
    const ground = CONTAINER_GROUND[lot.kind];
    return ground && lot.h > 0 ? isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, GROUND_COLORS[ground]) : [];
  }
  if (lot.kind === "river") return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, WATER);
  if (lot.panel?.emblem) {
    // Panonceau sur son poteau, ou drapeau en haut de son mât (sans l'icône : le dessin reste au trait).
    const { width, height, lift, emblem } = lot.panel;
    const cz = lot.z + lot.d / 2;
    const pole = emblem === "flag" ? lot.x : lot.x + lot.w / 2;
    return [
      ...isoBox(pole - 0.05, lot.y, cz - 0.05, 0.1, lift + height, 0.1, "#8e9197"),
      ...isoBox(emblem === "flag" ? lot.x + 0.05 : lot.x, lot.y + lift, cz - 0.02, width, height, 0.04, "#f4f1ea"),
    ];
  }
  if (lot.panel) {
    const { width, height, lift } = lot.panel;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    return [
      ...isoBox(cx - width * 0.32 - 0.15, lot.y, cz - 0.15, 0.3, lift, 0.3, "#55555c"),
      ...isoBox(cx + width * 0.32 - 0.15, lot.y, cz - 0.15, 0.3, lift, 0.3, "#55555c"),
      ...isoBox(lot.x, lot.y + lift, lot.z, width, height, lot.d, "#2b2b31"),
    ];
  }
  const color = buildingColor(lot);
  if (lot.kind === "house") {
    return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, color, { top: pick(ROOFS, rand(lot.id, 3)) });
  }
  if (lot.kind === "monument") {
    const s = lot.w;
    return [
      ...isoBox(lot.x, lot.y, lot.z, s, lot.h * 0.62, s, color),
      ...isoBox(lot.x + s * 0.2, lot.y + lot.h * 0.62, lot.z + s * 0.2, s * 0.6, lot.h * 0.26, s * 0.6, color),
      ...isoBox(lot.x + s * 0.33, lot.y + lot.h * 0.88, lot.z + s * 0.33, s * 0.34, lot.h * 0.12, s * 0.34, "#ff4b12"),
    ];
  }
  if (lot.kind === "belfry") {
    return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, color, { top: COPPER });
  }
  return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, color);
}

/** Empile les étiquettes de haut en bas, sans chevauchement. */
function stackLabels<T extends { y: number }>(anchors: T[], start: number, gap: number) {
  const placed: Array<T & { labelY: number }> = [];
  let cursor = start;
  for (const anchor of anchors) {
    const labelY = Math.max(anchor.y, cursor);
    cursor = labelY + gap;
    placed.push({ ...anchor, labelY });
  }
  return { placed, bottom: cursor };
}

/**
 * Une ville dessinée en axonométrie par le vrai moteur d'urbanisme,
 * annotée comme une planche : des repères relient les éléments à leur balise.
 */
export function IsoCity({
  doc,
  annotations = [],
  className,
  title,
}: {
  doc: CityDoc;
  annotations?: IsoAnnotation[];
  className?: string;
  title: string;
}) {
  const { lots, plates, channels, roads, airport } = layoutCity(doc);
  const field = airport ? airportFaces(airport, roads) : { ground: [], buildings: [] };
  const depthOf = (r: { x: number; z: number; w: number; d: number }) => r.x + r.w / 2 + r.z + r.d / 2;
  // Le sol d'abord (socle, places, trottoirs, eau), puis les bâtiments du fond vers l'avant.
  const grounds = [
    ...lots.filter((l) => l.container || l.kind === "river").map((lot) => ({ y: lot.y, depth: depthOf(lot), faces: facesOf(lot) })),
    ...plates.map((p) => ({ y: p.y, depth: depthOf(p), faces: isoBox(p.x, p.y, p.z, p.w, p.h, p.d, GROUND_COLORS[p.style]) })),
    ...channels.map((c) => ({ y: c.y, depth: depthOf(c), faces: isoBox(c.x, c.y, c.z, c.w, WATER_DEPTH, c.d, WATER) })),
  ].sort((a, b) => a.y - b.y || a.depth - b.depth);
  const leaves = lots.filter((l) => !l.container && l.kind !== "river").sort((a, b) => depthOf(a) - depthOf(b) || a.y - b.y);
  const faces = [...field.ground, ...grounds.flatMap((g) => g.faces), ...leaves.flatMap(facesOf), ...field.buildings];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const face of faces) {
    for (const pair of face.points.split(" ")) {
      const [x, y] = pair.split(",").map(Number);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const span = maxX - minX;
  const fontSize = span * 0.03;
  const labelX = maxX + span * 0.06;
  const anchors = annotations
    .map((note) => {
      const lot = lots.find(note.match);
      if (!lot) return null;
      const [x, y] = project(lot.x + lot.w / 2, lot.y + lot.h, lot.z + lot.d / 2);
      return { note, x, y };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.y - b.y);

  const { placed, bottom: labelsBottom } = stackLabels(anchors, minY + fontSize, fontSize * 2.6);
  const bottom = Math.max(maxY, labelsBottom);
  const labelWidth = anchors.length ? span * 0.42 : 0;
  const pad = span * 0.03;
  const viewBox = [minX - pad, minY - pad, maxX - minX + labelWidth + span * 0.08 + pad * 2, bottom - minY + pad * 2]
    .map((v) => v.toFixed(1))
    .join(" ");

  return (
    <svg className={className} viewBox={viewBox} role="img" aria-label={title}>
      <g strokeLinejoin="round">
        {faces.map((face, i) => (
          <polygon
            key={i}
            points={face.points}
            fill={face.fill}
            stroke="#15151a"
            strokeOpacity={0.75}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      {placed.map(({ note, x, y, labelY }, i) => (
        <g key={i}>
          <polyline
            points={`${x},${y} ${labelX - fontSize * 2},${labelY} ${labelX - fontSize * 0.6},${labelY}`}
            fill="none"
            stroke="#15151a"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={x} cy={y} r={fontSize * 0.28} fill="#ffd23f" stroke="#15151a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text
            x={labelX}
            y={labelY}
            dominantBaseline="middle"
            fontFamily="var(--mono)"
            fontSize={fontSize}
            letterSpacing={fontSize * 0.04}
          >
            <tspan fill="#c73a08" fontWeight={600}>{`<${note.tag}>`}</tspan>
            <tspan fill="#15151a" dx={fontSize * 0.5}>{note.name.toUpperCase()}</tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
