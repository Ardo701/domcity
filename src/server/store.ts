import "server-only";
import type {
  CityCard,
  CityStatsSummary,
  CityVersion,
  KnownSite,
  ReportReason,
  SearchHit,
  SharedCity,
  SitePage,
  SiteSummary,
} from "@/format/shared";
import type { CaptureSource } from "@/format/types";
import { Bytea, rpc } from "./db";

/**
 * Les opérations sur les villes partagées, au-dessus des fonctions SQL.
 * Les lectures passent avec les droits d'un visiteur ; les écritures avec la clé secrète.
 */

type Row = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const stats = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : (v ?? {})) as Partial<CityStatsSummary>;

function reader() {
  const db = rpc("public");
  if (!db) throw new Error("partage non configuré");
  return db;
}

function writer() {
  const db = rpc("admin");
  if (!db) throw new Error("partage non configuré");
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

/** Vrai si la limite est atteinte. */
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

export async function recentCaptures(limit = 12): Promise<CityCard[]> {
  const rows = await reader().rows<Row>("recent_captures", { p_limit: limit });
  return rows.map((row) => ({
    slug: String(row.slug),
    title: String(row.title ?? ""),
    capturedAt: String(row.captured_at),
    source: row.source as CaptureSource,
    stats: stats(row.stats),
    views: num(row.views_count),
    domain: String(row.domain),
    path: String(row.path),
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

/** La dernière version visible de chaque page du site (la mégalopole), dans l'ordre des adresses. */
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

/** Parmi ces domaines, ceux qui ont des villes sur DOMCity. */
export async function knownSites(domains: string[]): Promise<KnownSite[]> {
  if (domains.length === 0) return [];
  const rows = await reader().rows<Row>("known_sites", { p_domains: domains.slice(0, 60) });
  return rows.map((row) => ({ domain: String(row.domain), pages: num(row.pages_count) }));
}

export async function searchCities(query: string, limit = 12): Promise<SearchHit[]> {
  const rows = await reader().rows<Row>("search_cities", { p_query: query, p_limit: limit });
  return rows.map((row) => ({
    kind: row.kind === "page" ? "page" : "site",
    domain: String(row.domain),
    path: str(row.path),
    title: str(row.title),
    lastCaptureAt: str(row.last_capture_at),
  }));
}
