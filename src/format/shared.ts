/** Ce que le site sait d'une ville partagée (hors le fichier de la ville lui-même). */

import type { CaptureSource } from "./types";

/**
 * La miniature d'une ville partagée : toujours la maquette entière, rendue par le moteur au
 * moment du partage (`thumbnail` dans src/city/view.ts), au format des aperçus sur les réseaux.
 */
export const THUMBNAIL = { width: 1200, height: 630 } as const;

export interface CityStatsSummary {
  buildings: number;
  districts: number;
  monuments: number;
  billboards: number;
  rivers: number;
  parks: number;
  vacant: number;
  maxAltitude: number;
  maxDepth: number;
  elements: number;
  /** Une miniature a été envoyée avec la ville. */
  thumbnail?: boolean;
}

export interface SharedCity {
  slug: string;
  title: string;
  capturedAt: string;
  source: CaptureSource;
  formatVersion: number;
  sizeBytes: number;
  stats: Partial<CityStatsSummary>;
  views: number;
  domain: string;
  path: string;
  pageTitle: string | null;
  pageVersions: number;
}

export interface CityVersion {
  slug: string;
  title: string | null;
  capturedAt: string;
  source: CaptureSource;
}

export interface SiteSummary {
  domain: string;
  pagesCount: number;
  capturesCount: number;
  lastCaptureAt: string | null;
  views: number;
}

export interface SitePage {
  path: string;
  title: string | null;
  capturesCount: number;
  lastCaptureAt: string | null;
  latestSlug: string | null;
}

/** Un site dans la galerie, représenté par la miniature d'une de ses pages (son accueil d'abord). */
export interface SiteCard extends SiteSummary {
  cover: { slug: string; thumbnail: boolean };
}

/** Une page sur la page de son site : sa dernière version visible. */
export interface SitePageCard {
  path: string;
  title: string | null;
  capturesCount: number;
  lastCaptureAt: string | null;
  slug: string;
  stats: Partial<CityStatsSummary>;
}

/** Une page du site dans la mégalopole : sa dernière version visible. */
export interface MegaPageInfo {
  path: string;
  title: string;
  slug: string;
  capturedAt: string;
  source: CaptureSource;
  /** Éléments de sa ville : on n'affiche d'emblée que ce que la vue tient sans peine. */
  elements: number;
  versions: number;
  /** Fichier de la ville (JSON compressé). */
  fileUrl: string;
}

/** Un site lié qui a des villes sur DOMCity. */
export interface KnownSite {
  domain: string;
  pages: number;
}

/** Un site trouvé par la recherche, par son domaine ou par le titre de ses pages. */
export interface SearchHit {
  domain: string;
  pagesCount: number;
  lastCaptureAt: string | null;
  /** Les pages dont le titre répond le mieux (3 au plus) : elles mènent droit à leur ville. */
  pages: Array<{ path: string; title: string | null; slug: string }>;
  /** Toutes les pages du site qui répondent. */
  pagesMatched: number;
}

export const REPORT_REASONS = {
  offensive: "Contenu choquant",
  spam: "Spam ou publicité",
  privacy: "Données personnelles",
  other: "Autre raison",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const sharedCityPath = (slug: string) => `/c/${slug}`;
export const sitePath = (domain: string) => `/site/${encodeURIComponent(domain)}`;
export const megalopolisPath = (domain: string) => `${sitePath(domain)}/megalopolis`;
