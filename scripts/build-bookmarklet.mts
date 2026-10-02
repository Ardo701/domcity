/**
 * Compile le favori DOMCity (src/bookmarklet/main.ts et le relevé) en une seule ligne,
 * rangée dans src/bookmarklet/generated.ts.
 *
 * npm run bookmarklet (lancé aussi avant chaque build). Un test vérifie que le fichier est à jour.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));

export async function buildBookmarklet(): Promise<string> {
  const result = await build({
    entryPoints: [path("src/bookmarklet/main.ts")],
    tsconfig: path("tsconfig.json"),
    bundle: true,
    write: false,
    minify: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    legalComments: "none",
    logLevel: "silent",
  });
  return result.outputFiles[0].text.trim();
}

export function generatedModule(code: string): string {
  return [
    "// Généré par scripts/build-bookmarklet.mts (npm run bookmarklet) : ne pas modifier à la main.",
    "",
    "/** Code minifié du favori. L'adresse de DOMCity y est inscrite à l'installation (voir href.ts). */",
    `export const BOOKMARKLET_CODE =\n  ${JSON.stringify(code)};`,
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const code = await buildBookmarklet();
  await writeFile(path("src/bookmarklet/generated.ts"), generatedModule(code));
  console.log(`Favori compilé : ${code.length} caractères.`);
}
