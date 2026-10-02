/**
 * Format d'une ville DOMCity (version 1).
 *
 * C'est la « photo » d'une page : sa structure, jamais son texte complet.
 * Le même format sort de la capture Wikipédia, du bookmarklet, et sera
 * stocké tel quel (gzip) dans R2.
 */

export const FORMAT_VERSION = 1 as const;

export type CaptureSource = "wikipedia" | "bookmarklet";

export interface CityImage {
  /** URL absolue de l'image (jamais l'image elle-même). */
  src: string;
  alt?: string;
  /** Dimensions affichées ou déclarées, pour garder les proportions du panneau. */
  w?: number;
  h?: number;
}

export interface CityLinks {
  /** Liens vers une page du même site. */
  internal: number;
  /** Liens vers un autre site. */
  external: number;
}

export interface CityNode {
  /** Nom de balise en minuscules : "div", "section", "img"… */
  tag: string;
  /** Nombre de caractères de texte propres à l'élément (hors enfants gardés). */
  text?: number;
  /** Texte des titres h1 à h3 uniquement, raccourci. */
  heading?: string;
  /** id lisible ou première classe, pour reconnaître l'élément. */
  label?: string;
  img?: CityImage;
  links?: CityLinks;
  /** Position sur la page réelle [x, y, largeur, hauteur], quand on la connaît (bookmarklet). */
  rect?: [number, number, number, number];
  children?: CityNode[];
}

export interface CityDoc {
  format: typeof FORMAT_VERSION;
  source: CaptureSource;
  /** URL normalisée de la page (sans ?query ni #ancre). */
  url: string;
  title: string;
  /** Date ISO du relevé. */
  capturedAt: string;
  lang?: string;
  root: CityNode;
}
