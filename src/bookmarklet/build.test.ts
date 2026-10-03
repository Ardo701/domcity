import { describe, expect, it } from "vitest";
import { buildBookmarklet } from "../../scripts/build-bookmarklet.mjs";
import { BOOKMARKLET_CODE } from "./generated";
import { bookmarkletHref } from "./href";

// esbuild runs in Node, not in jsdom: these tests are separate.
const ORIGIN = "https://domcity.test";

describe("bookmarklet build", () => {
  it("the generated file is up to date (otherwise: npm run bookmarklet)", async () => {
    expect(await buildBookmarklet()).toBe(BOOKMARKLET_CODE);
  }, 30_000);

  it("gives a javascript: link short enough for every browser, pointing to this site", () => {
    const href = bookmarkletHref(`${ORIGIN}/create`);
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href.length).toBeLessThan(30_000);
    const code = decodeURIComponent(href.slice("javascript:".length));
    expect(code).toContain(`"${ORIGIN}"`);
    expect(code).not.toContain("__DOMCITY_ORIGIN__");
    expect(code).not.toMatch(/[\n\u2014]/);
  });
});

