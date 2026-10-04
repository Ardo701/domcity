import { sharingEnabled } from "@/server/config";
import { searchSites } from "@/server/store";

/** Searches the shared sites: "amzon" finds amazon.com, "croissant" the Wikipedia page. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!sharingEnabled() || q.length < 2) return Response.json({ results: [] });
  try {
    const results = await searchSites(q, 8);
    return Response.json({ results }, { headers: { "cache-control": "public, max-age=30" } });
  } catch (error) {
    console.error("search", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}
