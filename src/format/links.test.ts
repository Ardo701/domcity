import { describe, expect, it } from "vitest";
import { linkKey, linkPath } from "./links";
import { normalizePageUrl } from "./url";

describe("empreinte des liens", () => {
  it("range les chemins comme les pages de DOMCity", () => {
    expect(linkPath("/wiki//Paris/")).toBe("/wiki/Paris");
    expect(linkPath("")).toBe("/");
    expect(linkPath("/Champs-%C3%89lys%C3%A9es")).toBe("/Champs-Élysées");
    expect(linkPath("/mal%E0form%C3")).toBe("/mal%E0form%C3");
  });

  it("donne la même empreinte au lien et à la page qu'il vise", () => {
    const page = normalizePageUrl("https://fr.wikipedia.org/wiki/Champs-Élysées/")!;
    expect(linkKey(page.path)).toBe(linkKey(new URL("./Champs-%C3%89lys%C3%A9es", "https://fr.wikipedia.org/wiki/Paris").pathname));
    expect(linkKey("/a")).toMatch(/^[0-9a-f]{8}$/);
    expect(linkKey("/a")).not.toBe(linkKey("/b"));
  });
});
