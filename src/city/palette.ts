/**
 * Les couleurs de la ville, partagées par la 3D et le dessin axonométrique de l'accueil.
 * Des tons de matériaux réels (béton, brique, enduit, verre, gazon, asphalte) ;
 * l'orange chantier reste réservé au monument et aux accents.
 */

import type { GroundStyle, RoadStyle } from "./layout";

export const GLASS = ["#7f9bab", "#6d8a9b", "#88a3a6", "#8f9fb2", "#5f7c8e", "#9aaab0"];
export const CONCRETE = ["#cfc8bb", "#bdb6a8", "#d9d3c7", "#b3ac9f", "#c7c0b2", "#a9a69f"];
export const BRICK = ["#b0654b", "#a35a43", "#bf7a5b", "#8f4f3c", "#b7856c", "#9c6a55"];
export const STUCCO = ["#eadcc0", "#e5c9a6", "#dcbf9d", "#d7cfb8", "#e9d6c6", "#cdd3c2", "#f0e6d2"];
export const HOUSES = ["#f0e2c4", "#e8c7b0", "#cfdccf", "#f2d7a6", "#dcd0e2", "#f3ead9", "#c9dbe3", "#e6b8a2"];
export const ROOFS = ["#a8503a", "#8e4535", "#b8643f", "#6d6a6e", "#5a5d63", "#7c5a48"];
export const ACCENTS = ["#ff4b12", "#2346d8", "#ffd23f", "#2f8f6b", "#e2549a"];
export const CARS = ["#e9e5dc", "#2b2b31", "#c43c2c", "#2d5aa8", "#e8b923", "#8f9499", "#f4f1ea", "#3c6e4f", "#d9d4c9", "#5d6670"];
export const STONE = "#e6ddc9";
export const SIGNAL = "#ff4b12";
export const COPPER = "#5c8f80";
export const WATER = "#4f88a6";

export const GROUND_COLORS: Record<GroundStyle, string> = {
  base: "#4a4b51",
  sidewalk: "#cdc7ba",
  plaza: "#ddd5c3",
  grass: "#7c9d57",
  lawn: "#91b264",
  crops: "#b8b25f",
  dirt: "#a88f6b",
  wharf: "#a7a198",
  quay: "#bfb4a1",
};

export const ROAD_COLORS: Record<RoadStyle, string> = {
  ring: "#3e3f44",
  avenue: "#44454a",
  street: "#4a4b50",
  lane: "#56575b",
  path: "#cdbf9d",
  highway: "#3a3b40",
};

/** Tirage stable : le même lot tire toujours les mêmes nombres. */
export function rand(id: number, salt: number): number {
  const x = Math.sin(id * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const pick = <T,>(list: readonly T[], r: number): T => list[Math.min(list.length - 1, Math.floor(r * list.length))];
