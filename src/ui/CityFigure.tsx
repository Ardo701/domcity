import { preload } from "react-dom";
import { layoutCity, type CityLayout, type Lot } from "@/city/layout";
import type { CityDoc } from "@/format/types";
import { projectOn, type FigureMeta } from "./figureMeta";

export interface FigureAnnotation {
  match: (lot: Lot) => boolean;
  tag: string;
  name: string;
  /** The targeted point, when it is not the top of the lot (the arch of a gate in the middle of its square). */
  at?: (lot: Lot, city: CityLayout) => [number, number, number] | undefined;
}

/** Stacks the labels from top to bottom, without overlap. */
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
 * A city rendered by the real 3D engine (an image, see `figureMeta.ts`), annotated like a
 * drawing sheet: markers link the elements to their tag. The markers are placed by
 * the page's urban plan, projected with the image's camera.
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
  // The image is inside an SVG: the browser would only discover it while reading it.
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
  // Monospaced font (Martian Mono, wide): about 0.75 em per character, letter spacing included.
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
