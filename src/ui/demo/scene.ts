/**
 * La démonstration du favori (page Créer une ville) : ce que le serveur prépare et ce que le navigateur anime.
 * La scène est un navigateur dessiné de 640 × 480 ; sous ses barres, la fenêtre de la page fait 640 × 388.
 */

export const SCENE = { width: 640, height: 480 };
/** Les barres du navigateur : onglets, adresse, favoris. La page commence dessous. */
export const BARS = { tabs: 32, toolbar: 34, bookmarks: 26 };
export const VIEW = { top: BARS.tabs + BARS.toolbar + BARS.bookmarks, width: 640, height: 388 };

export interface PageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** L'allure d'un élément dans la page d'exemple, avant qu'il devienne un bâtiment. */
export type Look =
  | { type: "words"; text: string }
  | { type: "title"; text: string; size: number }
  | { type: "lines"; footer?: boolean }
  | { type: "image"; src: string }
  | { type: "rule" }
  | { type: "bullet"; width: number }
  | { type: "empty" }
  | { type: "embed" }
  | { type: "none" };

/** Un élément de la page d'exemple et le lot que l'urbanisme en a fait (coordonnées de la ville). */
export interface DemoLot {
  tag: string;
  page: PageRect;
  look: Look;
  /** L'étiquette posée pendant le relevé (`<h1>`…), pour quelques éléments seulement. */
  label?: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Couleurs du dessus et des deux flancs visibles (ouest, sud). */
  top: string;
  west: string;
  south: string;
  /** Ordre de sortie de terre, du plus bas au plus haut (bâtiments seulement). */
  rank: number;
  /** Une affiche accrochée à une façade : son image et le côté où elle regarde. */
  panel?: { src: string; mount: "west" | "south" };
}

/** Un sol de la maquette : socle, trottoirs, places, pelouses, eau. */
export interface DemoSlab {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Altitude du dessus. */
  y: number;
  color: string;
}

export interface DemoCamera {
  /** Rotation autour de la verticale, en radians (0 : le nord en haut). */
  theta: number;
  /** Hauteur de vue, en radians (π/2 : vue de dessus, comme un plan). */
  elevation: number;
  /** Pixels de la scène par unité de la ville. */
  scale: number;
  /** Où tombe l'origine de la ville, dans la fenêtre de la page. */
  ox: number;
  oy: number;
}

export interface DemoCity {
  /** Les bâtiments, rangés du fond vers l'avant (ordre de dessin). */
  buildings: DemoLot[];
  /** Les conteneurs (en-tête, sections, liste…), tracés en pointillés pendant le relevé. */
  containers: DemoLot[];
  panels: DemoLot[];
  /** Le socle, puis les sols posés dessus. */
  base: DemoSlab;
  ground: DemoSlab[];
  /** Le plan vu de dessus, puis la caméra de l'image rendue par le moteur. */
  plan: DemoCamera;
  final: DemoCamera;
  image: { src: string; x: number; y: number; width: number; height: number };
  /** Le point survolé sur le monument, dans la fenêtre de la page. */
  hover: [number, number];
}

/** Un point de la ville vu par une caméra orthographique, en pixels de la fenêtre de la page. */
export function viewPoint(cam: DemoCamera, x: number, y: number, z: number): [number, number] {
  const cos = Math.cos(cam.theta);
  const sin = Math.sin(cam.theta);
  const a = x * cos - z * sin;
  const b = x * sin + z * cos;
  return [cam.ox + cam.scale * a, cam.oy + cam.scale * (b * Math.sin(cam.elevation) - y * Math.cos(cam.elevation))];
}

export function lerpCamera(from: DemoCamera, to: DemoCamera, k: number): DemoCamera {
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    theta: mix(from.theta, to.theta),
    elevation: mix(from.elevation, to.elevation),
    scale: mix(from.scale, to.scale),
    ox: mix(from.ox, to.ox),
    oy: mix(from.oy, to.oy),
  };
}

const channels = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const toHex = (rgb: number[]) =>
  `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;

/** Une couleur éclaircie (facteur > 1) ou assombrie (< 1). */
export const tone = (hex: string, factor: number) => toHex(channels(hex).map((c) => c * factor));

/** Le mélange de deux couleurs (k = 0 : la première). */
export function mixColor(a: string, b: string, k: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex(ca.map((c, i) => c + (cb[i] - c) * k));
}
