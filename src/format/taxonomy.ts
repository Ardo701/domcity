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
  | "tower" | "vacant" | "residence" | "house" | "gallery" | "monument" | "belfry" | "kiosk"
  | "bollard" | "billboard" | "ruin" | "screen" | "embassy" | "sculpture" | "counter"
  // Infrastructures
  | "river"
  // Hors les murs : pas un élément, toute la page (ses liens vers d'autres sites)
  | "airport"
  // L'ambiance : ce que la page fait sans le montrer (scripts, traqueurs, commentaires, poids)
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

export interface KindInfo {
  /** Nom dans la ville. */
  name: string;
  /** Balises d'origine, pour la légende. */
  tags: string;
  /** Une phrase courte pour la légende et l'inspecteur. */
  blurb: string;
  color: string;
  group: "Quartiers" | "Bâtiments" | "Monuments" | "Équipements" | "Nature et réseaux" | "Ambiance";
}

export const KINDS: Record<Kind, KindInfo> = {
  terrain:   { name: "Terrain",            tags: "body",                group: "Quartiers",        color: "#4A4B51", blurb: "Le socle de la ville, ceinturé par le périphérique et une bande verte." },
  district:  { name: "Quartier",           tags: "section · article · main", group: "Quartiers", color: "#CDC7BA", blurb: "Une partie de la page : un quartier, séparé des autres par de grandes avenues." },
  block:     { name: "Îlot",               tags: "div (avec enfants)",  group: "Quartiers",        color: "#D6D0C3", blurb: "Un bloc qui en regroupe d'autres : un pâté de maisons, bordé de ses rues." },
  boulevard: { name: "Allée",              tags: "nav",                 group: "Nature et réseaux", color: "#DDD5C3", blurb: "Le menu de navigation : une place pavée, plantée d'arbres." },
  gate:      { name: "Porte de la ville",  tags: "header",              group: "Quartiers",        color: "#D8CCB0", blurb: "L'en-tête : la place d'entrée, avec son arc monumental." },
  port:      { name: "Port",               tags: "footer",              group: "Quartiers",        color: "#4F88A6", blurb: "Le pied de page : les quais, les grues, un cargo à quai." },
  park:      { name: "Parc",               tags: "aside",               group: "Nature et réseaux", color: "#7C9D57", blurb: "Le contenu secondaire : un parc planté d'arbres, traversé d'allées." },
  estate:    { name: "Lotissement",        tags: "ul · ol",             group: "Quartiers",        color: "#91B264", blurb: "Une liste : des maisons sur gazon, desservies par de petites rues." },
  townhall:  { name: "Place de la mairie", tags: "form",                group: "Équipements",      color: "#C9C1AE", blurb: "Un formulaire : une place pavée, ses guichets et sa fontaine." },
  fields:    { name: "Champs",             tags: "table",               group: "Nature et réseaux", color: "#B8B25F", blurb: "Un tableau : des champs cultivés en rangées." },
  tower:     { name: "Immeuble",           tags: "div",                 group: "Bâtiments",        color: "#7F9BAB", blurb: "Un bloc de texte : un immeuble de bureaux. Avec beaucoup de texte, une tour de verre." },
  vacant:    { name: "Chantier",           tags: "div (vide)",          group: "Bâtiments",        color: "#A88F6B", blurb: "Un élément vide : un chantier clôturé, parfois avec sa grue. Du balisage pour rien." },
  residence: { name: "Habitation",         tags: "p · blockquote · pre", group: "Bâtiments",       color: "#E3C9A6", blurb: "Un paragraphe : un immeuble d'habitation. Plus il est long, plus il a d'étages." },
  gallery:   { name: "Galerie",            tags: "bloc d'images",       group: "Bâtiments",        color: "#4A4F58", blurb: "Un bloc qui ne contient que des images : un immeuble couvert d'écrans, comme à Times Square." },
  house:     { name: "Maison",             tags: "li",                  group: "Bâtiments",        color: "#F0E2C4", blurb: "Un élément de liste : une maison, son toit et sa cheminée." },
  monument:  { name: "Monument",           tags: "h1",                  group: "Monuments",        color: "#FF4B12", blurb: "Le titre principal : la tour Art déco qui domine la ville, son nom gravé au sommet." },
  belfry:    { name: "Beffroi",            tags: "h2",                  group: "Monuments",        color: "#5C8F80", blurb: "Un titre de partie : un beffroi à horloge, qui nomme son quartier." },
  kiosk:     { name: "Kiosque",            tags: "h3",                  group: "Monuments",        color: "#C4683F", blurb: "Un sous-titre : un pavillon à coupole." },
  bollard:   { name: "Statue",             tags: "h4 · h5 · h6",        group: "Monuments",        color: "#6D5D45", blurb: "Un petit titre : une statue de bronze sur son socle." },
  billboard: { name: "Affiche",            tags: "img",                 group: "Équipements",      color: "#2B2B31", blurb: "Une image du site, en affiche sur une façade du bâtiment le plus proche dans la page (sur son toit quand les façades sont pleines). Une icône devient une enseigne, un petit drapeau flotte sur un mât au toit." },
  ruin:      { name: "Ruine",              tags: "img cassée",          group: "Ambiance",         color: "#8A7F72", blurb: "Une image cassée dans la page : son panneau s'est effondré, au milieu des gravats." },
  screen:    { name: "Écran géant",        tags: "video · canvas",      group: "Équipements",      color: "#1E1E24", blurb: "Une vidéo ou une zone de dessin : un écran géant sur une façade du bâtiment voisin." },
  embassy:   { name: "Ambassade",          tags: "iframe",              group: "Équipements",      color: "#EFE8DA", blurb: "Un autre site, enclavé dans celui-ci : un édifice à colonnes, sous son drapeau." },
  sculpture: { name: "Sculpture",          tags: "svg",                 group: "Équipements",      color: "#E2549A", blurb: "Une illustration vectorielle : une sculpture abstraite sur son socle." },
  counter:   { name: "Guichet",            tags: "button · input · select", group: "Équipements",  color: "#3657E0", blurb: "Un bouton ou un champ à remplir : un petit kiosque à auvent." },
  river:     { name: "Canal",              tags: "hr",                  group: "Nature et réseaux", color: "#4F88A6", blurb: "Une ligne de séparation : un canal entre deux quais, franchi par des ponts." },
  airport:   { name: "Aéroport",           tags: "liens externes",      group: "Nature et réseaux", color: "#8E9197", blurb: "Les liens vers d'autres sites : un aéroport hors les murs, à l'est. Plus il y en a, plus il a de pistes et d'avions. Dans une mégalopole, le site a un grand aéroport et chaque ville son petit aérodrome." },
  factory:   { name: "Usines",             tags: "script",              group: "Ambiance",         color: "#9A4A37", blurb: "Le JavaScript de la page : des usines qui fument dans la ceinture verte, une pour six scripts." },
  camera:    { name: "Caméras",            tags: "traqueurs",           group: "Ambiance",         color: "#2B2D31", blurb: "Les traqueurs publicitaires que la page appelle : des caméras au bord des rues, trois par traqueur." },
  graffiti:  { name: "Graffitis",          tags: "<!-- commentaires -->", group: "Ambiance",       color: "#7A3FB0", blurb: "Les commentaires laissés dans le HTML : des tags bombés au pied des immeubles." },
  weather:   { name: "Météo",              tags: "poids de la page",    group: "Ambiance",         color: "#8FA3B5", blurb: "Le poids de la page (octets chargés, éléments) : grand soleil pour une page légère, orage pour une page très lourde." },
};

export const HIGHLIGHT_COLOR = "#FFD23F";

export const LEGEND_GROUPS: KindInfo["group"][] = [
  "Quartiers", "Bâtiments", "Monuments", "Équipements", "Nature et réseaux", "Ambiance",
];
