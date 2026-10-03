import { BLOCK_CATEGORIES, type BlockCategory } from "@/format/blocklist";
import { sharingEnabled } from "@/server/config";
import { blocklist } from "@/server/store";

/**
 * The full list of refused sites: { adult: [...], bank: [...] }. The browser downloads it
 * and checks a city's sites and images on its own: it sends nothing about the visited page.
 * A few thousand domains, cached for a few minutes by the browser and by Vercel's network.
 */
export async function GET() {
  if (!sharingEnabled()) return Response.json({ error: "Liste indisponible." }, { status: 503 });
  try {
    const grouped = Object.fromEntries(BLOCK_CATEGORIES.map((category) => [category, [] as string[]])) as Record<
      BlockCategory,
      string[]
    >;
    for (const [domain, category] of await blocklist()) grouped[category].push(domain);
    return Response.json(grouped, {
      headers: { "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("refused sites list", error);
    return Response.json({ error: "Liste indisponible." }, { status: 500 });
  }
}
