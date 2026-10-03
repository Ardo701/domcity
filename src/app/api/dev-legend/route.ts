import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const Meta = z.object({
  cell: z.number().int().positive().max(512),
  columns: z.number().int().positive().max(32),
  order: z.array(z.string().regex(/^[a-z]+$/)).min(1).max(128),
});

/**
 * Développement seulement : enregistre les vignettes de la légende rendues par /dev/legend
 * (l'image dans public/figures, leur ordre dans src/ui/legendSprite.generated.ts).
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
  await writeFile(join(root, "public", "figures", "legende.webp"), bytes);
  const { cell, columns, order } = meta.data;
  // L'adresse change avec l'image : les navigateurs ne gardent pas l'ancienne.
  const version = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  const source = `// Généré par /dev/legend (npm run dev) : ne pas modifier à la main.

export const LEGEND_SPRITE = {
  src: "/figures/legende.webp?v=${version}",
  cell: ${cell},
  columns: ${columns},
  order: [${order.map((key) => `"${key}"`).join(", ")}],
};
`;
  await writeFile(join(root, "src", "ui", "legendSprite.generated.ts"), source);
  return new Response(null, { status: 204 });
}
