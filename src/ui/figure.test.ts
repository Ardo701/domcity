import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { layoutCity } from "@/city/layout";
import { figureKey, projectOn } from "./figureMeta";
import { HERO_FIGURE } from "./heroFigure.generated";
import { HERO_SAMPLE } from "./samples";

describe("home page figure", () => {
  it("shows the city the engine builds today (otherwise: npm run dev, then open /dev/figure)", () => {
    expect(figureKey(layoutCity(HERO_SAMPLE))).toBe(HERO_FIGURE.layout);
    expect(existsSync(join(process.cwd(), "public", HERO_FIGURE.src.replace(/\?.*$/, "")))).toBe(true);
  });

  it("projects every building of the sample into the image", () => {
    const city = layoutCity(HERO_SAMPLE);
    for (const lot of city.lots) {
      const [x, y] = projectOn(HERO_FIGURE, lot.x + lot.w / 2, lot.y + lot.h, lot.z + lot.d / 2);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(HERO_FIGURE.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(HERO_FIGURE.height);
    }
  });
});
