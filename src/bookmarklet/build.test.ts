import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "../../scripts/build-bookmarklet.mjs";
import { BOOKMARKLET_CODE } from "./generated";
import { bookmarkletHref } from "./href";

// esbuild tourne dans Node, pas dans jsdom : ces tests sont à part.
const ORIGIN = "https://domcity.test";

describe("compilation du favori", () => {
  it("le fichier généré est à jour (sinon : npm run bookmarklet)", async () => {
    expect(await buildBookmarklet()).toBe(BOOKMARKLET_CODE);
  }, 30_000);

  it("donne un lien javascript: assez court pour tous les navigateurs, vers ce site", () => {
    const href = bookmarkletHref(`${ORIGIN}/create`);
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href.length).toBeLessThan(30_000);
    const code = decodeURIComponent(href.slice("javascript:".length));
    expect(code).toContain(`"${ORIGIN}"`);
    expect(code).not.toContain("__DOMCITY_ORIGIN__");
    expect(code).not.toMatch(/[\n\u2014]/);
  });
});

