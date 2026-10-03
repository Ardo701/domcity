import "server-only";
import { gunzipSync, gzipSync } from "node:zlib";
import { DOMParser } from "linkedom";
import { fetchWikipediaCity, type WikiLang } from "@/capture/wikipedia";
import { layoutCity } from "@/city/layout";
import { cityRefusal } from "@/format/blocklist";
import { validateCityDoc } from "@/format/schema";
import { THUMBNAIL, type CityStatsSummary } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { isPublicHost, normalizePageUrl } from "@/format/url";
import { cityKey, fileStore, thumbKey } from "./files";
import { hashToken, newDeleteToken } from "./security";
import * as store from "./store";

/** Taille maximale d'une ville compressée, et une fois décompressée (contre les bombes gzip). */
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

/** Relève l'article sur Wikipédia depuis le serveur : on ne fait pas confiance à la ville envoyée. */
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

/** Ville envoyée telle quelle (bookmarklet) : gzip borné, puis validation stricte. */
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

/** Largeur et hauteur d'un JPEG, lues dans son en-tête (marqueur SOF), ou null. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Marqueurs sans longueur.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    // Début de l'image (SOF0 à SOF15, sauf C4, C8 et CC qui sont d'autres marqueurs).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    // Les données commencent sans que la taille ait été donnée.
    if (marker === 0xda) return null;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return null;
}

/**
 * Miniature : un JPEG au format de celle que fait le moteur, et rien d'autre. Le serveur ne peut
 * pas savoir ce qu'elle montre (il ne sait pas rendre la 3D) ; une image détournée se signale.
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
}

/**
 * Publie une ville : ligne en attente → fichiers dans le stockage → ligne visible.
 * Si l'envoi des fichiers échoue, on efface la ligne : rien ne reste à moitié publié.
 */
export async function shareCity(doc: CityDoc, thumbnail: Uint8Array | null): Promise<ShareResult> {
  const files = fileStore();
  if (!files) throw new ShareError(503, "Le partage n'est pas configuré.");

  const address = normalizePageUrl(doc.url);
  if (!address) throw new ShareError(400, "Adresse de page invalide.");
  if (!isPublicHost(address.domain)) throw new ShareError(400, "Les pages locales ou d'intranet ne se partagent pas.");
  const refusal = cityRefusal(doc);
  if (refusal) throw new ShareError(403, refusal);
  if (address.path.length > 1024) throw new ShareError(400, "Adresse de page trop longue.");

  const canonical: CityDoc = { ...doc, url: address.url };
  const body = new Uint8Array(gzipSync(JSON.stringify(canonical), { level: 9 }));
  if (body.byteLength > MAX_GZIP_BYTES) throw new ShareError(413, "Ville trop lourde.");

  const token = newDeleteToken();
  const tokenHash = hashToken(token);
  const slug = await store.createCapture({
    domain: address.domain,
    path: address.path,
    source: doc.source,
    title: doc.title.slice(0, 300),
    sizeBytes: body.byteLength,
    stats: { ...statsOf(canonical), thumbnail: thumbnail !== null },
    deleteTokenHash: tokenHash,
  });

  try {
    await files.put(cityKey(slug), body, "application/gzip");
    if (thumbnail) await files.put(thumbKey(slug), thumbnail, "image/jpeg");
    const published = await store.publishCapture(slug);
    if (!published) throw new Error("publication refusée");
  } catch (error) {
    await store.deleteCapture(slug, tokenHash).catch(() => undefined);
    await files.remove([cityKey(slug), thumbKey(slug)]).catch(() => undefined);
    throw error;
  }
  return { slug, token };
}

/** Supprime la ville si le jeton correspond, puis ses fichiers. */
export async function deleteSharedCity(slug: string, token: string): Promise<boolean> {
  const deleted = await store.deleteCapture(slug, hashToken(token));
  if (!deleted) return false;
  await fileStore()?.remove([cityKey(slug), thumbKey(slug)]);
  return true;
}
