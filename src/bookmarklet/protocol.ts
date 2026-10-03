/**
 * The exchange between the bookmarklet (on the captured page) and DOMCity (/nouveau).
 *
 * 1. The bookmarklet opens /nouveau in a new tab, then captures the page.
 * 2. /nouveau sends "pret" to the page that opened it, until it receives the city.
 * 3. The bookmarklet answers with the city, addressed to the DOMCity origin and to it alone.
 * 4. /nouveau confirms "recu".
 *
 * Plan B, when the tab could not open or the site cuts the link between its windows:
 * the compressed city travels in the address fragment (#ville=...), which the browser
 * never sends to a server.
 *
 * This file is compiled into the bookmarklet: no dependencies.
 */

import type { CityDoc } from "@/format/types";

/** Increase when the bookmarklet changes: /nouveau then offers to reinstall it. */
export const BOOKMARKLET_VERSION = 4;

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

/** City → "1.H4sIAAAA...": bookmarklet version, then gzip-compressed JSON in base64url. */
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

/** The inverse of packCity. The city is not verified yet: pass it to validateCityDoc. */
export async function unpackCity(packed: string): Promise<{ version: number; data: unknown }> {
  /** Maximum size of a decompressed city (against booby-trapped links). */
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
      throw new Error("city too large");
    }
    chunks.push(value);
  }
  const json = new TextDecoder().decode(await new Blob(chunks as BlobPart[]).arrayBuffer());
  return { version: Number(match[1]), data: JSON.parse(json) };
}
