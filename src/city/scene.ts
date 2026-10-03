/**
 * Construction de la scène 3D à partir de l'urbanisme.
 *
 * Chaque bâtiment est composé de quelques pièces (socle, fût, retraits, toit,
 * flèche…) choisies selon son genre et tirées au sort de façon stable : la même
 * page donne toujours la même ville. Toutes les pièces répétées sont des
 * InstancedMesh, quelques dizaines d'appels de dessin pour des milliers de
 * bâtiments, d'arbres et de voitures. Seules les affiches des panneaux (une
 * texture chacune) sont des objets à part ; les icônes partagent un atlas.
 */

import * as THREE from "three";
import * as shapes from "./geometries";
import {
  BASE, CURB, FLOOR, PLANE, WATER_DEPTH, cutRect, harborWater,
  type Airport, type Bridge, type Camera, type CityLayout, type Cloud, type Decor, type Factory, type Joint, type Lot,
  type Panel, type Rect, type Road,
} from "./layout";
import { FACADE, GROUND, ROAD, ROAD_AXIS, emblemMaterial, type CityMaterials } from "./materials";
import * as PALETTE from "./palette";
import { IconAtlas } from "./textures";

export interface InstanceRef {
  mesh: THREE.InstancedMesh;
  index: number;
}

export interface BillboardSlot {
  /** Numéro du lot dans la vue (dans la mégalopole, celui de toute la mégalopole). */
  id: number;
  lot: Lot;
  panels: THREE.Mesh[];
  ratio: number;
}

/** Panonceaux et drapeaux : l'atlas à remplir, et les lots qui portent chacune de ses icônes. */
export interface EmblemSet {
  atlas: IconAtlas;
  /** owners[i] : lots de l'icône atlas.sources[i]. */
  owners: number[][];
}

export interface LabelSlot {
  id: number;
  lot: Lot;
  level: 1 | 2 | 3;
  anchor: THREE.Vector3;
}

export interface CityScene {
  group: THREE.Group;
  pickables: THREE.Object3D[];
  /** Instances de chaque lot, pour les surligner. */
  refs: InstanceRef[][];
  /** Couleurs d'origine de chaque InstancedMesh. */
  baseColors: Map<THREE.InstancedMesh, Float32Array>;
  billboards: BillboardSlot[];
  emblems: EmblemSet;
  labels: LabelSlot[];
  /** Le mobilier (arbres, voitures, lampadaires) : on le cache de loin dans la mégalopole. */
  details: THREE.Object3D[];
  dispose(): void;
}

const GROUND_COLORS = PALETTE.GROUND_COLORS;
const ROAD_COLORS = PALETTE.ROAD_COLORS;
const { GLASS, CONCRETE, BRICK, STUCCO, HOUSES, ROOFS, ACCENTS, CARS, STONE, SIGNAL, rand, pick } = PALETTE;

// ---------------------------------------------------------------------------
// Instances
// ---------------------------------------------------------------------------

type Extra = [number, number, number, number];

class Batch {
  private matrices: number[] = [];
  private colors: number[] = [];
  private lots: number[] = [];
  private extras: number[] = [];

  constructor(
    readonly geometry: THREE.BufferGeometry,
    readonly material: THREE.Material,
    readonly options: { attribute?: string; cast?: boolean; receive?: boolean; pickable?: boolean } = {},
  ) {}

  add(lotId: number, matrix: THREE.Matrix4, color: THREE.ColorRepresentation, extra: Extra = [0, 0, 0, 0]) {
    const c = tmpColor.set(color);
    this.matrices.push(...matrix.elements);
    this.colors.push(c.r, c.g, c.b);
    this.lots.push(lotId);
    if (this.options.attribute) this.extras.push(...extra);
  }

  /** `base` : numéro, dans la vue, du premier lot de cette ville (la mégalopole en assemble plusieurs). */
  build(refs: InstanceRef[][], baseColors: Map<THREE.InstancedMesh, Float32Array>, base: number): THREE.InstancedMesh | null {
    const count = this.lots.length;
    if (count === 0) {
      this.geometry.dispose();
      return null;
    }
    if (this.options.attribute) {
      this.geometry.setAttribute(this.options.attribute, new THREE.InstancedBufferAttribute(new Float32Array(this.extras), 4));
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    mesh.instanceMatrix.array.set(this.matrices);
    mesh.instanceMatrix.needsUpdate = true;
    const colors = new Float32Array(this.colors);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors.slice(), 3);
    mesh.castShadow = this.options.cast ?? true;
    mesh.receiveShadow = this.options.receive ?? true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    if (this.options.pickable) {
      // -1 : la campagne et les autoroutes de la mégalopole, qui ne sont pas des éléments de la page.
      mesh.userData.lots = Int32Array.from(this.lots, (lotId) => (lotId >= 0 ? lotId + base : -1));
      baseColors.set(mesh, colors);
      this.lots.forEach((lotId, index) => {
        if (lotId >= 0) (refs[lotId + base] ??= []).push({ mesh, index });
      });
    }
    return mesh;
  }
}

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpPosition = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const tmpEuler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * Base au centre (cx, y, cz), taille (w, h, d), rotation autour de la verticale puis de x ;
 * `rotZ` cabre une forme tournée vers +x (un avion qui décolle).
 */
/** Les petits avions d'un aérodrome. */
const SMALL_PLANE = PLANE * 0.48;

function at(cx: number, y: number, cz: number, w: number, h: number, d: number, rotY = 0, rotX = 0, rotZ = 0): THREE.Matrix4 {
  tmpQuaternion.setFromEuler(tmpEuler.set(rotX, rotY, rotZ));
  return tmpMatrix.compose(tmpPosition.set(cx, y, cz), tmpQuaternion, tmpScale.set(w, h, d));
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const shade = (hex: string, factor: number) => "#" + new THREE.Color(hex).multiplyScalar(factor).getHexString();

/** Grille de recherche : où sont les bâtiments, l'eau et les rues, pour poser arbres et voitures ailleurs. */
class Obstacles {
  private readonly cells = new Map<string, Rect[]>();
  constructor(private readonly size = 6) {}

  add(rect: Rect, pad = 0) {
    const r = { x: rect.x - pad, z: rect.z - pad, w: rect.w + 2 * pad, d: rect.d + 2 * pad };
    for (let i = Math.floor(r.x / this.size); i <= Math.floor((r.x + r.w) / this.size); i += 1) {
      for (let j = Math.floor(r.z / this.size); j <= Math.floor((r.z + r.d) / this.size); j += 1) {
        const key = `${i},${j}`;
        const list = this.cells.get(key);
        if (list) list.push(r);
        else this.cells.set(key, [r]);
      }
    }
  }

  hit(x: number, z: number, radius: number): boolean {
    for (let i = Math.floor((x - radius) / this.size); i <= Math.floor((x + radius) / this.size); i += 1) {
      for (let j = Math.floor((z - radius) / this.size); j <= Math.floor((z + radius) / this.size); j += 1) {
        for (const r of this.cells.get(`${i},${j}`) ?? []) {
          if (x + radius > r.x && x - radius < r.x + r.w && z + radius > r.z && z - radius < r.z + r.d) return true;
        }
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// La ville
// ---------------------------------------------------------------------------

export function buildCityScene(layout: CityLayout, materials: CityMaterials, base = 0): CityScene {
  const group = new THREE.Group();
  group.name = "domcity";
  const pickable = { pickable: true };

  // Icônes : une case d'atlas par adresse, dans l'ordre de la page.
  const iconOwners = new Map<string, number[]>();
  for (const lot of layout.lots) {
    const src = lot.panel?.emblem ? lot.node.img?.src : undefined;
    if (!src) continue;
    const owners = iconOwners.get(src);
    if (owners) owners.push(lot.id);
    else iconOwners.set(src, [lot.id]);
  }
  const atlas = new IconAtlas([...iconOwners.keys()]);
  const emblemSurface = emblemMaterial(atlas.texture);

  const kit = {
    facade: new Batch(shapes.boxGeometry(), materials.facade, { attribute: "aFacade", pickable: true }),
    plain: new Batch(shapes.boxGeometry(), materials.plain, pickable),
    gable: new Batch(shapes.gableGeometry(), materials.plain, pickable),
    pyramid: new Batch(shapes.pyramidGeometry(), materials.plain, pickable),
    cylinder: new Batch(shapes.cylinderGeometry(), materials.plain, pickable),
    cone: new Batch(shapes.coneGeometry(), materials.plain, pickable),
    dome: new Batch(shapes.domeGeometry(), materials.plain, pickable),
    ball: new Batch(shapes.ballGeometry(), materials.plain, pickable),
    knot: new Batch(shapes.knotGeometry(), materials.plain, pickable),
    ground: new Batch(shapes.boxGeometry(), materials.ground, { attribute: "aGround", cast: false, pickable: true }),
    road: new Batch(shapes.boxGeometry(), materials.road, { attribute: "aRoad", cast: false, pickable: true }),
    bend: new Batch(shapes.bendGeometry(), materials.road, { attribute: "aRoad", cast: false, pickable: true }),
    verge: new Batch(shapes.bendVergeGeometry(), materials.ground, { attribute: "aGround", cast: false, pickable: true }),
    water: new Batch(shapes.boxGeometry(), materials.water, { attribute: "aWater", cast: false, pickable: true }),
    tree: new Batch(shapes.treeGeometry(), materials.painted, { receive: false }),
    poplar: new Batch(shapes.poplarGeometry(), materials.painted, { receive: false }),
    car: new Batch(shapes.carGeometry(), materials.painted, { receive: false }),
    lamp: new Batch(shapes.lampGeometry(), materials.painted, { cast: false, receive: false }),
    plane: new Batch(shapes.planeGeometry(), materials.painted, pickable),
    sign: new Batch(shapes.faceGeometry(), emblemSurface, { attribute: "aIcon", cast: false, pickable: true }),
    flag: new Batch(shapes.flagGeometry(), emblemSurface, { attribute: "aIcon", pickable: true }),
    // L'ambiance. Nuages, fumées, pluie et champs des caméras ne se survolent pas : on vise à travers.
    graffiti: new Batch(shapes.faceGeometry(), materials.graffiti, { attribute: "aIcon", cast: false, pickable: true }),
    cloud: new Batch(shapes.ballGeometry(), materials.cloud, { receive: false }),
    glow: new Batch(shapes.boxGeometry(), materials.glow, { cast: false, receive: false }),
    veil: new Batch(shapes.wedgeGeometry(), materials.veil, { cast: false, receive: false }),
    rain: new Batch(shapes.boxGeometry(), materials.veil, { cast: false, receive: false }),
  };

  const billboards: BillboardSlot[] = [];
  const labels: LabelSlot[] = [];
  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panelMaterials: THREE.Material[] = [];
  const panelMeshes: THREE.Mesh[] = [];
  const obstacles = new Obstacles();

  // --- Raccourcis ----------------------------------------------------------

  const box = (id: number, cx: number, y: number, cz: number, w: number, h: number, d: number, color: string, rotY = 0) =>
    kit.plain.add(id, at(cx, y, cz, w, h, d, rotY), color);
  const facade = (
    id: number, cx: number, y: number, cz: number, w: number, h: number, d: number,
    color: string, style: number, shop = 0, floor = FLOOR,
  ) => {
    if (w <= 0.05 || d <= 0.05 || h <= 0.05) return;
    kit.facade.add(id, at(cx, y, cz, w, h, d), color, [style, floor, rand(id, 41), shop]);
  };
  const ground = (id: number, r: Rect, y: number, h: number, style: keyof typeof GROUND) => {
    if (r.w <= 0.01 || r.d <= 0.01) return;
    kit.ground.add(id, at(r.x + r.w / 2, y, r.z + r.d / 2, r.w, h, r.d), GROUND_COLORS[style], [GROUND[style], 0, 0, 0]);
  };
  const roofOf = (w: number, d: number) => (w >= d ? { w, d, rot: 0 } : { w: d, d: w, rot: Math.PI / 2 });

  // --- Bâtiments -----------------------------------------------------------

  /** Équipements de toit : caissons de clim, édicule, parfois un château d'eau. */
  function rooftop(lot: Lot, top: number, cx: number, cz: number, w: number, d: number) {
    const id = lot.id;
    const short = Math.min(w, d);
    if (short < 1.6) return;
    const count = 1 + Math.floor(rand(id, 21) * 3);
    for (let i = 0; i < count; i += 1) {
      const s = clamp(short * (0.14 + rand(id, 22 + i) * 0.14), 0.5, 2.2);
      const x = cx + (rand(id, 30 + i) - 0.5) * Math.max(0, w - s - 0.8);
      const z = cz + (rand(id, 40 + i) - 0.5) * Math.max(0, d - s - 0.8);
      box(id, x, top, z, s, 0.45 + rand(id, 50 + i) * 0.6, s * (0.7 + rand(id, 60 + i) * 0.6), "#9d9b95");
    }
    if (rand(id, 23) < 0.3 && short > 2.6 && top - lot.y < 24) {
      const x = cx + (rand(id, 24) - 0.5) * (w - 2);
      const z = cz + (rand(id, 25) - 0.5) * (d - 2);
      box(id, x, top, z, 1.1, 0.8, 1.1, "#4b4a48");
      kit.cylinder.add(id, at(x, top + 0.8, z, 1.4, 1.2, 1.4), "#8a6a4e");
      kit.cone.add(id, at(x, top + 2, z, 1.5, 0.5, 1.5), "#6b5240");
    }
  }

  function tower(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const short = Math.min(lot.w, lot.d);
    const shop = rand(id, 1) < 0.7 ? 1 : 0;

    if (h >= 20 && short >= 3.6) {
      // Gratte-ciel : socle commerçant, fût de verre, un retrait, couronne technique, parfois une antenne.
      const glass = pick(GLASS, rand(id, 2));
      const podium = clamp(h * 0.14, 2.6, 5.5);
      facade(id, cx, y, cz, lot.w, podium, lot.d, pick(CONCRETE, rand(id, 3)), FACADE.office, 1);
      const inset = short * (0.07 + rand(id, 4) * 0.06);
      let w = lot.w - 2 * inset;
      let d = lot.d - 2 * inset;
      const twoTiers = rand(id, 5) < 0.55;
      const crown = y + h * 0.95;
      const shaftTop = twoTiers ? y + h * (0.66 + rand(id, 6) * 0.12) : crown;
      facade(id, cx, y + podium, cz, w, shaftTop - y - podium, d, glass, FACADE.glass);
      if (twoTiers) {
        const step = short * 0.12;
        w -= 2 * step;
        d -= 2 * step;
        facade(id, cx, shaftTop, cz, w, crown - shaftTop, d, glass, FACADE.glass);
      }
      box(id, cx, crown, cz, w * 0.66, y + h - crown, d * 0.66, shade(glass, 0.62));
      if (rand(id, 7) < 0.45) kit.cylinder.add(id, at(cx, y + h, cz, 0.22, h * 0.14, 0.22), "#8b8e94");
      return;
    }

    const r = rand(id, 2);
    const [color, style] =
      r < 0.42 ? [pick(CONCRETE, rand(id, 3)), FACADE.office] : r < 0.78 ? [pick(BRICK, rand(id, 3)), FACADE.brick] : [pick(STUCCO, rand(id, 3)), FACADE.stucco];
    facade(id, cx, y, cz, lot.w, h, lot.d, color, style, shop);
    rooftop(lot, y + h, cx, cz, lot.w, lot.d);
  }

  function residence(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const short = Math.min(lot.w, lot.d);
    const brick = rand(id, 2) < 0.38;
    const color = brick ? pick(BRICK, rand(id, 3)) : pick(STUCCO, rand(id, 3));
    const style = brick ? FACADE.brick : FACADE.stucco;
    const shop = rand(id, 1) < 0.45 ? 1 : 0;

    if (h <= 9.5 && short >= 2 && rand(id, 4) < 0.55) {
      // Petit immeuble à toit pentu.
      const roofH = Math.min(2.4, short * 0.42);
      const body = Math.max(2, h - roofH * 0.6);
      facade(id, cx, y, cz, lot.w, body, lot.d, color, style, shop);
      const roof = roofOf(lot.w + 0.2, lot.d + 0.2);
      kit.gable.add(id, at(cx, y + body, cz, roof.w, roofH, roof.d, roof.rot), pick(ROOFS, rand(id, 5)));
      return;
    }
    if (h > 6 && short > 2.4 && rand(id, 7) < 0.4) {
      // Dernier étage en retrait, couvert de zinc, à la parisienne.
      facade(id, cx, y, cz, lot.w, h - FLOOR, lot.d, color, style, shop);
      box(id, cx, y + h - FLOOR, cz, lot.w - 0.8, FLOOR, lot.d - 0.8, "#6f747a");
      rooftop(lot, y + h, cx, cz, lot.w - 0.8, lot.d - 0.8);
      return;
    }
    facade(id, cx, y, cz, lot.w, h, lot.d, color, style, shop);
    if (rand(id, 6) < 0.07 && short > 2.4) {
      box(id, cx, y + h, cz, lot.w - 0.7, 0.14, lot.d - 0.7, "#7d9c57");
    } else {
      rooftop(lot, y + h, cx, cz, lot.w, lot.d);
    }
  }

  function house(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const body = Math.max(1.6, h * 0.62);
    const roofH = Math.max(0.9, h - body);
    facade(id, cx, y, cz, lot.w, body, lot.d, pick(HOUSES, rand(id, 2)), FACADE.house, 0, Math.min(FLOOR, body * 0.6));
    const roof = roofOf(lot.w + 0.24, lot.d + 0.24);
    kit.gable.add(id, at(cx, y + body, cz, roof.w, roofH, roof.d, roof.rot), pick(ROOFS, rand(id, 3)));
    if (rand(id, 4) < 0.6) {
      const along = lot.w >= lot.d;
      const off = (rand(id, 5) < 0.5 ? -1 : 1) * (along ? lot.w : lot.d) * 0.22;
      box(id, cx + (along ? off : 0), y + body + roofH * 0.25, cz + (along ? 0 : off), 0.32, roofH * 0.9, 0.32, "#8f4f3c");
    }
  }

  /** Le monument (h1) : une tour Art déco à gradins, couronne orange et flèche. */
  function monument(lot: Lot) {
    const { id, y, h } = lot;
    const s = lot.w;
    const cx = lot.x + s / 2;
    const cz = lot.z + s / 2;
    box(id, cx, y, cz, s * 1.28, 0.45, s * 1.28, "#cfc6b4");
    const tiers: Array<[number, number]> = [[1, 0.42], [0.8, 0.62], [0.62, 0.76], [0.45, 0.86]];
    let base = y + 0.45;
    for (const [k, end] of tiers) {
      const top = y + h * end;
      facade(id, cx, base, cz, s * k, top - base, s * k, STONE, FACADE.stone, 0);
      base = top;
    }
    box(id, cx, base, cz, s * 0.34, h * 0.05, s * 0.34, SIGNAL);
    kit.cone.add(id, at(cx, base + h * 0.05, cz, s * 0.2, y + h - base - h * 0.05, s * 0.2), "#d9d2c3");
    labels.push({ id: lot.id + base, lot, level: 1, anchor: new THREE.Vector3(cx, y + h, cz) });
  }

  /** Le beffroi (h2) : tour de pierre, cadrans sur les quatre faces, toit pyramidal de cuivre. */
  function belfry(lot: Lot) {
    const { id, y, h } = lot;
    const s = lot.w;
    const cx = lot.x + s / 2;
    const cz = lot.z + s / 2;
    box(id, cx, y, cz, s * 1.1, 0.4, s * 1.1, "#cbc2ae");
    facade(id, cx, y + 0.4, cz, s * 0.8, h * 0.64, s * 0.8, "#d8cbb0", FACADE.stone, 0);
    const stage = y + 0.4 + h * 0.64;
    box(id, cx, stage, cz, s * 0.88, h * 0.12, s * 0.88, "#e9e2d2");
    const clockY = stage + h * 0.06 - s * 0.21;
    for (let i = 0; i < 4; i += 1) {
      const rot = (i * Math.PI) / 2;
      const ox = Math.sin(rot) * s * 0.44;
      const oz = Math.cos(rot) * s * 0.44;
      kit.cylinder.add(id, at(cx + ox, clockY + s * 0.21, cz + oz, s * 0.42, 0.06, s * 0.42, rot, Math.PI / 2), "#f6f3ec");
      kit.cylinder.add(id, at(cx + ox * 1.02, clockY + s * 0.21, cz + oz * 1.02, s * 0.08, 0.06, s * 0.08, rot, Math.PI / 2), "#15151a");
    }
    const roofBase = stage + h * 0.12;
    kit.pyramid.add(id, at(cx, roofBase, cz, s * 0.94, y + h - roofBase, s * 0.94), "#5c8f80");
    labels.push({ id: lot.id + base, lot, level: 2, anchor: new THREE.Vector3(cx, y + h, cz) });
  }

  /** Le kiosque (h3) : un pavillon à coupole. */
  function kiosk(lot: Lot) {
    const { id, y, h } = lot;
    const s = lot.w;
    const cx = lot.x + s / 2;
    const cz = lot.z + s / 2;
    kit.cylinder.add(id, at(cx, y, cz, s, 0.3, s), "#d6cdbb");
    kit.cylinder.add(id, at(cx, y + 0.3, cz, s * 0.78, h * 0.42, s * 0.78), "#f1ece0");
    kit.dome.add(id, at(cx, y + 0.3 + h * 0.42, cz, s * 0.86, h * 0.36, s * 0.86), pick(["#5c8f80", "#c4683f", "#3d5f8a"], rand(id, 2)));
    const lantern = y + 0.3 + h * 0.78;
    kit.cylinder.add(id, at(cx, lantern, cz, s * 0.16, h * 0.12, s * 0.16), "#f1ece0");
    kit.cone.add(id, at(cx, lantern + h * 0.12, cz, s * 0.2, y + h - lantern - h * 0.12, s * 0.2), "#5c8f80");
    labels.push({ id: lot.id + base, lot, level: 3, anchor: new THREE.Vector3(cx, y + h, cz) });
  }

  /** Les petits titres (h4 à h6) : une statue de bronze sur son socle. */
  function statue(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const s = Math.min(lot.w, lot.d);
    box(id, cx, y, cz, s * 0.9, h * 0.42, s * 0.9, STONE);
    kit.cylinder.add(id, at(cx, y + h * 0.42, cz, s * 0.36, h * 0.42, s * 0.36), "#6d5d45");
    kit.ball.add(id, at(cx, y + h * 0.84, cz, s * 0.26, h * 0.16, s * 0.26), "#6d5d45");
  }

  /** L'ambassade (iframe) : un édifice à colonnes et fronton, son dôme, son drapeau. */
  function embassy(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const { w, d } = lot;
    box(id, cx, y, cz, w, 0.45, d, "#d9d1bf");
    const floor = y + 0.45;
    facade(id, cx, floor, cz - d * 0.15, w * 0.92, h * 0.8, d * 0.66, "#efe8da", FACADE.stone, 0);
    const columns = clamp(Math.round((w * 0.84) / 1.3), 4, 10);
    const colH = h * 0.62;
    const front = cz + d * 0.36;
    for (let i = 0; i < columns; i += 1) {
      const x = cx - w * 0.42 + (w * 0.84 * i) / (columns - 1);
      kit.cylinder.add(id, at(x, floor, front, 0.36, colH, 0.36), "#f4efe4");
    }
    box(id, cx, floor + colH, cz + d * 0.2, w * 0.9, 0.4, d * 0.36, "#efe8da");
    kit.gable.add(id, at(cx, floor + colH + 0.4, cz + d * 0.2, d * 0.36, h * 0.18, w * 0.9, Math.PI / 2), "#e6dece");
    if (rand(id, 2) < 0.6) kit.dome.add(id, at(cx, floor + h * 0.8, cz - d * 0.15, w * 0.32, h * 0.32, w * 0.32), "#7d9fb0");
    const px = cx + w * 0.44;
    const pz = cz + d * 0.44;
    kit.cylinder.add(id, at(px, floor, pz, 0.08, h * 0.9, 0.08), "#55575c");
    box(id, px + 0.5, floor + h * 0.9 - 0.65, pz, 1, 0.62, 0.04, pick(ACCENTS, rand(id, 3)));
  }

  function sculpture(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    box(id, cx, y, cz, lot.w * 0.8, 0.5, lot.d * 0.8, "#dcd4c4");
    kit.knot.add(id, at(cx, y + 0.5, cz, lot.w * 0.85, h - 0.5, lot.d * 0.85, rand(id, 2) * Math.PI), pick(ACCENTS, rand(id, 3)));
  }

  /** Les boutons et champs : un petit kiosque à auvent. */
  function booth(lot: Lot) {
    const { id, y, h } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    box(id, cx, y, cz, lot.w * 0.8, h * 0.78, lot.d * 0.8, pick(["#2346d8", SIGNAL, "#2f8f6b", "#c9a227"], rand(id, 2)));
    box(id, cx, y + h * 0.78, cz, lot.w, 0.14, lot.d, "#f6f3ec");
  }

  /** Les éléments vides : un chantier clôturé, parfois avec sa grue. */
  function site(lot: Lot) {
    const { id, y } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    ground(id, lot, y, 0.05, "dirt");
    const t = 0.07;
    const fence = "#e2dccf";
    box(id, cx, y, lot.z + t / 2, lot.w, 0.75, t, fence);
    box(id, cx, y, lot.z + lot.d - t / 2, lot.w, 0.75, t, fence);
    box(id, lot.x + t / 2, y, cz, t, 0.75, lot.d, fence);
    box(id, lot.x + lot.w - t / 2, y, cz, t, 0.75, lot.d, fence);
    // Une grue de temps en temps : les <div> vides vont souvent par dizaines.
    if (rand(id, 2) < 0.16 && Math.min(lot.w, lot.d) >= 2.6) {
      const mast = 14 + rand(id, 3) * 12;
      const angle = rand(id, 4) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dz = -Math.sin(angle);
      const jib = 9 + rand(id, 5) * 7;
      const yellow = "#e8b10f";
      box(id, cx, y, cz, 0.34, mast, 0.34, yellow);
      box(id, cx + dx * (jib / 2 - 0.8), y + mast, cz + dz * (jib / 2 - 0.8), jib, 0.32, 0.32, yellow, angle);
      box(id, cx - dx * 1.9, y + mast, cz - dz * 1.9, 3.4, 0.36, 0.4, yellow, angle);
      box(id, cx - dx * 3.2, y + mast - 0.7, cz - dz * 3.2, 1, 0.8, 0.7, "#5a5c62", angle);
      box(id, cx + dx * 0.5, y + mast - 0.75, cz + dz * 0.5, 0.7, 0.7, 0.7, "#f6f3ec", angle);
      kit.pyramid.add(id, at(cx, y + mast + 0.32, cz, 0.42, 1.6, 0.42), yellow);
      const hook = jib * 0.7;
      box(id, cx + dx * hook, y + mast * 0.45, cz + dz * hook, 0.04, mast * 0.55, 0.04, "#2b2b31");
    }
  }

  /** Petite image : un panonceau sur son poteau, ou un drapeau en haut de son mât. */
  function emblem(lot: Lot, panel: Panel) {
    const cell = atlas.cell(atlas.index(lot.node.img?.src));
    const cz = lot.z + lot.d / 2;
    if (panel.emblem === "flag") {
      const pole = lot.x;
      const top = panel.lift + panel.height + 0.3;
      kit.cylinder.add(lot.id, at(pole, lot.y, cz, 0.09, top, 0.09), "#dcd9d2");
      kit.ball.add(lot.id, at(pole, lot.y + top, cz, 0.18, 0.18, 0.18), "#c9a54e");
      kit.flag.add(lot.id, at(pole + 0.04 + panel.width / 2, lot.y + panel.lift, cz, panel.width, panel.height, panel.width), "#ffffff", cell);
      return;
    }
    // Enseigne : une plaque d'aluminium à plat sur la façade, l'icône tournée vers la rue.
    const { x, z, rot, alongX } = onWall(lot, panel);
    box(lot.id, x, lot.y - 0.04, z, alongX ? panel.width + 0.08 : 0.05, panel.height + 0.08, alongX ? 0.05 : panel.width + 0.08, "#b4b7bd");
    kit.sign.add(lot.id, at(x + outward(panel).x * 0.04, lot.y, z + outward(panel).z * 0.04, panel.width, panel.height, 1, rot), "#ffffff", cell);
  }

  /** Vers où regarde une façade. */
  function outward(panel: Panel): { x: number; z: number } {
    switch (panel.mount) {
      case "south": return { x: 0, z: 1 };
      case "north": return { x: 0, z: -1 };
      case "east": return { x: 1, z: 0 };
      case "west": return { x: -1, z: 0 };
      default: return { x: 0, z: 1 };
    }
  }

  /** Centre d'une affiche contre son mur (au ras de la façade), et sa rotation. */
  function onWall(lot: Lot, panel: Panel) {
    const n = outward(panel);
    const alongX = n.z !== 0;
    // Le lot est la bande devant la façade : le mur est son bord intérieur.
    const x = alongX ? lot.x + lot.w / 2 : n.x > 0 ? lot.x : lot.x + lot.w;
    const z = alongX ? (n.z > 0 ? lot.z : lot.z + lot.d) : lot.z + lot.d / 2;
    const rot = panel.mount === "north" ? Math.PI : panel.mount === "east" ? Math.PI / 2 : panel.mount === "west" ? -Math.PI / 2 : 0;
    return { x, z, rot, alongX, n };
  }

  /** Une galerie : un immeuble sombre, sobre, que ses écrans et ses affiches habillent. */
  function gallery(lot: Lot) {
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    facade(lot.id, cx, lot.y, cz, lot.w, lot.h, lot.d, pick(["#4a4f58", "#3d424b", "#565b63"], rand(lot.id, 2)), FACADE.office, 1);
    rooftop(lot, lot.y + lot.h, cx, cz, lot.w, lot.d);
  }

  /** Une image cassée : le panneau s'est effondré, entre un pan de mur et des gravats. */
  function ruin(lot: Lot) {
    const { id, y } = lot;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    ground(id, lot, y, 0.05, "dirt");
    const brick = pick(BRICK, rand(id, 9));
    // Deux pans de mur debout, déchiquetés, en équerre.
    const wall = Math.min(lot.w * 0.75, 6);
    const pieces = Math.max(3, Math.round(wall / 1.2));
    for (let k = 0; k < pieces; k += 1) {
      const piece = wall / pieces;
      const h = 0.7 + rand(id, 10 + k) * 2.2 * (1 - Math.abs(k - pieces * 0.3) / pieces);
      box(id, lot.x + lot.w * 0.08 + piece * (k + 0.5), y, lot.z + 0.35, piece * 0.97, Math.max(0.4, h), 0.35, brick);
    }
    const side = Math.min(lot.d * 0.6, 4);
    for (let k = 0; k < 3; k += 1) {
      const h = 0.5 + rand(id, 15 + k) * 1.6;
      box(id, lot.x + lot.w * 0.08 + 0.17, y, lot.z + 0.35 + (side / 3) * (k + 0.5), 0.35, h, (side / 3) * 0.97, brick);
    }
    // Le panneau tombé, un poteau encore debout et penché.
    kit.plain.add(id, at(cx, y + 0.35, cz + lot.d * 0.1, Math.min(lot.w * 0.7, 5), 0.08, Math.min(lot.d * 0.5, 2.6), 0.2, 0.35), "#2b2b31");
    kit.plain.add(id, at(cx - lot.w * 0.25, y, cz, 0.16, 2.2, 0.16, 0, 0.25), "#5b5e64");
    kit.plain.add(id, at(cx + lot.w * 0.22, y, cz + 0.4, 0.16, 1.4, 0.16, 0, -0.5), "#5b5e64");
    // Les gravats, d'autant plus nombreux que le terrain est grand.
    const rubble = clamp(Math.round((lot.w * lot.d) / 3), 8, 28);
    for (let k = 0; k < rubble; k += 1) {
      const s = 0.25 + rand(id, 20 + k) * 0.55;
      const gx = lot.x + 0.3 + rand(id, 30 + k) * (lot.w - 0.6);
      const gz = lot.z + 0.6 + rand(id, 40 + k) * (lot.d - 0.9);
      box(id, gx, y, gz, s, s * 0.7, s * 0.9, pick(["#a39b8f", "#8a7f72", "#b5ab9c", brick], rand(id, 60 + k)), rand(id, 70 + k) * 3);
    }
    obstacles.add(lot, 0.2);
  }

  function board(lot: Lot) {
    const panel = lot.panel;
    // Une image qui n'a trouvé de place nulle part : elle n'est que dans l'inspecteur.
    if (!panel || lot.h <= 0) return;
    if (panel.emblem) {
      emblem(lot, panel);
      return;
    }
    const screen = lot.kind === "screen";
    const material = new THREE.MeshStandardMaterial({
      color: screen ? "#1b1d2b" : "#cfc8b9",
      emissive: screen ? new THREE.Color("#22337a") : new THREE.Color("#000000"),
      emissiveIntensity: screen ? 0.6 : 0,
      roughness: 0.75,
      metalness: 0,
      // L'affiche est collée au cadre : vue de loin, la profondeur ne sait plus lequel est
      // devant et le cadre perce l'image par rayures qui scintillent. L'affiche gagne toujours.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    panelMaterials.push(material);
    const panels: THREE.Mesh[] = [];
    const addPanel = (x: number, y: number, z: number, rot: number) => {
      const mesh = new THREE.Mesh(panelGeometry, material);
      mesh.position.set(x, y + panel.height / 2, z);
      mesh.scale.set(panel.width, panel.height, 1);
      mesh.rotation.y = rot;
      mesh.userData.lotId = lot.id + base;
      mesh.receiveShadow = true;
      group.add(mesh);
      panels.push(mesh);
      panelMeshes.push(mesh);
    };
    const frameColor = screen ? "#15161c" : "#2b2b31";

    if (panel.mount === "roof") {
      // Le panneau d'un toit : sur ses poteaux, lisible des deux côtés.
      const cx = lot.x + lot.w / 2;
      const cz = lot.z + lot.d / 2;
      const frameY = lot.y + panel.lift;
      box(lot.id, cx, frameY - 0.15, cz, panel.width + 0.3, panel.height + 0.3, 0.3, frameColor);
      const spread = panel.width * 0.32;
      for (const dx of [-spread, spread]) kit.cylinder.add(lot.id, at(cx + dx, lot.y, cz, 0.2, panel.lift, 0.2), "#55575c");
      addPanel(cx, frameY, cz + 0.18, 0);
      addPanel(cx, frameY, cz - 0.18, Math.PI);
    } else {
      // Sur la façade : un caisson sombre contre le mur, l'affiche devant.
      const { x, z, rot, alongX, n } = onWall(lot, panel);
      const depth = 0.1;
      box(
        lot.id, x + n.x * depth / 2, lot.y - 0.1, z + n.z * depth / 2,
        alongX ? panel.width + 0.2 : depth, panel.height + 0.2, alongX ? depth : panel.width + 0.2, frameColor,
      );
      addPanel(x + n.x * (depth + 0.01), lot.y, z + n.z * (depth + 0.01), rot);
    }
    if (lot.kind === "billboard") billboards.push({ id: lot.id + base, lot, panels, ratio: panel.width / panel.height });
  }

  /** Canal : l'eau, et des ponts pour la franchir. */
  function river(lot: Lot) {
    kit.water.add(lot.id, at(lot.x + lot.w / 2, lot.y, lot.z + lot.d / 2, lot.w, lot.h, lot.d), "#4f88a6");
    const count = Math.max(1, Math.floor(lot.w / 45));
    for (let i = 0; i < count; i += 1) {
      const bx = lot.x + (lot.w * (i + 0.5)) / count;
      const span = lot.d + 2.6;
      const deckY = lot.y + CURB - 0.08;
      kit.road.add(lot.id, at(bx, deckY, lot.z + lot.d / 2, 3.4, 0.14, span), ROAD_COLORS.street, [ROAD.lane, 1, 0, 0]);
      for (const side of [-1, 1]) box(lot.id, bx + side * 1.75, deckY, lot.z + lot.d / 2, 0.14, 0.62, span, "#d8d2c4");
    }
  }

  // --- Conteneurs et décors ---------------------------------------------------

  const CONTAINER_GROUND: Partial<Record<Lot["kind"], keyof typeof GROUND>> = {
    terrain: "base", park: "grass", estate: "lawn", townhall: "plaza", gate: "plaza", boulevard: "plaza", fields: "crops", port: "wharf",
  };

  // Le bassin d'un port est plus bas que son quai : le sol du port s'arrête à son bord.
  const basins = new Map(layout.decor.filter((d) => d.type === "harbor").map((d) => [d.owner, harborWater(d)]));

  for (const lot of layout.lots) {
    if (lot.container) {
      const style = lot.depth === 0 ? "base" : CONTAINER_GROUND[lot.kind];
      const basin = basins.get(lot.id);
      if (style && lot.h > 0) for (const part of basin ? cutRect(lot, basin) : [lot]) ground(lot.id, part, lot.y, lot.h, style);
      continue;
    }
    switch (lot.kind) {
      case "tower": tower(lot); break;
      case "residence": residence(lot); break;
      case "house": house(lot); break;
      case "monument": monument(lot); break;
      case "belfry": belfry(lot); break;
      case "kiosk": kiosk(lot); break;
      case "bollard": statue(lot); break;
      case "embassy": embassy(lot); break;
      case "sculpture": sculpture(lot); break;
      case "counter": booth(lot); break;
      case "vacant": site(lot); break;
      case "ruin": ruin(lot); break;
      case "gallery": gallery(lot); break;
      case "fields": ground(lot.id, lot, lot.y, 0.08, "crops"); break;
      case "river": river(lot); break;
      case "billboard":
      case "screen": board(lot); break;
      default: tower(lot);
    }
    if (lot.kind === "river") obstacles.add(lot, 1.2);
    else obstacles.add(lot, lot.kind === "billboard" || lot.kind === "screen" ? 0.4 : 0.15);
  }

  for (const plate of layout.plates) ground(plate.owner, plate, plate.y, plate.h, plate.style);
  for (const road of layout.roads) {
    kit.road.add(road.owner, at(road.x + road.w / 2, road.y, road.z + road.d / 2, road.w, 0.03, road.d), ROAD_COLORS[road.style], [
      ROAD[road.style],
      road.axis === "x" ? 0 : 1,
      0,
      0,
    ]);
    obstacles.add(road);
    // Le terre-plein central d'une autoroute : un muret de béton.
    if (road.style === "highway") {
      const cx = road.x + road.w / 2;
      const cz = road.z + road.d / 2;
      if (road.axis === "x") box(road.owner, cx, road.y, cz, road.w, 0.32, 0.4, "#c9c4b8");
      else box(road.owner, cx, road.y, cz, 0.4, 0.32, road.d, "#c9c4b8");
    }
  }
  for (const joint of layout.joints) {
    junction(joint);
    obstacles.add(joint);
  }
  // Chenaux des ports : l'eau jusqu'au bord de la maquette, et un pont pour chaque rue qui les coupe.
  for (const channel of layout.channels) {
    kit.water.add(channel.owner, at(channel.x + channel.w / 2, channel.y, channel.z + channel.d / 2, channel.w, WATER_DEPTH, channel.d), PALETTE.WATER);
    obstacles.add(channel, 0.6);
  }
  for (const span of layout.bridges) bridge(span);
  if (layout.airport?.kind === "aerodrome") aerodrome(layout.airport);
  else if (layout.airport) airfield(layout.airport);

  /**
   * L'aérodrome d'une ville de la mégalopole : un hangar au bout de sa rue, de petits avions
   * devant, une piste courte et sa manche à air. Les vols partent du grand aéroport du site.
   */
  function aerodrome(a: Airport) {
    const { id } = a;
    ground(id, a, 0, BASE, "base");
    let lawn: Rect[] = [a];
    for (const road of layout.roads) lawn = lawn.flatMap((piece) => cutRect(piece, road));
    for (const piece of lawn) ground(id, piece, BASE, CURB, "grass");
    ground(id, a.apron, a.y, 0.03, "sidewalk");
    const [strip] = a.runways;
    kit.road.add(id, at(strip.x + strip.w / 2, a.y, strip.z + strip.d / 2, strip.w, 0.03, strip.d), "#3b3c41", [ROAD.runway, 1, 0, 0]);
    for (const way of a.taxiways) {
      kit.road.add(id, at(way.x + way.w / 2, a.y, way.z + way.d / 2, way.w, 0.03, way.d), "#4a4b50", [ROAD.taxiway, way.axis === "x" ? 0 : 1, 0, 0]);
    }

    // Le hangar : murs de tôle, toit à deux pans, grande porte ouverte vers les avions.
    const h = a.terminal;
    const hcx = h.x + h.w / 2;
    const hcz = h.z + h.d / 2;
    box(id, hcx, a.y, hcz, h.w, 2.2, h.d, "#b9bdb8");
    kit.gable.add(id, at(hcx, a.y + 2.2, hcz, h.w + 0.3, 1.1, h.d + 0.3), "#8d969b");
    box(id, h.x + h.w + 0.02, a.y, hcz, 0.06, 1.8, h.d * 0.7, "#2f3236");
    obstacles.add(h, 0.6);

    // Les avions devant le hangar, nez vers lui.
    const gate = a.apron.d / a.planes;
    for (let i = 0; i < a.planes; i += 1) {
      planeAt(id, a.apron.x + a.apron.w / 2 + 0.3, a.y, a.apron.z + gate * (i + 0.5), Math.PI, i, 0, SMALL_PLANE);
    }

    // La manche à air, rayée, gonflée par le vent d'ouest.
    const pole = a.tower;
    const px = pole.x + pole.w / 2;
    const pz = pole.z + pole.d / 2;
    box(id, px, a.y, pz, 0.08, 2.4, 0.08, "#d8d4ca");
    kit.cone.add(id, at(px, a.y + 2.3, pz, 0.36, 1.3, 0.36, 0.3, 0, -Math.PI / 2 - 0.12), "#ff4b12");
  }

  /**
   * L'aéroport, hors les murs : le socle s'agrandit pour lui. Terminal vitré et tour de contrôle
   * côté ville, avions aux portes sur le tarmac, voies de circulation, pistes.
   */
  function airfield(a: Airport) {
    const { id } = a;
    ground(id, a, 0, BASE, "base");
    // La pelouse s'écarte pour l'avenue qui vient du périphérique.
    let lawn: Rect[] = [a];
    for (const road of layout.roads) lawn = lawn.flatMap((piece) => cutRect(piece, road));
    for (const piece of lawn) ground(id, piece, BASE, CURB, "grass");

    ground(id, a.apron, a.y, 0.03, "sidewalk");
    for (const strip of a.runways) {
      kit.road.add(id, at(strip.x + strip.w / 2, a.y, strip.z + strip.d / 2, strip.w, 0.03, strip.d), "#3b3c41", [ROAD.runway, 1, 0, 0]);
    }
    for (const way of a.taxiways) {
      kit.road.add(id, at(way.x + way.w / 2, a.y, way.z + way.d / 2, way.w, 0.03, way.d), "#4a4b50", [ROAD.taxiway, way.axis === "x" ? 0 : 1, 0, 0]);
    }

    // Le terminal : un long hall vitré, son toit débordant, l'auvent de la dépose côté ville.
    const t = a.terminal;
    const tcx = t.x + t.w / 2;
    const tcz = t.z + t.d / 2;
    facade(id, tcx, a.y, tcz, t.w, 2.6, t.d, "#cfd8de", FACADE.glass, 0, 1.3);
    box(id, tcx, a.y + 2.6, tcz, t.w + 0.5, 0.22, t.d + 0.5, "#d4d6d9");
    box(id, t.x - 0.9, a.y + 2.1, tcz, 1.8, 0.12, Math.min(t.d * 0.6, 14), "#e8e4da");
    obstacles.add(t, 0.8);

    // La tour de contrôle.
    const cx = a.tower.x + a.tower.w / 2;
    const cz = a.tower.z + a.tower.d / 2;
    kit.cylinder.add(id, at(cx, a.y, cz, 1.3, 10, 1.3), "#e2dccf");
    kit.cylinder.add(id, at(cx, a.y + 10, cz, 2.7, 1.4, 2.7), "#6f93a8");
    kit.cylinder.add(id, at(cx, a.y + 11.4, cz, 3, 0.3, 3), "#3b3d42");
    box(id, cx, a.y + 11.7, cz, 0.08, 1.8, 0.08, "#3b3d42");
    kit.ball.add(id, at(cx + 0.7, a.y + 11.7, cz, 0.7, 0.7, 0.7), "#f4f2ee");
    obstacles.add(a.tower, 0.5);

    // Les avions aux portes, nez vers le terminal, chacun relié par sa passerelle.
    const gate = (a.apron.d - 6) / a.planes;
    const px = a.apron.x + a.apron.w / 2 + 0.4;
    for (let i = 0; i < a.planes; i += 1) {
      const pz = a.apron.z + 3 + gate * (i + 0.5);
      planeAt(id, px, a.y, pz, Math.PI, i);
      const from = t.x + t.w;
      const to = px - PLANE * 0.36;
      box(id, (from + to) / 2, a.y + 0.62, pz - PLANE * 0.1, to - from, 0.5, 0.55, "#c9c5bb");
      box(id, to - 0.3, a.y, pz - PLANE * 0.1, 0.16, 0.62, 0.16, "#8e9197");
    }
    // Un avion attend en bout de piste ; une page très ouverte en a un autre qui décolle.
    const [main] = a.runways;
    if (a.runways.length >= 2) planeAt(id, main.x + main.w / 2, a.y, main.z + main.d - PLANE * 0.9, Math.PI / 2, 20);
    if (a.runways.length >= 3) planeAt(id, main.x + main.w / 2, a.y + 6, main.z - PLANE * 0.4, Math.PI / 2, 21, 0.22);
    // Les vols vers les sites liés, déjà en l'air.
    a.flights.forEach((flight, i) => planeAt(id, flight.x, flight.y, flight.z, flight.heading, 30 + i, flight.pitch));
  }

  /** Un avion (nez vers +x avant rotation) et sa dérive aux couleurs d'une compagnie. */
  function planeAt(id: number, x: number, y: number, z: number, heading: number, salt: number, pitch = 0, size = PLANE) {
    kit.plane.add(id, at(x, y, z, size, size, size, heading, 0, pitch), "#ffffff");
    const fin = new THREE.Vector3(-0.43 * size, 0.15 * size, 0).applyEuler(new THREE.Euler(0, heading, pitch, "YXZ"));
    const livery = pick(["#ff4b12", "#2346d8", "#2f8f6b", "#c4462e", "#d9a21b", "#22324a"], rand(id, 500 + salt));
    kit.plain.add(id, at(x + fin.x, y + fin.y, z + fin.z, 0.12 * size, 0.16 * size, 0.014 * size, heading, 0, pitch), livery);
  }

  /** Le pont d'une rue sur un chenal : un tablier juste au-dessus de l'eau, et ses parapets. */
  function bridge(span: Bridge) {
    const cx = span.x + span.w / 2;
    const cz = span.z + span.d / 2;
    const deckY = span.y + WATER_DEPTH + 0.01;
    const alongX = span.axis === "x";
    kit.road.add(span.owner, at(cx, deckY, cz, span.w, 0.06, span.d), ROAD_COLORS[span.style], [ROAD[span.style], alongX ? 0 : 1, 0, 0]);
    const length = (alongX ? span.w : span.d) + 0.6;
    const rail = "#d8d2c4";
    for (const side of [-1, 1]) {
      if (alongX) box(span.owner, cx, deckY + 0.06, cz + side * (span.d / 2 - 0.06), length, 0.3, 0.12, rail);
      else box(span.owner, cx + side * (span.w / 2 - 0.06), deckY + 0.06, cz, 0.12, 0.3, length, rail);
    }
  }
  for (const decor of layout.decor) {
    if (decor.type === "harbor") harbor(decor);
    else if (decor.type === "gate") gate(decor);
  }

  /** Case de raccord : virage arrondi si deux côtés voisins sont ouverts, sinon chaussée droite ou carrefour. */
  function junction(joint: Joint) {
    const { open, owner, y } = joint;
    const cx = joint.x + joint.w / 2;
    const cz = joint.z + joint.d / 2;
    const sides = [open.north, open.east, open.south, open.west].filter(Boolean).length;
    const turning = sides === 2 && open.north !== open.south;
    if (!turning) {
      // Ligne droite (marquage dans le sens de la traversée) ou carrefour (sans marquage).
      const axis = sides === 2 ? (open.east ? ROAD_AXIS.x : ROAD_AXIS.z) : ROAD_AXIS.cross;
      kit.road.add(owner, at(cx, y, cz, joint.w, 0.03, joint.d), ROAD_COLORS[joint.style], [ROAD[joint.style], axis, 0, 0]);
      return;
    }
    // Le centre du virage est le coin de la case entre les deux côtés ouverts.
    const rot = open.east ? (open.south ? Math.PI : -Math.PI / 2) : open.south ? Math.PI / 2 : 0;
    kit.bend.add(owner, at(cx, y, cz, joint.w, 0.03, joint.d, rot), ROAD_COLORS[joint.style], [ROAD[joint.style], ROAD_AXIS.bend, 0, 0]);
    kit.verge.add(owner, at(cx, y, cz, joint.w, CURB, joint.d, rot), GROUND_COLORS[joint.verge], [GROUND[joint.verge], 0, 0, 0]);

    // Arbres d'alignement le long de l'arrondi, comme sur le reste du périphérique.
    if (joint.style !== "ring" && joint.style !== "avenue") return;
    const centerX = open.east ? joint.x + joint.w : joint.x;
    const centerZ = open.south ? joint.z + joint.d : joint.z;
    const dx = open.east ? -1 : 1;
    const dz = open.south ? -1 : 1;
    const radius = joint.w + 0.55;
    const count = Math.max(1, Math.round((radius * Math.PI) / 2 / 2.7));
    const salt = Math.round(joint.x * 13 + joint.z * 7);
    for (let i = 0; i < count; i += 1) {
      const angle = ((i + 0.5) / count) * (Math.PI / 2);
      const size = 1.9 + rand(salt, i * 3) * 0.7;
      const x = centerX + dx * radius * Math.cos(angle);
      const z = centerZ + dz * radius * Math.sin(angle);
      kit.tree.add(-1, at(x, y + CURB, z, size, size, size, rand(salt, i + 9) * 6), new THREE.Color(0.95, 0.97, 0.95));
    }
  }

  function gate(decor: Decor) {
    const id = decor.owner;
    const cx = decor.x + decor.w / 2;
    const cz = decor.z + decor.d / 2;
    const span = clamp(decor.w * 0.3, 4, 11);
    const height = clamp(span * 0.85, 5, 9);
    const pillar = 1.3;
    for (const side of [-1, 1]) box(id, cx + side * (span / 2 + pillar / 2), decor.y, cz, pillar, height, 1.6, STONE);
    box(id, cx, decor.y + height, cz, span + 2 * pillar + 0.4, 1.3, 1.9, "#ddd3bf");
    box(id, cx, decor.y + height + 1.3, cz, span * 0.7, 0.7, 1.4, "#d4c9b2");
    box(id, cx, decor.y + height + 0.3, cz + 0.97, span * 0.5, 0.5, 0.04, SIGNAL);
    obstacles.add({ x: cx - span / 2 - pillar, z: cz - 1, w: span + 2 * pillar, d: 2 }, 0.3);
  }

  /** Le port : bassin, grues portiques, conteneurs empilés, un cargo à quai. */
  function harbor(decor: Decor) {
    const id = decor.owner;
    const water = harborWater(decor);
    const quay = water.z - decor.z;
    // L'eau au pied du quai, au niveau de celle du chenal qui mène au large.
    const base = layout.lots[id].y;
    kit.water.add(id, at(water.x + water.w / 2, base, water.z + water.d / 2, water.w, WATER_DEPTH, water.d), PALETTE.WATER);
    obstacles.add(water, 0.6);
    const cranes = clamp(Math.floor(decor.w / 16), 1, 4);
    for (let i = 0; i < cranes; i += 1) {
      const x = decor.x + (decor.w * (i + 0.5)) / cranes;
      const legH = 7;
      const color = i % 2 === 0 ? "#2346d8" : SIGNAL;
      for (const dx of [-1.4, 1.4]) {
        for (const z of [decor.z + 0.6, decor.z + quay - 0.6]) box(id, x + dx, decor.y, z, 0.32, legH, 0.32, color);
      }
      box(id, x, decor.y + legH, decor.z + quay * 0.5 + water.d * 0.3, 3.4, 0.6, quay + water.d * 0.6, color);
      box(id, x, decor.y + legH + 0.6, decor.z + quay * 0.35, 1.6, 0.9, 1.4, "#f6f3ec");
    }
    const stacks = Math.floor(decor.w / 3.2);
    for (let i = 0; i < stacks; i += 1) {
      if (rand(id, 100 + i) < 0.35) continue;
      const x = decor.x + 1.6 + i * 3.2;
      const levels = 1 + Math.floor(rand(id, 200 + i) * 3);
      for (let k = 0; k < levels; k += 1) {
        box(id, x, decor.y + k * 1.05, decor.z + quay * 0.5, 2.6, 1, 1.1, pick(["#c4462e", "#2d5aa8", "#2f8f6b", "#d9a21b", "#8d9196"], rand(id, 300 + i * 7 + k)));
      }
    }
    if (water.d > 3 && water.w > 12) {
      const sx = water.x + water.w * (0.3 + rand(id, 9) * 0.4);
      const sz = water.z + water.d * 0.5;
      const len = Math.min(water.w * 0.45, 16);
      box(id, sx, decor.y - 0.3, sz, len, 1.5, Math.min(2.8, water.d * 0.5), "#7b2f2a");
      box(id, sx - len * 0.36, decor.y + 1.2, sz, len * 0.16, 1.6, Math.min(2.2, water.d * 0.4), "#f2efe8");
    }
  }

  // --- Parcs, pelouses, places ---------------------------------------------------

  /** Plante des arbres sur une surface, là où il n'y a ni bâtiment, ni rue, ni eau. */
  function plant(owner: number, area: Rect, y: number, step: number, chance: number) {
    for (let x = area.x + step / 2; x < area.x + area.w; x += step) {
      for (let z = area.z + step / 2; z < area.z + area.d; z += step) {
        const salt = Math.floor(x * 7.1) * 131 + Math.floor(z * 3.7);
        if (rand(owner, salt) > chance) continue;
        const px = x + (rand(owner, salt + 1) - 0.5) * step * 0.7;
        const pz = z + (rand(owner, salt + 2) - 0.5) * step * 0.7;
        if (px < area.x + 0.5 || px > area.x + area.w - 0.5 || pz < area.z + 0.5 || pz > area.z + area.d - 0.5) continue;
        if (obstacles.hit(px, pz, 0.6)) continue;
        const size = 1.7 + rand(owner, salt + 3) * 1.1;
        const batch = rand(owner, salt + 4) < 0.22 ? kit.poplar : kit.tree;
        const tint = 0.85 + rand(owner, salt + 5) * 0.3;
        batch.add(-1, at(px, y, pz, size, size * (batch === kit.poplar ? 1.5 : 1), size, rand(owner, salt + 6) * 6), new THREE.Color(tint, tint, tint));
      }
    }
  }

  // Bosquets de la campagne, autour des villes de la mégalopole.
  for (const decor of layout.decor) if (decor.type === "woods") plant(decor.owner, decor, decor.y, 2.2, 0.8);

  // Places publiques : une fontaine au milieu si elle tient, des arbres autour.
  for (const decor of layout.decor) {
    if (decor.type !== "square") continue;
    if (decor.w > 7 && decor.d > 7) fountainAt(decor.owner, decor.x + decor.w / 2, decor.z + decor.d / 2, decor.y);
    plant(decor.owner, decor, decor.y, 2.6, 0.55);
  }

  for (const lot of layout.lots) {
    if (!lot.container) continue;
    const top = lot.y + lot.h;
    if (lot.kind === "park") plant(lot.id, lot, top, 2.3, 0.75);
    else if (lot.kind === "estate") plant(lot.id, lot, top, 3.4, 0.4);
    else if (lot.kind === "boulevard") plant(lot.id, lot, top, 2.6, 0.5);
    else if ((lot.kind === "townhall" || lot.kind === "gate") && lot.w > 8 && lot.d > 8) fountain(lot, top);
  }

  function fountain(lot: Lot, top: number) {
    fountainAt(lot.id, lot.x + lot.w / 2, lot.z + lot.d / 2, top);
  }

  function fountainAt(id: number, cx: number, cz: number, top: number) {
    if (obstacles.hit(cx, cz, 1.8)) return;
    kit.cylinder.add(id, at(cx, top, cz, 3.4, 0.45, 3.4), "#d6cdbb");
    kit.cylinder.add(id, at(cx, top + 0.3, cz, 3, 0.18, 3), "#6aa3bd");
    kit.cylinder.add(id, at(cx, top, cz, 0.36, 1.5, 0.36), "#d6cdbb");
    kit.ball.add(id, at(cx, top + 1.5, cz, 0.5, 0.5, 0.5), "#d6cdbb");
    obstacles.add({ x: cx - 1.7, z: cz - 1.7, w: 3.4, d: 3.4 });
  }

  // --- L'ambiance : usines, caméras, graffitis, nuages ------------------------------

  const ambiance = layout.ambiance;
  if (ambiance?.industry) for (const factory of ambiance.industry.factories) factoryAt(ambiance.industry.id, factory);
  if (ambiance?.surveillance) for (const camera of ambiance.surveillance.cameras) cameraAt(ambiance.surveillance.id, camera);
  if (ambiance) {
    graffiti(ambiance.info.graffiti);
    const tone = ambiance.weather === "storm" ? 0.5 : ambiance.weather === "overcast" ? 0.8 : 0.96;
    ambiance.clouds.forEach((cloud, i) => cloudAt(cloud, i, tone));
    if (ambiance.weather === "storm") storm(ambiance.clouds);
  }

  /** Une usine : hall de brique à sheds, cheminées rayées, fumée poussée par le vent d'ouest. */
  function factoryAt(id: number, f: Factory) {
    const alongZ = f.axis === "z";
    const cx = f.x + f.w / 2;
    const cz = f.z + f.d / 2;
    ground(id, { x: f.x - 0.4, z: f.z - 0.4, w: f.w + 0.8, d: f.d + 0.8 }, f.y, 0.04, "sidewalk");
    const body = 3.4;
    const hallW = alongZ ? f.w : f.w * 0.78;
    const hallD = alongZ ? f.d * 0.78 : f.d;
    const hx = alongZ ? cx : f.x + hallW / 2;
    const hz = alongZ ? f.z + hallD / 2 : cz;
    facade(id, hx, f.y, hz, hallW, body, hallD, pick(BRICK, rand(id, Math.round(f.x + f.z))), FACADE.brick, 0, 1.7);
    // Toit à sheds : une rangée de pignons sur la longueur.
    const teeth = 3;
    for (let k = 0; k < teeth; k += 1) {
      const step = (alongZ ? hallD : hallW) / teeth;
      const tx = alongZ ? hx : f.x + step * (k + 0.5);
      const tz = alongZ ? f.z + step * (k + 0.5) : hz;
      kit.gable.add(id, at(tx, f.y + body, tz, alongZ ? hallW : step, 1.1, alongZ ? step : hallD, alongZ ? 0 : Math.PI / 2), "#7d8186");
    }
    obstacles.add({ x: f.x - 0.4, z: f.z - 0.4, w: f.w + 0.8, d: f.d + 0.8 });
    // Les cheminées, au bout libre du terrain.
    for (let c = 0; c < f.chimneys; c += 1) {
      const sx = alongZ ? f.x + f.w * (f.chimneys === 1 ? 0.5 : 0.3 + c * 0.4) : f.x + f.w * 0.9;
      const sz = alongZ ? f.z + f.d * 0.9 : f.z + f.d * (f.chimneys === 1 ? 0.5 : 0.3 + c * 0.4);
      const tall = 11 + rand(id, Math.round(sx * 7 + sz * 3)) * 5;
      kit.cylinder.add(id, at(sx, f.y, sz, 1.1, tall, 1.1), "#9a4a37");
      kit.cylinder.add(id, at(sx, f.y + tall - 1.6, sz, 1.16, 0.5, 1.16), "#ece7dc");
      kit.cylinder.add(id, at(sx, f.y + tall - 0.8, sz, 1.16, 0.5, 1.16), "#c4462e");
      for (let k = 0; k < 6; k += 1) {
        const size = 1.1 + k * 0.55;
        const shade = 0.95 - k * 0.035;
        kit.cloud.add(-1, at(sx + k * 1.15 + k * k * 0.12, f.y + tall + 0.2 + k * 1.05, sz + k * 0.25, size, size * 0.85, size), new THREE.Color(shade, shade * 0.99, shade * 0.97));
      }
    }
  }

  /** Une caméra sur son mât, l'objectif vers la chaussée, son champ dessiné au sol. */
  function cameraAt(id: number, cam: Camera) {
    const dx = Math.cos(cam.heading);
    const dz = -Math.sin(cam.heading);
    box(id, cam.x, cam.y, cam.z, 0.14, 3, 0.14, "#6f7378");
    box(id, cam.x + dx * 0.3, cam.y + 2.95, cam.z + dz * 0.3, 0.6, 0.1, 0.1, "#6f7378", cam.heading);
    kit.plain.add(id, at(cam.x + dx * 0.75, cam.y + 2.6, cam.z + dz * 0.75, 0.9, 0.34, 0.36, cam.heading, 0, -0.3), "#2b2d31");
    kit.glow.add(id, at(cam.x + dx * 0.55, cam.y + 2.97, cam.z + dz * 0.55, 0.12, 0.08, 0.12), SIGNAL);
    kit.veil.add(-1, at(cam.x + dx * 1.1, cam.y - CURB + 0.06, cam.z + dz * 1.1, 7.5, 1, 7.5, cam.heading), SIGNAL);
    obstacles.add({ x: cam.x - 0.3, z: cam.z - 0.3, w: 0.6, d: 0.6 });
  }

  /**
   * Les graffitis, sur la façade sud (celle qu'on voit d'emblée) d'immeubles et de palissades de
   * chantier tirés au sort, au rez-de-chaussée.
   */
  function graffiti(count: number) {
    if (count === 0) return;
    const walls = layout.lots
      .filter((lot) => !lot.container && (lot.kind === "residence" || lot.kind === "tower" || lot.kind === "vacant") && lot.w >= 2.4)
      .sort((a, b) => rand(a.id, 900) - rand(b.id, 900) || a.id - b.id)
      .slice(0, count);
    walls.forEach((lot, i) => {
      // Au pied du mur, sous les enseignes.
      const w = Math.min(lot.w * 0.72, 1.9);
      const h = w / 2;
      const x = lot.x + lot.w / 2 + (rand(lot.id, 901) - 0.5) * (lot.w - w) * 0.8;
      const z = lot.z + lot.d + (lot.kind === "vacant" ? 0.12 : 0.03);
      const cell = materials.graffitiAtlas.cell(Math.floor(rand(lot.id, 902) * 97) + i);
      kit.graffiti.add(lot.id, at(x, lot.y + 0.08, z, w, Math.min(h, 0.92), 1), "#ffffff", cell);
    });
  }

  /** Un nuage : quelques boules aplaties autour d'une plus grosse. */
  function cloudAt(cloud: Cloud, i: number, tone: number) {
    const t = Math.min(1, tone + rand(i, 950) * 0.06);
    const color = new THREE.Color(t, t, t * (tone < 0.6 ? 1.05 : 0.99));
    const s = cloud.size;
    kit.cloud.add(-1, at(cloud.x, cloud.y, cloud.z, s * 2, s * 1.1, s * 1.6), color);
    const puffs = 5;
    for (let k = 0; k < puffs; k += 1) {
      const angle = (k / puffs) * Math.PI * 2 + rand(i, 960 + k);
      const r = s * (0.7 + rand(i, 970 + k) * 0.4);
      const size = s * (0.9 + rand(i, 980 + k) * 0.5);
      kit.cloud.add(-1, at(cloud.x + Math.cos(angle) * r, cloud.y - s * 0.15, cloud.z + Math.sin(angle) * r * 0.7, size * 1.3, size * 0.8, size * 1.1), color);
    }
  }

  /** L'orage : un rideau de pluie sous chaque nuage, et un éclair sous le plus gros. */
  function storm(clouds: Cloud[]) {
    const ground0 = BASE + CURB;
    for (const cloud of clouds) {
      const height = cloud.y - ground0;
      kit.rain.add(-1, at(cloud.x, ground0, cloud.z, cloud.size * 1.5, height, cloud.size * 1.1), "#6f7f92");
    }
    const big = clouds.reduce<Cloud | null>((best, c) => (!best || c.size > best.size ? c : best), null);
    if (!big) return;
    let x = big.x + big.size * 0.3;
    let y = big.y;
    const z = big.z;
    const legs = 5;
    const drop = (y - ground0) / legs;
    for (let k = 0; k < legs; k += 1) {
      const nx = x + (k % 2 === 0 ? 1 : -1) * (1.2 + rand(k, 990) * 1.4);
      const ny = y - drop;
      const length = Math.hypot(nx - x, drop);
      const angle = Math.atan2(nx - x, drop);
      // Posé sur son bout bas, penché jusqu'à toucher le bout haut.
      kit.glow.add(-1, at(nx, ny, z, 0.32, length, 0.32, 0, 0, angle), "#fff7d6");
      x = nx;
      y = ny;
    }
  }

  // --- Mobilier urbain : arbres d'alignement, lampadaires, voitures -------------

  for (const road of layout.roads) streetLife(road);

  function streetLife(road: Road) {
    const alongX = road.axis === "x";
    const length = alongX ? road.w : road.d;
    const width = alongX ? road.d : road.w;
    const salt = Math.round(road.x * 13 + road.z * 7);
    const point = (along: number, across: number): [number, number] =>
      alongX ? [road.x + along, road.z + across] : [road.x + across, road.z + along];
    const sidewalkY = road.y + CURB;

    const drivable = road.style !== "path";
    const lined =
      road.style === "ring" || road.style === "avenue" || road.style === "highway" || (road.style === "street" && width >= 3.4);

    if (lined) {
      const spacing = road.style === "street" ? 3.4 : 2.7;
      for (let t = 1.7; t < length - 1.7; t += spacing) {
        for (const side of [-1, 1]) {
          const [x, z] = point(t, side < 0 ? -0.55 : width + 0.55);
          if (obstacles.hit(x, z, 0.5)) continue;
          const size = 1.9 + rand(salt, t * 3 + side) * 0.7;
          kit.tree.add(-1, at(x, sidewalkY, z, size, size, size, rand(salt, t + side * 9) * 6), new THREE.Color(0.95, 0.97, 0.95));
        }
      }
    }
    if (drivable && road.style !== "lane") {
      let flip = 0;
      for (let t = 4; t < length - 2; t += 8.5) {
        flip += 1;
        const side = flip % 2 === 0 ? -0.22 : width + 0.22;
        const [x, z] = point(t, side);
        if (obstacles.hit(x, z, 0.15)) continue;
        // La crosse du lampadaire penche au-dessus de la chaussée.
        const rot = alongX ? (side < 0 ? -Math.PI / 2 : Math.PI / 2) : side < 0 ? 0 : Math.PI;
        kit.lamp.add(-1, at(x, sidewalkY, z, 2.6, 2.6, 2.6, rot), "#ffffff");
      }
    }
    if (!drivable) return;

    // Voitures : deux files en sens opposés (quatre sur l'autoroute), loin des carrefours.
    const lanes =
      road.style === "highway"
        ? [0.14, 0.34, 0.66, 0.86].map((f) => width * f)
        : width >= 2.6
          ? [width * 0.28, width * 0.72]
          : [width * 0.5];
    lanes.forEach((across, lane) => {
      const forward = lane < lanes.length / 2;
      const margin = Math.min(width * 0.9, length * 0.3);
      let t = margin + rand(salt, lane * 3) * 4;
      let n = 0;
      while (t < length - margin) {
        const r = rand(salt, lane * 1000 + n);
        n += 1;
        if (r > 0.42) {
          const [x, z] = point(t, across);
          const size = 1.35 + rand(salt, lane * 2000 + n) * 0.25;
          const rot = alongX ? (forward ? 0 : Math.PI) : forward ? -Math.PI / 2 : Math.PI / 2;
          kit.car.add(-1, at(x, road.y + 0.03, z, size, size, size, rot), pick(CARS, rand(salt, lane * 3000 + n)));
        }
        t += 2.4 + rand(salt, lane * 4000 + n) * 6;
      }
    });
  }

  // --- Assemblage ----------------------------------------------------------------

  const refs: InstanceRef[][] = [];
  const baseColors = new Map<THREE.InstancedMesh, Float32Array>();
  const pickables: THREE.Object3D[] = [];
  const details: THREE.Object3D[] = [];
  const furniture = new Set<Batch>([kit.tree, kit.poplar, kit.car, kit.lamp]);
  for (const [name, batch] of Object.entries(kit)) {
    const mesh = batch.build(refs, baseColors, base);
    if (!mesh) continue;
    group.add(mesh);
    mesh.userData.batch = name;
    if (furniture.has(batch)) details.push(mesh);
    // Une rue désigne le conteneur qui l'a fait tracer : le survol doit savoir que c'en est une.
    if (batch === kit.road || batch === kit.bend) mesh.userData.part = "road";
    if (batch.options.pickable) pickables.push(mesh);
  }
  pickables.push(...panelMeshes);

  return {
    group,
    pickables,
    refs,
    baseColors,
    billboards,
    emblems: { atlas, owners: atlas.sources.map((src) => iconOwners.get(src)!.map((id) => id + base)) },
    labels,
    details,
    dispose() {
      group.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) {
          object.geometry.dispose();
          object.dispose();
        }
      });
      panelGeometry.dispose();
      atlas.dispose();
      emblemSurface.dispose();
      for (const material of panelMaterials) {
        (material as THREE.MeshStandardMaterial).map?.dispose();
        material.dispose();
      }
    },
  };
}
