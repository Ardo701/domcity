import { isWikiLang } from "@/capture/wikipedia";
import type { Refusal } from "@/format/blocklist";
import { deleteCityPath, sharedCityPath, type DuplicateAnswer } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { API } from "@/i18n/messages/api";
import { REFUSAL } from "@/i18n/messages/refusal";
import { sharingEnabled, siteUrl } from "@/server/config";
import { refreshGalleries } from "@/server/galleries";
import { clientActor, jsonError, requestLanguage, sameOrigin } from "@/server/security";
import {
  captureWikipediaOnServer,
  DuplicateCity,
  readThumbnail,
  readUploadedCity,
  shareCity,
  ShareError,
} from "@/server/share";
import { hitRateLimit } from "@/server/store";

/**
 * Shares a city. Multipart body: source, (lang + title) or city (gzip), thumbnail (jpeg), and newVersionOf
 * (the slug of the recent version the visitor confirmed over, after a 409 "recent").
 */
export async function POST(request: Request) {
  const locale = requestLanguage(request);
  const m = API[locale];
  if (!sharingEnabled()) return jsonError(503, m.notConfigured);
  if (!sameOrigin(request)) return jsonError(403, m.forbidden);

  try {
    if (await hitRateLimit(clientActor(request), "share", 10, "1 hour")) {
      return jsonError(429, m.share.tooMany);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, m.unreadable);
    }

    let doc: CityDoc;
    const source = form.get("source");
    if (source === "wikipedia") {
      const lang = String(form.get("lang") ?? "");
      const title = String(form.get("title") ?? "").trim();
      if (!isWikiLang(lang) || !title || title.length > 300) return jsonError(400, m.share.badArticle);
      doc = await captureWikipediaOnServer(lang, title);
    } else if (source === "bookmarklet") {
      const city = form.get("city");
      if (!(city instanceof Blob)) return jsonError(400, m.share.missingCity);
      doc = readUploadedCity(new Uint8Array(await city.arrayBuffer()));
      if (doc.source !== "bookmarklet") return jsonError(400, m.share.badSource);
    } else {
      return jsonError(400, m.share.unknownSource);
    }

    const thumb = form.get("thumbnail");
    const thumbnail = thumb instanceof Blob && thumb.size > 0 ? readThumbnail(new Uint8Array(await thumb.arrayBuffer())) : null;

    const newVersionOf = String(form.get("newVersionOf") ?? "") || null;
    const { slug, token, pageUrl } = await shareCity(doc, thumbnail, { newVersionOf });
    refreshGalleries();
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
    if (error instanceof DuplicateCity) {
      const answer: DuplicateAnswer = {
        error: m.duplicate[error.duplicate](error.existing.capturedAt),
        duplicate: error.duplicate,
        existing: error.existing,
        difference: error.difference,
      };
      return Response.json(answer, { status: 409 });
    }
    if (error instanceof ShareError) {
      const message =
        error.code === "refused" ? REFUSAL[locale].reasons[error.detail as Refusal] : m.share[error.code](error.detail);
      return jsonError(error.status, message);
    }
    console.error("share", error);
    return jsonError(500, m.share.failed);
  }
}
