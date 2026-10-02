import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { secretSalt, siteUrl } from "./config";

/** Empreinte de l'IP du visiteur : jamais l'IP elle-même. */
export function clientActor(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return toBytea(createHash("sha256").update(`${secretSalt()}:${ip}`).digest());
}

/** Les écritures ne sont acceptées que depuis le site lui-même. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === siteUrl(request) || origin === new URL(request.url).origin;
}

/** Jeton du lien secret de suppression : 24 octets aléatoires, en base64url. */
export function newDeleteToken(): string {
  return randomBytes(24).toString("base64url");
}

/** On ne garde que l'empreinte du jeton, au format bytea de Postgres. */
export function hashToken(token: string): string {
  return toBytea(createHash("sha256").update(token).digest());
}

function toBytea(bytes: Buffer): string {
  return `\\x${bytes.toString("hex")}`;
}

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{8}$/;

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
