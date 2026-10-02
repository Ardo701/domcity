/**
 * Nettoyage des adresses : `https://www.amazon.com/livres/?ref=abc#top`
 * et `http://amazon.com/livres` désignent la même page.
 */

export interface PageAddress {
  /** Adresse propre : https://domaine/chemin */
  url: string;
  /** Domaine en minuscules, sans « www. » */
  domain: string;
  /** Chemin sans ?query ni #ancre, sans / final (sauf la racine). */
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

/** Étiquettes de second niveau qui font partie du suffixe : bbc.co.uk, abc.net.au, service-public.gouv.fr… */
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "gouv", "edu", "ac", "or", "ne", "go", "gob", "mil", "nic"]);

/** Domaine racine, approché sans liste officielle : lemonde.fr pour static.lemonde.fr, bbc.co.uk pour news.bbc.co.uk. */
export function rootDomain(hostname: string): string {
  const labels = siteHost(hostname).split(".");
  if (labels.length <= 2) return labels.join(".");
  const tld = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  const keep = tld.length === 2 && SECOND_LEVEL.has(second) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

const PRIVATE_SUFFIXES = [".local", ".localhost", ".internal", ".intranet", ".lan", ".home", ".corp", ".test", ".example", ".invalid", ".arpa"];

/** Faux pour les adresses locales ou d'intranet (localhost, 192.168.1.2, nas.local…) : elles ne se partagent pas. */
export function isPublicHost(hostname: string): boolean {
  const host = siteHost(hostname);
  if (!host.includes(".") || host.includes(":") || host.startsWith("[")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return !PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** Vrai si le lien mène au même site que la page (www. ignoré). */
export function isSameSite(pageHostname: string, linkHostname: string): boolean {
  return siteHost(pageHostname) === siteHost(linkHostname);
}
