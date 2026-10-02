import { describe, expect, it } from "vitest";
import type { CityDoc, CityNode } from "@/format/types";
import { layoutCity, stripLayout, type Lot, type Rect } from "./layout";

function doc(root: CityNode): CityDoc {
  return {
    format: 1,
    source: "wikipedia",
    url: "https://fr.wikipedia.org/wiki/Test",
    title: "Test",
    capturedAt: "2026-10-02T12:00:00.000Z",
    root,
  };
}

const SAMPLE = doc({
  tag: "body",
  children: [
    {
      tag: "section",
      text: 40,
      children: [
        { tag: "h2", text: 8, heading: "Histoire" },
        { tag: "p", text: 900 },
        { tag: "p", text: 50 },
        { tag: "hr" },
        { tag: "div", text: 3000 },
        { tag: "img", img: { src: "https://example.com/a.jpg", w: 400, h: 200 } },
      ],
    },
    {
      tag: "div",
      children: [
        { tag: "div", children: [{ tag: "div", children: [{ tag: "p", text: 10 }] }] },
        { tag: "ul", children: [{ tag: "li", text: 5 }, { tag: "li", text: 12 }] },
      ],
    },
  ],
});

const inside = (child: Rect, parent: Rect) =>
  child.x >= parent.x - 1e-6 &&
  child.z >= parent.z - 1e-6 &&
  child.x + child.w <= parent.x + parent.w + 1e-6 &&
  child.z + child.d <= parent.z + parent.d + 1e-6;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6;

describe("stripLayout", () => {
  it("remplit le rectangle sans changer l'ordre", () => {
    const cells = stripLayout([4, 1, 1, 2, 8], { x: 0, z: 0, w: 4, d: 4 });
    const area = cells.reduce((sum, c) => sum + c.w * c.d, 0);
    expect(area).toBeCloseTo(16, 6);
    // ordre de lecture : on avance vers l'est, puis vers le sud
    for (let i = 1; i < cells.length; i += 1) {
      const sameRow = Math.abs(cells[i].z - cells[i - 1].z) < 1e-9;
      if (sameRow) expect(cells[i].x).toBeGreaterThan(cells[i - 1].x);
      else expect(cells[i].z).toBeGreaterThan(cells[i - 1].z);
    }
  });
});

describe("layoutCity", () => {
  const layout = layoutCity(SAMPLE);
  const { lots } = layout;

  it("numérote les lots en ordre de document, avec des sous-arbres contigus", () => {
    expect(lots[0].kind).toBe("terrain");
    for (const lot of lots) {
      if (lot.parent >= 0) {
        const parent = lots[lot.parent];
        expect(lot.id).toBeGreaterThan(parent.id);
        expect(lot.id).toBeLessThan(parent.subtreeEnd);
      }
    }
  });

  it("garde chaque lot dans son parent, posé sur son sol", () => {
    for (const lot of lots) {
      if (lot.parent < 0) continue;
      const parent = lots[lot.parent];
      expect(inside(lot, parent)).toBe(true);
      expect(lot.y).toBeGreaterThanOrEqual(parent.y + parent.h - 1e-6);
    }
  });

  it("entoure la ville d'un périphérique et sépare les conteneurs voisins par une rue", () => {
    expect(layout.roads.filter((r) => r.style === "ring")).toHaveLength(4);
    const section = lots.find((l) => l.kind === "district")!;
    const block = lots.find((l) => l.parent === 0 && l.kind === "block")!;
    const between = layout.roads.filter((r) => r.owner === 0 && r.style === "street");
    expect(between.length).toBeGreaterThan(0);
    for (const road of between) {
      expect(overlaps(road, section)).toBe(false);
      expect(overlaps(road, block)).toBe(false);
    }
  });

  it("ne bâtit jamais sur une rue", () => {
    for (const lot of lots) {
      if (lot.container) continue;
      for (const road of layout.roads) expect(overlaps(lot, road)).toBe(false);
    }
  });

  it("ne superpose jamais deux voisins", () => {
    const byParent = new Map<number, Lot[]>();
    for (const lot of lots) byParent.set(lot.parent, [...(byParent.get(lot.parent) ?? []), lot]);
    for (const siblings of byParent.values()) {
      for (let i = 0; i < siblings.length; i += 1) {
        for (let j = i + 1; j < siblings.length; j += 1) {
          expect(overlaps(siblings[i], siblings[j])).toBe(false);
        }
      }
    }
  });

  it("ajoute un bâtiment pour le texte écrit directement dans un conteneur", () => {
    const section = lots.find((l) => l.kind === "district")!;
    const first = lots[section.id + 1];
    expect(first.ownText).toBe(true);
    expect(first.parent).toBe(section.id);
  });

  it("fait traverser le quartier par la rivière, entre les deux moitiés", () => {
    const river = lots.find((l) => l.kind === "river")!;
    const section = lots[river.parent];
    expect(river.w).toBeCloseTo(section.w, 6);
    const before = lots.find((l) => l.kind === "residence" && l.node.text === 50)!;
    const after = lots.find((l) => l.kind === "tower" && l.node.text === 3000)!;
    expect(before.z + before.d).toBeLessThanOrEqual(river.z + 1e-6);
    expect(after.z).toBeGreaterThanOrEqual(river.z + river.d - 1e-6);
  });

  it("grandit avec le texte, et le monument domine", () => {
    const short = lots.find((l) => l.node.text === 50)!;
    const tall = lots.find((l) => l.node.text === 900)!;
    expect(tall.h).toBeGreaterThan(short.h);
    const highest = Math.max(...lots.filter((l) => l.kind === "tower" || l.kind === "residence").map((l) => l.h));
    const h1 = layoutCity(doc({ tag: "body", children: [{ tag: "h1", text: 4, heading: "Titre" }, ...SAMPLE.root.children!] }))
      .lots.find((l) => l.kind === "monument")!;
    expect(h1.h).toBeGreaterThan(highest);
  });

  it("donne aux panneaux les proportions de l'image", () => {
    const board = lots.find((l) => l.kind === "billboard")!;
    expect(board.panel!.width / board.panel!.height).toBeCloseTo(2, 6);
  });

  it("compte la ville", () => {
    expect(layout.stats).toMatchObject({ districts: 1, rivers: 1, billboards: 1, monuments: 1 });
    expect(layout.stats.buildings).toBe(7);
  });

  it("est déterministe", () => {
    expect(layoutCity(SAMPLE)).toEqual(layout);
  });
});
