import { sharingEnabled } from "@/server/config";
import { knownSites } from "@/server/store";

const DOMAIN = /^[a-z0-9.-]{3,253}$/;

/** Parmi les sites liés à une page (?d=github.com,doi.org), ceux qui ont des villes sur DOMCity. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("d") ?? "";
  const domains = [...new Set(raw.split(",").map((d) => d.trim().toLowerCase()))].filter((d) => DOMAIN.test(d)).slice(0, 60);
  if (!sharingEnabled() || domains.length === 0) return Response.json({ sites: [] });
  try {
    const sites = await knownSites(domains);
    return Response.json({ sites }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (error) {
    console.error("sites connus", error);
    return Response.json({ sites: [] }, { status: 500 });
  }
}
