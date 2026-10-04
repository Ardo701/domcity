/**
 * How alike two captures of the same page are, for the city they build.
 *
 * Two captures of an unchanged page are rarely identical to the byte: positions follow the window,
 * the loaded weight varies, a carousel turns. So the comparison keeps only what the city shows:
 * each element's tag and place in the tree, its amount of text and the size of its images, and the
 * headings engraved on the monuments. Positions, colors, image addresses and the page's weight
 * (the ambiance) are left out.
 */

import type { CityDoc, CityNode } from "./types";

export interface CityComparison {
  /** The same engraved headings (h1 to h3), in the same order. */
  sameHeadings: boolean;
  /** Share of elements alike, from 0 to 1. */
  similarity: number;
}

/** From this share of elements alike, with the same headings, the city has not changed. */
export const UNCHANGED_SIMILARITY = 0.98;

/** A version of the page younger than this asks the visitor to confirm a new one. */
export const RECENT_VERSION_DAYS = 7;

/** Rounded to the nearest power of two: 380 and 400 characters weigh the same, 40 and 400 do not. */
const scale = (value: number) => (value > 0 ? Math.round(Math.log2(value)) : -1);

function signature(node: CityNode, depth: number, parent: string): string {
  const img = node.img ? (node.img.broken ? "broken" : scale(Math.max(node.img.w ?? 0, node.img.h ?? 0))) : "";
  return `${depth}|${parent}|${node.tag}|${scale(node.text ?? 0)}|${img}|${node.heading ?? ""}`;
}

/** Each element's signature and how many times it appears, plus the headings in page order. */
function survey(doc: CityDoc): { counts: Map<string, number>; headings: string[] } {
  const counts = new Map<string, number>();
  const headings: string[] = [];
  const stack: Array<[CityNode, number, string]> = [[doc.root, 0, ""]];
  while (stack.length) {
    const [node, depth, parent] = stack.pop()!;
    const key = signature(node, depth, parent);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (node.heading) headings.push(node.heading);
    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push([children[i], depth + 1, node.tag]);
  }
  return { counts, headings };
}

const sizeOf = (counts: Map<string, number>) => [...counts.values()].reduce((sum, count) => sum + count, 0);

export function compareCities(a: CityDoc, b: CityDoc): CityComparison {
  const left = survey(a);
  const right = survey(b);
  // The elements both captures have, over the elements of the larger one: one element changed in a hundred is 99%.
  let shared = 0;
  for (const [key, count] of left.counts) shared += Math.min(count, right.counts.get(key) ?? 0);
  const total = Math.max(sizeOf(left.counts), sizeOf(right.counts));
  const sameHeadings =
    left.headings.length === right.headings.length && left.headings.every((heading, i) => heading === right.headings[i]);
  return { sameHeadings, similarity: total === 0 ? 1 : shared / total };
}

export function isUnchanged(comparison: CityComparison): boolean {
  return comparison.sameHeadings && comparison.similarity >= UNCHANGED_SIMILARITY;
}
