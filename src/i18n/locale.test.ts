import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { API } from "./messages/api";
import { CITY } from "./messages/city";
import { negotiateLocale, requestLocale } from "./locale";
import { formatBytes, formatCount, plural } from "./format";

const visit = (path: string, headers: Record<string, string> = {}) => proxy(new NextRequest(`http://localhost:3000${path}`, { headers }));

describe("languages", () => {
  it("speaks French when the browser asks for it first, English otherwise", () => {
    expect(negotiateLocale("fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("fr");
    expect(negotiateLocale("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(negotiateLocale("fr-CA")).toBe("fr");
    // The first language the site speaks, in preference order.
    expect(negotiateLocale("de-DE,de;q=0.9,fr;q=0.8,en;q=0.7")).toBe("fr");
    expect(negotiateLocale("de-DE,en;q=0.5,fr;q=0.8")).toBe("fr");
    expect(negotiateLocale("fr;q=0,en;q=0.5")).toBe("en");
    // Nothing the site speaks, or no header: English.
    expect(negotiateLocale("de-DE,de;q=0.9")).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("*")).toBe("en");
  });

  it("the switcher's choice wins over the browser", () => {
    expect(requestLocale("en", "fr-FR,fr;q=0.9")).toBe("en");
    expect(requestLocale("fr", "en-US")).toBe("fr");
    expect(requestLocale("de", "fr-FR")).toBe("fr");
    expect(requestLocale(undefined, "en-US")).toBe("en");
  });

  it("serves a page in the visitor's language without changing its address", () => {
    const rewritten = (response: Response) => response.headers.get("x-middleware-rewrite");
    expect(rewritten(visit("/create", { "accept-language": "fr-FR,fr;q=0.9" }))).toBe("http://localhost:3000/fr/create");
    expect(rewritten(visit("/create", { "accept-language": "en-GB" }))).toBe("http://localhost:3000/en/create");
    expect(rewritten(visit("/", { "accept-language": "fr" }))).toBe("http://localhost:3000/fr");
    expect(rewritten(visit("/city/AbCdEfGh", { cookie: "locale=en", "accept-language": "fr" }))).toBe(
      "http://localhost:3000/en/city/AbCdEfGh",
    );
    // The bookmarklet's plan B: the fragment never reaches the server, the address stays /new.
    expect(rewritten(visit("/new?x=1"))).toBe("http://localhost:3000/en/new?x=1");
    // Wikipedia keeps its own language in the address.
    expect(rewritten(visit("/w/fr/Paris", { "accept-language": "en" }))).toBe("http://localhost:3000/en/w/fr/Paris");
  });

  it("an address that names its language keeps the choice and loses its prefix", () => {
    const response = visit("/fr/site/apple.com", { "accept-language": "en" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/site/apple.com");
    expect(response.headers.get("set-cookie")).toMatch(/^locale=fr; Path=\/;.*Max-Age=31536000/);
    expect(visit("/en").headers.get("location")).toBe("http://localhost:3000/");
    // The router's own requests are not redirected.
    expect(visit("/fr/create", { rsc: "1" }).headers.get("location")).toBeNull();
  });

  it("formats numbers, weights and plurals in each language", () => {
    expect(formatCount(3244, "en")).toBe("3,244");
    expect(formatCount(3244, "fr")).toBe("3 244");
    expect(formatBytes(2.4 * 1024 * 1024, "en")).toBe("2.4 MB");
    expect(formatBytes(2.4 * 1024 * 1024, "fr")).toBe("2,4 Mo");
    expect(plural("en", 1, "city", "cities")).toBe("1 city");
    expect(plural("en", 0, "city", "cities")).toBe("0 cities");
    expect(plural("fr", 0, "ville", "villes")).toBe("0 ville");
    expect(plural("fr", 2, "ville", "villes")).toBe("2 villes");
  });

  it("has every message in both languages", () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === "object" && !Array.isArray(value) && !("$$typeof" in value)
        ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]))
        : typeof value;
    for (const messages of [API, CITY]) expect(shape(messages.fr)).toEqual(shape(messages.en));
  });
});
