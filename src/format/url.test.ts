import { describe, expect, it } from "vitest";
import { isPublicHost, normalizePageUrl, rootDomain } from "./url";

describe("adresses", () => {
  it("nettoie une adresse de page", () => {
    expect(normalizePageUrl("http://www.Amazon.com/livres/?ref=abc#haut")).toEqual({
      url: "https://amazon.com/livres",
      domain: "amazon.com",
      path: "/livres",
    });
  });

  it("trouve le domaine racine, y compris derrière co.uk ou gouv.fr", () => {
    expect(rootDomain("static.lemonde.fr")).toBe("lemonde.fr");
    expect(rootDomain("www.bbc.co.uk")).toBe("bbc.co.uk");
    expect(rootDomain("news.bbc.co.uk")).toBe("bbc.co.uk");
    expect(rootDomain("www.service-public.gouv.fr")).toBe("service-public.gouv.fr");
    expect(rootDomain("github.com")).toBe("github.com");
  });

  it("reconnaît les adresses locales ou d'intranet", () => {
    for (const host of ["localhost", "192.168.1.20", "nas.local", "app.localhost", "wiki.corp", "[::1]", "intranet"]) {
      expect(isPublicHost(host), host).toBe(false);
    }
    for (const host of ["github.com", "fr.wikipedia.org", "www.bbc.co.uk"]) {
      expect(isPublicHost(host), host).toBe(true);
    }
  });
});
