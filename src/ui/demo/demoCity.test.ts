import { describe, expect, it } from "vitest";
import { projectOn } from "@/ui/figureMeta";
import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import { demoCity } from "./demoCity";
import { VIEW, viewPoint } from "./scene";
import { DURATION, KEYSTROKES, STEPS, T, along } from "./timeline";

describe("démonstration du favori", () => {
  const city = demoCity();
  const lots = [...city.containers, ...city.buildings, ...city.panels];

  it("dessine chaque élément de la page d'exemple dans la fenêtre", () => {
    expect(lots).toHaveLength(35);
    for (const { page } of lots) {
      expect(page.x).toBeGreaterThanOrEqual(0);
      expect(page.y).toBeGreaterThanOrEqual(0);
      expect(page.x + page.w).toBeLessThanOrEqual(VIEW.width);
      expect(page.y + page.h).toBeLessThanOrEqual(VIEW.height);
    }
  });

  it("pose les blocs exactement sur les bâtiments de l'image du moteur", () => {
    const k = city.image.width / HERO_FIGURE.width;
    for (const lot of city.buildings) {
      for (const [x, y, z] of [
        [lot.x, lot.y, lot.z],
        [lot.x + lot.w, lot.y + lot.h, lot.z + lot.d],
      ]) {
        const [px, py] = projectOn(HERO_FIGURE, x, y, z);
        const [vx, vy] = viewPoint(city.final, x, y, z);
        // Au dixième de pixel près : la maquette se fond dans l'image sans décalage visible.
        expect(Math.abs(vx - (city.image.x + px * k))).toBeLessThan(0.1);
        expect(Math.abs(vy - (city.image.y + py * k))).toBeLessThan(0.1);
      }
    }
  });

  it("fait sortir le monument de terre en dernier", () => {
    const last = city.buildings.reduce((a, b) => (b.rank > a.rank ? b : a));
    expect(last.tag).toBe("h1");
    expect(new Set(city.buildings.map((lot) => lot.rank)).size).toBe(city.buildings.length);
  });

  it("accroche les deux images de la page à leur façade", () => {
    expect(city.panels.map((lot) => lot.panel?.src)).toEqual(["/figures/exemple-logo.svg", "/figures/exemple-affiche.svg"]);
  });

  it("enchaîne les étapes sans trou et boucle sans saut", () => {
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
