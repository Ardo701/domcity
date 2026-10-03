/**
 * Wikipedia mode: the Wikipedia API lets other sites read its
 * pages (CORS header `*`). Everything therefore happens in the browser, without a proxy.
 *
 * The same code runs on the server when a city is shared: it captures
 * the article itself instead of trusting the city sent by the browser.
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

/** "Tour Eiffel" → "Tour_Eiffel" (the form used in addresses). */
export function toWikiSlug(title: string): string {
  return title.trim().replace(/\s+/g, "_");
}

/** Address of an article's city on DOMCity. */
export function wikiPath(lang: WikiLang, title: string): string {
  return `/w/${lang}/${encodeURIComponent(toWikiSlug(title))}`;
}

export function fromWikiSlug(slug: string): string {
  return slug.replace(/_/g, " ");
}

/** Recognizes an article address pasted as is: https://fr.wikipedia.org/wiki/Paris */
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

export interface WikiFetchOptions {
  /** Extra headers (server side: the User-Agent requested by Wikimedia). */
  headers?: Record<string, string>;
  /** HTML parser (server side, where the browser does not provide one). */
  parse?: (html: string) => Document;
}

export async function suggestWikipedia(
  lang: WikiLang,
  query: string,
  signal?: AbortSignal,
  options: WikiFetchOptions = {},
): Promise<WikiSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&namespace=0&limit=6` +
    `&format=json&origin=*&search=${encodeURIComponent(q)}`;
  const response = await fetch(url, { signal, headers: options.headers });
  if (!response.ok) return [];
  const data = (await response.json()) as [string, string[]];
  return (data[1] ?? []).map((title) => ({ title }));
}

/** Finds the exact title (handles redirects and case mistakes). */
export async function resolveWikipediaTitle(
  lang: WikiLang,
  title: string,
  signal?: AbortSignal,
  options: WikiFetchOptions = {},
): Promise<string | null> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&redirects=1&format=json` +
    `&formatversion=2&origin=*&titles=${encodeURIComponent(title)}`;
  const response = await fetch(url, { signal, headers: options.headers });
  if (response.ok) {
    const data = (await response.json()) as { query?: { pages?: Array<{ title: string; missing?: boolean }> } };
    const page = data.query?.pages?.[0];
    if (page && !page.missing) return page.title;
  }
  const suggestions = await suggestWikipedia(lang, title, signal, options);
  return suggestions[0]?.title ?? null;
}

export interface WikiFetchResult {
  doc: CityDoc;
  /** Exact title of the article (after redirect). */
  title: string;
}

export async function fetchWikipediaCity(
  lang: WikiLang,
  requestedTitle: string,
  signal?: AbortSignal,
  options: WikiFetchOptions = {},
): Promise<WikiFetchResult> {
  const title = await resolveWikipediaTitle(lang, requestedTitle, signal, options);
  if (!title) throw new WikiNotFoundError(requestedTitle);

  const slug = toWikiSlug(title);
  const response = await fetch(
    `https://${lang}.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(slug)}/html`,
    { signal, headers: options.headers },
  );
  if (response.status === 404) throw new WikiNotFoundError(requestedTitle);
  if (!response.ok) throw new Error(`Wikipédia a répondu ${response.status}.`);

  const html = await response.text();
  const parsed = options.parse ? options.parse(html) : new DOMParser().parseFromString(html, "text/html");
  // On wikipedia.org, the <h1> title is displayed above the content, but the API does not return it.
  // We put it back at the top of the page: it becomes the main monument.
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
