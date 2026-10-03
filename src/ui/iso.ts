/**
 * Axonometric (isometric) drawing in SVG: the graphic language of DOMCity
 * outside the 3D. Boxes outlined with an ink line, flat-shaded faces,
 * as on an architect's drawing sheet.
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
  /** Color of the top face, if it differs (roof). */
  top?: string;
}

/** The three visible faces of a box: top, right side (+x), left side (+z). */
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
