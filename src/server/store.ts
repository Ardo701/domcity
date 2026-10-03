import "server-only";
import type {
  CityStatsSummary,
  CityVersion,
  KnownSite,
  ReportReason,
  SearchHit,
  SharedCity,
  SiteCard,
  SitePage,
  SitePageCard,
  SiteSummary,
} from "@/format/shared";
import { isBlockCategory, type BlockCategory } from "@/format/blocklist";
import type { CaptureSource } from "@/format/types";
import { Bytea, rpc } from "./db";

/**
 * Operations on shared cities, on top of the SQL functions.
 * Reads go through with a visitor's privileges; writes with the secret key.
 * No read returns a refused site (table `blocked_domains`): the SQL functions ignore it,
 * even if published before it entered the list. Its cities stay in the database until they are deleted.
 */

type Row = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const stats = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : (v ?? {})) as Partial<CityStatsSummary>;

function reader() {
  const db = rpc("public");
  if (!db) throw new Error("sharing not configured");
  return db;
}

function writer() {
  const db = rpc("admin");
  if (!db) throw new Error("sharing not configured");
  return db;
}

export async function createCapture(input: {
  domain: string;
  path: string;
  source: CaptureSource;
  title: string;
  sizeBytes: number;
  stats: CityStatsSummary;
  deleteTokenHash: string;
}): Promise<string> {
  return writer().scalar<string>("create_capture", {
    p_domain: input.domain,
    p_path: input.path,
    p_source: input.source,
    p_title: input.title,
    p_size_bytes: input.sizeBytes,
    p_stats: input.stats,
    p_delete_token_hash: new Bytea(input.deleteTokenHash),
    p_format_version: 1,
  });
}

export async function publishCapture(slug: string): Promise<boolean> {
  return writer().scalar<boolean>("publish_capture", { p_slug: slug });
}

export async function deleteCapture(slug: string, tokenHash: string): Promise<boolean> {
  return writer().scalar<boolean>("delete_capture", { p_slug: slug, p_delete_token_hash: new Bytea(tokenHash) });
}

export async function reportCapture(slug: string, reason: ReportReason, details: string | null, reporter: string) {
  return writer().scalar<boolean>("report_capture", {
    p_slug: slug,
    p_reason: reason,
    p_details: details,
    p_reporter: new Bytea(reporter),
  });
}

/** True if the limit is reached. */
export async function hitRateLimit(actor: string, action: string, max: number, window: string) {
  return writer().scalar<boolean>("hit_rate_limit", {
    p_actor: new Bytea(actor),
    p_action: action,
    p_max: max,
    p_window: window,
  });
}

export async function recordView(slug: string): Promise<void> {
  await reader().scalar<null>("record_view", { p_slug: slug });
}

export async function getCapture(slug: string): Promise<SharedCity | null> {
  const [row] = await reader().rows<Row>("get_capture", { p_slug: slug });
  if (!row) return null;
  return {
    slug: String(row.slug),
    title: String(row.title ?? ""),
    capturedAt: String(row.captured_at),
    source: row.source as CaptureSource,
    formatVersion: num(row.format_version),
    sizeBytes: num(row.size_bytes),
    stats: stats(row.stats),
    views: num(row.views_count),
    domain: String(row.domain),
    path: String(row.path),
    pageTitle: str(row.page_title),
    pageVersions: num(row.page_versions),
  };
}

export async function pageVersions(domain: string, path: string): Promise<CityVersion[]> {
  const rows = await reader().rows<Row>("page_versions", { p_domain: domain, p_path: path });
  return rows.map((row) => ({
    slug: String(row.slug),
    title: str(row.title),
    capturedAt: String(row.captured_at),
    source: row.source as CaptureSource,
  }));
}

/** The most recently updated sites (the gallery). */
export async function recentSites(limit = 12, offset = 0): Promise<SiteCard[]> {
  const rows = await reader().rows<Row>("recent_sites", { p_limit: limit, p_offset: offset });
  return rows.map((row) => ({
    domain: String(row.domain),
    pagesCount: num(row.pages_count),
    capturesCount: num(row.captures_count),
    lastCaptureAt: str(row.last_capture_at),
    views: num(row.views_count),
    cover: { slug: String(row.cover_slug), thumbnail: stats(row.cover_stats).thumbnail !== false },
  }));
}

export async function getSite(domain: string): Promise<SiteSummary | null> {
  const [row] = await reader().rows<Row>("get_site", { p_domain: domain });
  if (!row) return null;
  return {
    domain: String(row.domain),
    pagesCount: num(row.pages_count),
    capturesCount: num(row.captures_count),
    lastCaptureAt: str(row.last_capture_at),
    views: num(row.views_count),
  };
}

export async function sitePages(domain: string): Promise<SitePage[]> {
  const rows = await reader().rows<Row>("site_pages", { p_domain: domain });
  return rows.map((row) => ({
    path: String(row.path),
    title: str(row.title),
    capturesCount: num(row.captures_count),
    lastCaptureAt: str(row.last_capture_at),
    latestSlug: str(row.latest_slug),
  }));
}

/** The pages of a site in address order, in chunks, with their latest version. */
export async function sitePageList(domain: string, limit: number, offset: number): Promise<SitePageCard[]> {
  const rows = await reader().rows<Row>("site_page_list", { p_domain: domain, p_limit: limit, p_offset: offset });
  return rows.map((row) => ({
    path: String(row.path),
    title: str(row.title),
    capturesCount: num(row.captures_count),
    lastCaptureAt: str(row.last_capture_at),
    slug: String(row.latest_slug),
    stats: stats(row.latest_stats),
  }));
}

/** The latest visible version of each page of the site (the megalopolis), in address order. */
export async function siteCity(domain: string): Promise<Array<Omit<SharedCity, "views" | "pageTitle" | "pageVersions" | "domain">>> {
  const rows = await reader().rows<Row>("site_city", { p_domain: domain });
  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title ?? ""),
    capturedAt: String(row.captured_at),
    source: row.source as CaptureSource,
    formatVersion: num(row.format_version),
    sizeBytes: num(row.size_bytes),
    stats: stats(row.stats),
    path: String(row.path),
  }));
}

/** Among these domains, those that have cities on DOMCity. */
export async function knownSites(domains: string[]): Promise<KnownSite[]> {
  const wanted = domains.slice(0, 60);
  if (wanted.length === 0) return [];
  const rows = await reader().rows<Row>("known_sites", { p_domains: wanted });
  return rows.map((row) => ({ domain: String(row.domain), pages: num(row.pages_count) }));
}

/** One result per site; the pages whose title matches are listed under their site. */
export async function searchSites(query: string, limit = 12): Promise<SearchHit[]> {
  const rows = await reader().rows<Row>("search_sites", { p_query: query, p_limit: limit });
  return rows.map((row) => {
    const pages = (typeof row.pages === "string" ? JSON.parse(row.pages) : (row.pages ?? [])) as Row[];
    return {
      domain: String(row.domain),
      pagesCount: num(row.pages_count),
      lastCaptureAt: str(row.last_capture_at),
      pages: pages
        .filter((page) => page.slug)
        .map((page) => ({ path: String(page.path), title: str(page.title), slug: String(page.slug) })),
      pagesMatched: num(row.pages_matched),
    };
  });
}

/** The whole list of refused sites: domain (or extension) → category. */
export async function blocklist(): Promise<Map<string, BlockCategory>> {
  const rows = await reader().rows<Row>("blocklist", {});
  const list = new Map<string, BlockCategory>();
  for (const row of rows) {
    if (isBlockCategory(row.category)) list.set(String(row.domain), row.category);
  }
  return list;
}
