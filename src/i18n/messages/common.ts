/** What every page shares: the header, the footer, the 404 page, the site's description. */

import { plural, shortDate } from "../format";
import { defineMessages } from "../locale";

export const COMMON = defineMessages({
  en: {
    siteTitle: "DOMCity · Every web page is a city",
    siteDescription:
      "DOMCity maps the structure of a web page and builds it in 3D: sections become districts, blocks become buildings, headings become monuments.",
    tagline: "Every web page is a city.",
    homeLabel: "DOMCity, home",
    nav: { label: "Navigation", explore: "Explore", create: "Create a city", account: "Your account" },
    menu: { label: "Menu", open: "Open the menu", close: "Close the menu", github: "The code on GitHub" },
    githubLabel: "The DOMCity code on GitHub",
    language: { label: "Language", switchTo: "Afficher le site en français" },
    footer: {
      about: "Every web page is a city. Capture a page, DOMCity builds it in 3D and takes you on a tour.",
      label: "Footer",
      cities: "Cities",
      project: "Project",
      sourceCode: "Source code",
      legal: "Legal",
      legalNotice: "Legal notice",
      terms: "Terms of use",
      privacy: "Privacy",
      top: "Back to top ↑",
    },
    notFound: {
      error: "Error 404",
      heading: "Vacant lot",
      text: "Nothing has been built at this address.",
      back: "Back to the home page →",
    },
    legalPage: { updated: "Updated:", missing: "To be completed:" },
    accountLink: { label: "Your published cities", count: (n: number) => plural("en", n, "city", "cities") },
    gallery: {
      empty: "No shared city yet. Build one, then click “Share”.",
      cities: (n: number) => plural("en", n, "city", "cities"),
      visits: (n: number) => plural("en", n, "visit", "visits"),
      updated: (iso: string) => `updated ${shortDate(iso, "en")}`,
    },
  },
  fr: {
    siteTitle: "DOMCity · Chaque page web est une ville",
    siteDescription:
      "DOMCity relève le plan d'une page web et la construit en 3D : les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments.",
    tagline: "Chaque page web est une ville.",
    homeLabel: "DOMCity, accueil",
    nav: { label: "Navigation", explore: "Découvrir", create: "Créer une ville", account: "Votre compte" },
    menu: { label: "Menu", open: "Ouvrir le menu", close: "Fermer le menu", github: "Le code sur GitHub" },
    githubLabel: "Le code de DOMCity sur GitHub",
    language: { label: "Langue", switchTo: "View the site in English" },
    footer: {
      about: "Chaque page web est une ville. Relevez une page, DOMCity la construit en 3D et vous la fait visiter.",
      label: "Pied de page",
      cities: "Villes",
      project: "Projet",
      sourceCode: "Code source",
      legal: "Légal",
      legalNotice: "Mentions légales",
      terms: "Conditions d'utilisation",
      privacy: "Confidentialité",
      top: "Haut de page ↑",
    },
    notFound: {
      error: "Erreur 404",
      heading: "Terrain vague",
      text: "Rien n'a été construit à cette adresse.",
      back: "Retour à l'accueil →",
    },
    legalPage: { updated: "Mise à jour :", missing: "À compléter :" },
    accountLink: { label: "Vos villes publiées", count: (n: number) => plural("fr", n, "ville", "villes") },
    gallery: {
      empty: "Aucune ville partagée pour l'instant. Construisez-en une, puis cliquez sur « Partager ».",
      cities: (n: number) => plural("fr", n, "ville", "villes"),
      visits: (n: number) => plural("fr", n, "visite", "visites"),
      updated: (iso: string) => `mis à jour le ${shortDate(iso, "fr")}`,
    },
  },
});
