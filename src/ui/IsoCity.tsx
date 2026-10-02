import { layoutCity, type Lot } from "@/city/layout";
import { ALTITUDE_TINTS, KINDS, ROOF_COLOR } from "@/format/taxonomy";
import type { CityDoc } from "@/format/types";
import { isoBox, project, type IsoFace } from "./iso";

export interface IsoAnnotation {
  match: (lot: Lot) => boolean;
  tag: string;
  name: string;
}

function colorOf(lot: Lot): string {
  if (lot.container && (lot.kind === "district" || lot.kind === "block" || lot.kind === "terrain")) {
    return lot.depth === 0 ? KINDS.terrain.color : ALTITUDE_TINTS[Math.min(lot.depth, ALTITUDE_TINTS.length - 1)];
  }
  return KINDS[lot.kind].color;
}

function facesOf(lot: Lot): IsoFace[] {
  const color = colorOf(lot);
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
  return isoBox(lot.x, lot.y, lot.z, lot.w, lot.h, lot.d, color, {
    top: lot.kind === "house" ? ROOF_COLOR : undefined,
  });
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
  const { lots } = layoutCity(doc);
  const depthOf = (lot: Lot) => lot.x + lot.w / 2 + lot.z + lot.d / 2;
  const slabs = lots.filter((l) => l.container).sort((a, b) => a.y - b.y || depthOf(a) - depthOf(b));
  const leaves = lots.filter((l) => !l.container).sort((a, b) => depthOf(a) - depthOf(b) || a.y - b.y);
  const faces = [...slabs, ...leaves].flatMap(facesOf);

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
