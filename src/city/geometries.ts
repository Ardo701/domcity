/**
 * Les formes de base de la ville, toutes à l'échelle 1 :
 * emprise de -0.5 à 0.5 en x et z, base à y = 0, sommet à y = 1.
 * Chaque instance est ensuite étirée à la taille de son lot.
 *
 * Les formes à plusieurs teintes (maison et toit, arbre et tronc…) portent des
 * couleurs de sommets, multipliées par la couleur de l'instance : le blanc
 * prend la couleur du genre, le reste garde sa teinte.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ROOF_COLOR, TREE_COLOR } from "@/format/taxonomy";

const WHITE = new THREE.Color("#ffffff");

/** Prépare une forme pour la fusion : sans index, sans UV, avec une couleur unie. */
function part(geometry: THREE.BufferGeometry, color: THREE.Color = WHITE): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  const count = flat.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  return flat;
}

function box(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("fusion de géométries impossible");
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/** Boîte simple : socles, immeubles, habitations, champs, rivières. */
export function blockGeometry(): THREE.BufferGeometry {
  return box(1, 1, 1);
}

/** Maison : murs (blanc → couleur du genre) et toit à deux pans en terre cuite. */
export function houseGeometry(): THREE.BufferGeometry {
  const eave = 0.62;
  const walls = part(box(1, eave, 1));

  const roof = new THREE.BufferGeometry();
  const o = 0.54; // léger débord du toit
  const r = 1.0;
  // prisme : faîtage le long de x, à z = 0
  const v = [
    // pan nord
    -o, eave, -o, o, eave, -o, o, r, 0,
    -o, eave, -o, o, r, 0, -o, r, 0,
    // pan sud
    -o, eave, o, -o, r, 0, o, r, 0,
    -o, eave, o, o, r, 0, o, eave, o,
    // pignons
    -o, eave, -o, -o, r, 0, -o, eave, o,
    o, eave, -o, o, eave, o, o, r, 0,
  ];
  // Sommets listés dans le sens horaire : on inverse chaque triangle pour que les faces regardent dehors.
  for (let t = 0; t < v.length; t += 9) {
    for (let k = 0; k < 3; k += 1) [v[t + 3 + k], v[t + 6 + k]] = [v[t + 6 + k], v[t + 3 + k]];
  }
  roof.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  roof.computeVertexNormals();
  return merge([walls, part(roof, new THREE.Color(ROOF_COLOR))]);
}

/** Obélisque : socle sombre, fût effilé, pointe. */
export function obeliskGeometry(): THREE.BufferGeometry {
  const base = part(box(1, 0.06, 1), new THREE.Color("#8d8a84"));
  const shaft = new THREE.CylinderGeometry(0.24, 0.36, 0.84, 4, 1);
  shaft.rotateY(Math.PI / 4);
  shaft.translate(0, 0.06 + 0.42, 0);
  const tip = new THREE.ConeGeometry(0.24, 0.1, 4);
  tip.rotateY(Math.PI / 4);
  tip.translate(0, 0.9 + 0.05, 0);
  return merge([base, part(shaft), part(tip)]);
}

/** Beffroi : tour carrée, bandeau d'horloge, flèche pointue. */
export function belfryGeometry(): THREE.BufferGeometry {
  const tower = part(box(0.7, 0.66, 0.7));
  const band = part(box(0.76, 0.08, 0.76, 0, 0.56, 0), new THREE.Color("#f4efe4"));
  const spire = new THREE.ConeGeometry(0.5, 0.34, 4);
  spire.rotateY(Math.PI / 4);
  spire.translate(0, 0.66 + 0.17, 0);
  return merge([tower, band, part(spire, new THREE.Color("#8d8a84"))]);
}

/** Kiosque : pavillon hexagonal et son toit. */
export function kioskGeometry(): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 6, 1);
  body.translate(0, 0.25, 0);
  const roof = new THREE.ConeGeometry(0.56, 0.5, 6);
  roof.translate(0, 0.75, 0);
  return merge([part(body, new THREE.Color("#f4efe4")), part(roof)]);
}

/** Borne : petit cylindre. */
export function bollardGeometry(): THREE.BufferGeometry {
  const post = new THREE.CylinderGeometry(0.4, 0.46, 1, 8, 1);
  post.translate(0, 0.5, 0);
  return merge([part(post)]);
}

/** Ambassade : bâtiment, mât et drapeau à la couleur du genre. */
export function embassyGeometry(): THREE.BufferGeometry {
  const hall = part(box(1, 0.62, 1), new THREE.Color("#ece7dc"));
  const pole = part(box(0.04, 0.4, 0.04, 0.3, 0.62, 0.3), new THREE.Color("#55555c"));
  const flag = part(box(0.26, 0.14, 0.02, 0.43, 0.86, 0.3));
  return merge([hall, pole, flag]);
}

/** Sculpture : un polyèdre sur un socle. */
export function sculptureGeometry(): THREE.BufferGeometry {
  const plinth = part(box(0.6, 0.2, 0.6), new THREE.Color("#ece7dc"));
  const gem = new THREE.IcosahedronGeometry(0.4, 0);
  gem.translate(0, 0.6, 0);
  return merge([plinth, part(gem)]);
}

/** Arbre : tronc et houppier. */
export function treeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.07, 0.09, 0.3, 5, 1);
  trunk.translate(0, 0.15, 0);
  const crown = new THREE.ConeGeometry(0.42, 0.78, 7);
  crown.translate(0, 0.3 + 0.39, 0);
  return merge([part(trunk, new THREE.Color("#7a5b3c")), part(crown, new THREE.Color(TREE_COLOR))]);
}
