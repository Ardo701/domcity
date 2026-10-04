import { isPublicHost } from "@/format/url";
import { sharingEnabled } from "@/server/config";
import { recentPageVersions } from "@/server/share";

const DOMAIN = /^[a-z0-9.-]{3,253}$/;

/**
 * The pages of a site (?d=example.org) published less than 30 days ago: the share panel warns before publishing
 * a new version. Never cached, so that a city published a minute ago counts.
 */
export async function GET(request: Request) {
  const domain = (new URL(request.url).searchParams.get("d") ?? "").trim().toLowerCase();
  if (!sharingEnabled() || !DOMAIN.test(domain) || !isPublicHost(domain)) return Response.json({ pages: [] });
  try {
    const pages = await recentPageVersions(domain);
    return Response.json({ pages }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("recent pages", error);
    return Response.json({ pages: [] }, { status: 500 });
  }
}
