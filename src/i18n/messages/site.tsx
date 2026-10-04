/** A site's page (/site/apple.com) and its megalopolis's description. */

import type { ReactNode } from "react";
import { formatCount, longDate, plural, shortDate } from "../format";
import { defineMessages } from "../locale";

interface SiteMessages {
  notFound: string;
  description: (domain: string, pages: number) => string;
  megaTitle: (domain: string) => string;
  megaDescription: (domain: string, pages: number) => string;
  kicker: string;
  leadSeveral: (domain: string) => string;
  leadOne: (domain: string) => string;
  cities: (n: number) => string;
  versions: (n: number) => string;
  visits: (n: number) => string;
  buildings: (n: number) => string;
  updated: (iso: string) => string;
  date: (iso: string) => string;
  visitMegalopolis: string;
  visitCity: string;
  open: (domain: string) => string;
  pagesTitle: string;
  range: (first: number, last: number, total: number) => string;
  homeMissing: { label: string; title: string; text: (site: ReactNode, create: ReactNode) => ReactNode; create: string };
  pager: { label: string; previous: string; next: string };
}

export const SITE = defineMessages<SiteMessages>({
  en: {
    notFound: "Site not found",
    description: (domain, pages) => `${plural("en", pages, "page", "pages")} of ${domain} built as 3D ${pages === 1 ? "city" : "cities"} on DOMCity.`,
    megaTitle: (domain) => `${domain} · megalopolis`,
    megaDescription: (domain, pages) =>
      `${plural("en", pages, "page", "pages")} of ${domain} built as 3D cities and assembled into a megalopolis on DOMCity.`,
    kicker: "Site",
    leadSeveral: (domain) =>
      `The pages of ${domain} captured on DOMCity, each turned into a city. Visit them one by one, or all together in the megalopolis, connected by their links.`,
    leadOne: (domain) =>
      `One page of ${domain} is captured on DOMCity. Capture others with the bookmarklet: they will come together as a megalopolis.`,
    cities: (n) => plural("en", n, "city", "cities"),
    versions: (n) => plural("en", n, "version", "versions"),
    visits: (n) => plural("en", n, "visit", "visits"),
    buildings: (n) => plural("en", n, "building", "buildings"),
    updated: (iso) => `updated ${longDate(iso, "en")}`,
    date: (iso) => shortDate(iso, "en"),
    visitMegalopolis: "Visit the megalopolis",
    visitCity: "Visit the city",
    open: (domain) => `Open ${domain} ↗`,
    pagesTitle: "Its pages",
    range: (first, last, total) => `${first} to ${last} of ${formatCount(total, "en")}`,
    homeMissing: {
      label: "Not captured yet",
      title: "Home page",
      text: (site, create) => (
        <>
          Open {site} and click the bookmark to build it. No bookmarklet yet? {create}.
        </>
      ),
      create: "Create a city",
    },
    pager: { label: "The site's other pages", previous: "← Previous", next: "Next →" },
  },
  fr: {
    notFound: "Site introuvable",
    description: (domain, pages) =>
      `${plural("fr", pages, "page", "pages")} de ${domain} construite${pages > 1 ? "s" : ""} en ville${pages > 1 ? "s" : ""} 3D sur DOMCity.`,
    megaTitle: (domain) => `${domain} · mégalopole`,
    megaDescription: (domain, pages) =>
      `${plural("fr", pages, "page", "pages")} de ${domain} construite${pages > 1 ? "s" : ""} en villes 3D et assemblée${pages > 1 ? "s" : ""} en une mégalopole sur DOMCity.`,
    kicker: "Site",
    leadSeveral: (domain) =>
      `Les pages de ${domain} relevées sur DOMCity, chacune devenue une ville. Visitez-les une par une, ou toutes ensemble dans la mégalopole, reliées par leurs liens.`,
    leadOne: (domain) =>
      `Une page de ${domain} est relevée sur DOMCity. Relevez-en d'autres avec le favori : elles s'assembleront en une mégalopole.`,
    cities: (n) => plural("fr", n, "ville", "villes"),
    versions: (n) => plural("fr", n, "version", "versions"),
    visits: (n) => plural("fr", n, "visite", "visites"),
    buildings: (n) => plural("fr", n, "bâtiment", "bâtiments"),
    updated: (iso) => `mis à jour le ${longDate(iso, "fr")}`,
    date: (iso) => shortDate(iso, "fr"),
    visitMegalopolis: "Visiter la mégalopole",
    visitCity: "Visiter la ville",
    open: (domain) => `Ouvrir ${domain} ↗`,
    pagesTitle: "Ses pages",
    range: (first, last, total) => `${first} à ${last} sur ${formatCount(total, "fr")}`,
    homeMissing: {
      label: "Pas encore relevée",
      title: "Page d'accueil",
      text: (site, create) => (
        <>
          Ouvrez {site} et cliquez sur le favori pour la construire. Pas encore de favori ? {create}.
        </>
      ),
      create: "Créer une ville",
    },
    pager: { label: "Les autres pages du site", previous: "← Précédentes", next: "Suivantes →" },
  },
});

/** The description of a shared city and of a Wikipedia article's city, for search engines and social networks. */
export const CITY_META = defineMessages({
  en: {
    notFound: "City not found",
    description: (page: string, buildings: number, districts: number, monuments: number) =>
      `The page ${page} built as a 3D city: ${plural("en", buildings, "building", "buildings")}, ${plural("en", districts, "district", "districts")}, ${plural("en", monuments, "monument", "monuments")}.`,
    imageAlt: (title: string) => `The city of ${title}`,
    wikipedia: (title: string) => `The Wikipedia article “${title}”, captured and built as a 3D city by DOMCity.`,
  },
  fr: {
    notFound: "Ville introuvable",
    description: (page: string, buildings: number, districts: number, monuments: number) =>
      `La page ${page} construite en ville 3D : ${plural("fr", buildings, "bâtiment", "bâtiments")}, ${plural("fr", districts, "quartier", "quartiers")}, ${plural("fr", monuments, "monument", "monuments")}.`,
    imageAlt: (title: string) => `La ville de ${title}`,
    wikipedia: (title: string) => `L'article Wikipédia « ${title} », relevé et construit en ville 3D par DOMCity.`,
  },
});
