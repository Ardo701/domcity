import { API } from "@/i18n/messages/api";
import { sharingEnabled } from "@/server/config";
import { clientActor, jsonError, requestLanguage, sameOrigin, SLUG_PATTERN } from "@/server/security";
import { deleteSharedCity } from "@/server/share";
import { hitRateLimit } from "@/server/store";

/** Deletes a city with its secret link. JSON body: { token }. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/captures/[slug]">) {
  const m = API[requestLanguage(request)];
  if (!sharingEnabled()) return jsonError(503, m.notConfigured);
  if (!sameOrigin(request)) return jsonError(403, m.forbidden);
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug)) return jsonError(404, m.cityNotFound);

  let token = "";
  try {
    token = String(((await request.json()) as { token?: unknown }).token ?? "");
  } catch {
    return jsonError(400, m.unreadable);
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return jsonError(403, m.remove.badLink);

  try {
    if (await hitRateLimit(clientActor(request), "delete", 30, "1 hour")) {
      return jsonError(429, m.remove.tooMany);
    }
    const deleted = await deleteSharedCity(slug, token);
    if (!deleted) return jsonError(403, m.remove.alreadyGone);
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("deletion", error);
    return jsonError(500, m.remove.failed);
  }
}
