import { describe, expect, it } from "vitest";
import { projectOn } from "@/ui/figureMeta";
import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import { demoCity } from "./demoCity";
import { VIEW, viewPoint } from "./scene";
import { DURATION, KEYSTROKES, STEPS, T, along } from "./timeline";

describe("bookmarklet demo", () => {
  const city = demoCity();
  const lots = [...city.containers, ...city.buildings, ...city.panels];

  it("draws every element of the sample page inside the window", () => {
    expect(lots).toHaveLength(35);
    for (const { page } of lots) {
      expect(page.x).toBeGreaterThanOrEqual(0);
      expect(page.y).toBeGreaterThanOrEqual(0);
      expect(page.x + page.w).toBeLessThanOrEqual(VIEW.width);
      expect(page.y + page.h).toBeLessThanOrEqual(VIEW.height);
    }
  });

  it("lays the blocks exactly on the buildings of the engine's image", () => {
    const k = city.image.width / HERO_FIGURE.width;
    for (const lot of city.buildings) {
      for (const [x, y, z] of [
        [lot.x, lot.y, lot.z],
        [lot.x + lot.w, lot.y + lot.h, lot.z + lot.d],
      ]) {
        const [px, py] = projectOn(HERO_FIGURE, x, y, z);
        const [vx, vy] = viewPoint(city.final, x, y, z);
        // To a tenth of a pixel: the model blends into the image without a visible offset.
        expect(Math.abs(vx - (city.image.x + px * k))).toBeLessThan(0.1);
        expect(Math.abs(vy - (city.image.y + py * k))).toBeLessThan(0.1);
      }
    }
  });

  it("makes the monument rise from the ground last", () => {
    const last = city.buildings.reduce((a, b) => (b.rank > a.rank ? b : a));
    expect(last.tag).toBe("h1");
    expect(new Set(city.buildings.map((lot) => lot.rank)).size).toBe(city.buildings.length);
  });

  it("hangs the page's two images on their facade", () => {
    expect(city.panels.map((lot) => lot.panel?.src)).toEqual(["/figures/sample-logo.svg", "/figures/sample-poster.svg"]);
  });

  it("chains the steps without gaps and loops without a jump", () => {
    expect(STEPS[0].from).toBe(0);
    STEPS.slice(1).forEach((step, i) => expect(step.from).toBe(STEPS[i].to));
    expect(STEPS.at(-1)!.to).toBe(DURATION);
    for (const step of STEPS) {
      expect(step.still).toBeGreaterThan(step.from);
      expect(step.still).toBeLessThan(step.to);
    }
    expect(KEYSTROKES.at(-1)!).toBeLessThan(T.enter);
    const keys = [
      [0, 10, 20],
      [5, 300, 40],
      [DURATION, 10, 20],
    ] as const;
    expect(along(0, keys)).toEqual(along(DURATION, keys));
  });
});
