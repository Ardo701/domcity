import { REPORT_REASONS, type ReportReason } from "@/format/shared";
import { API } from "@/i18n/messages/api";
import { sharingEnabled } from "@/server/config";
import { refreshGalleries } from "@/server/galleries";
import { clientActor, jsonError, requestLanguage, sameOrigin, SLUG_PATTERN } from "@/server/security";
import { hitRateLimit, reportCapture } from "@/server/store";

/** Reports a city. JSON body: { reason, details? }. Three reports hide it. */
export async function POST(request: Request, ctx: RouteContext<"/api/captures/[slug]/report">) {
  const m = API[requestLanguage(request)];
  if (!sharingEnabled()) return jsonError(503, m.notConfigured);
  if (!sameOrigin(request)) return jsonError(403, m.forbidden);
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug)) return jsonError(404, m.cityNotFound);

  let reason: ReportReason;
  let details: string | null;
  try {
    const body = (await request.json()) as { reason?: unknown; details?: unknown };
    if (!REPORT_REASONS.includes(body.reason as ReportReason)) return jsonError(400, m.report.badReason);
    reason = body.reason as ReportReason;
    details = typeof body.details === "string" && body.details.trim() ? body.details.trim().slice(0, 500) : null;
  } catch {
    return jsonError(400, m.unreadable);
  }

  try {
    const actor = clientActor(request);
    if (await hitRateLimit(actor, "report", 20, "1 hour")) {
      return jsonError(429, m.report.tooMany);
    }
    const recorded = await reportCapture(slug, reason, details, actor);
    // The third report hides the city: the galleries must stop showing it.
    if (recorded) refreshGalleries();
    return Response.json({ recorded });
  } catch (error) {
    console.error("report", error);
    return jsonError(500, m.report.failed);
  }
}
