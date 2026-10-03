/**
 * Format of a DOMCity city (version 1).
 *
 * It is the "photo" of a page: its structure, never its full text.
 * The same format comes out of the Wikipedia capture and of the bookmarklet, and is
 * stored as is (gzip) in R2.
 */

export const FORMAT_VERSION = 1 as const;

export type CaptureSource = "wikipedia" | "bookmarklet";

export interface CityImage {
  /** Absolute URL of the image (never the image itself). */
  src: string;
  alt?: string;
  /** Displayed or declared dimensions, to keep the billboard's proportions. */
  w?: number;
  h?: number;
  /** Image broken in the page at capture time (the browser could not display it). Bookmarklet. */
  broken?: true;
  /**
   * Image from a site refused by DOMCity: its address and text were removed (empty `src`),
   * the poster says "Image masquée". Set at publishing and when a city is opened.
   */
  refused?: true;
}

export interface CityLinks {
  /** Links to a page of the same site. */
  internal: number;
  /** Links to another site. */
  external: number;
}

export interface CityNode {
  /** Lowercase tag name: "div", "section", "img"... */
  tag: string;
  /** Number of text characters of the element itself (excluding kept children). */
  text?: number;
  /** Text of h1 to h3 headings only, shortened. */
  heading?: string;
  /** Readable id or first class, to recognize the element. */
  label?: string;
  img?: CityImage;
  links?: CityLinks;
  /** Position on the real page [x, y, width, height], when known (bookmarklet). */
  rect?: [number, number, number, number];
  /** Real background color (#rrggbb), only when it changes from the parent (bookmarklet). */
  bg?: string;
  children?: CityNode[];
}

/** What is known about the whole page when it is captured in the browser (bookmarklet). */
export interface CityPage {
  /** Number of HTML elements in the document, before sorting: the real weight of the DOM. */
  domSize?: number;
  /** <script> tags. */
  scripts?: number;
  /** Comments left in the HTML. */
  comments?: number;
  /** Loaded resources (images, scripts, requests...), at least: the browser only keeps part of them. */
  resources?: number;
  /** Known transferred bytes, at least: other sites often hide the size of their files. */
  bytes?: number;
  /** Hosts of the resources coming from other sites, from most to least called. */
  thirdParty?: string[];
  /** Real colors of the page (#rrggbb). */
  colors?: { background?: string; text?: string; link?: string };
  /** The page declares itself adults only (rating tag): DOMCity builds no city for it. */
  adult?: true;
}

/**
 * Where the links of the whole page lead: the megalopolis highways and flights.
 * Optional: cities captured earlier do not know it.
 */
export interface CityLinksTo {
  /** Fingerprints of the targeted pages of the same site (see format/links.ts), never their addresses. */
  pages?: string[];
  /** Targeted sites and the number of links to each, from most to least targeted. */
  sites?: Array<[domain: string, links: number]>;
}

export interface CityDoc {
  format: typeof FORMAT_VERSION;
  source: CaptureSource;
  /** Normalized URL of the page (without ?query or #anchor). */
  url: string;
  title: string;
  /** ISO date of the capture. */
  capturedAt: string;
  lang?: string;
  /** Facts about the whole page (bookmarklet). */
  page?: CityPage;
  /** Pages and sites targeted by the page's links. */
  linksTo?: CityLinksTo;
  root: CityNode;
}
