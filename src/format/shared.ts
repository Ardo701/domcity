/** What the site knows about a shared city (apart from the city file itself). */

import type { CaptureSource } from "./types";

/**
 * The thumbnail of a shared city: always the whole model, rendered by the engine at
 * sharing time (`thumbnail` in src/city/view.ts), in the format of social previews.
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
  /** A thumbnail was sent with the city. */
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

/** The latest version of a page, met when publishing it again. */
export interface ExistingVersion {
  slug: string;
  /** ISO date of its publication. */
  capturedAt: string;
  /** Address of its thumbnail (the file may be missing: the gallery's hatching then shows). */
  thumbnail: string | null;
}

/** The answer (409) to a publication less than 30 days after the page's latest version: the visitor confirms. */
export interface RecentVersionAnswer {
  error: string;
  existing: ExistingVersion;
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

/** A site in the gallery, represented by the thumbnail of one of its pages (its home page first). */
export interface SiteCard extends SiteSummary {
  cover: { slug: string; thumbnail: boolean };
}

/** A page on its site's page: its latest visible version. */
export interface SitePageCard {
  path: string;
  title: string | null;
  capturesCount: number;
  lastCaptureAt: string | null;
  slug: string;
  stats: Partial<CityStatsSummary>;
}

/** A page of the site in the megalopolis: its latest visible version. */
export interface MegaPageInfo {
  path: string;
  title: string;
  slug: string;
  capturedAt: string;
  source: CaptureSource;
  /** Elements of its city: only what the view handles easily is shown right away. */
  elements: number;
  versions: number;
  /** City file (compressed JSON). */
  fileUrl: string;
}

/** A linked site that has cities on DOMCity. */
export interface KnownSite {
  domain: string;
  pages: number;
}

/** A site found by the search, by its domain or by the title of its pages. */
export interface SearchHit {
  domain: string;
  pagesCount: number;
  lastCaptureAt: string | null;
  /** The pages whose title matches best (3 at most): they lead straight to their city. */
  pages: Array<{ path: string; title: string | null; slug: string }>;
  /** All the pages of the site that match. */
  pagesMatched: number;
}

/** The reasons for a report (their names: src/i18n/messages/city.tsx). */
export const REPORT_REASONS = ["offensive", "spam", "privacy", "other"] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const sharedCityPath = (slug: string) => `/city/${slug}`;
/** The files of a city in storage (R2, or the local folder): the city and its thumbnail. */
export const cityKey = (slug: string) => `city/${slug}.json.gz`;
export const thumbKey = (slug: string) => `city/${slug}.jpg`;
/** The secret link: the token stays after the #, never sent to the server in the address. */
export const deleteCityPath = (slug: string, token: string) => `${sharedCityPath(slug)}/delete#${token}`;
export const sitePath = (domain: string) => `/site/${encodeURIComponent(domain)}`;
export const megalopolisPath = (domain: string) => `${sitePath(domain)}/megalopolis`;
