/**
 * La vue 3D : rendu, caméra, deux façons de se déplacer, survol et sélection.
 *
 * - Vue aérienne : glisser pour se déplacer, clic droit pour tourner, molette pour zoomer.
 * - Promenade : ZQSD (ou WASD) pour avancer, Espace et Maj pour monter et descendre.
 *   On regarde avec la souris capturée ; si le navigateur refuse, en glissant.
 *
 * Le rendu ne se fait que quand quelque chose bouge : la batterie dit merci.
 */

import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { HIGHLIGHT_COLOR } from "@/format/taxonomy";
import type { CityLayout, Lot } from "./layout";
import { createMaterials, type CityMaterials } from "./materials";
import { buildCityScene, type CityScene, type LabelSlot } from "./scene";
import {
  createQueue,
  ensureFonts,
  fontFamily,
  loadImageTexture,
  plaqueTexture,
  probeImage,
  unavailableTexture,
  type ImageStatus,
} from "./textures";

export type ViewMode = "aerial" | "walk";
/** off : on lit le mode d'emploi · locked : souris capturée · free : on regarde en glissant. */
export type WalkState = "off" | "locked" | "free";

export interface ViewEvents {
  onHover?: (lotId: number | null, screen: { x: number; y: number } | null) => void;
  onSelect?: (lotId: number | null) => void;
  onModeChange?: (mode: ViewMode) => void;
  onWalkChange?: (state: WalkState) => void;
  onImageStatus?: (lotId: number, status: ImageStatus) => void;
}

const PAPER = "#EEEAE1";
const GROUND = "#E7E2D7";
/** Hauteur des yeux du promeneur. */
const EYE = 1.9;
const HOVER = new THREE.Color(HIGHLIGHT_COLOR);
const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight",
]);

interface Flight {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPosition: THREE.Vector3;
  toTarget: THREE.Vector3;
  start: number;
  duration: number;
}

export class CityView {
  readonly layout: CityLayout;
  private readonly container: HTMLElement;
  private readonly events: ViewEvents;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly aerial: MapControls;
  private readonly materials: CityMaterials;
  private readonly city: CityScene;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly size: number;
  private readonly center: THREE.Vector3;
  private readonly sprites: Array<{ slot: LabelSlot; sprite: THREE.Sprite }> = [];
  private readonly extras: THREE.Object3D[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly timer = new THREE.Timer();
  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly reducedMotion: boolean;
  private environment: THREE.Texture | null = null;

  private mode: ViewMode = "aerial";
  private walking: WalkState = "off";
  private look: { x: number; y: number; moved: number } | null = null;
  private frame = 0;
  private dirty = true;
  private pointerInside = false;
  private pointerMoved = false;
  private pointerDown: { x: number; y: number; button: number } | null = null;
  private hovered: number | null = null;
  private selected: number | null = null;
  private flight: Flight | null = null;
  private savedAerial: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private disposed = false;

  constructor(container: HTMLElement, layout: CityLayout, events: ViewEvents = {}) {
    this.container = container;
    this.layout = layout;
    this.events = events;
    this.reducedMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const { bounds } = layout;
    this.size = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 40);
    this.center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);

    // Rendu
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // La ville ne bouge pas : les ombres sont calculées une seule fois.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.className = "domcity-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Ville en 3D");
    container.appendChild(this.renderer.domElement);

    // Ciel de papier, brume pour la profondeur
    this.scene.background = new THREE.Color(PAPER);
    this.scene.fog = new THREE.Fog(PAPER, this.size * 1.8, this.size * 4.8);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, this.size * 12);

    this.materials = createMaterials(GROUND);
    this.city = buildCityScene(layout, this.materials);
    this.scene.add(this.city.group);
    this.addGround();
    this.addLights();
    this.addSky();

    // Contrôles
    this.aerial = new MapControls(this.camera, this.renderer.domElement);
    this.aerial.enableDamping = true;
    this.aerial.dampingFactor = 0.09;
    this.aerial.screenSpacePanning = false;
    this.aerial.maxPolarAngle = 1.38;
    this.aerial.minDistance = 2.5;
    this.aerial.maxDistance = this.size * 3;
    this.aerial.zoomToCursor = true;
    this.aerial.addEventListener("change", this.invalidate);

    // Événements
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointerleave", this.handlePointerLeave);
    canvas.addEventListener("dblclick", this.handleDoubleClick);
    canvas.addEventListener("contextmenu", this.preventDefault);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("pointerlockchange", this.handleLockChange);
    document.addEventListener("pointerlockerror", this.handleLockError);
    document.addEventListener("mousemove", this.handleLockedMouse);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.resetView(false);

    this.renderer.shadowMap.needsUpdate = true;
    this.timer.connect(document);
    this.frame = requestAnimationFrame(this.tick);

    void this.decorate();
  }

  // -------------------------------------------------------------------------
  // API
  // -------------------------------------------------------------------------

  get currentMode(): ViewMode {
    return this.mode;
  }

  setMode(mode: ViewMode) {
    if (mode === this.mode) return;
    this.flight = null;
    if (mode === "walk") {
      this.savedAerial = { position: this.camera.position.clone(), target: this.aerial.target.clone() };
      this.aerial.enabled = false;
      // On pose le promeneur sur le périphérique sud, à hauteur d'homme, face au nord (le haut de la page).
      const { bounds } = this.layout;
      this.camera.position.set(this.center.x, EYE, bounds.maxZ - 10);
      this.camera.lookAt(this.center.x, EYE + 1.5, this.center.z);
      this.setHover(null, null);
    } else {
      if (this.isLocked()) document.exitPointerLock();
      this.setWalking("off");
      this.aerial.enabled = true;
      const saved = this.savedAerial;
      if (saved) {
        this.camera.position.copy(saved.position);
        this.aerial.target.copy(saved.target);
      } else {
        this.resetView(false);
      }
      this.aerial.update();
      this.keys.clear();
      this.velocity.set(0, 0, 0);
    }
    this.mode = mode;
    this.events.onModeChange?.(mode);
    this.invalidate();
  }

  /** Démarre la promenade (doit suivre un clic) : souris capturée si possible, sinon on regarde en glissant. */
  startWalk() {
    if (this.mode !== "walk") this.setMode("walk");
    const canvas = this.renderer.domElement;
    try {
      const request = canvas.requestPointerLock() as unknown;
      if (request instanceof Promise) request.catch(() => this.setWalking("free"));
    } catch {
      this.setWalking("free");
    }
  }

  /** Vue d'ensemble depuis le sud, assez loin pour que toute la ville tienne à l'écran. */
  resetView(animate = true) {
    const { bounds } = this.layout;
    const target = new THREE.Vector3(this.center.x, bounds.maxY * 0.1, this.center.z + this.size * 0.04);
    const vertical = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const distance = (this.size * 0.6) / Math.sin(Math.min(vertical, horizontal) / 2);
    const direction = new THREE.Vector3(0, 0.62, 0.79).normalize();
    const reach = Math.min(distance, this.aerial.maxDistance);
    // La brume commence derrière la ville vue d'ensemble, quelle que soit la forme de l'écran.
    const fog = this.scene.fog as THREE.Fog;
    fog.near = Math.max(this.size * 1.2, reach * 0.95);
    fog.far = fog.near + this.size * 3;
    this.flyTo(target.clone().addScaledVector(direction, reach), target, animate);
  }

  select(lotId: number | null, focus = false) {
    if (lotId === this.selected) {
      if (focus && lotId !== null) this.focus(lotId);
      return;
    }
    const previous = this.selected;
    this.selected = lotId;
    if (previous !== null) this.repaintRange(previous, this.layout.lots[previous].subtreeEnd);
    if (lotId !== null) this.repaintRange(lotId, this.layout.lots[lotId].subtreeEnd);
    if (this.hovered !== null) this.paintLot(this.hovered);
    this.events.onSelect?.(lotId);
    if (focus && lotId !== null) this.focus(lotId);
    this.invalidate();
  }

  /** Approche la caméra d'un lot, en gardant l'angle de vue actuel. */
  focus(lotId: number) {
    if (this.mode !== "aerial") return;
    const lot = this.layout.lots[lotId];
    const target = new THREE.Vector3(lot.x + lot.w / 2, lot.y + lot.h * 0.5, lot.z + lot.d / 2);
    const extent = Math.max(lot.w, lot.d, lot.h);
    const distance = Math.min(this.size * 2.4, extent * 2.2 + 14);
    const direction = this.camera.position.clone().sub(this.aerial.target).normalize();
    if (direction.y < 0.35) direction.setY(0.35).normalize();
    this.flyTo(target.clone().addScaledVector(direction, distance), target, true);
  }

  /**
   * Miniature 1200 × 630 de la vue actuelle, pour l'aperçu sur les réseaux et la galerie,
   * avec un petit cartouche DOMCity dans le coin.
   */
  async snapshot(title: string, place: string): Promise<Blob | null> {
    const width = 1200;
    const height = 630;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    // Rendu et copie dans la même tâche : le tampon WebGL est encore plein.
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
    const source = this.renderer.domElement;
    const scale = Math.max(width / source.width, height / source.height);
    const sw = width / scale;
    const sh = height / scale;
    ctx.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, 0, 0, width, height);

    const display = fontFamily("--font-display", "sans-serif");
    const mono = fontFamily("--font-mono", "monospace");
    const name = title.toUpperCase();
    const kicker = "DOMCITY · CHAQUE PAGE WEB EST UNE VILLE";
    ctx.font = `800 44px ${display}`;
    const nameWidth = ctx.measureText(name).width + 40;
    ctx.font = `600 15px ${mono}`;
    const kickerWidth = ctx.measureText(kicker).width + 56;
    ctx.font = `500 15px ${mono}`;
    const placeWidth = ctx.measureText(place).width + 40;
    const boxWidth = Math.min(width - 64, Math.max(nameWidth, kickerWidth, placeWidth));
    const x = 32;
    const y = height - 32 - 124;
    ctx.fillStyle = "#F6F3EC";
    ctx.fillRect(x, y, boxWidth, 124);
    ctx.strokeStyle = "#15151A";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, boxWidth, 124);
    ctx.beginPath();
    ctx.moveTo(x, y + 36);
    ctx.lineTo(x + boxWidth, y + 36);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#FF4B12";
    ctx.fillRect(x + 16, y + 13, 10, 10);
    ctx.fillStyle = "#15151A";
    ctx.textBaseline = "middle";
    ctx.font = `600 15px ${mono}`;
    ctx.fillText(kicker, x + 36, y + 19);
    ctx.font = `800 44px ${display}`;
    ctx.fillText(name, x + 20, y + 70, boxWidth - 40);
    ctx.font = `500 15px ${mono}`;
    ctx.fillStyle = "#45454F";
    ctx.fillText(place, x + 20, y + 104, boxWidth - 40);

    return new Promise((resolve) => out.toBlob(resolve, "image/jpeg", 0.86));
  }

  /** Dessine tout de suite, même si l'onglet est caché (essais, captures). */
  renderNow() {
    this.aerial.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  }

  /** L'image de la vue telle qu'elle est (essais de rendu). */
  capture(): Promise<Blob | null> {
    this.renderNow();
    // Copie dans la même tâche que le rendu : le tampon WebGL est encore plein.
    const source = this.renderer.domElement;
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext("2d")?.drawImage(source, 0, 0);
    return new Promise((resolve) => copy.toBlob(resolve, "image/jpeg", 0.88));
  }

  /** Place la caméra (vue aérienne), sans animation. */
  lookFrom(position: [number, number, number], target: [number, number, number]) {
    this.flyTo(new THREE.Vector3(...position), new THREE.Vector3(...target), false);
    this.renderNow();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.timer.dispose();
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    canvas.removeEventListener("dblclick", this.handleDoubleClick);
    canvas.removeEventListener("contextmenu", this.preventDefault);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("pointerlockchange", this.handleLockChange);
    document.removeEventListener("pointerlockerror", this.handleLockError);
    document.removeEventListener("mousemove", this.handleLockedMouse);
    if (this.isLocked()) document.exitPointerLock();
    this.aerial.dispose();
    this.city.dispose();
    for (const { sprite } of this.sprites) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    for (const object of this.extras) {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          const material = child.material as THREE.Material | THREE.Material[];
          (Array.isArray(material) ? material : [material]).forEach((m) => m.dispose());
        }
      });
    }
    this.materials.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
    canvas.remove();
  }

  // -------------------------------------------------------------------------
  // Décor
  // -------------------------------------------------------------------------

  private addGround() {
    const extent = this.size * 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(extent, extent), this.materials.paper);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.center.x, -0.02, this.center.z);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.extras.push(ground);

    // Papier millimétré : une ligne tous les 10 m, une plus marquée tous les 50 m.
    const divisions = Math.round(extent / 10);
    const grid = new THREE.GridHelper(divisions * 10, divisions, "#15151A", "#15151A");
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.07;
    gridMaterial.depthWrite = false;
    grid.position.set(this.center.x, 0, this.center.z);
    this.scene.add(grid);
    this.extras.push(grid);

    const major = new THREE.GridHelper(divisions * 10, Math.round(divisions / 5), "#15151A", "#15151A");
    const majorMaterial = major.material as THREE.LineBasicMaterial;
    majorMaterial.transparent = true;
    majorMaterial.opacity = 0.1;
    majorMaterial.depthWrite = false;
    major.position.set(this.center.x, 0.01, this.center.z);
    this.scene.add(major);
    this.extras.push(major);
  }

  /**
   * Un ciel de fin de matinée, rendu une fois en carte d'environnement :
   * les vitres et l'eau le reflètent. L'arrière-plan reste le papier de la planche.
   */
  private addSky() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const sky = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(10, 32, 16);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 zenith = vec3(0.36, 0.52, 0.74);
          vec3 horizon = vec3(0.93, 0.91, 0.86);
          vec3 below = vec3(0.36, 0.35, 0.33);
          vec3 c = h > 0.0 ? mix(horizon, zenith, pow(h, 0.55)) : mix(horizon, below, pow(-h, 0.4));
          vec3 sun = normalize(vec3(-0.6, 0.8, 0.32));
          c += vec3(1.0, 0.88, 0.68) * pow(max(dot(vDir, sun), 0.0), 48.0) * 3.0;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    sky.add(new THREE.Mesh(geometry, material));
    this.environment = pmrem.fromScene(sky, 0.015).texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.5;
    geometry.dispose();
    material.dispose();
    pmrem.dispose();
  }

  private addLights() {
    const sky = new THREE.HemisphereLight("#FFF7EA", "#B9AE98", 0.7);
    this.scene.add(sky);

    const sun = new THREE.DirectionalLight("#FFF0DA", 3.1);
    // Soleil à l'ouest, un peu au sud : les ombres s'allongent vers l'est, du côté où l'on regarde.
    sun.position.set(this.center.x - this.size * 0.6, this.size * 0.8, this.center.z + this.size * 0.32);
    sun.target.position.copy(this.center);
    sun.castShadow = true;
    const half = this.size * 0.62;
    const shadow = sun.shadow;
    shadow.mapSize.set(4096, 4096);
    shadow.camera.left = -half;
    shadow.camera.right = half;
    shadow.camera.top = half;
    shadow.camera.bottom = -half;
    shadow.camera.near = 1;
    shadow.camera.far = this.size * 3;
    shadow.bias = -0.0004;
    shadow.normalBias = 0.04;
    shadow.radius = 2;
    this.scene.add(sun, sun.target);
  }

  /** Plaques des monuments et affiches des panneaux, une fois les polices prêtes. */
  private async decorate() {
    await ensureFonts();
    if (this.disposed) return;

    for (const slot of this.city.labels) {
      const text = slot.lot.node.heading ?? "";
      const { texture, ratio } = plaqueTexture(text, slot.level);
      const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, fog: false });
      const sprite = new THREE.Sprite(material);
      const height = slot.level === 1 ? Math.max(4.5, this.size * 0.03) : slot.level === 2 ? 2.6 : 1.5;
      sprite.scale.set(height * ratio, height, 1);
      sprite.center.set(0.5, 0);
      sprite.position.copy(slot.anchor).add(new THREE.Vector3(0, slot.level === 1 ? 1.2 : 0.6, 0));
      sprite.renderOrder = 10;
      this.scene.add(sprite);
      this.sprites.push({ slot, sprite });
    }
    this.updateLabels();
    this.invalidate();

    const enqueue = createQueue(6);
    for (const board of this.city.billboards) {
      const src = board.lot.node.img?.src ?? "";
      const lotId = board.lot.id;
      const apply = (texture: THREE.Texture, status: ImageStatus) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        const material = board.panels[0].material as THREE.MeshStandardMaterial;
        material.map = texture;
        material.color.set("#ffffff");
        material.needsUpdate = true;
        this.events.onImageStatus?.(lotId, status);
        this.invalidate();
      };
      void enqueue(async () => {
        if (this.disposed) return;
        try {
          if (!src) throw new Error("pas d'adresse");
          apply(await loadImageTexture(src), "shown");
        } catch {
          const status = src ? await probeImage(src) : "missing";
          apply(unavailableTexture(board.ratio, status, board.lot.node.img?.alt), status);
        }
      });
    }
  }

  private updateLabels() {
    const position = this.camera.position;
    for (const { slot, sprite } of this.sprites) {
      const distance = position.distanceTo(slot.anchor);
      const reach = slot.level === 1 ? Infinity : slot.level === 2 ? this.size * 1.1 : this.size * 0.42;
      sprite.visible = distance < reach;
    }
  }

  // -------------------------------------------------------------------------
  // Couleurs
  // -------------------------------------------------------------------------

  private inSelection(lotId: number): boolean {
    if (this.selected === null) return false;
    return lotId >= this.selected && lotId < this.layout.lots[this.selected].subtreeEnd;
  }

  private paintLot(lotId: number) {
    const refs = this.city.refs[lotId];
    if (!refs) return;
    const selectedTint = this.inSelection(lotId);
    const isHovered = lotId === this.hovered;
    for (const { mesh, index } of refs) {
      const base = this.city.baseColors.get(mesh)!;
      const colors = mesh.instanceColor!;
      const target = new THREE.Color(base[index * 3], base[index * 3 + 1], base[index * 3 + 2]);
      if (isHovered) target.copy(HOVER);
      else if (selectedTint) target.lerp(HOVER, lotId === this.selected ? 0.85 : 0.5);
      colors.setXYZ(index, target.r, target.g, target.b);
      colors.needsUpdate = true;
    }
  }

  private repaintRange(start: number, end: number) {
    for (let id = start; id < end; id += 1) this.paintLot(id);
  }

  private setWalking(state: WalkState) {
    if (state === this.walking) return;
    this.walking = state;
    if (state === "off") {
      this.keys.clear();
      this.velocity.set(0, 0, 0);
      this.look = null;
      this.setHover(null, null);
    }
    this.events.onWalkChange?.(state);
    this.invalidate();
  }

  private setHover(lotId: number | null, screen: { x: number; y: number } | null) {
    if (lotId !== this.hovered) {
      const previous = this.hovered;
      this.hovered = lotId;
      if (previous !== null) this.paintLot(previous);
      if (lotId !== null) this.paintLot(lotId);
      this.renderer.domElement.style.cursor = lotId !== null && this.mode === "aerial" ? "pointer" : "";
      this.invalidate();
    }
    this.events.onHover?.(lotId, screen);
  }

  // -------------------------------------------------------------------------
  // Boucle
  // -------------------------------------------------------------------------

  private invalidate = () => {
    this.dirty = true;
  };

  private tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.1);

    if (this.flight) this.stepFlight();
    if (this.mode === "aerial") {
      if (this.aerial.update(delta)) this.dirty = true;
    } else if (this.walking !== "off") {
      this.stepWalk(delta);
    }

    const pointerPicking = this.mode === "aerial" || this.walking === "free";
    if (this.pointerMoved && pointerPicking && this.pointerInside && !this.pointerDown && !this.look) {
      this.pointerMoved = false;
      this.pick(this.pointer, true);
    }

    if (!this.dirty) return;
    this.dirty = false;
    this.updateLabels();
    if (this.walking === "locked") this.pick(new THREE.Vector2(0, 0), false);
    this.renderer.render(this.scene, this.camera);
  };

  private stepFlight() {
    const flight = this.flight!;
    const t = Math.min(1, (performance.now() - flight.start) / flight.duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    this.camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased);
    this.aerial.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
    this.camera.lookAt(this.aerial.target);
    if (t >= 1) this.flight = null;
    this.dirty = true;
  }

  private flyTo(position: THREE.Vector3, target: THREE.Vector3, animate: boolean) {
    if (!animate || this.reducedMotion) {
      this.flight = null;
      this.camera.position.copy(position);
      this.aerial.target.copy(target);
      this.camera.lookAt(target);
      this.aerial.update();
      this.invalidate();
      return;
    }
    this.flight = {
      fromPosition: this.camera.position.clone(),
      fromTarget: this.aerial.target.clone(),
      toPosition: position,
      toTarget: target,
      start: performance.now(),
      duration: 750,
    };
  }

  private stepWalk(delta: number) {
    const speed = Math.max(10, this.size * 0.055) * (this.keys.has("ShiftLeft") && this.keys.has("Space") ? 2 : 1);
    const input = new THREE.Vector3(
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
      Number(this.keys.has("Space")) - Number(this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")),
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) - Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")),
    );
    const damping = Math.exp(-10 * delta);
    this.velocity.multiplyScalar(damping).addScaledVector(input, speed * (1 - damping));
    if (this.velocity.lengthSq() < 1e-4) return;
    // Avancer à l'horizontale, quelle que soit l'inclinaison du regard.
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    this.camera.position.addScaledVector(forward, this.velocity.z * delta);
    this.camera.position.addScaledVector(right, this.velocity.x * delta);
    this.camera.position.y = Math.max(EYE * 0.7, this.camera.position.y + this.velocity.y * delta);
    this.dirty = true;
  }

  private pick(ndc: THREE.Vector2, fromPointer: boolean) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.city.pickables, false);
    let lotId: number | null = null;
    for (const hit of hits) {
      const object = hit.object;
      if (object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        lotId = (object.userData.lots as Int32Array)[hit.instanceId];
      } else if (typeof object.userData.lotId === "number") {
        lotId = object.userData.lotId;
      }
      if (lotId !== null) break;
    }
    // Le terrain nu n'est pas une cible intéressante au survol.
    if (lotId === 0) lotId = null;
    if (fromPointer) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const screen = {
        x: ((ndc.x + 1) / 2) * rect.width + rect.left,
        y: ((1 - ndc.y) / 2) * rect.height + rect.top,
      };
      this.setHover(lotId, lotId === null ? null : screen);
    } else {
      this.setHover(lotId, null);
    }
  }

  // -------------------------------------------------------------------------
  // Entrées
  // -------------------------------------------------------------------------

  private resize = () => {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  };

  private toNdc(event: PointerEvent | MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (this.mode === "walk") {
      if (this.walking !== "free") return;
      this.pointerInside = true;
      this.toNdc(event);
      if (this.look) {
        const dx = event.clientX - this.look.x;
        const dy = event.clientY - this.look.y;
        this.look = { x: event.clientX, y: event.clientY, moved: this.look.moved + Math.abs(dx) + Math.abs(dy) };
        this.turn(dx, dy, 0.0045);
      } else {
        this.pointerMoved = true;
      }
      return;
    }
    this.pointerInside = true;
    this.toNdc(event);
    this.pointerMoved = true;
    if (this.pointerDown && this.hovered !== null) this.setHover(null, null);
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (this.mode === "walk") {
      if (this.walking === "locked" && event.button === 0 && this.hovered !== null) this.select(this.hovered);
      if (this.walking === "free" && event.button === 0) {
        this.look = { x: event.clientX, y: event.clientY, moved: 0 };
        this.renderer.domElement.setPointerCapture(event.pointerId);
        this.setHover(null, null);
      }
      return;
    }
    this.flight = null;
    this.pointerDown = { x: event.clientX, y: event.clientY, button: event.button };
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.mode === "walk" && this.look) {
      const click = this.look.moved < 5;
      this.look = null;
      if (click) {
        this.toNdc(event);
        this.pick(this.pointer, true);
        this.select(this.hovered);
      }
      return;
    }
    const down = this.pointerDown;
    this.pointerDown = null;
    if (this.mode !== "aerial" || !down || down.button !== 0) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (moved > 5) {
      this.pointerMoved = true;
      return;
    }
    this.toNdc(event);
    this.pick(this.pointer, true);
    this.select(this.hovered);
  };

  private handlePointerLeave = () => {
    this.pointerInside = false;
    this.pointerDown = null;
    if (this.mode === "aerial") this.setHover(null, null);
  };

  private handleDoubleClick = (event: MouseEvent) => {
    if (this.mode !== "aerial") return;
    this.toNdc(event);
    this.pick(this.pointer, true);
    if (this.hovered !== null) this.select(this.hovered, true);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    if (this.mode === "walk" && this.walking !== "off" && MOVE_KEYS.has(event.code)) {
      this.keys.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === "Escape" && this.walking === "free") {
      this.setWalking("off");
      return;
    }
    if (event.code === "Escape" && this.mode === "aerial" && this.selected !== null) this.select(null);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private handleBlur = () => {
    this.keys.clear();
  };

  private isLocked(): boolean {
    return document.pointerLockElement === this.renderer.domElement;
  }

  /** Tourne la tête : lacet autour de la verticale, tangage borné pour ne pas faire la culbute. */
  private turn(dx: number, dy: number, sensitivity: number) {
    const euler = new THREE.Euler(0, 0, 0, "YXZ").setFromQuaternion(this.camera.quaternion);
    euler.y -= dx * sensitivity;
    euler.x = THREE.MathUtils.clamp(euler.x - dy * sensitivity, -1.45, 1.45);
    this.camera.quaternion.setFromEuler(euler);
    this.invalidate();
  }

  private handleLockChange = () => {
    if (this.isLocked()) this.setWalking("locked");
    else if (this.walking === "locked") this.setWalking("off");
  };

  private handleLockedMouse = (event: MouseEvent) => {
    if (this.walking === "locked" && this.isLocked()) this.turn(event.movementX, event.movementY, 0.0018);
  };

  private handleLockError = () => {
    if (this.mode === "walk") this.setWalking("free");
  };

  private preventDefault = (event: Event) => event.preventDefault();
}

export type { Lot };
