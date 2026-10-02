/**
 * Les villes partagées depuis ce navigateur, avec leur lien secret de suppression.
 * Simple confort : si le stockage est indisponible (navigation privée…), on fait sans.
 */

export interface MyCity {
  slug: string;
  title: string;
  token: string;
  sharedAt: string;
}

export const SAVED_CITIES_KEY = "domcity:mes-villes";
const KEY = SAVED_CITIES_KEY;

export function listMyCities(): MyCity[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MyCity[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
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
