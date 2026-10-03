/**
 * Drawn or loaded textures: billboard posters, "unavailable" billboard,
 * monument plaques, icon atlas.
 */

import * as THREE from "three";

/** "refused": the image comes from a site refused by DOMCity, it is never loaded. */
export type ImageStatus = "loading" | "shown" | "blocked" | "missing" | "refused";

/** The site's fonts, read from the CSS variables set by next/font. */
export function fontFamily(variable: "--font-display" | "--font-mono", fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const display = fontFamily("--font-display", "sans-serif");
  const mono = fontFamily("--font-mono", "monospace");
  await Promise.allSettled([
    document.fonts.load(`800 64px ${display}`),
    document.fonts.load(`500 24px ${mono}`),
  ]);
}

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s*\S*$/, "")}…`;
  }
  return lines;
}

/** Calm tints for placeholder posters: a covered facade must not be uniform. */
const PLACARDS = ["#E6DFCF", "#DCE2DA", "#E4D8D0", "#D9DEE4", "#E8E1CC", "#DED6E0"];

/**
 * Placeholder poster, when the image's site does not lend it (or it has disappeared):
 * plain, like a printed poster. The image's alt text in large type, a discreet
 * note at the bottom. A click always shows the real image.
 */
export function unavailableTexture(ratio: number, status: ImageStatus, alt?: string): THREE.CanvasTexture {
  const width = 512;
  const height = Math.max(160, Math.round(width / Math.max(ratio, 0.45)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // The alt text of a refused image is not shown: it can be as crude as the image.
  const text = status === "refused" ? "Image masquée" : alt?.trim() || "Image sans légende";
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  ctx.fillStyle = PLACARDS[hash % PLACARDS.length];
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#15151A";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  const display = fontFamily("--font-display", "sans-serif");
  const mono = fontFamily("--font-mono", "monospace");
  const caption =
    status === "missing" ? "IMAGE INTROUVABLE" : status === "refused" ? "SITE REFUSÉ PAR DOMCITY" : "IMAGE NON AFFICHÉE · CLIC POUR LA VOIR";
  const box = { x: 34, y: 34, w: width - 68, h: height - 104 };

  // The alt text, as large as the space allows.
  ctx.fillStyle = "#15151A";
  ctx.textBaseline = "top";
  let size = 64;
  let lines: string[] = [];
  for (; size >= 22; size -= 4) {
    ctx.font = `800 ${size}px ${display}`;
    lines = wrapLines(ctx, text.toUpperCase(), box.w, Math.max(1, Math.floor(box.h / (size * 1.05))));
    if (lines.length * size * 1.05 <= box.h) break;
  }
  lines.forEach((line, i) => ctx.fillText(line, box.x, box.y + i * size * 1.05, box.w));

  ctx.font = `500 16px ${mono}`;
  ctx.fillStyle = "#45454F";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(caption, box.x, height - 32, box.w);
  return canvasTexture(canvas);
}

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

/** Loads an image as a texture (its site must allow it). */
export function loadImageTexture(src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      src,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

/**
 * The texture failed: does the image exist? A simple display (without
 * reading the pixels) is always allowed. If it succeeds, the image is blocked;
 * otherwise, it has disappeared.
 */
export function probeImage(src: string): Promise<"blocked" | "missing"> {
  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve("blocked");
    img.onerror = () => resolve("missing");
    img.src = src;
  });
}

/** Queue: a few loads at a time, so as not to saturate the network. */
export function createQueue(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const next = () => {
    if (active >= concurrency) return;
    const job = waiting.shift();
    if (!job) return;
    active += 1;
    job();
  };
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}

export type PlaqueLevel = 1 | 2 | 3;

/** A monument's plaque: paper, ink rule, orange marker, title in capitals. */
export function plaqueTexture(text: string, level: PlaqueLevel): { texture: THREE.CanvasTexture; ratio: number } {
  const display = fontFamily("--font-display", "sans-serif");
  const mono = fontFamily("--font-mono", "monospace");
  const size = level === 1 ? 88 : level === 2 ? 64 : 52;
  const pad = Math.round(size * 0.42);
  const kicker = `H${level}`;

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `800 ${size}px ${display}`;
  const title = text.toUpperCase();
  const titleWidth = Math.min(measure.measureText(title).width, 1600);
  measure.font = `600 ${Math.round(size * 0.34)}px ${mono}`;
  const kickerWidth = measure.measureText(kicker).width;

  const width = Math.ceil(pad * 3 + kickerWidth + titleWidth);
  const height = Math.ceil(size * 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = level === 1 ? "#15151A" : "#F6F3EC";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#15151A";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = "#FF4B12";
  ctx.fillRect(0, 0, Math.round(size * 0.14), height);

  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(size * 0.34)}px ${mono}`;
  ctx.fillStyle = "#FF4B12";
  ctx.fillText(kicker, pad, height / 2 + 2);

  ctx.font = `800 ${size}px ${display}`;
  ctx.fillStyle = level === 1 ? "#F6F3EC" : "#15151A";
  ctx.fillText(title, pad * 2 + kickerWidth, height / 2 + size * 0.06, titleWidth);

  return { texture: canvasTexture(canvas), ratio: width / height };
}

/** An atlas cell, in pixels, including a margin so that neighboring cells do not bleed from afar. */
const CELL = 64;
const GUTTER = 4;
/** Beyond this, the remaining icons keep a blank plate (2,048 px per side at most). */
const MAX_CELLS = 1024;
const PLATE = "#F4F1EA";

/**
 * Icon atlas: all the small images of the city (small signs, flags) in a
 * single texture, one cell per address. A single draw call for all of them, instead of one per icon.
 * Cell 0 stays blank: the plate of an icon without an address.
 */
export class IconAtlas {
  readonly texture: THREE.CanvasTexture;
  /** Address of each cell from cell 1 on. */
  readonly sources: string[];
  private readonly ctx: CanvasRenderingContext2D;
  private readonly columns: number;
  private readonly size: { width: number; height: number };

  constructor(sources: string[]) {
    this.sources = sources.slice(0, MAX_CELLS - 1);
    const cells = this.sources.length + 1;
    this.columns = Math.ceil(Math.sqrt(cells));
    const canvas = document.createElement("canvas");
    canvas.width = this.columns * CELL;
    canvas.height = Math.ceil(cells / this.columns) * CELL;
    this.size = { width: canvas.width, height: canvas.height };
    this.ctx = canvas.getContext("2d")!;
    this.ctx.fillStyle = PLATE;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.texture = canvasTexture(canvas);
  }

  /** Cell number of an address (0: blank plate). */
  index(src: string | undefined): number {
    if (!src) return 0;
    const at = this.sources.indexOf(src);
    return at < 0 ? 0 : at + 1;
  }

  /** Bottom-left corner and size of the useful part of a cell, in texture coordinates. */
  cell(index: number): [number, number, number, number] {
    const { x, y } = this.origin(index);
    const inner = CELL - GUTTER * 2;
    const { width, height } = this.size;
    // The texture is flipped on upload: the top of the canvas is at v = 1.
    return [(x + GUTTER) / width, 1 - (y + GUTTER + inner) / height, inner / width, inner / height];
  }

  /** Paints the icon in its cell, on the light plate (icons often have a transparent background). */
  draw(index: number, image: CanvasImageSource) {
    const { x, y } = this.origin(index);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = PLATE;
    ctx.fillRect(x, y, CELL, CELL);
    // The margin receives the stretched image: from afar, the cell blends with its own edges.
    ctx.drawImage(image, x, y, CELL, CELL);
    ctx.fillRect(x + GUTTER, y + GUTTER, CELL - GUTTER * 2, CELL - GUTTER * 2);
    ctx.drawImage(image, x + GUTTER, y + GUTTER, CELL - GUTTER * 2, CELL - GUTTER * 2);
    this.texture.needsUpdate = true;
  }

  /** Unusable icon: the construction hatching of unavailable posters, small. */
  drawUnavailable(index: number) {
    const { x, y } = this.origin(index);
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, CELL, CELL);
    ctx.clip();
    ctx.fillStyle = "#DCD5C6";
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeStyle = "rgba(21,21,26,0.16)";
    ctx.lineWidth = 5;
    for (let k = -CELL; k < CELL; k += 14) {
      ctx.beginPath();
      ctx.moveTo(x + k, y + CELL);
      ctx.lineTo(x + k + CELL, y);
      ctx.stroke();
    }
    ctx.restore();
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }

  private origin(index: number) {
    return { x: (index % this.columns) * CELL, y: Math.floor(index / this.columns) * CELL };
  }
}

/** Loads an image readable by the 3D: its site must allow it (CORS), otherwise it fails. */
export function loadCorsImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Graffiti: what developers leave in HTML comments, sprayed on the
 * walls. The capture does not keep the text of comments: the tags are the words found there
 * most often, always the same ones.
 */
export const GRAFFITI_TAGS = ["TODO", "FIXME", "<!-- -->", "HACK", "XXX", "WIP", "NE PAS TOUCHER", "V2", "DEBUG", "OLD", "TEMP", "BUG"];

const TAG_W = 256;
const TAG_H = 128;
const TAG_COLUMNS = 4;
const SPRAYS: Array<[string, string]> = [
  ["#3657E0", "#7FD1E8"],
  ["#2F8F6B", "#B8E06A"],
  ["#C4462E", "#F2A33A"],
  ["#7A3FB0", "#E2549A"],
  ["#D9A21B", "#F4E06A"],
  ["#22324A", "#5C8F80"],
];

/** Graffiti atlas: one tag per cell, transparent background (the wall shows around it). */
export class GraffitiAtlas {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = TAG_W * TAG_COLUMNS;
    this.canvas.height = TAG_H * Math.ceil(GRAFFITI_TAGS.length / TAG_COLUMNS);
    this.texture = canvasTexture(this.canvas);
  }

  /** Bottom-left corner and size of a cell, in texture coordinates. */
  cell(index: number): [number, number, number, number] {
    const i = index % GRAFFITI_TAGS.length;
    const { width, height } = this.canvas;
    const x = (i % TAG_COLUMNS) * TAG_W;
    const y = Math.floor(i / TAG_COLUMNS) * TAG_H;
    return [x / width, 1 - (y + TAG_H) / height, TAG_W / width, TAG_H / height];
  }

  /** Sprays the tags (once the fonts are ready): ink outline, gradient fill, drips. */
  draw() {
    const ctx = this.canvas.getContext("2d")!;
    const display = fontFamily("--font-display", "sans-serif");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    GRAFFITI_TAGS.forEach((tag, i) => {
      const x = (i % TAG_COLUMNS) * TAG_W;
      const y = Math.floor(i / TAG_COLUMNS) * TAG_H;
      const [deep, light] = SPRAYS[i % SPRAYS.length];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, TAG_W, TAG_H);
      ctx.clip();
      ctx.translate(x + TAG_W / 2, y + TAG_H / 2 + 6);
      ctx.rotate(((i * 37) % 9) / 100 - 0.04);
      let size = 84;
      ctx.font = `800 ${size}px ${display}`;
      while (ctx.measureText(tag).width > TAG_W - 36 && size > 30) {
        size -= 4;
        ctx.font = `800 ${size}px ${display}`;
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      // The outline, wide and dark, then the gradient fill and a white highlight.
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#15151a";
      ctx.strokeText(tag, 0, 0);
      const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      fill.addColorStop(0, light);
      fill.addColorStop(1, deep);
      ctx.fillStyle = fill;
      ctx.fillText(tag, 0, 0);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(tag, -2, -3);
      // Drips under the letters.
      const span = ctx.measureText(tag).width;
      ctx.fillStyle = deep;
      for (let k = 0; k < 4; k += 1) {
        const dx = -span / 2 + ((k * 53 + i * 29) % Math.max(1, Math.round(span)));
        const length = 10 + ((k * 17 + i * 11) % 22);
        ctx.fillRect(dx, size * 0.32, 3, length);
        ctx.beginPath();
        ctx.arc(dx + 1.5, size * 0.32 + length, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
