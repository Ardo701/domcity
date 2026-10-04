/** The home page. */

import { defineMessages } from "../locale";

export const HOME = defineMessages({
  en: {
    title: ["Every web", "page is a"] as [string, string],
    titleEnd: "city.",
    lead: "Open any website and click the bookmark: DOMCity maps its structure and builds it in 3D. Sections become districts, paragraphs become apartment buildings, headings become monuments. Then you take a walk through it.",
    cta: "Create a city",
    figureTitle:
      "A sample page built as a city: monument, belfries, office towers, poster, canal, housing estate, embassy, harbor.",
    figure: {
      monument: "Monument",
      gate: "Gate",
      tower: "Office tower",
      belfry: "Belfry",
      poster: "Poster",
      canal: "Canal",
      estate: "Estate",
      embassy: "Embassy",
      harbor: "Harbor",
    },
    shared: {
      title: "Shared cities",
      lead: "The pages of a site are filed together, and come together as a megalopolis. Search for a site or a page, or browse the latest updated sites.",
      all: "Explore all the sites",
    },
    legend: {
      title: "The map legend",
      lead: "Every HTML tag has its place in the city. The colors follow a zoning map: calm tones for ordinary buildings, vivid ones for what matters.",
    },
    method: {
      title: "The method",
      steps: [
        {
          title: "Survey",
          text: "We read the structure of the page: its tags, how much text, the headings, the images. Never the whole content, only its shape.",
        },
        {
          title: "Urban planning",
          text: "Each element gets its plot, in the order of the page, from north to south. Wide avenues separate the parts of the page; simple elements huddle into city blocks.",
        },
        {
          title: "Construction",
          text: "The city is built in your browser. Hover over a building to find out what it was, click to inspect it, then go for a walk.",
        },
      ],
    },
  },
  fr: {
    title: ["Chaque page", "web est une"],
    titleEnd: "ville.",
    lead: "Ouvrez n'importe quel site et cliquez sur le favori : DOMCity en relève le plan et le construit en 3D. Les sections deviennent des quartiers, les paragraphes des habitations, les titres des monuments. Ensuite, on s'y promène.",
    cta: "Créer une ville",
    figureTitle:
      "Une page de démonstration construite en ville : monument, beffrois, tours de bureaux, affiche, canal, lotissement, ambassade, port.",
    figure: {
      monument: "Monument",
      gate: "Porte",
      tower: "Tour de bureaux",
      belfry: "Beffroi",
      poster: "Affiche",
      canal: "Canal",
      estate: "Lotissement",
      embassy: "Ambassade",
      harbor: "Port",
    },
    shared: {
      title: "Les villes partagées",
      lead: "Les pages d'un même site se rangent ensemble, et s'assemblent en mégalopole. Cherchez un site ou une page, ou parcourez les derniers sites mis à jour.",
      all: "Découvrir tous les sites",
    },
    legend: {
      title: "La légende du plan",
      lead: "Chaque balise HTML a sa place dans la ville. Les couleurs suivent un plan de zonage : des tons calmes pour le bâti courant, du vif pour ce qui compte.",
    },
    method: {
      title: "La méthode",
      steps: [
        {
          title: "Relevé",
          text: "On lit la structure de la page : ses balises, la quantité de texte, les titres, les images. Jamais le contenu entier, seulement sa forme.",
        },
        {
          title: "Urbanisme",
          text: "Chaque élément reçoit sa parcelle, dans l'ordre de la page, du nord au sud. De grandes avenues séparent les parties de la page ; les éléments simples se serrent en pâtés de maisons.",
        },
        {
          title: "Construction",
          text: "La ville est bâtie dans votre navigateur. Survolez un bâtiment pour savoir ce qu'il était, cliquez pour l'inspecter, puis passez en promenade.",
        },
      ],
    },
  },
});
