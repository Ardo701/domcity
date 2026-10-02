import { sharingEnabled } from "@/server/config";
import { SLUG_PATTERN } from "@/server/security";
import { recordView } from "@/server/store";

/** Compte une visite (appelé une fois par session de navigateur). */
export async function POST(_request: Request, ctx: RouteContext<"/api/captures/[slug]/view">) {
  const { slug } = await ctx.params;
  if (sharingEnabled() && SLUG_PATTERN.test(slug)) {
    await recordView(slug).catch(() => undefined);
  }
  return new Response(null, { status: 204 });
}
