import { REPORT_REASONS, type ReportReason } from "@/format/shared";
import { sharingEnabled } from "@/server/config";
import { clientActor, jsonError, sameOrigin, SLUG_PATTERN } from "@/server/security";
import { hitRateLimit, reportCapture } from "@/server/store";

/** Reports a city. JSON body: { reason, details? }. Three reports hide it. */
export async function POST(request: Request, ctx: RouteContext<"/api/captures/[slug]/report">) {
  if (!sharingEnabled()) return jsonError(503, "Le partage n'est pas encore configuré.");
  if (!sameOrigin(request)) return jsonError(403, "Requête refusée.");
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug)) return jsonError(404, "Ville introuvable.");

  let reason: ReportReason;
  let details: string | null;
  try {
    const body = (await request.json()) as { reason?: unknown; details?: unknown };
    if (typeof body.reason !== "string" || !(body.reason in REPORT_REASONS)) return jsonError(400, "Motif inconnu.");
    reason = body.reason as ReportReason;
    details = typeof body.details === "string" && body.details.trim() ? body.details.trim().slice(0, 500) : null;
  } catch {
    return jsonError(400, "Requête illisible.");
  }

  try {
    const actor = clientActor(request);
    if (await hitRateLimit(actor, "report", 20, "1 hour")) {
      return jsonError(429, "Trop de signalements. Réessayez plus tard.");
    }
    const recorded = await reportCapture(slug, reason, details, actor);
    return Response.json({ recorded });
  } catch (error) {
    console.error("signalement", error);
    return jsonError(500, "Le signalement a échoué.");
  }
}
