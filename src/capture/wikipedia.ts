/**
 * Mode Wikipédia : l'API de Wikipédia autorise les autres sites à lire ses
 * pages (en-tête CORS `*`). Tout se passe donc dans le navigateur, sans proxy.
 */

import type { CityDoc } from "@/format/types";
import { captureDocument } from "./capture";

export const WIKI_LANGS = ["fr", "en", "de", "es", "it"] as const;
export type WikiLang = (typeof WIKI_LANGS)[number];

export function isWikiLang(value: string): value is WikiLang {
  return (WIKI_LANGS as readonly string[]).includes(value);
}

export class WikiNotFoundError extends Error {
  constructor(title: string) {
    super(`Aucun article « ${title} » sur Wikipédia.`);
    this.name = "WikiNotFoundError";
  }
}

/** « Tour Eiffel » → « Tour_Eiffel » (forme utilisée dans les adresses). */
export function toWikiSlug(title: string): string {
  return title.trim().replace(/\s+/g, "_");
}

/** Adresse de la ville d'un article sur DOMCity. */
export function wikiPath(lang: WikiLang, title: string): string {
  return `/w/${lang}/${encodeURIComponent(toWikiSlug(title))}`;
}

export function fromWikiSlug(slug: string): string {
  return slug.replace(/_/g, " ");
}

/** Reconnaît une adresse d'article collée telle quelle : https://fr.wikipedia.org/wiki/Paris */
export function parseWikipediaUrl(input: string): { lang: WikiLang; title: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.match(/^([a-z]{2,3})(?:\.m)?\.wikipedia\.org$/);
  const path = url.pathname.match(/^\/wiki\/(.+)$/);
  if (!host || !path || !isWikiLang(host[1])) return null;
  return { lang: host[1], title: fromWikiSlug(decodeURIComponent(path[1])) };
}

export interface WikiSuggestion {
  title: string;
}

export async function suggestWikipedia(
  lang: WikiLang,
  query: string,
  signal?: AbortSignal,
): Promise<WikiSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&namespace=0&limit=6` +
    `&format=json&origin=*&search=${encodeURIComponent(q)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as [string, string[]];
  return (data[1] ?? []).map((title) => ({ title }));
}

/** Trouve le titre exact (gère les redirections et les fautes de casse). */
export async function resolveWikipediaTitle(
  lang: WikiLang,
  title: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&redirects=1&format=json` +
    `&formatversion=2&origin=*&titles=${encodeURIComponent(title)}`;
  const response = await fetch(url, { signal });
  if (response.ok) {
    const data = (await response.json()) as { query?: { pages?: Array<{ title: string; missing?: boolean }> } };
    const page = data.query?.pages?.[0];
    if (page && !page.missing) return page.title;
  }
  const suggestions = await suggestWikipedia(lang, title, signal);
  return suggestions[0]?.title ?? null;
}

export interface WikiFetchResult {
  doc: CityDoc;
  /** Titre exact de l'article (après redirection). */
  title: string;
}

export async function fetchWikipediaCity(
  lang: WikiLang,
  requestedTitle: string,
  signal?: AbortSignal,
): Promise<WikiFetchResult> {
  const title = await resolveWikipediaTitle(lang, requestedTitle, signal);
  if (!title) throw new WikiNotFoundError(requestedTitle);

  const slug = toWikiSlug(title);
  const response = await fetch(
    `https://${lang}.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(slug)}/html`,
    { signal },
  );
  if (response.status === 404) throw new WikiNotFoundError(requestedTitle);
  if (!response.ok) throw new Error(`Wikipédia a répondu ${response.status}.`);

  const html = await response.text();
  const parsed = new DOMParser().parseFromString(html, "text/html");
  // Sur wikipedia.org, le titre <h1> est affiché au-dessus du contenu, mais l'API ne le renvoie pas.
  // On le remet en tête de page : c'est lui qui devient le monument principal.
  const heading = parsed.createElement("h1");
  heading.textContent = title;
  parsed.body?.prepend(heading);

  const doc = captureDocument(parsed, {
    source: "wikipedia",
    url: `https://${lang}.wikipedia.org/wiki/${slug}`,
    title,
    lang,
  });
  return { doc, title };
}
