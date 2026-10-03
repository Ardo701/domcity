/**
 * Les villes partagées depuis ce navigateur, avec leur lien secret de suppression : c'est le « compte »
 * d'un visiteur (il n'y a ni inscription ni mot de passe).
 * Simple confort : si le stockage est indisponible (navigation privée…), on fait sans.
 */

import { useMemo, useSyncExternalStore } from "react";

export interface MyCity {
  slug: string;
  title: string;
  token: string;
  sharedAt: string;
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
    // stockage indisponible : le lien secret reste affiché à l'écran
  }
}

export function forgetCity(slug: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listMyCities().filter((c) => c.slug !== slug)));
  } catch {
    // rien à faire
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * Les villes de ce navigateur, la plus récente d'abord. `null` tant qu'on ne les a pas lues
 * (rendu côté serveur, puis la première image) : on n'affiche pas « aucune ville » par erreur.
 */
export function useMyCities(): MyCity[] | null {
  const raw = useSyncExternalStore(subscribe, () => readRaw() ?? "[]", () => null);
  return useMemo(() => (raw === null ? null : parse(raw)), [raw]);
}
