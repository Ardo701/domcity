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
  /** Image cassée dans la page au moment du relevé (le navigateur n'a pas pu l'afficher). Favori. */
  broken?: true;
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
  /** Couleur de fond réelle (#rrggbb), seulement quand elle change par rapport au parent (bookmarklet). */
  bg?: string;
  children?: CityNode[];
}

/** Ce que l'on sait de la page entière quand elle est relevée dans le navigateur (bookmarklet). */
export interface CityPage {
  /** Nombre d'éléments HTML du document, avant tri : le vrai poids du DOM. */
  domSize?: number;
  /** Balises <script>. */
  scripts?: number;
  /** Commentaires laissés dans le HTML. */
  comments?: number;
  /** Ressources chargées (images, scripts, requêtes…), au moins : le navigateur n'en retient qu'une partie. */
  resources?: number;
  /** Octets transférés connus, au moins : les autres sites cachent souvent la taille de leurs fichiers. */
  bytes?: number;
  /** Hôtes des ressources venues d'autres sites, du plus sollicité au moins sollicité. */
  thirdParty?: string[];
  /** Couleurs réelles de la page (#rrggbb). */
  colors?: { background?: string; text?: string; link?: string };
  /** La page se déclare réservée aux adultes (balise rating) : DOMCity n'en construit pas de ville. */
  adult?: true;
}

/**
 * Où mènent les liens de la page entière : les autoroutes et les vols de la mégalopole.
 * Facultatif : les villes relevées avant ne le savent pas.
 */
export interface CityLinksTo {
  /** Empreintes des pages du même site visées (voir format/links.ts), jamais leurs adresses. */
  pages?: string[];
  /** Sites visés et nombre de liens vers chacun, du plus visé au moins visé. */
  sites?: Array<[domain: string, links: number]>;
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
  /** Faits sur la page entière (bookmarklet). */
  page?: CityPage;
  /** Pages et sites visés par les liens de la page. */
  linksTo?: CityLinksTo;
  root: CityNode;
}
