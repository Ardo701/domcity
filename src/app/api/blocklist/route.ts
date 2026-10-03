import { BLOCK_CATEGORIES, type BlockCategory } from "@/format/blocklist";
import { sharingEnabled } from "@/server/config";
import { blocklist } from "@/server/store";

/**
 * La liste des sites refusés, entière : { adult: [...], bank: [...] }. Le navigateur la télécharge
 * et vérifie seul les sites et les images d'une ville : il n'envoie rien de la page visitée.
 * Quelques milliers de domaines, gardés quelques minutes par le navigateur et par le réseau de Vercel.
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
    console.error("liste des sites refusés", error);
    return Response.json({ error: "Liste indisponible." }, { status: 500 });
  }
}
