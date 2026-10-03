import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const Meta = z.object({
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  matrix: z.array(z.number()).length(16),
  layout: z.string().regex(/^[0-9a-f]{8}$/),
});

/**
 * Développement seulement : enregistre la figure de l'accueil rendue par /dev/figure
 * (l'image dans public/figures, sa caméra et son empreinte dans src/ui/heroFigure.generated.ts).
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const form = await request.formData();
  const image = form.get("image");
  const meta = Meta.safeParse(JSON.parse(String(form.get("meta") ?? "null")));
  if (!(image instanceof Blob) || image.size > 8 * 1024 * 1024 || !meta.success) return new Response(null, { status: 400 });
  const bytes = new Uint8Array(await image.arrayBuffer());
  // RIFF....WEBP
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") {
    return new Response(null, { status: 400 });
  }

  const root = process.cwd();
  await mkdir(join(root, "public", "figures"), { recursive: true });
  await writeFile(join(root, "public", "figures", "accueil.webp"), bytes);
  const { width, height, matrix, layout } = meta.data;
  // L'adresse change avec l'image : les navigateurs ne gardent pas l'ancienne.
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  const source = `// Généré par /dev/figure (npm run dev) : ne pas modifier à la main.
import type { FigureMeta } from "./figureMeta";

export const HERO_FIGURE: FigureMeta = {
  src: "/figures/accueil.webp?v=${version}",
  width: ${width},
  height: ${height},
  matrix: [${matrix.map((v) => Number(v.toPrecision(10))).join(", ")}],
  layout: "${layout}",
};
`;
  await writeFile(join(root, "src", "ui", "heroFigure.generated.ts"), source);
  return new Response(null, { status: 204 });
}
