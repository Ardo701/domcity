/**
 * The languages of the site. English is the default; French when the browser asks for it first.
 * A choice made with the language switcher is kept in a cookie and wins over the browser.
 *
 * No dependencies: used by the proxy, the route handlers, the pages and the browser.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** The cookie set by the language switcher. */
export const LOCALE_COOKIE = "locale";
/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", fr: "Français" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * The first language of the Accept-Language header that the site speaks, by preference order:
 * "fr-FR,fr;q=0.9,en;q=0.8" gives fr, "de-DE,de;q=0.9,en;q=0.8" gives en, "de" gives the default.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((entry) => entry.lang).find(isLocale) ?? DEFAULT_LOCALE;
}

/** The language of a request: the switcher's cookie, otherwise the browser's languages. */
export function requestLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookie) ? cookie : negotiateLocale(acceptLanguage);
}

/** Messages in every language, side by side: TypeScript checks that the French ones match the English ones. */
export type Messages<T> = Record<Locale, T>;

export function defineMessages<T>(messages: { en: T; fr: NoInfer<T> }): Messages<T> {
  return messages;
}
