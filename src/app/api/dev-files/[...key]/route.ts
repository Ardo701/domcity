import { readLocalFile } from "@/server/files";

const TYPES: Record<string, string> = {
  gz: "application/gzip",
  jpg: "image/jpeg",
};

/** Development only: serves the city files stored in .data/files (the role of R2 in production). */
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
