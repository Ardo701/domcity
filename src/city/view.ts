/**
 * The 3D view: rendering, camera, two ways of moving around, hover and selection.
 *
 * - Aerial view: drag to move, right click to rotate, wheel to zoom.
 * - Walk: ZQSD (or WASD) to move forward, Space and Shift to go up and down.
 *   You look around with the captured mouse; if the browser refuses, by dragging.
 *
 * Rendering only happens when something moves: the battery says thanks.
 */

import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { THUMBNAIL } from "@/format/shared";
import { HIGHLIGHT_COLOR } from "@/format/taxonomy";
import type { Weather } from "./ambiance";
import type { Airport, CityLayout, Lot, RoadStyle } from "./layout";
import { createMaterials, type CityMaterials } from "./materials";
import { buildCityScene, type CityScene, type InstanceRef, type LabelSlot } from "./scene";
import {
  createQueue,
  ensureFonts,
  loadCorsImage,
  loadImageTexture,
  plaqueTexture,
  probeImage,
  unavailableTexture,
  type ImageStatus,
} from "./textures";
import { singleWorld, type Special, type World, type WorldPart } from "./world";

export type ViewMode = "aerial" | "walk";
/** off: reading the instructions · locked: mouse captured · free: looking by dragging. */
export type WalkState = "off" | "locked" | "free";

/** Rendering measurements, for the FPS meter. */
export interface ViewStats {
  /** Frames drawn during the last second. */
  fps: number;
  /** Average interval between two frames (ms). */
  frameMs: number;
  /** Average time spent preparing a frame on the CPU (ms). */
  renderMs: number;
  triangles: number;
  calls: number;
}

/**
 * What hovering points at when it is not the lot itself: a street it had drawn, or
 * an airport, an airfield, factories, cameras (which are not lots: their numbers
 * follow the last one).
 */
export type HoverPart = { kind: "road"; style: RoadStyle } | Special | null;

export interface ViewEvents {
  onHover?: (lotId: number | null, screen: { x: number; y: number } | null, part: HoverPart) => void;
  onSelect?: (lotId: number | null) => void;
  onModeChange?: (mode: ViewMode) => void;
  onWalkChange?: (state: WalkState) => void;
  onImageStatus?: (lotId: number, status: ImageStatus) => void;
  /** Click on an airport or an airfield (which has no element card): the departures board. */
  onAirport?: (airport: Airport) => void;
}

const PAPER = "#EEEAE1";

/** The meshes repainted in the site's true colors: walls, roofs, grounds. Not streets, water, posters. */
const PAINTABLE = new Set(["facade", "plain", "gable", "pyramid", "cylinder", "cone", "dome", "ground"]);

/** Light according to the weather: sun, sky, reflections, and the sheet's paper darkening a little. */
const WEATHER_LIGHT: Record<Weather, { sun: number; sunColor: string; sky: number; skyColor: string; environment: number; paper: string }> = {
  clear: { sun: 3.3, sunColor: "#FFF0DA", sky: 0.7, skyColor: "#FFF7EA", environment: 0.55, paper: PAPER },
  fair: { sun: 3.0, sunColor: "#FFF0DA", sky: 0.72, skyColor: "#FFF7EA", environment: 0.5, paper: PAPER },
  cloudy: { sun: 2.3, sunColor: "#FBF3E6", sky: 0.88, skyColor: "#F4F2EC", environment: 0.45, paper: "#EAE7DF" },
  overcast: { sun: 1.25, sunColor: "#EEEDEA", sky: 1.2, skyColor: "#E8E8E6", environment: 0.38, paper: "#E2E0DA" },
  storm: { sun: 0.75, sunColor: "#DDE0E6", sky: 1.0, skyColor: "#C9CDD4", environment: 0.3, paper: "#D3D2CE" },
};
const GROUND = "#E7E2D7";
/** Eye height of the walker. */
const EYE = 1.9;
/** Minimum near plane (walk, camera flush with the roofs). */
const NEAR = 0.3;
const HOVER = new THREE.Color(HIGHLIGHT_COLOR);
const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "ShiftLeft", "ShiftRight",
]);

/** A part of the world in the scene: a city (or the megalopolis countryside), placed where it belongs. */
interface PartView {
  part: WorldPart;
  scene: CityScene;
  /** Center and radius in the world, to judge distance. */
  center: THREE.Vector3;
  radius: number;
  /** Street furniture shown (up close). */
  detailed: boolean;
  /** Posters and icons requested (the first time we get close). */
  decorated: boolean;
}

interface Flight {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPosition: THREE.Vector3;
  toTarget: THREE.Vector3;
  start: number;
  duration: number;
  /** Turn around the target (along an arc) rather than going in a straight line. */
  orbit?: boolean;
}

export class CityView {
  /** The shared plan: that of the city, or of the whole megalopolis. */
  layout: CityLayout;
  private world: World;
  private readonly container: HTMLElement;
  private readonly events: ViewEvents;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly aerial: MapControls;
  private readonly materials: CityMaterials;
  private parts: PartView[] = [];
  private pickables: THREE.Object3D[] = [];
  private refs: InstanceRef[][] = [];
  private baseColors = new Map<THREE.InstancedMesh, Float32Array>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly size: number;
  private readonly center: THREE.Vector3;
  /** Everything drawn above the paper fits in this box (plaques included). */
  private readonly cityBox: THREE.Box3;
  private sprites: Array<{ slot: LabelSlot; sprite: THREE.Sprite; anchor: THREE.Vector3 }> = [];
  private fontsReady = false;
  private readonly extras: THREE.Object3D[] = [];
  private readonly resizeObserver: ResizeObserver;
  private readonly timer = new THREE.Timer();
  private readonly keys = new Set<string>();
  private readonly velocity = new THREE.Vector3();
  private readonly reducedMotion: boolean;
  private environment: THREE.Texture | null = null;
  /** The sheet's paper and its grid (the home page figure replaces them with the page). */
  private paper: { ground: THREE.Mesh; grids: THREE.Object3D[] } | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private skyLight: THREE.HemisphereLight | null = null;
  /** The site's true colors: the original colors of the repainted instances, to go back. */
  private realColors = false;
  private originalColors = new Map<THREE.InstancedMesh, Float32Array>();

  private mode: ViewMode = "aerial";
  private walking: WalkState = "off";
  private look: { x: number; y: number; moved: number } | null = null;
  private frame = 0;
  private dirty = true;
  /** FPS meter shown: we redraw every frame to measure for real. */
  private measuring = false;
  private renderTimes: number[] = [];
  private renderCosts: number[] = [];
  private lastInfo = { triangles: 0, calls: 0 };
  private pointerInside = false;
  private pointerMoved = false;
  private pointerDown: { x: number; y: number; button: number } | null = null;
  private hovered: number | null = null;
  private selected: number | null = null;
  private flight: Flight | null = null;
  private savedAerial: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private disposed = false;
  /**
   * Camera heading in degrees: how much to turn the north arrow so that it points to the top
   * of the page (0: it is at the top of the screen, 90: on the right).
   */
  heading = 0;

  constructor(container: HTMLElement, world: World | CityLayout, events: ViewEvents = {}) {
    this.container = container;
    this.world = "parts" in world ? world : singleWorld(world);
    const layout = this.world.layout;
    this.layout = layout;
    this.events = events;
    this.reducedMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const { bounds } = layout;
    this.size = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 40);
    this.center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    // Wide enough for the construction cranes (26 at most), antennas and heading plaques.
    const margin = Math.max(30, this.size * 0.1);
    this.cityBox = new THREE.Box3(
      new THREE.Vector3(bounds.minX - margin, 0, bounds.minZ - margin),
      new THREE.Vector3(bounds.maxX + margin, bounds.maxY + margin, bounds.maxZ + margin),
    );

    // Rendering
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // The city does not move: shadows are computed only once.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.className = "domcity-canvas";
    this.renderer.domElement.setAttribute("aria-label", "Ville en 3D");
    container.appendChild(this.renderer.domElement);

    // Paper sky, haze for depth
    this.scene.background = new THREE.Color(PAPER);
    this.scene.fog = new THREE.Fog(PAPER, this.size * 1.8, this.size * 4.8);

    this.camera = new THREE.PerspectiveCamera(42, 1, NEAR, this.size * 12);

    this.materials = createMaterials(GROUND);
    this.buildParts();
    this.addGround();
    this.addLights();
    this.addSky();
    // A single city has the weather of its page; the megalopolis keeps a neutral light
    // (each city there has its clouds).
    const ambiance = this.world.parts.length === 1 ? layout.ambiance : undefined;
    if (ambiance) this.applyWeather(ambiance.weather);

    // Controls
    this.aerial = new MapControls(this.camera, this.renderer.domElement);
    this.aerial.enableDamping = true;
    this.aerial.dampingFactor = 0.09;
    this.aerial.screenSpacePanning = false;
    this.aerial.maxPolarAngle = 1.38;
    this.aerial.minDistance = 2.5;
    this.aerial.maxDistance = this.size * 3;
    this.aerial.zoomToCursor = true;
    this.aerial.addEventListener("change", this.invalidate);

    // Events
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
      // The walker is placed on the south ring road, at eye level, facing north (the top of the page).
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

  /** Starts the walk (must follow a click): mouse captured if possible, otherwise looking by dragging. */
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

  /** Puts north (the top of the page) back at the top of the screen, without changing viewpoint or distance. */
  faceNorth() {
    if (this.mode === "walk") {
      const euler = new THREE.Euler(0, 0, 0, "YXZ").setFromQuaternion(this.camera.quaternion);
      euler.y = 0;
      this.camera.quaternion.setFromEuler(euler);
      this.invalidate();
      return;
    }
    const target = this.aerial.target.clone();
    const offset = this.camera.position.clone().sub(target);
    const position = target.clone().add(new THREE.Vector3(0, offset.y, Math.hypot(offset.x, offset.z)));
    this.flyTo(position, target, true, true);
  }

  /** Overview from the south, far enough for the whole city to fit on screen. */
  resetView(animate = true) {
    const { bounds } = this.layout;
    const target = new THREE.Vector3(this.center.x, bounds.maxY * 0.1, this.center.z + this.size * 0.04);
    const vertical = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const distance = (this.size * 0.6) / Math.sin(Math.min(vertical, horizontal) / 2);
    const direction = new THREE.Vector3(0, 0.62, 0.79).normalize();
    const reach = Math.min(distance, this.aerial.maxDistance);
    // The haze starts behind the city seen in the overview, whatever the shape of the screen.
    const fog = this.scene.fog as THREE.Fog;
    fog.near = Math.max(this.size * 1.2, reach * 0.95);
    fog.far = fog.near + this.size * 3;
    this.flyTo(target.clone().addScaledVector(direction, reach), target, animate);
  }

  select(lotId: number | null, focus = false) {
    // The airport is not an element of the page: nothing to inspect.
    if (lotId !== null && !this.layout.lots[lotId]) return;
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

  /** Shows a whole area (a megalopolis city), seen from the south like the overview. */
  frameArea(area: { x: number; z: number; w: number; d: number }) {
    if (this.mode !== "aerial") return;
    const size = Math.max(area.w, area.d, 30);
    const target = new THREE.Vector3(area.x + area.w / 2, 0, area.z + area.d / 2 + size * 0.04);
    const vertical = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * this.camera.aspect);
    const distance = (size * 0.62) / Math.sin(Math.min(vertical, horizontal) / 2);
    const direction = new THREE.Vector3(0, 0.62, 0.79).normalize();
    this.flyTo(target.clone().addScaledVector(direction, Math.min(distance, this.aerial.maxDistance)), target, true);
  }

  /** Brings the camera closer to a lot, keeping the current viewing angle. */
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
   * The thumbnail of a shared city (social preview, gallery). It is always the same
   * shot, taken by the engine and never chosen by the person sharing: the whole
   * city in axonometry, seen from the southwest like the home page figure, laid with its shadows on
   * the graph paper. Nothing touched in the view: no selection, no hover, no
   * true colors.
   */
  async thumbnail(): Promise<Blob | null> {
    const { width, height } = THUMBNAIL;
    const margin = 40;
    const selected = this.selected;
    const realColors = this.realColors;
    this.setHover(null, null);
    this.selected = null;
    if (selected !== null) this.repaintRange(selected, this.layout.lots[selected].subtreeEnd);
    this.setRealColors(false);
    const shot = await this.figure(width - margin * 2, { from: "south-west" });
    this.setRealColors(realColors);
    if (selected !== null && this.selected === null) {
      this.selected = selected;
      this.repaintRange(selected, this.layout.lots[selected].subtreeEnd);
    }
    if (!shot) return null;

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    // The sheet's paper and its grid, like .graph-paper in the page.
    ctx.fillStyle = "#eeeae1";
    ctx.fillRect(0, 0, width, height);
    for (const [step, alpha] of [
      [24, 0.05],
      [120, 0.08],
    ]) {
      ctx.fillStyle = `rgba(21, 21, 26, ${alpha})`;
      for (let x = 0; x < width; x += step) ctx.fillRect(x, 0, 1, height);
      for (let y = 0; y < height; y += step) ctx.fillRect(0, y, width, 1);
    }
    // The model in the middle; a very tall city is scaled down to fit.
    const scale = Math.min(1, (height - margin * 2) / shot.height);
    const w = shot.width * scale;
    const h = shot.height * scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(shot.canvas, (width - w) / 2, (height - h) / 2, w, h);
    return new Promise((resolve) => out.toBlob(resolve, "image/jpeg", 0.86));
  }

  /**
   * FPS meter: while it is shown, the city is redrawn every frame
   * (at rest, it is only redrawn when something moves, and the meter would drop to zero).
   */
  setMeasuring(on: boolean) {
    this.measuring = on;
    this.renderTimes = [];
    this.renderCosts = [];
    this.invalidate();
  }

  stats(): ViewStats {
    const now = performance.now();
    let first = this.renderTimes.length;
    while (first > 0 && now - this.renderTimes[first - 1] <= 1000) first -= 1;
    const recent = this.renderTimes.slice(first);
    const costs = this.renderCosts.slice(first);
    const frameMs = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
    const renderMs = costs.length > 0 ? costs.reduce((sum, c) => sum + c, 0) / costs.length : 0;
    return { fps: recent.length, frameMs, renderMs, ...this.lastInfo };
  }

  /** Draws right away, even if the tab is hidden (experiments, captures). */
  renderNow() {
    this.aerial.update();
    this.updateLabels();
    this.fitDepth();
    this.renderer.render(this.scene, this.camera);
  }

  /** The image of the view as it is (rendering experiments). */
  capture(): Promise<Blob | null> {
    this.renderNow();
    // Copy in the same task as the rendering: the WebGL buffer is still full.
    const source = this.renderer.domElement;
    const copy = document.createElement("canvas");
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext("2d")?.drawImage(source, 0, 0);
    return new Promise((resolve) => copy.toBlob(resolve, "image/jpeg", 0.88));
  }

  /**
   * The whole city in axonometry (without perspective), seen from the southeast or the southwest, on a transparent background: the home page figure, regenerated in development (/dev/figure).
   * No haze, no paper, no labels: only the shadows remain, laid on the page.
   * Also returns the matrix that projects a point of the city onto the image (for the markers).
   */
  async figure(
    width: number,
    {
      elevation = 30,
      from = "south-east",
      shadows = true,
    }: {
      elevation?: number;
      from?: "south-east" | "south-west";
      /** The shadows laid on the page around the model (not for the legend thumbnails). */
      shadows?: boolean;
    } = {},
  ): Promise<{ blob: Blob; canvas: HTMLCanvasElement; width: number; height: number; matrix: number[] } | null> {
    const { bounds } = this.layout;
    const tilt = THREE.MathUtils.degToRad(elevation);
    const side = from === "south-east" ? 1 : -1;
    const target = new THREE.Vector3(this.center.x, 0, this.center.z);
    const camera = new THREE.OrthographicCamera();
    camera.position
      .set(side * Math.cos(tilt) * Math.SQRT1_2, Math.sin(tilt), Math.cos(tilt) * Math.SQRT1_2)
      .multiplyScalar(this.size * 4)
      .add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    // First frame, wide: the city, its clouds, and enough to receive its shadows.
    const top = Math.max(bounds.maxY, ...(this.layout.ambiance?.clouds ?? []).map((c) => c.y + c.size));
    const reach = this.size * 0.4;
    const box = new THREE.Box3(
      new THREE.Vector3(bounds.minX - reach, -1, bounds.minZ - reach),
      new THREE.Vector3(bounds.maxX + reach, top + 1, bounds.maxZ + reach),
    );
    const seen = new THREE.Box3();
    for (let i = 0; i < 8; i += 1) {
      const corner = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      seen.expandByPoint(corner.applyMatrix4(camera.matrixWorldInverse));
    }
    camera.near = Math.max(0.1, -seen.max.z - this.size);
    camera.far = -seen.min.z + this.size * 2;
    const frame = (left: number, right: number, bottom: number, upper: number) => {
      camera.left = left;
      camera.right = right;
      camera.bottom = bottom;
      camera.top = upper;
      camera.updateProjectionMatrix();
      return Math.round((width * (upper - bottom)) / (right - left));
    };

    // No haze, no paper, no labels: only the shadows remain, laid on the page.
    const ratio = this.renderer.getPixelRatio();
    const fog = this.scene.fog;
    const background = this.scene.background;
    const paper = this.paper;
    const paperMaterial = paper?.ground.material;
    const shadow = new THREE.ShadowMaterial({ opacity: 0.2 });
    this.renderer.setPixelRatio(1);
    this.scene.fog = null;
    if (paper) {
      paper.ground.material = shadow;
      paper.ground.visible = shadows;
      for (const grid of paper.grids) grid.visible = false;
    }
    for (const { sprite } of this.sprites) sprite.visible = false;

    // We render twice, on a black then a white background: the difference gives each pixel's transparency
    // (softened edges, shadows on the page), without touching the rendering itself.
    const render = (w: number, h: number) => {
      this.renderer.setSize(w, h, false);
      const shot = (color: string) => {
        this.scene.background = new THREE.Color(color);
        this.renderer.render(this.scene, camera);
        // Copy in the same task as the rendering: the WebGL buffer is still full.
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(this.renderer.domElement, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const dark = shot("#000000");
      const light = shot("#ffffff");
      const pixels = new Uint8ClampedArray(dark.length);
      for (let i = 0; i < dark.length; i += 4) {
        const gap = (light[i] - dark[i] + light[i + 1] - dark[i + 1] + light[i + 2] - dark[i + 2]) / 3;
        const alpha = THREE.MathUtils.clamp(255 - gap, 0, 255);
        pixels[i + 3] = alpha;
        if (alpha > 0) for (let c = 0; c < 3; c += 1) pixels[i + c] = (dark[i + c] * 255) / alpha;
      }
      return pixels;
    };

    // A first small image tells where the city is really drawn; the real one frames it as tightly as possible.
    const probe = 480;
    const probeHeight = frame(seen.min.x, seen.max.x, seen.min.y, seen.max.y);
    const scaled = Math.round((probeHeight * probe) / width);
    const draft = render(probe, scaled);
    let minX = probe;
    let maxX = 0;
    let minY = scaled;
    let maxY = 0;
    for (let y = 0; y < scaled; y += 1) {
      for (let x = 0; x < probe; x += 1) {
        if (draft[(y * probe + x) * 4 + 3] < 6) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x + 1);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + 1);
      }
    }
    const unit = (seen.max.x - seen.min.x) / probe;
    const margin = (maxX - minX) * unit * 0.02;
    const height = frame(
      seen.min.x + minX * unit - margin,
      seen.min.x + maxX * unit + margin,
      seen.max.y - maxY * unit - margin,
      seen.max.y - minY * unit + margin,
    );
    const pixels = render(width, height);

    this.scene.fog = fog;
    this.scene.background = background;
    if (paper && paperMaterial) {
      paper.ground.material = paperMaterial;
      paper.ground.visible = true;
      for (const grid of paper.grids) grid.visible = true;
    }
    shadow.dispose();
    this.renderer.setPixelRatio(ratio);
    this.resize();
    this.updateLabels();

    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements.slice();
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/webp", 0.9));
    return blob ? { blob, canvas: out, width, height, matrix } : null;
  }

  /** Places the camera (aerial view), without animation. */
  lookFrom(position: [number, number, number], target: [number, number, number]) {
    this.flyTo(new THREE.Vector3(...position), new THREE.Vector3(...target), false);
    this.renderNow();
  }

  /**
   * Replaces what is built (a megalopolis page is checked or unchecked), without moving the camera.
   * Cities keep their place: the extent of the view does not change.
   */
  setWorld(world: World) {
    if (this.disposed) return;
    this.setHover(null, null);
    this.select(null);
    this.clearParts();
    this.world = world;
    this.layout = world.layout;
    this.buildParts();
    this.originalColors = new Map();
    if (this.realColors) this.paintRealColors(true);
    if (this.fontsReady) this.addLabels();
    this.updateParts(true);
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  /**
   * The site's true colors (captured by the bookmarklet): each building, each container
   * ground takes the background color of its element in the page (or of its nearest parent
   * that has one). The monument keeps its own. Nothing is rebuilt: we repaint.
   */
  setRealColors(on: boolean) {
    if (on === this.realColors) return;
    this.realColors = on;
    this.paintRealColors(on);
    this.invalidate();
  }

  private paintRealColors(on: boolean) {
    const touched = new Set<THREE.InstancedMesh>();
    const tint = new THREE.Color();
    for (const part of this.world.parts) {
      const { lots } = part.layout;
      const page = part.layout.ambiance?.info.background;
      const bgOf: Array<string | undefined> = [];
      for (const lot of lots) {
        // Parents come before their children: their color is already known.
        bgOf[lot.id] = lot.node.bg ?? (lot.parent >= 0 ? bgOf[lot.parent] : page);
        const bg = bgOf[lot.id];
        if (!bg || lot.depth === 0 || lot.kind === "monument") continue;
        tint.set(bg);
        for (const { mesh, index } of this.refs[lot.id + part.base] ?? []) {
          if (!PAINTABLE.has(mesh.userData.batch)) continue;
          const base = this.baseColors.get(mesh)!;
          let original = this.originalColors.get(mesh);
          if (!original) {
            original = base.slice();
            this.originalColors.set(mesh, original);
          }
          const i = index * 3;
          if (on) {
            base[i] = original[i] + (tint.r - original[i]) * 0.78;
            base[i + 1] = original[i + 1] + (tint.g - original[i + 1]) * 0.78;
            base[i + 2] = original[i + 2] + (tint.b - original[i + 2]) * 0.78;
          } else {
            base[i] = original[i];
            base[i + 1] = original[i + 1];
            base[i + 2] = original[i + 2];
          }
          touched.add(mesh);
        }
      }
    }
    for (const mesh of touched) {
      (mesh.instanceColor!.array as Float32Array).set(this.baseColors.get(mesh)!);
      mesh.instanceColor!.needsUpdate = true;
    }
    if (this.selected !== null) this.repaintRange(this.selected, this.layout.lots[this.selected].subtreeEnd);
    if (this.hovered !== null) this.paintLot(this.hovered);
  }

  /** The weather: bright sun for a light page, low dark sky for a heavy page. */
  private applyWeather(weather: Weather) {
    const light = WEATHER_LIGHT[weather];
    if (this.sun) {
      this.sun.intensity = light.sun;
      this.sun.color.set(light.sunColor);
    }
    if (this.skyLight) {
      this.skyLight.intensity = light.sky;
      this.skyLight.color.set(light.skyColor);
    }
    this.scene.environmentIntensity = light.environment;
    (this.scene.background as THREE.Color).set(light.paper);
    (this.scene.fog as THREE.Fog).color.set(light.paper);
    this.materials.paper.color.set(light.paper);
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
    this.clearParts();
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
  // Decor
  // -------------------------------------------------------------------------

  private addGround() {
    const extent = this.size * 8;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(extent, extent), this.materials.paper);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.center.x, -0.02, this.center.z);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.extras.push(ground);

    // Graph paper: a line every 10 m, a stronger one every 50 m.
    const divisions = Math.round(extent / 10);
    const grid = new THREE.GridHelper(divisions * 10, divisions, "#15151A", "#15151A");
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.07;
    gridMaterial.depthWrite = false;
    grid.position.set(this.center.x, 0, this.center.z);
    this.scene.add(grid);
    this.extras.push(grid);
    this.paper = { ground, grids: [grid] };

    const major = new THREE.GridHelper(divisions * 10, Math.round(divisions / 5), "#15151A", "#15151A");
    const majorMaterial = major.material as THREE.LineBasicMaterial;
    majorMaterial.transparent = true;
    majorMaterial.opacity = 0.1;
    majorMaterial.depthWrite = false;
    major.position.set(this.center.x, 0.01, this.center.z);
    this.scene.add(major);
    this.extras.push(major);
    this.paper.grids.push(major);
  }

  /**
   * A late-morning sky, rendered once as an environment map:
   * windows and water reflect it. The background stays the sheet's paper.
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
    this.skyLight = sky;

    const sun = new THREE.DirectionalLight("#FFF0DA", 3.1);
    this.sun = sun;
    // Sun in the west, slightly south: shadows stretch eastward, toward where we look.
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

  /** Each part of the world in the scene, in its place, its lots renumbered in the shared plan. */
  private buildParts() {
    for (const part of this.world.parts) {
      const scene = buildCityScene(part.layout, this.materials, part.base);
      scene.group.position.set(part.offset.x, 0, part.offset.z);
      this.scene.add(scene.group);
      for (const [lotId, refs] of scene.refs.entries()) if (refs) this.refs[lotId] = refs;
      for (const [mesh, colors] of scene.baseColors) this.baseColors.set(mesh, colors);
      this.pickables.push(...scene.pickables);
      const b = part.layout.bounds;
      const center = new THREE.Vector3((b.minX + b.maxX) / 2 + part.offset.x, 0, (b.minZ + b.maxZ) / 2 + part.offset.z);
      const radius = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
      this.parts.push({ part, scene, center, radius, detailed: true, decorated: false });
    }
  }

  private clearParts() {
    for (const view of this.parts) {
      this.scene.remove(view.scene.group);
      view.scene.dispose();
    }
    for (const { sprite } of this.sprites) {
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.parts = [];
    this.sprites = [];
    this.pickables = [];
    this.refs = [];
    this.baseColors = new Map();
  }

  /**
   * In the megalopolis, a distant city simplifies (no trees, cars or street lamps)
   * and its images only load when we get close. A single city is always complete.
   */
  private updateParts(force = false) {
    const position = this.camera.position;
    for (const view of this.parts) {
      const distance = view.part.city ? Math.max(0, position.distanceTo(view.center) - view.radius) : 0;
      const detailed = distance < 90 + view.radius * 0.6;
      if (detailed !== view.detailed || force) {
        view.detailed = detailed;
        for (const mesh of view.scene.details) mesh.visible = detailed;
      }
      if (!view.decorated && this.fontsReady && distance < 160 + view.radius) {
        view.decorated = true;
        this.decoratePart(view);
      }
    }
  }

  /** Monument plaques, billboard posters and icons, once the fonts are ready. */
  private async decorate() {
    await ensureFonts();
    if (this.disposed) return;
    this.fontsReady = true;
    this.materials.graffitiAtlas.draw();
    this.addLabels();
    this.updateParts(true);
  }

  private addLabels() {
    for (const view of this.parts) {
      for (const slot of view.scene.labels) {
        const text = slot.lot.node.heading ?? "";
        const { texture, ratio } = plaqueTexture(text, slot.level);
        const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, fog: false });
        const sprite = new THREE.Sprite(material);
        // The main heading's plaque follows the size of its city, not that of the whole megalopolis.
        const size = view.part.city ? view.radius * 1.4 : this.size;
        const height = slot.level === 1 ? Math.max(4.5, size * 0.03) : slot.level === 2 ? 2.6 : 1.5;
        sprite.scale.set(height * ratio, height, 1);
        sprite.center.set(0.5, 0);
        const anchor = slot.anchor.clone().add(new THREE.Vector3(view.part.offset.x, 0, view.part.offset.z));
        sprite.position.copy(anchor).add(new THREE.Vector3(0, slot.level === 1 ? 1.2 : 0.6, 0));
        sprite.renderOrder = 10;
        this.scene.add(sprite);
        this.sprites.push({ slot, sprite, anchor });
      }
    }
    this.updateLabels();
    this.invalidate();
  }

  private readonly enqueue = createQueue(6);

  private decoratePart(view: PartView) {
    const { scene } = view;
    const alive = () => !this.disposed && this.parts.includes(view);
    for (const board of scene.billboards) {
      const src = board.lot.node.img?.src ?? "";
      const refused = board.lot.node.img?.refused === true;
      const apply = (texture: THREE.Texture, status: ImageStatus) => {
        if (!alive()) {
          texture.dispose();
          return;
        }
        const material = board.panels[0].material as THREE.MeshStandardMaterial;
        material.map = texture;
        material.color.set("#ffffff");
        material.needsUpdate = true;
        this.events.onImageStatus?.(board.id, status);
        this.invalidate();
      };
      // An image from a refused site no longer has an address: it is never requested from its site.
      if (refused) {
        apply(unavailableTexture(board.ratio, "refused"), "refused");
        continue;
      }
      void this.enqueue(async () => {
        if (!alive()) return;
        try {
          if (!src) throw new Error("no address");
          apply(await loadImageTexture(src), "shown");
        } catch {
          const status = src ? await probeImage(src) : "missing";
          apply(unavailableTexture(board.ratio, status, board.lot.node.img?.alt), status);
        }
      });
    }

    // The icons next: small and numerous, they are painted into the shared atlas.
    // Those from refused sites no longer have an address: they keep the blank plate.
    const { atlas, owners } = scene.emblems;
    atlas.sources.forEach((src, i) => {
      const index = i + 1;
      void this.enqueue(async () => {
        if (!alive()) return;
        let status: ImageStatus = "shown";
        try {
          atlas.draw(index, await loadCorsImage(src));
        } catch {
          status = await probeImage(src);
          atlas.drawUnavailable(index);
        }
        if (!alive()) return;
        for (const lotId of owners[i]) this.events.onImageStatus?.(lotId, status);
        this.invalidate();
      });
    });
  }

  private updateLabels() {
    const position = this.camera.position;
    for (const { slot, sprite, anchor } of this.sprites) {
      const distance = position.distanceTo(anchor);
      const reach = slot.level === 1 ? Infinity : slot.level === 2 ? this.size * 1.1 : this.size * 0.42;
      sprite.visible = distance < reach;
    }
  }

  // -------------------------------------------------------------------------
  // Colors
  // -------------------------------------------------------------------------

  private inSelection(lotId: number): boolean {
    if (this.selected === null) return false;
    return lotId >= this.selected && lotId < this.layout.lots[this.selected].subtreeEnd;
  }

  private paintLot(lotId: number) {
    const refs = this.refs[lotId];
    if (!refs) return;
    const selectedTint = this.inSelection(lotId);
    const isHovered = lotId === this.hovered;
    for (const { mesh, index } of refs) {
      const base = this.baseColors.get(mesh)!;
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

  private setHover(lotId: number | null, screen: { x: number; y: number } | null, part: HoverPart = null) {
    if (lotId !== this.hovered) {
      const previous = this.hovered;
      this.hovered = lotId;
      if (previous !== null) this.paintLot(previous);
      if (lotId !== null) this.paintLot(lotId);
      this.renderer.domElement.style.cursor = lotId !== null && this.mode === "aerial" ? "pointer" : "";
      this.invalidate();
    }
    this.events.onHover?.(lotId, screen, part);
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  /**
   * Near plane as far as possible. Depth has only limited precision, spread
   * mostly near the camera: with a near plane at 30 cm, the city seen from afar can no longer
   * tell apart two surfaces at almost the same height (roadway and ground, poster and frame)
   * and they flicker. Nothing is drawn between the camera and the city: the near
   * plane is moved forward to halfway.
   */
  private fitDepth() {
    const position = this.camera.position;
    const clear = this.mode === "aerial" ? Math.min(this.cityBox.distanceToPoint(position), position.y) : 0;
    const near = Math.max(NEAR, clear * 0.5);
    if (Math.abs(near - this.camera.near) <= this.camera.near * 0.02) return;
    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  }

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

    if (this.measuring) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    this.updateParts();
    this.updateLabels();
    this.updateHeading();
    if (this.walking === "locked") this.pick(new THREE.Vector2(0, 0), false);
    this.fitDepth();
    const start = performance.now();
    this.renderer.render(this.scene, this.camera);
    const end = performance.now();
    this.renderTimes.push(end);
    this.renderCosts.push(end - start);
    if (this.renderTimes.length > 240) {
      this.renderTimes.splice(0, this.renderTimes.length - 240);
      this.renderCosts.splice(0, this.renderCosts.length - 240);
    }
    const info = this.renderer.info.render;
    this.lastInfo = { triangles: info.triangles, calls: info.calls };
  };

  /** The screen's right is always horizontal (neither the aerial view nor the walk tilts): it gives the heading. */
  private updateHeading() {
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.heading = THREE.MathUtils.radToDeg(Math.atan2(-right.z, right.x));
  }

  private stepFlight() {
    const flight = this.flight!;
    const t = Math.min(1, (performance.now() - flight.start) / flight.duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    this.aerial.target.lerpVectors(flight.fromTarget, flight.toTarget, eased);
    if (flight.orbit) {
      // By the shorter of the two arcs, with gliding height and distance.
      const from = flight.fromPosition.clone().sub(flight.fromTarget);
      const to = flight.toPosition.clone().sub(flight.toTarget);
      const start = Math.atan2(from.x, from.z);
      const turn = THREE.MathUtils.euclideanModulo(Math.atan2(to.x, to.z) - start + Math.PI, 2 * Math.PI) - Math.PI;
      const angle = start + turn * eased;
      const flat = THREE.MathUtils.lerp(Math.hypot(from.x, from.z), Math.hypot(to.x, to.z), eased);
      this.camera.position
        .set(Math.sin(angle) * flat, THREE.MathUtils.lerp(from.y, to.y, eased), Math.cos(angle) * flat)
        .add(this.aerial.target);
    } else {
      this.camera.position.lerpVectors(flight.fromPosition, flight.toPosition, eased);
    }
    this.camera.lookAt(this.aerial.target);
    if (t >= 1) this.flight = null;
    this.dirty = true;
  }

  private flyTo(position: THREE.Vector3, target: THREE.Vector3, animate: boolean, orbit = false) {
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
      orbit,
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
    // Move horizontally, whatever the tilt of the gaze.
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    this.camera.position.addScaledVector(forward, this.velocity.z * delta);
    this.camera.position.addScaledVector(right, this.velocity.x * delta);
    this.camera.position.y = Math.max(EYE * 0.7, this.camera.position.y + this.velocity.y * delta);
    this.dirty = true;
  }

  /** The airport, airfield, factories or cameras that carry this number. */
  private specialAt(id: number): Special | undefined {
    return this.world.specials.find((entry) => entry.id === id)?.special;
  }

  private pick(ndc: THREE.Vector2, fromPointer: boolean) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    let lotId: number | null = null;
    let part: HoverPart = null;
    for (const hit of hits) {
      const object = hit.object;
      if (object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        lotId = (object.userData.lots as Int32Array)[hit.instanceId];
      } else if (typeof object.userData.lotId === "number") {
        lotId = object.userData.lotId;
      }
      if (lotId !== null) {
        const style = object.userData.part === "road" ? this.roadAt(lotId, hit.point) : null;
        if (style) part = { kind: "road", style };
        const special = this.specialAt(lotId);
        if (special) part = special;
        break;
      }
    }
    // Bare terrain (a city's base, the countryside) is not an interesting hover target.
    if (lotId !== null && (lotId < 0 || this.layout.lots[lotId]?.depth === 0)) lotId = null;
    if (fromPointer) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const screen = {
        x: ((ndc.x + 1) / 2) * rect.width + rect.left,
        y: ((1 - ndc.y) / 2) * rect.height + rect.top,
      };
      this.setHover(lotId, lotId === null ? null : screen, part);
    } else {
      this.setHover(lotId, null, part);
    }
  }

  /** The kind of the street under this point, among those this lot had drawn. A bridge deck is not one. */
  private roadAt(lotId: number, point: THREE.Vector3): RoadStyle | null {
    const margin = 0.05;
    const road = this.layout.roads.find(
      (r) =>
        r.owner === lotId &&
        point.x >= r.x - margin &&
        point.x <= r.x + r.w + margin &&
        point.z >= r.z - margin &&
        point.z <= r.z + r.d + margin,
    );
    return road?.style ?? null;
  }

  // -------------------------------------------------------------------------
  // Inputs
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
    const special = this.hovered === null ? undefined : this.specialAt(this.hovered);
    if (special?.kind === "airport") this.events.onAirport?.(special.airport);
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

  /** Turns the head: yaw around the vertical, pitch clamped to avoid somersaults. */
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
