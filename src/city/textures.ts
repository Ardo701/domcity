/**
 * Textures dessinées ou chargées : affiches des panneaux, panneau « indisponible »,
 * plaques des monuments, atlas des icônes.
 */

import * as THREE from "three";

export type ImageStatus = "loading" | "shown" | "blocked" | "missing";

/** Polices du site, lues dans les variables CSS posées par next/font. */
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

/** Affiche de remplacement : hachures de chantier, mention, texte alternatif. */
export function unavailableTexture(ratio: number, status: ImageStatus, alt?: string): THREE.CanvasTexture {
  const width = 512;
  const height = Math.max(160, Math.round(width / Math.max(ratio, 0.45)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#DCD5C6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(21,21,26,0.09)";
  ctx.lineWidth = 14;
  for (let x = -height; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = "#15151A";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  const display = fontFamily("--font-display", "sans-serif");
  const mono = fontFamily("--font-mono", "monospace");
  const label = status === "missing" ? "IMAGE INTROUVABLE" : "IMAGE INDISPONIBLE";

  ctx.fillStyle = "#FF4B12";
  ctx.fillRect(28, 28, 44, 10);
  ctx.fillStyle = "#15151A";
  ctx.font = `800 54px ${display}`;
  ctx.textBaseline = "top";
  ctx.fillText(label, 28, 52, width - 56);

  if (alt) {
    ctx.font = `500 22px ${mono}`;
    ctx.fillStyle = "#45454F";
    const lines = wrapLines(ctx, alt, width - 56, Math.max(1, Math.floor((height - 140) / 30)));
    lines.forEach((text, i) => ctx.fillText(text, 28, 124 + i * 30));
  }
  return canvasTexture(canvas);
}

const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

/** Charge une image comme texture (il faut que son site l'autorise). */
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
 * La texture a échoué : l'image existe-t-elle ? Un simple affichage (sans
 * lecture des pixels) est toujours permis. S'il réussit, l'image est bloquée ;
 * sinon, elle a disparu.
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

/** File d'attente : quelques chargements à la fois, pour ne pas saturer le réseau. */
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

/** Plaque d'un monument : papier, filet d'encre, repère orange, titre en capitales. */
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

/** Une case de l'atlas, en pixels, dont une marge pour que les cases voisines ne bavent pas de loin. */
const CELL = 64;
const GUTTER = 4;
/** Au-delà, les icônes restantes gardent une plaque vierge (2 048 px de côté au plus). */
const MAX_CELLS = 1024;
const PLATE = "#F4F1EA";

/**
 * Atlas des icônes : toutes les petites images de la ville (panonceaux, drapeaux) dans une
 * seule texture, une case par adresse. Un seul appel de dessin pour toutes, au lieu d'un par icône.
 * La case 0 reste vierge : la plaque d'une icône sans adresse.
 */
export class IconAtlas {
  readonly texture: THREE.CanvasTexture;
  /** Adresse de chaque case à partir de la case 1. */
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

  /** Numéro de case d'une adresse (0 : plaque vierge). */
  index(src: string | undefined): number {
    if (!src) return 0;
    const at = this.sources.indexOf(src);
    return at < 0 ? 0 : at + 1;
  }

  /** Coin bas-gauche et taille de la partie utile d'une case, en coordonnées de texture. */
  cell(index: number): [number, number, number, number] {
    const { x, y } = this.origin(index);
    const inner = CELL - GUTTER * 2;
    const { width, height } = this.size;
    // La texture est retournée à l'envoi : le haut de la toile est en v = 1.
    return [(x + GUTTER) / width, 1 - (y + GUTTER + inner) / height, inner / width, inner / height];
  }

  /** Peint l'icône dans sa case, sur la plaque claire (les icônes ont souvent un fond transparent). */
  draw(index: number, image: CanvasImageSource) {
    const { x, y } = this.origin(index);
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = PLATE;
    ctx.fillRect(x, y, CELL, CELL);
    // La marge reçoit l'image étirée : de loin, la case se mélange à ses propres bords.
    ctx.drawImage(image, x, y, CELL, CELL);
    ctx.fillRect(x + GUTTER, y + GUTTER, CELL - GUTTER * 2, CELL - GUTTER * 2);
    ctx.drawImage(image, x + GUTTER, y + GUTTER, CELL - GUTTER * 2, CELL - GUTTER * 2);
    this.texture.needsUpdate = true;
  }

  /** Icône inutilisable : les hachures de chantier des affiches indisponibles, en petit. */
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

/** Charge une image lisible par la 3D : il faut que son site l'autorise (CORS), sinon échec. */
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
 * Les graffitis : ce que les développeurs laissent dans les commentaires du HTML, bombé sur les
 * murs. Le relevé ne garde pas le texte des commentaires : les tags sont les mots qu'on y trouve
 * le plus souvent, toujours les mêmes.
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

/** Atlas des graffitis : un tag par case, fond transparent (le mur se voit autour). */
export class GraffitiAtlas {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = TAG_W * TAG_COLUMNS;
    this.canvas.height = TAG_H * Math.ceil(GRAFFITI_TAGS.length / TAG_COLUMNS);
    this.texture = canvasTexture(this.canvas);
  }

  /** Coin bas-gauche et taille d'une case, en coordonnées de texture. */
  cell(index: number): [number, number, number, number] {
    const i = index % GRAFFITI_TAGS.length;
    const { width, height } = this.canvas;
    const x = (i % TAG_COLUMNS) * TAG_W;
    const y = Math.floor(i / TAG_COLUMNS) * TAG_H;
    return [x / width, 1 - (y + TAG_H) / height, TAG_W / width, TAG_H / height];
  }

  /** Bombe les tags (une fois les polices prêtes) : contour d'encre, remplissage en dégradé, coulures. */
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
      // Le contour, large et sombre, puis le remplissage en dégradé et un reflet blanc.
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
      // Coulures sous les lettres.
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
