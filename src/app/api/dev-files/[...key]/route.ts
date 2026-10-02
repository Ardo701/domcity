import { readLocalFile } from "@/server/files";

const TYPES: Record<string, string> = {
  gz: "application/gzip",
  jpg: "image/jpeg",
};

/** En développement seulement : sert les fichiers des villes stockés dans .data/files (le rôle de R2 en production). */
export async function GET(_request: Request, ctx: RouteContext<"/api/dev-files/[...key]">) {
  const { key } = await ctx.params;
  const path = key.join("/");
  const body = await readLocalFile(path);
  if (!body) return new Response("Introuvable", { status: 404 });
  const extension = path.split(".").pop() ?? "";
  return new Response(body as BodyInit, {
    headers: {
      "content-type": TYPES[extension] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
