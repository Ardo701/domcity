/**
 * Le dictionnaire HTML → ville.
 *
 * Chaque élément gardé devient un « genre » (kind) : un quartier, un immeuble,
 * un monument… Les couleurs reprennent l'esprit d'un plan de zonage :
 * des tons neutres, et des pointes vives pour ce qui compte.
 */

/** Balises gardées pendant la capture. Les autres sont transparentes : leur texte remonte au parent gardé. */
export const KEPT_TAGS = new Set([
  "body", "main", "header", "footer", "nav", "aside", "section", "article", "div",
  "p", "blockquote", "pre", "details", "dialog",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "form",
  "img", "video", "canvas", "iframe", "svg", "hr",
  "button", "input", "textarea", "select",
]);

/** Balises dont on ne lit ni le texte ni les enfants. */
export const SKIPPED_TAGS = new Set([
  "script", "style", "noscript", "template", "link", "meta", "head", "base", "title",
]);

/** Balises gardées qui n'ont jamais d'enfants dans la ville. */
export const LEAF_TAGS = new Set([
  "img", "video", "canvas", "iframe", "svg", "hr", "button", "input", "textarea", "select",
]);

/** Titres dont on garde le texte (pour les graver sur les monuments). */
export const HEADING_TEXT_TAGS = new Set(["h1", "h2", "h3"]);

export type Kind =
  // Conteneurs (un socle sur lequel on construit)
  | "terrain" | "district" | "block" | "boulevard" | "gate" | "port" | "park"
  | "estate" | "townhall" | "fields"
  // Bâtiments
  | "tower" | "vacant" | "residence" | "house" | "monument" | "belfry" | "kiosk"
  | "bollard" | "billboard" | "screen" | "embassy" | "sculpture" | "counter"
  // Infrastructures
  | "river";

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

export interface KindInfo {
  /** Nom dans la ville. */
  name: string;
  /** Balises d'origine, pour la légende. */
  tags: string;
  /** Une phrase courte pour la légende et l'inspecteur. */
  blurb: string;
  color: string;
  group: "Quartiers" | "Bâtiments" | "Monuments" | "Équipements" | "Nature et réseaux";
}

export const KINDS: Record<Kind, KindInfo> = {
  terrain:   { name: "Terrain",            tags: "body",                group: "Quartiers",        color: "#E3DDD0", blurb: "Le sol de la ville. Tout le reste est bâti dessus." },
  district:  { name: "Quartier",           tags: "section · article · main", group: "Quartiers", color: "#D6CDB9", blurb: "Une partie de la page. Plus on s'enfonce dans la page, plus le quartier monte." },
  block:     { name: "Îlot",               tags: "div (avec enfants)",  group: "Quartiers",        color: "#DAD2C1", blurb: "Un bloc qui regroupe d'autres éléments." },
  boulevard: { name: "Périphérique",       tags: "nav",                 group: "Nature et réseaux", color: "#3B3B42", blurb: "Le menu de navigation, en asphalte." },
  gate:      { name: "Porte de la ville",  tags: "header",              group: "Quartiers",        color: "#B7AC96", blurb: "L'en-tête, par où l'on entre." },
  port:      { name: "Port",               tags: "footer",              group: "Quartiers",        color: "#9DB0C2", blurb: "Le pied de page, au bord de l'eau." },
  park:      { name: "Parc",               tags: "aside",               group: "Nature et réseaux", color: "#9DBE7E", blurb: "Le contenu secondaire, planté d'arbres." },
  estate:    { name: "Lotissement",        tags: "ul · ol",             group: "Quartiers",        color: "#CBD5A6", blurb: "Une liste : des maisons alignées." },
  townhall:  { name: "Mairie",             tags: "form",                group: "Équipements",      color: "#B9C4EA", blurb: "Un formulaire, là où l'on remplit des papiers." },
  fields:    { name: "Champs",             tags: "table",               group: "Nature et réseaux", color: "#C9CF6E", blurb: "Un tableau, cultivé en rangées." },
  tower:     { name: "Immeuble",           tags: "div",                 group: "Bâtiments",        color: "#D3D1CB", blurb: "Un bloc de contenu. Sa hauteur suit la quantité de texte." },
  vacant:    { name: "Terrain vague",      tags: "div (vide)",          group: "Bâtiments",        color: "#ECE4D3", blurb: "Un élément sans texte ni enfant. Du balisage pour rien." },
  residence: { name: "Habitation",         tags: "p · blockquote · pre", group: "Bâtiments",       color: "#E8C891", blurb: "Un paragraphe. Plus il est long, plus il a d'étages." },
  house:     { name: "Maison",             tags: "li",                  group: "Bâtiments",        color: "#EFE6D6", blurb: "Un élément de liste, avec son toit." },
  monument:  { name: "Monument",           tags: "h1",                  group: "Monuments",        color: "#FF4B12", blurb: "Le titre principal, gravé au sommet." },
  belfry:    { name: "Beffroi",            tags: "h2",                  group: "Monuments",        color: "#FF7B47", blurb: "Un titre de partie. Il nomme son quartier." },
  kiosk:     { name: "Kiosque",            tags: "h3",                  group: "Monuments",        color: "#F5A26F", blurb: "Un sous-titre, plus modeste." },
  bollard:   { name: "Borne",              tags: "h4 · h5 · h6",        group: "Monuments",        color: "#EDB896", blurb: "Un petit titre." },
  billboard: { name: "Panneau",            tags: "img",                 group: "Équipements",      color: "#2B2B31", blurb: "Une image du site, affichée sur un panneau." },
  screen:    { name: "Écran géant",        tags: "video · canvas",      group: "Équipements",      color: "#1E1E24", blurb: "Une vidéo ou une zone de dessin." },
  embassy:   { name: "Ambassade",          tags: "iframe",              group: "Équipements",      color: "#6C55D1", blurb: "Un autre site, enclavé dans celui-ci." },
  sculpture: { name: "Sculpture",          tags: "svg",                 group: "Équipements",      color: "#E2549A", blurb: "Une illustration vectorielle." },
  counter:   { name: "Guichet",            tags: "button · input · select", group: "Équipements",  color: "#3657E0", blurb: "Un bouton ou un champ à remplir." },
  river:     { name: "Rivière",            tags: "hr",                  group: "Nature et réseaux", color: "#2F6BFF", blurb: "Une ligne de séparation. Elle coupe le quartier en deux." },
};

/** Teintes hypsométriques : les socles changent de couleur avec l'altitude (la profondeur dans la page). */
export const ALTITUDE_TINTS = [
  "#E0D9CA", "#D6CDB9", "#CCC0A6", "#C3B293", "#BBA383",
  "#B39475", "#A9856A", "#9E7862", "#E9E4DA", "#F3F0E8",
];

export const ROOF_COLOR = "#C65A3E";
export const TREE_COLOR = "#4F7D3A";
export const HIGHLIGHT_COLOR = "#FFD23F";

export const LEGEND_GROUPS: KindInfo["group"][] = [
  "Quartiers", "Bâtiments", "Monuments", "Équipements", "Nature et réseaux",
];
