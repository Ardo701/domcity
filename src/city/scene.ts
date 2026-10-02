/**
 * Construction de la scène 3D à partir de l'urbanisme.
 *
 * Chaque bâtiment est composé de quelques pièces (socle, fût, retraits, toit,
 * flèche…) choisies selon son genre et tirées au sort de façon stable : la même
 * page donne toujours la même ville. Toutes les pièces répétées sont des
 * InstancedMesh, quelques dizaines d'appels de dessin pour des milliers de
 * bâtiments, d'arbres et de voitures. Seules les affiches des panneaux (une
 * texture chacune) sont des objets à part.
 */

import * as THREE from "three";
import * as shapes from "./geometries";
import { CURB, FLOOR, type CityLayout, type Decor, type Joint, type Lot, type Rect, type Road } from "./layout";
import { FACADE, GROUND, ROAD, ROAD_AXIS, type CityMaterials } from "./materials";
import * as PALETTE from "./palette";

export interface InstanceRef {
  mesh: THREE.InstancedMesh;
  index: number;
}

export interface BillboardSlot {
  lot: Lot;
  panels: THREE.Mesh[];
  ratio: number;
}

export interface LabelSlot {
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
  labels: LabelSlot[];
  dispose(): void;
}

const GROUND_COLORS = PALETTE.GROUND_COLORS;
const ROAD_COLORS = PALETTE.ROAD_COLORS;
const { GLASS, CONCRETE, BRICK, STUCCO, HOUSES, ROOFS, ACCENTS, CARS, STONE, SIGNAL, rand, pick } = PALETTE;

/** En dessous de cette taille (en pixels), une image est une icône : pas d'affiche. */
const ICON_SIZE = 48;

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

  build(refs: InstanceRef[][], baseColors: Map<THREE.InstancedMesh, Float32Array>): THREE.InstancedMesh | null {
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
      mesh.userData.lots = Int32Array.from(this.lots);
      baseColors.set(mesh, colors);
      this.lots.forEach((lotId, index) => {
        if (lotId >= 0) (refs[lotId] ??= []).push({ mesh, index });
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

/** Base au centre (cx, y, cz), taille (w, h, d), rotation autour de la verticale puis de x. */
function at(cx: number, y: number, cz: number, w: number, h: number, d: number, rotY = 0, rotX = 0): THREE.Matrix4 {
  tmpQuaternion.setFromEuler(tmpEuler.set(rotX, rotY, 0));
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

export function buildCityScene(layout: CityLayout, materials: CityMaterials): CityScene {
  const group = new THREE.Group();
  group.name = "domcity";
  const pickable = { pickable: true };

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
    labels.push({ lot, level: 1, anchor: new THREE.Vector3(cx, y + h, cz) });
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
    labels.push({ lot, level: 2, anchor: new THREE.Vector3(cx, y + h, cz) });
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
    labels.push({ lot, level: 3, anchor: new THREE.Vector3(cx, y + h, cz) });
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

  function board(lot: Lot) {
    const panel = lot.panel!;
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const size = Math.max(lot.node.img?.w ?? 0, lot.node.img?.h ?? 0);
    const isIcon = lot.kind === "billboard" && (!lot.node.img?.src || (size > 0 && size < ICON_SIZE));
    const frameY = lot.y + panel.lift;
    box(lot.id, cx, frameY - 0.15, cz, panel.width + 0.3, panel.height + 0.3, 0.3, isIcon ? "#e9e3d6" : "#2b2b31");
    if (!isIcon) box(lot.id, cx, frameY - 0.45, cz + 0.35, panel.width * 0.9, 0.08, 0.5, "#55575c");
    const spread = panel.width * 0.32;
    for (const dx of [-spread, spread]) kit.cylinder.add(lot.id, at(cx + dx, lot.y, cz, 0.24, panel.lift, 0.24), "#55575c");
    if (isIcon) return;

    const material = new THREE.MeshStandardMaterial({
      color: lot.kind === "screen" ? "#1b1d2b" : "#cfc8b9",
      emissive: lot.kind === "screen" ? new THREE.Color("#22337a") : new THREE.Color("#000000"),
      emissiveIntensity: lot.kind === "screen" ? 0.6 : 0,
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
    for (const side of [1, -1]) {
      const mesh = new THREE.Mesh(panelGeometry, material);
      mesh.position.set(cx, frameY + panel.height / 2, cz + side * 0.18);
      mesh.scale.set(panel.width, panel.height, 1);
      if (side < 0) mesh.rotation.y = Math.PI;
      mesh.userData.lotId = lot.id;
      mesh.receiveShadow = true;
      group.add(mesh);
      panels.push(mesh);
      panelMeshes.push(mesh);
    }
    if (lot.kind === "billboard") billboards.push({ lot, panels, ratio: panel.width / panel.height });
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

  for (const lot of layout.lots) {
    if (lot.container) {
      const style = lot.depth === 0 ? "base" : CONTAINER_GROUND[lot.kind];
      if (style && lot.h > 0) ground(lot.id, lot, lot.y, lot.h, style);
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
  }
  for (const joint of layout.joints) {
    junction(joint);
    obstacles.add(joint);
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
    const quay = decor.d * 0.38;
    const water: Rect = { x: decor.x, z: decor.z + quay, w: decor.w, d: decor.d - quay };
    kit.water.add(id, at(water.x + water.w / 2, decor.y, water.z + water.d / 2, water.w, 0.04, water.d), "#4f88a6");
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
    const lined = road.style === "ring" || road.style === "avenue" || (road.style === "street" && width >= 3.4);

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

    // Voitures : deux files en sens opposés, loin des carrefours.
    const lanes = width >= 2.6 ? [width * 0.28, width * 0.72] : [width * 0.5];
    lanes.forEach((across, lane) => {
      const forward = lane === 0;
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
  for (const batch of Object.values(kit)) {
    const mesh = batch.build(refs, baseColors);
    if (!mesh) continue;
    group.add(mesh);
    if (batch.options.pickable) pickables.push(mesh);
  }
  pickables.push(...panelMeshes);

  return {
    group,
    pickables,
    refs,
    baseColors,
    billboards,
    labels,
    dispose() {
      group.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) {
          object.geometry.dispose();
          object.dispose();
        }
      });
      panelGeometry.dispose();
      for (const material of panelMaterials) {
        (material as THREE.MeshStandardMaterial).map?.dispose();
        material.dispose();
      }
    },
  };
}
