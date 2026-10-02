/**
 * Dessin axonométrique (isométrique) en SVG : le langage graphique de DOMCity
 * hors de la 3D. Boîtes cernées d'un trait d'encre, faces ombrées à plat,
 * comme sur une planche d'architecte.
 */

const COS30 = Math.cos(Math.PI / 6);

export function project(x: number, y: number, z: number): [number, number] {
  return [(x - z) * COS30, (x + z) * 0.5 - y];
}

export function shade(hex: string, factor: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => Math.min(255, Math.round(((value >> shift) & 255) * factor));
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

export interface IsoFace {
  points: string;
  fill: string;
}

export interface IsoBoxOptions {
  /** Couleur de la face du dessus, si elle diffère (toit). */
  top?: string;
}

/** Les trois faces visibles d'une boîte : dessus, flanc droit (+x), flanc gauche (+z). */
export function isoBox(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  options: IsoBoxOptions = {},
): IsoFace[] {
  const pts = (corners: Array<[number, number, number]>) =>
    corners
      .map(([a, b, c]) => project(a, b, c))
      .map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`)
      .join(" ");

  return [
    {
      points: pts([
        [x + w, y, z],
        [x + w, y, z + d],
        [x + w, y + h, z + d],
        [x + w, y + h, z],
      ]),
      fill: shade(color, 0.7),
    },
    {
      points: pts([
        [x, y, z + d],
        [x + w, y, z + d],
        [x + w, y + h, z + d],
        [x, y + h, z + d],
      ]),
      fill: shade(color, 0.86),
    },
    {
      points: pts([
        [x, y + h, z],
        [x + w, y + h, z],
        [x + w, y + h, z + d],
        [x, y + h, z + d],
      ]),
      fill: options.top ?? color,
    },
  ];
}
