/** Numbers, weights, dates and plurals in the page's language. */

import type { Locale } from "./locale";

const numberFormats: Partial<Record<Locale, Intl.NumberFormat>> = {};

/** 3,244 in English, 3 244 in French. */
export function formatCount(value: number, locale: Locale): string {
  numberFormats[locale] ??= new Intl.NumberFormat(locale);
  return numberFormats[locale].format(Math.round(value));
}

/** A number with its noun: "1 city", "2 cities"; in French, 0 and 1 take the singular ("0 ville"). */
export function plural(locale: Locale, value: number, one: string, other: string): string {
  const n = Math.abs(Math.round(value));
  const many = locale === "fr" ? n >= 2 : n !== 1;
  return `${formatCount(value, locale)} ${many ? other : one}`;
}

/** A decimal number: 2.4 in English, 2,4 in French. */
export function formatDecimal(value: number, locale: Locale, digits = 1, minDigits = digits): string {
  return value.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: minDigits });
}

const BYTE_UNITS: Record<Locale, [string, string, string]> = { en: ["B", "KB", "MB"], fr: ["o", "Ko", "Mo"] };

/** Readable weight: 840 KB, 2.4 MB (840 Ko, 2,4 Mo in French). */
export function formatBytes(bytes: number, locale: Locale): string {
  const [b, kb, mb] = BYTE_UNITS[locale];
  if (bytes < 1024) return `${formatCount(bytes, locale)} ${b}`;
  if (bytes < 1024 * 1024) return `${formatCount(bytes / 1024, locale)} ${kb}`;
  return `${formatDecimal(bytes / 1024 / 1024, locale)} ${mb}`;
}

/** Megabytes in decimal units (the weight the browser measured): 2.4 MB. */
export function formatMegabytes(bytes: number, locale: Locale): string {
  const mb = BYTE_UNITS[locale][2];
  return `${formatDecimal(bytes / 1_000_000, locale, 1, bytes < 10_000_000 ? 1 : 0)} ${mb}`;
}

/** October 4, 2026 / 4 octobre 2026. */
export function longDate(iso: string | Date, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

/** Oct 4 / 4 oct. */
export function shortDate(iso: string | Date, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** 10.04.2026 in English order (month first), 04.10.2026 in French: the cartouche's dotted date. */
export function dottedDate(iso: string | Date, locale: Locale): string {
  return new Date(iso)
    .toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replaceAll("/", ".");
}

/** October 4, 2026 at 2:05 PM / 4 octobre 2026 à 14:05. */
export function dateTime(iso: string | Date, locale: Locale): string {
  return new Date(iso).toLocaleString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** 14% in English, 14 % in French. */
export function formatPercent(value: number, locale: Locale): string {
  return value.toLocaleString(locale, { style: "percent", maximumFractionDigits: 0 });
}

/** 3 days ago / il y a 3 jours, yesterday / hier; a minute ago at the least. */
export function timeAgo(iso: string | Date, locale: Locale, now = Date.now()): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (seconds < 3600) return relative.format(-Math.max(1, Math.floor(seconds / 60)), "minute");
  if (seconds < 86_400) return relative.format(-Math.floor(seconds / 3600), "hour");
  return relative.format(-Math.floor(seconds / 86_400), "day");
}
