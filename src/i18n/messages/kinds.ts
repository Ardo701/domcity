/** The HTML → city dictionary in words: the name of each kind, its tags, its sentence; streets and small images. */

import type { RoadStyle } from "@/city/layout";
import type { Kind, KindGroup } from "@/format/taxonomy";
import { plural } from "../format";
import { defineMessages } from "../locale";

export interface KindText {
  /** Name in the city. */
  name: string;
  /** Original tags, for the legend. */
  tags: string;
  /** A short sentence for the legend and the inspector. */
  blurb: string;
}

interface KindsMessages {
  kinds: Record<Kind, KindText>;
  groups: Record<KindGroup, string>;
  /** Streets are not in the page: on hover, they carry the name of their kind. */
  roads: Record<RoadStyle, string>;
  /** Small images are not posters: they have their own name. */
  emblems: Record<"sign" | "flag", { name: string; blurb: string }>;
  farm: string;
  /** Lot added to carry the images of a container that has nothing else. */
  galleryBlurb: (images: number, where: string) => string;
  /** Text of the cells of a table: a farm. */
  farmBlurb: (where: string) => string;
  /** Text written directly in a container. */
  ownTextBlurb: (where: string) => string;
  chars: (n: number) => string;
}

export const KINDS_TEXT = defineMessages<KindsMessages>({
  en: {
    kinds: {
      terrain: { name: "Ground", tags: "body", blurb: "The base of the city, ringed by the ring road and a green belt." },
      district: { name: "District", tags: "section · article · main", blurb: "A part of the page: a district, separated from the others by wide avenues." },
      block: { name: "Block", tags: "div (with children)", blurb: "A block that groups others: a city block, lined with its streets." },
      boulevard: { name: "Promenade", tags: "nav", blurb: "The navigation menu: a paved square, planted with trees." },
      gate: { name: "City gate", tags: "header", blurb: "The header: the entrance square, with its monumental arch." },
      port: { name: "Harbor", tags: "footer", blurb: "The footer: the quays, the cranes, a cargo ship at the dock." },
      park: { name: "Park", tags: "aside", blurb: "The secondary content: a park planted with trees, crossed by paths." },
      estate: { name: "Housing estate", tags: "ul · ol", blurb: "A list: houses on a lawn, served by small streets." },
      townhall: { name: "Town hall square", tags: "form", blurb: "A form: a paved square, its booths and its fountain." },
      fields: { name: "Fields", tags: "table", blurb: "A table: fields cultivated in rows." },
      tower: { name: "Office building", tags: "div", blurb: "A block of text: an office building. With a lot of text, a glass tower." },
      vacant: { name: "Construction site", tags: "div (empty)", blurb: "An empty element: a fenced construction site, sometimes with its crane. Markup for nothing." },
      residence: { name: "Apartment building", tags: "p · blockquote · pre", blurb: "A paragraph: an apartment building. The longer it is, the more floors it has." },
      gallery: { name: "Gallery", tags: "block of images", blurb: "A block that only contains images: a building covered with screens, like in Times Square." },
      house: { name: "House", tags: "li", blurb: "A list item: a house, its roof and its chimney." },
      monument: { name: "Monument", tags: "h1", blurb: "The main heading: the Art Deco tower that dominates the city, its name engraved at the top." },
      belfry: { name: "Belfry", tags: "h2", blurb: "A section heading: a clock belfry that names its district." },
      kiosk: { name: "Kiosk", tags: "h3", blurb: "A subheading: a domed pavilion." },
      bollard: { name: "Statue", tags: "h4 · h5 · h6", blurb: "A small heading: a bronze statue on its pedestal." },
      billboard: {
        name: "Poster",
        tags: "img",
        blurb:
          "An image of the site, as a poster on a facade of the nearest building in the page (on its roof when the facades are full). An icon becomes a sign, a small flag flies on a pole on the roof.",
      },
      ruin: { name: "Ruin", tags: "broken img", blurb: "A broken image in the page: its panel has collapsed, amid the rubble." },
      screen: { name: "Giant screen", tags: "video · canvas", blurb: "A video or a drawing area: a giant screen on a facade of the neighboring building." },
      embassy: { name: "Embassy", tags: "iframe", blurb: "Another site, enclosed in this one: a building with columns, under its flag." },
      sculpture: { name: "Sculpture", tags: "svg", blurb: "A vector illustration: an abstract sculpture on its pedestal." },
      counter: { name: "Booth", tags: "button · input · select", blurb: "A button or a field to fill in: a small booth with an awning." },
      river: { name: "Canal", tags: "hr", blurb: "A dividing line: a canal between two quays, crossed by bridges." },
      airport: {
        name: "Airport",
        tags: "external links",
        blurb:
          "The links to other sites: an airport outside the walls, to the east. The more there are, the more runways and planes it has. In a megalopolis, the site has a large airport and each city its small airfield.",
      },
      factory: { name: "Factories", tags: "script", blurb: "The page's JavaScript: factories smoking in the green belt, one for every six scripts." },
      camera: { name: "Cameras", tags: "trackers", blurb: "The ad trackers the page calls: cameras along the streets, three per tracker." },
      graffiti: { name: "Graffiti", tags: "<!-- comments -->", blurb: "The comments left in the HTML: tags sprayed at the foot of the buildings." },
      weather: {
        name: "Weather",
        tags: "page weight",
        blurb: "The weight of the page (bytes loaded, elements): bright sun for a light page, a storm for a very heavy one.",
      },
    },
    groups: {
      districts: "Districts",
      buildings: "Buildings",
      monuments: "Monuments",
      facilities: "Facilities",
      nature: "Nature and networks",
      ambiance: "Ambiance",
    },
    roads: { ring: "Ring road", avenue: "Avenue", street: "Street", lane: "Lane", path: "Footpath", highway: "Highway" },
    emblems: {
      sign: { name: "Sign", blurb: "An icon of the site (under 48 px), as a sign on the ground floor of the nearest building in the page." },
      flag: { name: "Flag", blurb: "A small flag of the site (under 48 px), raised on a pole, on the roof of the nearest building in the page." },
    },
    farm: "Farm",
    galleryBlurb: (images, where) =>
      `${images > 1 ? `The ${images} images` : "The image"} of ${where}, with no text beside them to carry them: a building covered with screens.`,
    farmBlurb: (where) => `The text of the cells of the table ${where}: a farm in the middle of its fields.`,
    ownTextBlurb: (where) => `The text written directly in ${where}, without a tag of its own.`,
    chars: (n) => plural("en", n, "character", "characters"),
  },
  fr: {
    kinds: {
      terrain: { name: "Terrain", tags: "body", blurb: "Le socle de la ville, ceinturé par le périphérique et une bande verte." },
      district: { name: "Quartier", tags: "section · article · main", blurb: "Une partie de la page : un quartier, séparé des autres par de grandes avenues." },
      block: { name: "Îlot", tags: "div (avec enfants)", blurb: "Un bloc qui en regroupe d'autres : un pâté de maisons, bordé de ses rues." },
      boulevard: { name: "Allée", tags: "nav", blurb: "Le menu de navigation : une place pavée, plantée d'arbres." },
      gate: { name: "Porte de la ville", tags: "header", blurb: "L'en-tête : la place d'entrée, avec son arc monumental." },
      port: { name: "Port", tags: "footer", blurb: "Le pied de page : les quais, les grues, un cargo à quai." },
      park: { name: "Parc", tags: "aside", blurb: "Le contenu secondaire : un parc planté d'arbres, traversé d'allées." },
      estate: { name: "Lotissement", tags: "ul · ol", blurb: "Une liste : des maisons sur gazon, desservies par de petites rues." },
      townhall: { name: "Place de la mairie", tags: "form", blurb: "Un formulaire : une place pavée, ses guichets et sa fontaine." },
      fields: { name: "Champs", tags: "table", blurb: "Un tableau : des champs cultivés en rangées." },
      tower: { name: "Immeuble", tags: "div", blurb: "Un bloc de texte : un immeuble de bureaux. Avec beaucoup de texte, une tour de verre." },
      vacant: { name: "Chantier", tags: "div (vide)", blurb: "Un élément vide : un chantier clôturé, parfois avec sa grue. Du balisage pour rien." },
      residence: { name: "Habitation", tags: "p · blockquote · pre", blurb: "Un paragraphe : un immeuble d'habitation. Plus il est long, plus il a d'étages." },
      gallery: { name: "Galerie", tags: "bloc d'images", blurb: "Un bloc qui ne contient que des images : un immeuble couvert d'écrans, comme à Times Square." },
      house: { name: "Maison", tags: "li", blurb: "Un élément de liste : une maison, son toit et sa cheminée." },
      monument: { name: "Monument", tags: "h1", blurb: "Le titre principal : la tour Art déco qui domine la ville, son nom gravé au sommet." },
      belfry: { name: "Beffroi", tags: "h2", blurb: "Un titre de partie : un beffroi à horloge, qui nomme son quartier." },
      kiosk: { name: "Kiosque", tags: "h3", blurb: "Un sous-titre : un pavillon à coupole." },
      bollard: { name: "Statue", tags: "h4 · h5 · h6", blurb: "Un petit titre : une statue de bronze sur son socle." },
      billboard: {
        name: "Affiche",
        tags: "img",
        blurb:
          "Une image du site, en affiche sur une façade du bâtiment le plus proche dans la page (sur son toit quand les façades sont pleines). Une icône devient une enseigne, un petit drapeau flotte sur un mât au toit.",
      },
      ruin: { name: "Ruine", tags: "img cassée", blurb: "Une image cassée dans la page : son panneau s'est effondré, au milieu des gravats." },
      screen: { name: "Écran géant", tags: "video · canvas", blurb: "Une vidéo ou une zone de dessin : un écran géant sur une façade du bâtiment voisin." },
      embassy: { name: "Ambassade", tags: "iframe", blurb: "Un autre site, enclavé dans celui-ci : un édifice à colonnes, sous son drapeau." },
      sculpture: { name: "Sculpture", tags: "svg", blurb: "Une illustration vectorielle : une sculpture abstraite sur son socle." },
      counter: { name: "Guichet", tags: "button · input · select", blurb: "Un bouton ou un champ à remplir : un petit kiosque à auvent." },
      river: { name: "Canal", tags: "hr", blurb: "Une ligne de séparation : un canal entre deux quais, franchi par des ponts." },
      airport: {
        name: "Aéroport",
        tags: "liens externes",
        blurb:
          "Les liens vers d'autres sites : un aéroport hors les murs, à l'est. Plus il y en a, plus il a de pistes et d'avions. Dans une mégalopole, le site a un grand aéroport et chaque ville son petit aérodrome.",
      },
      factory: { name: "Usines", tags: "script", blurb: "Le JavaScript de la page : des usines qui fument dans la ceinture verte, une pour six scripts." },
      camera: { name: "Caméras", tags: "traqueurs", blurb: "Les traqueurs publicitaires que la page appelle : des caméras au bord des rues, trois par traqueur." },
      graffiti: { name: "Graffitis", tags: "<!-- commentaires -->", blurb: "Les commentaires laissés dans le HTML : des tags bombés au pied des immeubles." },
      weather: {
        name: "Météo",
        tags: "poids de la page",
        blurb: "Le poids de la page (octets chargés, éléments) : grand soleil pour une page légère, orage pour une page très lourde.",
      },
    },
    groups: {
      districts: "Quartiers",
      buildings: "Bâtiments",
      monuments: "Monuments",
      facilities: "Équipements",
      nature: "Nature et réseaux",
      ambiance: "Ambiance",
    },
    roads: { ring: "Périphérique", avenue: "Avenue", street: "Rue", lane: "Ruelle", path: "Allée", highway: "Autoroute" },
    emblems: {
      sign: { name: "Enseigne", blurb: "Une icône du site (moins de 48 px), en enseigne au rez-de-chaussée du bâtiment le plus proche dans la page." },
      flag: { name: "Drapeau", blurb: "Un petit drapeau du site (moins de 48 px), hissé sur un mât, au toit du bâtiment le plus proche dans la page." },
    },
    farm: "Ferme",
    galleryBlurb: (images, where) =>
      `${images > 1 ? `Les ${images} images` : "L'image"} de ${where}, sans texte à côté pour les porter : un immeuble couvert d'écrans.`,
    farmBlurb: (where) => `Le texte des cases du tableau ${where} : une ferme au milieu de ses champs.`,
    ownTextBlurb: (where) => `Le texte écrit directement dans ${where}, sans balise à lui.`,
    chars: (n) => plural("fr", n, "caractère", "caractères"),
  },
});
