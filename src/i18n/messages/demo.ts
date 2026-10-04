/** The animated bookmarklet demo, on the "Create a city" page: the browser, the sample site, DOMCity around it. */

import type { SampleWord } from "@/ui/demo/scene";
import { defineMessages } from "../locale";

export const DEMO = defineMessages({
  en: {
    label:
      "Demo: on the Create a city page, the DOMCity button is dragged into the bookmarks bar; a site is opened, " +
      "the bookmark is clicked and captures the page; DOMCity opens it in a new tab, where the page lies down as a plan, " +
      "then rises from the ground as a city.",
    steps: ["Drag", "Click", "Visit"],
    pause: "Pause the demo",
    play: "Play the demo",
    /** The address typed in the demo: as many letters as there are keystrokes (timeline.ts). */
    typed: "example.org",
    tab: "Create a city · DOMCity",
    bookmarks: ["Weather", "Recipes"] as [string, string],
    nav: ["Explore", "Create a city", "Your account"] as [string, string, string],
    hero: ["THE WHOLE WEB IS", "BUILDABLE."] as [string, string],
    drop: "Drag this button into your bookmarks bar",
    howTo: "HOW TO",
    gestures: "THREE GESTURES",
    capture: "EXAMPLE.ORG · YOUR CAPTURE · NOT PUBLISHED",
    share: "SHARE",
    monument: "MONUMENT",
    quoted: (text: string) => `“${text}”`,
    receiving: (elements: number) => `RECEIVING THE CAPTURE · ${elements} ELEMENTS`,
    sample: { example: "Example", history: "History", places: "Places", contact: "Contact" } satisfies Record<SampleWord, string>,
  },
  fr: {
    label:
      "Démonstration : sur la page Créer une ville, on glisse le bouton DOMCity dans la barre de favoris ; on ouvre un site, " +
      "on clique sur le favori qui relève la page ; DOMCity l'ouvre dans un nouvel onglet, où la page se couche en plan puis " +
      "sort de terre en ville.",
    steps: ["Glisser", "Cliquer", "Visiter"],
    pause: "Mettre la démonstration en pause",
    play: "Lancer la démonstration",
    typed: "exemple.org",
    tab: "Créer une ville · DOMCity",
    bookmarks: ["Météo", "Recettes"],
    nav: ["Découvrir", "Créer une ville", "Votre compte"],
    hero: ["TOUT LE WEB EST", "CONSTRUCTIBLE."],
    drop: "Glissez ce bouton dans votre barre de favoris",
    howTo: "MODE D'EMPLOI",
    gestures: "TROIS GESTES",
    capture: "EXEMPLE.ORG · VOTRE RELEVÉ · NON PUBLIÉ",
    share: "PARTAGER",
    monument: "MONUMENT",
    quoted: (text: string) => `« ${text} »`,
    receiving: (elements: number) => `RÉCEPTION DU RELEVÉ · ${elements} ÉLÉMENTS`,
    sample: { example: "Exemple", history: "Histoire", places: "Lieux", contact: "Contact" },
  },
});
