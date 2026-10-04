/**
 * The HTML → city dictionary.
 *
 * Each kept element becomes a "kind": a district, a building,
 * a monument... The colors follow the spirit of a zoning map:
 * neutral tones, and vivid touches for what matters.
 */

/** Tags kept during capture. The others are transparent: their text moves up to the kept parent. */
export const KEPT_TAGS = new Set([
  "body", "main", "header", "footer", "nav", "aside", "section", "article", "div",
  "p", "blockquote", "pre", "details", "dialog",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "form",
  "img", "video", "canvas", "iframe", "svg", "hr",
  "button", "input", "textarea", "select",
]);

/** Tags whose text and children are not read. */
export const SKIPPED_TAGS = new Set([
  "script", "style", "noscript", "template", "link", "meta", "head", "base", "title",
]);

/** Kept tags that never have children in the city. */
export const LEAF_TAGS = new Set([
  "img", "video", "canvas", "iframe", "svg", "hr", "button", "input", "textarea", "select",
]);

/** Headings whose text is kept (to engrave them on the monuments). */
export const HEADING_TEXT_TAGS = new Set(["h1", "h2", "h3"]);

export type Kind =
  // Containers (a base to build on)
  | "terrain" | "district" | "block" | "boulevard" | "gate" | "port" | "park"
  | "estate" | "townhall" | "fields"
  // Buildings
  | "tower" | "vacant" | "residence" | "house" | "gallery" | "monument" | "belfry" | "kiosk"
  | "bollard" | "billboard" | "ruin" | "screen" | "embassy" | "sculpture" | "counter"
  // Infrastructure
  | "river"
  // Outside the walls: not an element, the whole page (its links to other sites)
  | "airport"
  // The ambiance: what the page does without showing it (scripts, trackers, comments, weight)
  | "factory" | "camera" | "graffiti" | "weather";

export function kindOf(tag: string, isContainer: boolean, text: number): Kind {
  if (isContainer) {
    switch (tag) {
      case "body": return "terrain";
      case "section": case "article": case "main": return "district";
      case "nav": return "boulevard";
      case "header": return "gate";
      case "footer": return "port";
      case "aside": return "park";
      case "ul": case "ol": return "estate";
      case "form": return "townhall";
      case "table": return "fields";
      default: return "block";
    }
  }
  switch (tag) {
    case "h1": return "monument";
    case "h2": return "belfry";
    case "h3": return "kiosk";
    case "h4": case "h5": case "h6": return "bollard";
    case "p": case "blockquote": case "pre": case "details": case "dialog": return "residence";
    case "li": return "house";
    case "img": return "billboard";
    case "video": case "canvas": return "screen";
    case "iframe": return "embassy";
    case "svg": return "sculpture";
    case "button": case "input": case "textarea": case "select": return "counter";
    case "hr": return "river";
    case "table": return "fields";
    case "ul": case "ol": return "estate";
    case "aside": return "park";
    default: return text > 0 ? "tower" : "vacant";
  }
}

export type KindGroup = "districts" | "buildings" | "monuments" | "facilities" | "nature" | "ambiance";

/** The legend group and the color of each kind. Its name, tags and sentence: src/i18n/messages/kinds.ts. */
export interface KindInfo {
  color: string;
  group: KindGroup;
}

export const KINDS: Record<Kind, KindInfo> = {
  terrain:   { group: "districts",  color: "#4A4B51" },
  district:  { group: "districts",  color: "#CDC7BA" },
  block:     { group: "districts",  color: "#D6D0C3" },
  boulevard: { group: "nature",     color: "#DDD5C3" },
  gate:      { group: "districts",  color: "#D8CCB0" },
  port:      { group: "districts",  color: "#4F88A6" },
  park:      { group: "nature",     color: "#7C9D57" },
  estate:    { group: "districts",  color: "#91B264" },
  townhall:  { group: "facilities", color: "#C9C1AE" },
  fields:    { group: "nature",     color: "#B8B25F" },
  tower:     { group: "buildings",  color: "#7F9BAB" },
  vacant:    { group: "buildings",  color: "#A88F6B" },
  residence: { group: "buildings",  color: "#E3C9A6" },
  gallery:   { group: "buildings",  color: "#4A4F58" },
  house:     { group: "buildings",  color: "#F0E2C4" },
  monument:  { group: "monuments",  color: "#FF4B12" },
  belfry:    { group: "monuments",  color: "#5C8F80" },
  kiosk:     { group: "monuments",  color: "#C4683F" },
  bollard:   { group: "monuments",  color: "#6D5D45" },
  billboard: { group: "facilities", color: "#2B2B31" },
  ruin:      { group: "ambiance",   color: "#8A7F72" },
  screen:    { group: "facilities", color: "#1E1E24" },
  embassy:   { group: "facilities", color: "#EFE8DA" },
  sculpture: { group: "facilities", color: "#E2549A" },
  counter:   { group: "facilities", color: "#3657E0" },
  river:     { group: "nature",     color: "#4F88A6" },
  airport:   { group: "nature",     color: "#8E9197" },
  factory:   { group: "ambiance",   color: "#9A4A37" },
  camera:    { group: "ambiance",   color: "#2B2D31" },
  graffiti:  { group: "ambiance",   color: "#7A3FB0" },
  weather:   { group: "ambiance",   color: "#8FA3B5" },
};

export const HIGHLIGHT_COLOR = "#FFD23F";

export const LEGEND_GROUPS: KindGroup[] = ["districts", "buildings", "monuments", "facilities", "nature", "ambiance"];
