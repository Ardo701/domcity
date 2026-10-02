/** Ce que le site sait d'une ville partagée (hors le fichier de la ville lui-même). */

import type { CaptureSource } from "./types";

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

export interface CityCard {
  slug: string;
  title: string;
  capturedAt: string;
  source: CaptureSource;
  stats: Partial<CityStatsSummary>;
  views: number;
  domain: string;
  path: string;
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

export interface SearchHit {
  kind: "site" | "page";
  domain: string;
  path: string | null;
  title: string | null;
  lastCaptureAt: string | null;
}

export const REPORT_REASONS = {
  offensive: "Contenu choquant",
  spam: "Spam ou publicité",
  privacy: "Données personnelles",
  other: "Autre raison",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const sharedCityPath = (slug: string) => `/c/${slug}`;
export const sitePath = (domain: string) => `/s/${encodeURIComponent(domain)}`;
