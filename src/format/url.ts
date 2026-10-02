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

/** Vrai si le lien mène au même site que la page (www. ignoré). */
export function isSameSite(pageHostname: string, linkHostname: string): boolean {
  return siteHost(pageHostname) === siteHost(linkHostname);
}
