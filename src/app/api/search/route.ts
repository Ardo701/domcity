import { sharingEnabled } from "@/server/config";
import { searchCities } from "@/server/store";

/** Recherche dans les villes partagées : « amzon » trouve amazon.com. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!sharingEnabled() || q.length < 2) return Response.json({ results: [] });
  try {
    const results = await searchCities(q, 12);
    return Response.json({ results }, { headers: { "cache-control": "public, max-age=30" } });
  } catch (error) {
    console.error("recherche", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}
