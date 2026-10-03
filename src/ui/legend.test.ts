import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/format/taxonomy";
import { LEGEND_SPRITE } from "./legendSprite.generated";

describe("vignettes de la légende", () => {
  it("en a une pour chaque genre et pour les rues (sinon : npm run dev, puis ouvrir /dev/legend)", () => {
    for (const kind of [...Object.keys(KINDS), "road"]) expect(LEGEND_SPRITE.order).toContain(kind);
    expect(existsSync(join(process.cwd(), "public", LEGEND_SPRITE.src.replace(/\?.*$/, "")))).toBe(true);
  });
});
