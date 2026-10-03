import { preload } from "react-dom";
import { layoutCity, type CityLayout, type Lot } from "@/city/layout";
import type { CityDoc } from "@/format/types";
import { projectOn, type FigureMeta } from "./figureMeta";

export interface FigureAnnotation {
  match: (lot: Lot) => boolean;
  tag: string;
  name: string;
  /** Le point visé, quand ce n'est pas le sommet du lot (l'arc d'une porte au milieu de sa place). */
  at?: (lot: Lot, city: CityLayout) => [number, number, number] | undefined;
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
 * Une ville rendue par le vrai moteur 3D (une image, voir `figureMeta.ts`), annotée comme une
 * planche : des repères relient les éléments à leur balise. Les repères sont placés par
 * l'urbanisme de la page, projetés avec la caméra de l'image.
 */
export function CityFigure({
  doc,
  figure,
  annotations = [],
  className,
  title,
}: {
  doc: CityDoc;
  figure: FigureMeta;
  annotations?: FigureAnnotation[];
  className?: string;
  title: string;
}) {
  const { width, height } = figure;
  // L'image est dans un SVG : le navigateur ne la découvrirait qu'en le lisant.
  preload(figure.src, { as: "image", fetchPriority: "high" });
  const city = annotations.length > 0 ? layoutCity(doc) : null;
  const fontSize = width * 0.024;
  const labelX = width + width * 0.06;
  const anchors = annotations
    .map((note) => {
      const lot = city?.lots.find(note.match);
      if (!city || !lot) return null;
      const point = note.at?.(lot, city) ?? [lot.x + lot.w / 2, lot.y + lot.h, lot.z + lot.d / 2];
      const [x, py] = projectOn(figure, ...point);
      return { note, x, y: py };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.y - b.y);

  const { placed, bottom: labelsBottom } = stackLabels(anchors, fontSize, fontSize * 2.4);
  const bottom = Math.max(height, labelsBottom);
  // Police à chasse fixe (Martian Mono, large) : environ 0,75 corps par signe, interlettre comprise.
  const longest = Math.max(0, ...anchors.map((a) => a.note.tag.length + 3 + a.note.name.length));
  const labelWidth = anchors.length > 0 ? width * 0.06 + longest * fontSize * 0.76 : 0;
  const pad = width * 0.01;
  const viewBox = [-pad, -pad, width + labelWidth + pad * 2, bottom + pad * 2].map((v) => v.toFixed(1)).join(" ");

  return (
    <svg className={className} viewBox={viewBox} role="img" aria-label={title}>
      <image href={figure.src} x={0} y={0} width={width} height={height} />
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
            <tspan fill="#15151a" dx={fontSize * 0.5}>
              {note.name.toUpperCase()}
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}
