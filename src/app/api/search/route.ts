import { sharingEnabled } from "@/server/config";
import { searchSites } from "@/server/store";

/** Recherche dans les sites partagés : « amzon » trouve amazon.com, « croissant » la page de Wikipédia. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!sharingEnabled() || q.length < 2) return Response.json({ results: [] });
  try {
    const results = await searchSites(q, 8);
    return Response.json({ results }, { headers: { "cache-control": "public, max-age=30" } });
  } catch (error) {
    console.error("recherche", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}
