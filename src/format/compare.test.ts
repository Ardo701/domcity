import { describe, expect, it } from "vitest";
import { compareCities, isUnchanged } from "./compare";
import type { CityDoc, CityNode } from "./types";

const card = (i: number): CityNode => ({
  tag: "article",
  label: `card-${i}`,
  rect: [0, i * 300, 400, 280],
  children: [
    { tag: "h3", text: 24, heading: `Product ${i}` },
    { tag: "p", text: 180 },
    { tag: "img", img: { src: `https://shop.example/${i}.jpg`, w: 300, h: 200 } },
  ],
});

/** A shop page: a header, then rows of product cards. */
const shop = (cards: number, edit: (node: CityNode, i: number) => CityNode = (node) => node): CityDoc => ({
  format: 1,
  source: "bookmarklet",
  url: "https://shop.example/",
  title: "Shop",
  capturedAt: "2026-10-01T10:00:00.000Z",
  page: { domSize: 2400, scripts: 30, bytes: 2_000_000 },
  root: {
    tag: "body",
    children: [
      { tag: "header", children: [{ tag: "h1", text: 12, heading: "The shop" }] },
      { tag: "main", children: Array.from({ length: cards }, (_, i) => edit(card(i), i)) },
    ],
  },
});

describe("comparing two captures of a page", () => {
  it("finds the same city in the same capture", () => {
    const comparison = compareCities(shop(40), shop(40));
    expect(comparison).toEqual({ sameHeadings: true, similarity: 1 });
    expect(isUnchanged(comparison)).toBe(true);
  });

  it("ignores what the city does not show: positions, colors, image addresses, weight, date", () => {
    const other: CityDoc = {
      ...shop(40, (node, i) => ({
        ...node,
        rect: [10, i * 320, 380, 300],
        bg: "#ffffff",
        children: node.children!.map((child) =>
          child.img ? { ...child, img: { ...child.img, src: `https://cdn.shop.example/v2/${i}.webp` } } : child,
        ),
      })),
      capturedAt: "2026-10-04T10:00:00.000Z",
      page: { domSize: 2600, scripts: 31, bytes: 2_600_000 },
    };
    expect(compareCities(shop(40), other).similarity).toBe(1);
  });

  it("a slightly longer text weighs the same, a much longer one does not", () => {
    const longer = (text: number) =>
      shop(40, (node, i) => (i === 0 ? { ...node, children: [node.children![0], { tag: "p", text }, node.children![2]] } : node));
    expect(compareCities(shop(40), longer(170)).similarity).toBe(1);
    expect(compareCities(shop(40), longer(2000)).similarity).toBeLessThan(1);
  });

  it("a few elements more still make the same city, a new row of cards does not", () => {
    const oneMore = compareCities(shop(100), shop(101));
    expect(oneMore.similarity).toBeGreaterThan(0.98);
    expect(isUnchanged(oneMore)).toBe(false); // its card has a new heading
    const sameHeadings = (node: CityNode) => ({ ...node, children: node.children!.slice(1) });
    expect(isUnchanged(compareCities(shop(100, sameHeadings), shop(101, sameHeadings)))).toBe(true);
    const newRow = compareCities(shop(40), shop(48));
    expect(newRow.similarity).toBeLessThan(0.9);
    expect(isUnchanged(newRow)).toBe(false);
  });

  it("a new engraved heading changes the city, however small", () => {
    const renamed = shop(40, (node, i) =>
      i === 7 ? { ...node, children: [{ tag: "h3", text: 24, heading: "Product 7, now on sale" }, ...node.children!.slice(1)] } : node,
    );
    const comparison = compareCities(shop(40), renamed);
    expect(comparison.similarity).toBeGreaterThan(0.99);
    expect(comparison.sameHeadings).toBe(false);
    expect(isUnchanged(comparison)).toBe(false);
  });
});
