import { describe, expect, it } from "vitest";
import { cityRefusal, isBlockedHost, isBlockedUrl } from "./blocklist";
import type { CityDoc } from "./types";

describe("sites refusés", () => {
  it("refuse un site de la liste, ses sous-domaines et les extensions pour adultes", () => {
    for (const host of ["pornhub.com", "fr.pornhub.com", "www.xvideos.com", "XHAMSTER.COM.", "ei.phncdn.com", "rule34.xxx", "a.b.porn"]) {
      expect(isBlockedHost(host), host).toBe(true);
    }
  });

  it("ne refuse pas un site qui ne fait que ressembler", () => {
    for (const host of ["exemple.org", "notpornhub.com", "pornhub.com.exemple.org", "essex.ac.uk", "pornic.fr", "xxxlutz.de", "sussex.com", "xxx.fr"]) {
      expect(isBlockedHost(host), host).toBe(false);
    }
  });

  it("lit l'hôte d'une adresse d'image, et ignore une adresse illisible", () => {
    expect(isBlockedUrl("https://ei.phncdn.com/videos/a.jpg")).toBe(true);
    expect(isBlockedUrl("https://upload.wikimedia.org/a.jpg")).toBe(false);
    expect(isBlockedUrl("pas une adresse")).toBe(false);
  });

  it("dit pourquoi une ville ne se construit pas", () => {
    const doc: CityDoc = { format: 1, source: "bookmarklet", url: "https://exemple.org/", title: "Essai", capturedAt: "2026-10-03T00:00:00.000Z", root: { tag: "body" } };
    expect(cityRefusal(doc)).toBeNull();
    expect(cityRefusal({ ...doc, url: "https://www.onlyfans.com/x" })).toMatch(/liste des sites refusés/);
    expect(cityRefusal({ ...doc, page: { adult: true } })).toMatch(/réservée aux adultes/);
  });
});
