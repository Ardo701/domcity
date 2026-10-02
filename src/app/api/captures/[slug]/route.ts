import { sharingEnabled } from "@/server/config";
import { clientActor, jsonError, sameOrigin, SLUG_PATTERN } from "@/server/security";
import { deleteSharedCity } from "@/server/share";
import { hitRateLimit } from "@/server/store";

/** Supprimer une ville avec son lien secret. Corps JSON : { token }. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/captures/[slug]">) {
  if (!sharingEnabled()) return jsonError(503, "Le partage n'est pas encore configuré.");
  if (!sameOrigin(request)) return jsonError(403, "Requête refusée.");
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug)) return jsonError(404, "Ville introuvable.");

  let token = "";
  try {
    token = String(((await request.json()) as { token?: unknown }).token ?? "");
  } catch {
    return jsonError(400, "Requête illisible.");
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return jsonError(403, "Lien de suppression invalide.");

  try {
    if (await hitRateLimit(clientActor(request), "delete", 30, "1 hour")) {
      return jsonError(429, "Trop de tentatives. Réessayez plus tard.");
    }
    const deleted = await deleteSharedCity(slug, token);
    if (!deleted) return jsonError(403, "Lien de suppression invalide, ou ville déjà supprimée.");
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("suppression", error);
    return jsonError(500, "La suppression a échoué. Réessayez dans un instant.");
  }
}
