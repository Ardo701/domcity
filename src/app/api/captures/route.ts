import { isWikiLang } from "@/capture/wikipedia";
import { deleteCityPath, sharedCityPath } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { sharingEnabled, siteUrl } from "@/server/config";
import { clientActor, jsonError, sameOrigin } from "@/server/security";
import { captureWikipediaOnServer, readThumbnail, readUploadedCity, shareCity, ShareError } from "@/server/share";
import { hitRateLimit } from "@/server/store";

/** Partager une ville. Corps multipart : source, (lang + title) ou city (gzip), thumbnail (jpeg). */
export async function POST(request: Request) {
  if (!sharingEnabled()) return jsonError(503, "Le partage n'est pas encore configuré.");
  if (!sameOrigin(request)) return jsonError(403, "Requête refusée.");

  try {
    if (await hitRateLimit(clientActor(request), "share", 10, "1 hour")) {
      return jsonError(429, "Trop de partages d'un coup. Réessayez dans une heure.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "Requête illisible.");
    }

    let doc: CityDoc;
    const source = form.get("source");
    if (source === "wikipedia") {
      const lang = String(form.get("lang") ?? "");
      const title = String(form.get("title") ?? "").trim();
      if (!isWikiLang(lang) || !title || title.length > 300) return jsonError(400, "Article invalide.");
      doc = await captureWikipediaOnServer(lang, title);
    } else if (source === "bookmarklet") {
      const city = form.get("city");
      if (!(city instanceof Blob)) return jsonError(400, "Ville manquante.");
      doc = readUploadedCity(new Uint8Array(await city.arrayBuffer()));
      if (doc.source !== "bookmarklet") return jsonError(400, "Source incohérente.");
    } else {
      return jsonError(400, "Source inconnue.");
    }

    const thumb = form.get("thumbnail");
    const thumbnail = thumb instanceof Blob && thumb.size > 0 ? readThumbnail(new Uint8Array(await thumb.arrayBuffer())) : null;

    const { slug, token, pageUrl } = await shareCity(doc, thumbnail);
    const base = siteUrl(request);
    return Response.json(
      {
        slug,
        title: doc.title,
        pageUrl,
        url: `${base}${sharedCityPath(slug)}`,
        deleteUrl: `${base}${deleteCityPath(slug, token)}`,
        token,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ShareError) return jsonError(error.status, error.message);
    console.error("partage", error);
    return jsonError(500, "Le partage a échoué. Réessayez dans un instant.");
  }
}
