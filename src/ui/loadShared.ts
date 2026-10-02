import type { CityDoc } from "@/format/types";

/** Télécharge une ville partagée (JSON compressé en gzip) et la décompresse dans le navigateur. */
export async function loadSharedCity(fileUrl: string, signal?: AbortSignal): Promise<CityDoc> {
  const response = await fetch(fileUrl, { signal });
  if (!response.ok || !response.body) throw new Error(`fichier de ville ${response.status}`);
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const doc = JSON.parse(await new Response(stream).text()) as CityDoc;
  if (doc?.format !== 1 || !doc.root) throw new Error("format de ville inconnu");
  return doc;
}

/** Compresse une ville pour l'envoi (bookmarklet). */
export async function gzipCity(doc: CityDoc): Promise<Blob> {
  const stream = new Blob([JSON.stringify(doc)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}
