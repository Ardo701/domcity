import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { LOCALE_COOKIE, requestLocale, type Locale } from "@/i18n/locale";
import { secretSalt, siteUrl } from "./config";

/** Fingerprint of the visitor's IP: never the IP itself. */
export function clientActor(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return toBytea(createHash("sha256").update(`${secretSalt()}:${ip}`).digest());
}

/** Writes are only accepted from the site itself. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === siteUrl(request) || origin === new URL(request.url).origin;
}

/** Token of the secret deletion link: 24 random bytes, in base64url. */
export function newDeleteToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Only the token's fingerprint is kept, in Postgres bytea format. */
export function hashToken(token: string): string {
  return toBytea(createHash("sha256").update(token).digest());
}

function toBytea(bytes: Buffer): string {
  return `\\x${bytes.toString("hex")}`;
}

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{8}$/;

/** The visitor's language for an API answer: the switcher's cookie, otherwise the browser's languages. */
export function requestLanguage(request: Request): Locale {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === LOCALE_COOKIE)?.[1];
  return requestLocale(cookie, request.headers.get("accept-language"));
}

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}
