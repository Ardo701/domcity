/**
 * Address cleanup: `https://www.amazon.com/livres/?ref=abc#top`
 * and `http://amazon.com/livres` designate the same page.
 */

export interface PageAddress {
  /** Clean address: https://domain/path */
  url: string;
  /** Lowercase domain, without "www." */
  domain: string;
  /** Path without ?query or #anchor, without a trailing / (except the root). */
  path: string;
}

export function siteHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

export function normalizePageUrl(input: string): PageAddress | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const domain = siteHost(parsed.hostname);
  if (!domain.includes(".") && domain !== "localhost") return null;

  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";

  return { url: `https://${domain}${path}`, domain, path };
}

/** Second-level labels that are part of the suffix: bbc.co.uk, abc.net.au, service-public.gouv.fr... */
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "gouv", "edu", "ac", "or", "ne", "go", "gob", "mil", "nic"]);

/** Root domain, approximated without the official list: lemonde.fr for static.lemonde.fr, bbc.co.uk for news.bbc.co.uk. */
export function rootDomain(hostname: string): string {
  const labels = siteHost(hostname).split(".");
  if (labels.length <= 2) return labels.join(".");
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  const keep = tld.length === 2 && SECOND_LEVEL.has(second) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

const PRIVATE_SUFFIXES = [".local", ".localhost", ".internal", ".intranet", ".lan", ".home", ".corp", ".test", ".example", ".invalid", ".arpa"];

/** False for local or intranet addresses (localhost, 192.168.1.2, nas.local...): they are not shared. */
export function isPublicHost(hostname: string): boolean {
  const host = siteHost(hostname);
  if (!host.includes(".") || host.includes(":") || host.startsWith("[")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return !PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** True if the link leads to the same site as the page (www. ignored). */
export function isSameSite(pageHostname: string, linkHostname: string): boolean {
  return siteHost(pageHostname) === siteHost(linkHostname);
}
