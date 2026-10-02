/**
 * Construction de la scène 3D à partir de l'urbanisme.
 *
 * Toutes les formes répétées sont des InstancedMesh : quelques appels de dessin
 * pour des milliers de bâtiments. Seules les affiches des panneaux (une texture
 * chacune) sont des objets à part.
 */

import * as THREE from "three";
import { ALTITUDE_TINTS, KINDS, type Kind } from "@/format/taxonomy";
import * as shapes from "./geometries";
import type { CityLayout, Lot } from "./layout";
import type { CityMaterials } from "./materials";

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

const POLE_COLOR = "#55555C";
const FRAME_COLOR = "#2B2B31";
const SIGN_COLOR = "#E9E3D6";
const PANEL_WAIT_COLOR = "#CFC8B9";
/** En dessous de cette taille (en pixels), une image est une icône : pas d'affiche. */
const ICON_SIZE = 48;

class Batch {
  private matrices: number[] = [];
  private colors: number[] = [];
  private lots: number[] = [];

  constructor(
    readonly geometry: THREE.BufferGeometry,
    readonly material: THREE.Material,
    readonly castShadow = true,
    readonly receiveShadow = true,
  ) {}

  add(lotId: number, matrix: THREE.Matrix4, color: THREE.Color) {
    this.matrices.push(...matrix.elements);
    this.colors.push(color.r, color.g, color.b);
    this.lots.push(lotId);
  }

  build(refs: InstanceRef[][], baseColors: Map<THREE.InstancedMesh, Float32Array>): THREE.InstancedMesh | null {
    const count = this.lots.length;
    if (count === 0) {
      this.geometry.dispose();
      return null;
    }
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
    mesh.instanceMatrix.array.set(this.matrices);
    mesh.instanceMatrix.needsUpdate = true;
    const colors = new Float32Array(this.colors);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors.slice(), 3);
    mesh.castShadow = this.castShadow;
    mesh.receiveShadow = this.receiveShadow;
    mesh.userData.lots = Int32Array.from(this.lots);
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    baseColors.set(mesh, colors);
    this.lots.forEach((lotId, index) => (refs[lotId] ??= []).push({ mesh, index }));
    return mesh;
  }
}

const tmpMatrix = new THREE.Matrix4();
const tmpPosition = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const identity = new THREE.Quaternion();

function matrixAt(cx: number, y: number, cz: number, w: number, h: number, d: number): THREE.Matrix4 {
  return tmpMatrix.compose(tmpPosition.set(cx, y, cz), identity, tmpScale.set(w, h, d));
}

/** Petite variation de teinte, stable d'un affichage à l'autre. */
function jitter(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.07;
}

function lotColor(lot: Lot): THREE.Color {
  let hex: string;
  if (lot.container && (lot.kind === "district" || lot.kind === "block" || lot.kind === "terrain")) {
    hex = lot.depth === 0 ? KINDS.terrain.color : ALTITUDE_TINTS[Math.min(lot.depth, ALTITUDE_TINTS.length - 1)];
  } else {
    hex = KINDS[lot.kind].color;
  }
  const color = new THREE.Color(hex);
  const j = jitter(lot.id);
  return color.multiplyScalar(1 + j);
}

const LEAF_SHAPES: Partial<Record<Kind, "building" | "plain" | "water">> = {
  tower: "building",
  residence: "building",
  vacant: "plain",
  fields: "plain",
  counter: "plain",
  estate: "plain",
  park: "plain",
  river: "water",
};

export function buildCityScene(layout: CityLayout, materials: CityMaterials): CityScene {
  const group = new THREE.Group();
  group.name = "domcity";

  const batches = {
    slab: new Batch(shapes.blockGeometry(), materials.slab, true, true),
    building: new Batch(shapes.blockGeometry(), materials.building),
    plain: new Batch(shapes.blockGeometry(), materials.plain),
    water: new Batch(shapes.blockGeometry(), materials.water, false, true),
    house: new Batch(shapes.houseGeometry(), materials.painted),
    obelisk: new Batch(shapes.obeliskGeometry(), materials.painted),
    belfry: new Batch(shapes.belfryGeometry(), materials.painted),
    kiosk: new Batch(shapes.kioskGeometry(), materials.painted),
    bollard: new Batch(shapes.bollardGeometry(), materials.painted),
    embassy: new Batch(shapes.embassyGeometry(), materials.painted),
    sculpture: new Batch(shapes.sculptureGeometry(), materials.painted),
    tree: new Batch(shapes.treeGeometry(), materials.painted),
  };

  const billboards: BillboardSlot[] = [];
  const labels: LabelSlot[] = [];
  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panelMaterials: THREE.Material[] = [];
  const panelMeshes: THREE.Mesh[] = [];
  const pole = new THREE.Color(POLE_COLOR);

  for (const lot of layout.lots) {
    const cx = lot.x + lot.w / 2;
    const cz = lot.z + lot.d / 2;
    const color = lotColor(lot);

    if (lot.container) {
      batches.slab.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
      if (lot.kind === "park") plantTrees(lot, batches.tree);
      continue;
    }

    const simple = LEAF_SHAPES[lot.kind];
    if (simple) {
      batches[simple].add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
      continue;
    }

    switch (lot.kind) {
      case "house":
        batches.house.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
        break;
      case "monument":
      case "belfry":
      case "kiosk": {
        const batch = lot.kind === "monument" ? batches.obelisk : lot.kind === "belfry" ? batches.belfry : batches.kiosk;
        batch.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
        if (lot.node.heading) {
          const level = lot.kind === "monument" ? 1 : lot.kind === "belfry" ? 2 : 3;
          labels.push({ lot, level, anchor: new THREE.Vector3(cx, lot.y + lot.h, cz) });
        }
        break;
      }
      case "bollard":
        batches.bollard.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
        break;
      case "embassy":
        batches.embassy.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
        break;
      case "sculpture":
        batches.sculpture.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
        break;
      case "billboard":
      case "screen": {
        const panel = lot.panel!;
        const size = Math.max(lot.node.img?.w ?? 0, lot.node.img?.h ?? 0);
        const isIcon = lot.kind === "billboard" && (!lot.node.img?.src || (size > 0 && size < ICON_SIZE));
        const frameColor = new THREE.Color(isIcon ? SIGN_COLOR : FRAME_COLOR).multiplyScalar(1 + jitter(lot.id));
        const frameY = lot.y + panel.lift;
        batches.plain.add(
          lot.id,
          matrixAt(cx, frameY - 0.15, cz, panel.width + 0.3, panel.height + 0.3, 0.3),
          frameColor,
        );
        const legHeight = panel.lift;
        const spread = panel.width * 0.32;
        for (const dx of [-spread, spread]) {
          batches.plain.add(lot.id, matrixAt(cx + dx, lot.y, cz, 0.22, legHeight, 0.22), pole);
        }

        if (!isIcon) {
          const material = new THREE.MeshStandardMaterial({
            color: lot.kind === "screen" ? "#1B1D2B" : PANEL_WAIT_COLOR,
            emissive: lot.kind === "screen" ? new THREE.Color("#22337a") : new THREE.Color("#000000"),
            emissiveIntensity: lot.kind === "screen" ? 0.6 : 0,
            roughness: 0.75,
            metalness: 0,
          });
          panelMaterials.push(material);
          const panels: THREE.Mesh[] = [];
          for (const side of [1, -1]) {
            const mesh = new THREE.Mesh(panelGeometry, material);
            mesh.position.set(cx, frameY + panel.height / 2, cz + side * 0.16);
            mesh.scale.set(panel.width, panel.height, 1);
            if (side < 0) mesh.rotation.y = Math.PI;
            mesh.userData.lotId = lot.id;
            mesh.receiveShadow = true;
            group.add(mesh);
            panels.push(mesh);
            panelMeshes.push(mesh);
          }
          if (lot.kind === "billboard") {
            billboards.push({ lot, panels, ratio: panel.width / panel.height });
          }
        }
        break;
      }
      default:
        batches.building.add(lot.id, matrixAt(cx, lot.y, cz, lot.w, lot.h, lot.d), color);
    }
  }

  const refs: InstanceRef[][] = [];
  const baseColors = new Map<THREE.InstancedMesh, Float32Array>();
  const pickables: THREE.Object3D[] = [];
  for (const batch of Object.values(batches)) {
    const mesh = batch.build(refs, baseColors);
    if (!mesh) continue;
    group.add(mesh);
    if (batch !== batches.tree) pickables.push(mesh);
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
        const map = (material as THREE.MeshStandardMaterial).map;
        map?.dispose();
        material.dispose();
      }
    },
  };
}

/** Une rangée d'arbres le long du bord d'un parc. */
function plantTrees(lot: Lot, batch: Batch) {
  const top = lot.y + lot.h;
  const inset = 0.55;
  const spacing = 2.4;
  const x0 = lot.x + inset;
  const x1 = lot.x + lot.w - inset;
  const z0 = lot.z + inset;
  const z1 = lot.z + lot.d - inset;
  const white = new THREE.Color("#ffffff");
  const points: Array<[number, number]> = [];
  for (let x = x0; x <= x1 + 1e-6; x += spacing) points.push([x, z0], [x, z1]);
  for (let z = z0 + spacing; z < z1 - 1e-6; z += spacing) points.push([x0, z], [x1, z]);
  points.forEach(([x, z], i) => {
    const size = 1.1 + (jitter(lot.id * 31 + i) + 0.035) * 6;
    batch.add(lot.id, matrixAt(x, top, z, size, size * 2, size), white);
  });
}
