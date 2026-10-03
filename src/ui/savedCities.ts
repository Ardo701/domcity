/**
 * The cities shared from this browser, with their secret deletion link: this is a visitor's
 * "account" (there is no sign-up and no password).
 * A simple convenience: if storage is unavailable (private browsing...), we do without.
 */

import { useMemo, useSyncExternalStore } from "react";

export interface MyCity {
  slug: string;
  title: string;
  token: string;
  sharedAt: string;
  /** The address of the captured page. Missing from cities published before October 3, 2026: recovered from their file. */
  pageUrl?: string;
}

export const SAVED_CITIES_KEY = "domcity:mes-villes";
const KEY = SAVED_CITIES_KEY;

function parse(raw: string | null): MyCity[] {
  try {
    const list = raw ? (JSON.parse(raw) as MyCity[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function listMyCities(): MyCity[] {
  return parse(readRaw());
}

export function rememberCity(city: MyCity): void {
  try {
    const list = listMyCities().filter((c) => c.slug !== city.slug);
    localStorage.setItem(KEY, JSON.stringify([city, ...list].slice(0, 50)));
  } catch {
    // storage unavailable: the secret link stays displayed on screen
  }
}

/** Completes an already kept city, without changing its place in the list. */
export function updateCity(slug: string, patch: Partial<Omit<MyCity, "slug">>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listMyCities().map((c) => (c.slug === slug ? { ...c, ...patch } : c))));
  } catch {
    // storage unavailable: we will find it next time
  }
}

export function forgetCity(slug: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listMyCities().filter((c) => c.slug !== slug)));
  } catch {
    // nothing to do
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * The cities of this browser, the most recent first. `null` until they have been read
 * (server-side rendering, then the first frame): "no city" is not displayed by mistake.
 */
export function useMyCities(): MyCity[] | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw() ?? "[]", () => null);
  return useMemo(() => (raw === null ? null : parse(raw)), [raw]);
}
