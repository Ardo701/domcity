/** The search among the shared cities (home page, Explore). */

import { plural } from "../format";
import { defineMessages } from "../locale";

export const SEARCH = defineMessages({
  en: {
    label: "Search a shared city",
    placeholder: "Search a site or a page: amazon, croissant…",
    empty: "No city yet. Yours to create.",
    site: "Site",
    page: "Page",
    cities: (n: number) => plural("en", n, "city", "cities"),
    others: (n: number) => `and ${n} more on`,
    sitePage: "the site's page",
  },
  fr: {
    label: "Chercher une ville partagée",
    placeholder: "Chercher un site ou une page : amazon, croissant…",
    empty: "Aucune ville pour l'instant. À vous de la créer.",
    site: "Site",
    page: "Page",
    cities: (n: number) => plural("fr", n, "ville", "villes"),
    others: (n: number) => `et ${n} ${n > 1 ? "autres" : "autre"} sur`,
    sitePage: "la page du site",
  },
});

/** The Wikipedia article field (in the error panel of an article not found). */
export const WIKI_SEARCH = defineMessages({
  en: {
    lang: "Wikipedia language",
    placeholder: "Paris, Croissant, Jazz…",
    label: "Wikipedia article to build",
    pending: "Capturing…",
    submit: "Build the city",
  },
  fr: {
    lang: "Langue de Wikipédia",
    placeholder: "Paris, Croissant, Jazz…",
    label: "Article Wikipédia à construire",
    pending: "Relevé…",
    submit: "Construire la ville",
  },
});
