/**
 * Textures dessinées ou chargées : affiches des panneaux, panneau « indisponible »,
 * plaques des monuments.
 */

import * as THREE from "three";

export type ImageStatus = "loading" | "shown" | "blocked" | "missing";

/** Polices du site, lues dans les variables CSS posées par next/font. */
function fontFamily(variable: "--font-display" | "--font-mono", fallback: string): string {
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
