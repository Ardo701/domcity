import "server-only";
import { gunzipSync, gzipSync } from "node:zlib";
import { DOMParser } from "linkedom";
import { fetchWikipediaCity, type WikiLang } from "@/capture/wikipedia";
import { layoutCity } from "@/city/layout";
import { cityRefusal, withoutBlocked } from "@/format/blocklist";
import { validateCityDoc } from "@/format/schema";
import { THUMBNAIL, type CityStatsSummary } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { isPublicHost, normalizePageUrl } from "@/format/url";
import { cityKey, fileStore, thumbKey } from "./files";
import { hashToken, newDeleteToken } from "./security";
import * as store from "./store";

/** Maximum size of a compressed city, and once decompressed (against gzip bombs). */
const MAX_GZIP_BYTES = 2 * 1024 * 1024;
const MAX_JSON_BYTES = 32 * 1024 * 1024;
const MAX_THUMB_BYTES = 800 * 1024;

export class ShareError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Captures the article on Wikipedia from the server: the city sent is not trusted. */
export async function captureWikipediaOnServer(lang: WikiLang, title: string): Promise<CityDoc> {
  const { doc } = await fetchWikipediaCity(lang, title, AbortSignal.timeout(20_000), {
    headers: {
      "user-agent": "DOMCity/0.1 (https://domcity.app)",
      "api-user-agent": "DOMCity/0.1 (https://domcity.app)",
    },
    parse: (html) => new DOMParser().parseFromString(html, "text/html") as unknown as Document,
  });
  return doc;
}

/** City sent as is (bookmarklet): bounded gzip, then strict validation. */
export function readUploadedCity(gzipped: Uint8Array): CityDoc {
  if (gzipped.byteLength > MAX_GZIP_BYTES) throw new ShareError(413, "Ville trop lourde.");
  let text: string;
  try {
    text = gunzipSync(gzipped, { maxOutputLength: MAX_JSON_BYTES }).toString("utf8");
  } catch {
    throw new ShareError(400, "Fichier de ville illisible.");
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ShareError(400, "Fichier de ville illisible.");
  }
  const result = validateCityDoc(data);
  if (!result.ok) throw new ShareError(400, `Ville invalide (${result.error}).`);
  return result.doc;
}

/** Width and height of a JPEG, read from its header (SOF marker), or null. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Markers without length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    // Start of frame (SOF0 to SOF15, except C4, C8 and CC, which are other markers).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    // The data starts without the size having been given.
    if (marker === 0xda) return null;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

/**
 * Thumbnail: a JPEG in the format of the one the engine makes, and nothing else. The server cannot
 * know what it shows (it cannot render the 3D); a misused image gets reported.
 */
export function readThumbnail(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength > MAX_THUMB_BYTES) throw new ShareError(413, "Miniature trop lourde.");
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg) throw new ShareError(400, "La miniature doit être un JPEG.");
  const size = jpegSize(bytes);
  if (size?.width !== THUMBNAIL.width || size.height !== THUMBNAIL.height) {
    throw new ShareError(400, `La miniature doit faire ${THUMBNAIL.width} × ${THUMBNAIL.height} pixels.`);
  }
  return bytes;
}

export function statsOf(doc: CityDoc): CityStatsSummary {
  const layout = layoutCity(doc);
  return { ...layout.stats, elements: layout.lots.length };
}

export interface ShareResult {
  slug: string;
  token: string;
  /** The published address, cleaned (without www., parameters or anchor). */
  pageUrl: string;
}

/**
 * Publishes a city: pending row → files in storage → visible row.
 * If uploading the files fails, the row is deleted: nothing stays half published.
 */
export async function shareCity(doc: CityDoc, thumbnail: Uint8Array | null): Promise<ShareResult> {
  const files = fileStore();
  if (!files) throw new ShareError(503, "Le partage n'est pas configuré.");

  const address = normalizePageUrl(doc.url);
  if (!address) throw new ShareError(400, "Adresse de page invalide.");
  if (!isPublicHost(address.domain)) throw new ShareError(400, "Les pages locales ou d'intranet ne se partagent pas.");
  // Refused sites (in the database): no city for them, and their images do not leave with another site's city.
  const blocked = await store.blocklist();
  const refusal = cityRefusal(doc, blocked);
  if (refusal) throw new ShareError(403, refusal);
  if (address.path.length > 1024) throw new ShareError(400, "Adresse de page trop longue.");

  const canonical: CityDoc = { ...withoutBlocked(doc, blocked), url: address.url };
  const body = new Uint8Array(gzipSync(JSON.stringify(canonical), { level: 9 }));
  if (body.byteLength > MAX_GZIP_BYTES) throw new ShareError(413, "Ville trop lourde.");

  const token = newDeleteToken();
  const tokenHash = hashToken(token);
  let slug: string;
  try {
    slug = await store.createCapture({
      domain: address.domain,
      path: address.path,
      source: doc.source,
      title: doc.title.slice(0, 300),
      sizeBytes: body.byteLength,
      stats: { ...statsOf(canonical), thumbnail: thumbnail !== null },
      deleteTokenHash: tokenHash,
    });
  } catch (error) {
    // The database refuses too: a site added to the list in the meantime.
    if (error instanceof Error && error.message.includes("blocked_domain")) {
      throw new ShareError(403, "Ce site est sur la liste des sites refusés par DOMCity.");
    }
    throw error;
  }

  try {
    await files.put(cityKey(slug), body, "application/gzip");
    if (thumbnail) await files.put(thumbKey(slug), thumbnail, "image/jpeg");
    const published = await store.publishCapture(slug);
    if (!published) throw new Error("publish refused");
  } catch (error) {
    await store.deleteCapture(slug, tokenHash).catch(() => undefined);
    await files.remove([cityKey(slug), thumbKey(slug)]).catch(() => undefined);
    throw error;
  }
  return { slug, token, pageUrl: address.url };
}

/** Deletes the city if the token matches, then its files. */
export async function deleteSharedCity(slug: string, token: string): Promise<boolean> {
  const deleted = await store.deleteCapture(slug, hashToken(token));
  if (!deleted) return false;
  await fileStore()?.remove([cityKey(slug), thumbKey(slug)]);
  return true;
}
