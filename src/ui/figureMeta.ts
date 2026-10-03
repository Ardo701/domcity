import type { CityLayout } from "@/city/layout";

/**
 * Les figures de la planche (l'accueil, la page Installer) sont de vraies images du moteur 3D,
 * rendues en développement (/dev/figure) et versionnées : la page reste légère, sans Three.js.
 * Elles sont accompagnées de la matrice de leur caméra, pour poser les repères au bon endroit,
 * et de l'empreinte de l'urbanisme qu'elles montrent : un test échoue si le moteur a changé
 * depuis (il faut alors régénérer l'image).
 */
export interface FigureMeta {
  src: string;
  width: number;
  height: number;
  /** Projection de la caméra (vue × projection, en colonnes, comme Three.js). */
  matrix: readonly number[];
  /** Empreinte de l'urbanisme rendu (`figureKey`). */
  layout: string;
}

/** Empreinte (FNV-1a, 32 bits) de ce que l'urbanisme a placé : lots, rues, sols. */
export function figureKey(layout: CityLayout): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  const parts = [
    ...layout.lots.map((l) => [l.kind, l.x, l.y, l.z, l.w, l.h, l.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
    ...layout.roads.map((r) => [r.style, r.x, r.z, r.w, r.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
    ...layout.plates.map((p) => [p.style, p.x, p.z, p.w, p.d].map((v) => (typeof v === "number" ? round(v) : v)).join(",")),
  ];
  const text = parts.join(";");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Un point de la ville sur l'image, en pixels. */
export function projectOn(figure: Pick<FigureMeta, "matrix" | "width" | "height">, x: number, y: number, z: number): [number, number] {
  const m = figure.matrix;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return [((nx + 1) / 2) * figure.width, ((1 - ny) / 2) * figure.height];
}
