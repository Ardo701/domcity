/**
 * L'échange entre le favori (sur la page relevée) et DOMCity (/nouveau).
 *
 * 1. Le favori ouvre /nouveau dans un nouvel onglet, puis relève la page.
 * 2. /nouveau envoie « pret » à la page qui l'a ouvert, jusqu'à recevoir la ville.
 * 3. Le favori répond avec la ville, adressée à l'origine de DOMCity et à elle seule.
 * 4. /nouveau confirme « recu ».
 *
 * Plan B, quand l'onglet n'a pas pu s'ouvrir ou que le site coupe le lien entre ses fenêtres :
 * la ville compressée voyage dans l'ancre de l'adresse (#ville=…), que le navigateur
 * n'envoie jamais à un serveur.
 *
 * Ce fichier est compilé dans le favori : aucune dépendance.
 */

import type { CityDoc } from "@/format/types";

/** À augmenter quand le favori change : /nouveau propose alors de le réinstaller. */
export const BOOKMARKLET_VERSION = 1;

export const NEW_CITY_PATH = "/nouveau";
export const HASH_KEY = "ville=";

export const MESSAGES = {
  ready: "domcity:pret",
  city: "domcity:ville",
  received: "domcity:recu",
} as const;

export interface CityMessage {
  type: typeof MESSAGES.city;
  version: number;
  city: unknown;
}

/** Ville → « 1.H4sIAAAA… » : version du favori, puis JSON compressé (gzip) en base64url. */
export async function packCity(city: CityDoc): Promise<string> {
  const stream = new Response(JSON.stringify(city)).body!.pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${BOOKMARKLET_VERSION}.${base64}`;
}

/** L'inverse de packCity. La ville n'est pas encore vérifiée : la passer à validateCityDoc. */
export async function unpackCity(packed: string): Promise<{ version: number; data: unknown }> {
  /** Taille maximale d'une ville décompressée (contre les liens piégés). */
  const MAX_JSON_BYTES = 32 * 1024 * 1024;
  const match = /^(\d{1,4})\.([A-Za-z0-9_-]+)$/.exec(packed);
  if (!match) throw new Error("ancre illisible");
  const binary = atob(match[2].replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const reader = new Response(bytes).body!.pipeThrough(new DecompressionStream("gzip")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_JSON_BYTES) {
      await reader.cancel();
      throw new Error("ville trop lourde");
    }
    chunks.push(value);
  }
  const json = new TextDecoder().decode(await new Blob(chunks as BlobPart[]).arrayBuffer());
  return { version: Number(match[1]), data: JSON.parse(json) };
}
