import { ROAD_COLORS } from "@/city/palette";
import { ROOF_COLOR, type Kind, KINDS } from "@/format/taxonomy";
import { isoBox } from "./iso";

const HEIGHTS: Partial<Record<Kind, number>> = {
  tower: 1.8, residence: 1.2, house: 0.8, monument: 2.2, belfry: 1.7, kiosk: 0.9,
  bollard: 0.6, billboard: 1.1, screen: 1.1, embassy: 1, sculpture: 0.9, counter: 0.6,
  vacant: 0.08, river: 0.08, fields: 0.15, airport: 0.08,
  ruin: 0.35, factory: 1, camera: 1.4, graffiti: 0.7, weather: 0.5,
};

/** Petit bloc isométrique à la couleur d'un genre, pour la légende et les fiches. */
export function KindSwatch({ kind, size = 22 }: { kind: Kind; size?: number }) {
  const info = KINDS[kind];
  const h = HEIGHTS[kind] ?? 0.3;
  const narrow = kind === "monument" || kind === "belfry" || kind === "bollard" || kind === "camera";
  const w = narrow ? 0.6 : 1;
  const offset = (1 - w) / 2;
  const faces = isoBox(offset, 0, offset, w, h, w, info.color, { top: kind === "house" ? ROOF_COLOR : undefined });
  return (
    <svg width={size} height={size} viewBox="-1.05 -2.35 2.1 3.45" aria-hidden>
      {faces.map((face, i) => (
        <polygon key={i} points={face.points} fill={face.fill} stroke="#15151a" strokeWidth={0.06} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Une dalle d'asphalte : les rues, qui ne sont pas des éléments de la page. */
export function RoadSwatch({ size = 22 }: { size?: number }) {
  const faces = isoBox(0, 0, 0, 1, 0.08, 1, ROAD_COLORS.street);
  return (
    <svg width={size} height={size} viewBox="-1.05 -2.35 2.1 3.45" aria-hidden>
      {faces.map((face, i) => (
        <polygon key={i} points={face.points} fill={face.fill} stroke="#15151a" strokeWidth={0.06} strokeLinejoin="round" />
      ))}
    </svg>
  );
}
