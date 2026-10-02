/**
 * Les formes de base de la ville, toutes à l'échelle 1 :
 * emprise de -0.5 à 0.5 en x et z, base à y = 0, sommet à y = 1.
 * Chaque instance est ensuite étirée (et parfois tournée) à sa taille.
 *
 * Les formes de décor à plusieurs teintes (arbre, voiture, lampadaire) portent des
 * couleurs de sommets, multipliées par la couleur de l'instance.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Prépare une forme pour la fusion : sans index, sans UV, avec une couleur unie. */
function part(geometry: THREE.BufferGeometry, color = "#ffffff"): THREE.BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  const c = new THREE.Color(color);
  const count = flat.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  return flat;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("fusion de géométries impossible");
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function boxAt(w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}

/** Boîte : façades, socles, trottoirs, chaussées, eau, équipements. */
export function boxGeometry(): THREE.BufferGeometry {
  return boxAt(1, 1, 1);
}

/** Toit à deux pans, faîtage le long de x. */
export function gableGeometry(): THREE.BufferGeometry {
  const o = 0.5;
  const v = [
    // pans
    -o, 0, -o, o, 1, 0, o, 0, -o,
    -o, 0, -o, -o, 1, 0, o, 1, 0,
    -o, 0, o, o, 0, o, o, 1, 0,
    -o, 0, o, o, 1, 0, -o, 1, 0,
    // pignons
    -o, 0, -o, -o, 0, o, -o, 1, 0,
    o, 0, -o, o, 1, 0, o, 0, o,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Pyramide à base carrée : flèches, toits de beffroi. */
export function pyramidGeometry(): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, 0.5, 0);
  return g.toNonIndexed();
}

export function cylinderGeometry(segments = 14): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, segments, 1);
  g.translate(0, 0.5, 0);
  return g;
}

export function coneGeometry(segments = 14): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(0.5, 1, segments, 1);
  g.translate(0, 0.5, 0);
  return g;
}

/** Coupole : une demi-sphère étirée sur toute la hauteur. */
export function domeGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 2, 1);
  return g;
}

export function ballGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.5, 14, 10);
  g.translate(0, 0.5, 0);
  return g;
}

/** Sculpture abstraite : un nœud, ramené dans la boîte unité. */
export function knotGeometry(): THREE.BufferGeometry {
  const g = new THREE.TorusKnotGeometry(0.3, 0.1, 96, 10, 2, 3);
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const size = new THREE.Vector3();
  box.getSize(size);
  g.translate(0, -box.min.y, 0);
  g.scale(1 / size.x, 1 / size.y, 1 / size.z);
  return g;
}

/**
 * Virage : un quart de disque de rayon 1 centré sur le coin nord-ouest de la case (-0.5, -0.5).
 * Pour une chaussée aussi large que la case, le bord intérieur tourne au ras du coin et le bord
 * extérieur en arrondi : la largeur reste la même tout le long du virage.
 */
export function bendGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, 0, Math.PI / 2);
  g.translate(-0.5, 0.5, -0.5);
  return g;
}

/** Ce qui reste de la case hors du virage : le bas-côté, qui borde l'arrondi comme un trottoir. */
export function bendVergeGeometry(): THREE.BufferGeometry {
  // Dessin dans le plan (x, -z), extrudé vers le haut ensuite.
  const shape = new THREE.Shape();
  shape.moveTo(0.5, 0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(-0.5, -0.5);
  shape.absarc(-0.5, 0.5, 1, -Math.PI / 2, 0, false);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 18 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Face plate, debout, tournée vers +z : la plaque d'un panonceau. */
export function faceGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  g.translate(0, 0.5, 0);
  return g;
}

/**
 * Drapeau, attaché au mât par son bord ouest (x = -0.5) : il ondule de plus en plus vers le
 * bout libre. L'ondulation est à l'échelle de la profondeur de l'instance.
 */
export function flagGeometry(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1, 10, 1);
  const position = g.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const t = position.getX(i) + 0.5;
    position.setZ(i, 0.07 * t * Math.sin(t * Math.PI * 1.7));
  }
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return g;
}

/** Arbre feuillu : tronc et trois touffes. */
export function treeGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.05, 0.07, 0.42, 5, 1);
  trunk.translate(0, 0.21, 0);
  const blob = (r: number, x: number, y: number, z: number, color: string) => {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.translate(x, y, z);
    return part(g, color);
  };
  return merge([
    part(trunk, "#6e5034"),
    blob(0.3, 0, 0.66, 0, "#6f9a4c"),
    blob(0.22, 0.14, 0.56, 0.08, "#628c43"),
    blob(0.2, -0.12, 0.58, -0.1, "#7aa656"),
  ]);
}

/** Arbre en fuseau (peuplier, cyprès), pour varier les alignements. */
export function poplarGeometry(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.04, 0.06, 0.2, 5, 1);
  trunk.translate(0, 0.1, 0);
  const crown = new THREE.SphereGeometry(0.22, 8, 6);
  crown.scale(1, 2.1, 1);
  crown.translate(0, 0.58, 0);
  return merge([part(trunk, "#6e5034"), part(crown, "#557f3d")]);
}

/** Voiture, longue d'une unité le long de x : caisse (couleur de l'instance), vitres, roues. */
export function carGeometry(): THREE.BufferGeometry {
  const body = boxAt(1, 0.2, 0.44, 0, 0.1);
  const cabin = boxAt(0.52, 0.15, 0.4, -0.06, 0.3);
  const roof = boxAt(0.46, 0.02, 0.36, -0.06, 0.45);
  // Roues : deux essieux en boîtes sombres, bien assez vus d'en haut.
  const wheels = [-0.32, 0.32].map((x) => part(boxAt(0.2, 0.18, 0.48, x, 0.01), "#1e1e22"));
  return merge([part(body), part(cabin, "#2b333b"), part(roof), ...wheels]);
}

/**
 * Avion de ligne, long d'une unité le long de x (nez vers +x), envergure d'une unité le long de z.
 * La dérive n'en fait pas partie : elle est peinte aux couleurs de sa compagnie, à part.
 */
export function planeGeometry(): THREE.BufferGeometry {
  const r = 0.055;
  const y = 0.1;
  const body = new THREE.CylinderGeometry(r, r, 0.78, 12, 1);
  body.rotateZ(Math.PI / 2);
  body.translate(-0.02, y, 0);
  const nose = new THREE.ConeGeometry(r, 0.12, 12, 1);
  nose.rotateZ(-Math.PI / 2);
  nose.translate(0.43, y, 0);
  const tail = new THREE.ConeGeometry(r, 0.14, 12, 1);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.48, y + 0.015, 0);
  const cockpit = boxAt(0.05, 0.022, 0.07, 0.39, y + 0.022);
  const wings = boxAt(0.17, 0.012, 1, 0.02, y - 0.03);
  const stabilizer = boxAt(0.08, 0.01, 0.34, -0.45, y + 0.03);
  const engines = [-0.2, 0.2].map((z) => {
    const engine = new THREE.CylinderGeometry(0.028, 0.026, 0.13, 10, 1);
    engine.rotateZ(Math.PI / 2);
    engine.translate(0.08, y - 0.055, z);
    return part(engine, "#b9bcc2");
  });
  return merge([
    part(body, "#f4f2ee"),
    part(nose, "#f4f2ee"),
    part(tail, "#f4f2ee"),
    part(cockpit, "#2b333b"),
    part(wings, "#d8dade"),
    part(stabilizer, "#d8dade"),
    ...engines,
  ]);
}

/** Lampadaire : mât, crosse, lanterne. */
export function lampGeometry(): THREE.BufferGeometry {
  const pole = new THREE.CylinderGeometry(0.035, 0.05, 1, 6, 1);
  pole.translate(0, 0.5, 0);
  const arm = boxAt(0.32, 0.03, 0.03, 0.14, 0.97);
  const head = boxAt(0.14, 0.05, 0.09, 0.28, 0.93);
  return merge([part(pole, "#3b3d42"), part(arm, "#3b3d42"), part(head, "#f3e7c4")]);
}
