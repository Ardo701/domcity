// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { linkKey } from "@/format/links";
import { validateCityDoc } from "@/format/schema";
import type { CityNode } from "@/format/types";
import { mimicBrowserLayout } from "@/test/layout";
import { captureDocument } from "./capture";

const PAGE = `<!doctype html><html><head><title>Croissant</title>
<style>body { color: red }</style><script>var tracking = "ne pas compter";</script></head>
<body class="mw-body">
  <section id="mwAQ">
    <h1>Croissant <span>(viennoiserie)</span></h1>
    <p>Le croissant est une <a href="./Viennoiserie">viennoiserie</a> <b>feuilletée</b>.</p>
    <div class="infobox">
      <img src="//upload.wikimedia.org/croissant.jpg" alt="Un croissant" width="250" height="167">
      <img src="pixel.gif" width="1" height="1">
    </div>
    <hr>
    <table class="wikitable"><tr><td>Calories <div>beaucoup</div></td><td><img src="/tableau.png" width="40" height="40"></td></tr></table>
  </section>
  <section>
    <h2>Histoire</h2>
    <ul><li>Vienne</li><li>Paris <a href="https://example.com/ailleurs">source</a></li></ul>
    <div id=":r1:"></div>
  </section>
</body></html>`;

function capture(html = PAGE) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return captureDocument(doc, {
    source: "wikipedia",
    url: "https://fr.wikipedia.org/wiki/Croissant",
    lang: "fr",
    now: new Date("2026-10-02T12:00:00Z"),
  });
}

function find(node: CityNode, predicate: (n: CityNode) => boolean): CityNode | undefined {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const hit = find(child, predicate);
    if (hit) return hit;
  }
  return undefined;
}

describe("captureDocument", () => {
  it("keeps the structure and order of the page", () => {
    const city = capture();
    expect(city.root.tag).toBe("body");
    expect(city.root.children?.map((n) => n.tag)).toEqual(["section", "section"]);
    const first = city.root.children![0];
    expect(first.children?.map((n) => n.tag)).toEqual(["h1", "p", "div", "hr", "table"]);
  });

  it("counts text without scripts or styles, and moves up the text of transparent elements", () => {
    const city = capture();
    const p = find(city.root, (n) => n.tag === "p")!;
    // spaces at the edges of a text node do not count: 20 + 12 + 10 + 1
    expect(p.text).toBe(43);
    expect(JSON.stringify(city)).not.toContain("tracking");
  });

  it("keeps the text of h1 to h3 headings", () => {
    const city = capture();
    expect(find(city.root, (n) => n.tag === "h1")?.heading).toBe("Croissant (viennoiserie)");
    expect(find(city.root, (n) => n.tag === "h2")?.heading).toBe("Histoire");
  });

  it("resolves images, ignores tracking pixels", () => {
    const city = capture();
    const infobox = find(city.root, (n) => n.label === ".infobox")!;
    expect(infobox.children).toHaveLength(1);
    expect(infobox.children![0].img).toEqual({
      src: "https://upload.wikimedia.org/croissant.jpg",
      alt: "Un croissant",
      w: 250,
      h: 167,
    });
  });

  it("in a table, keeps only the images", () => {
    const city = capture();
    const table = find(city.root, (n) => n.tag === "table")!;
    expect(table.children?.map((n) => n.tag)).toEqual(["img"]);
    expect(table.text).toBe("Calories".length + "beaucoup".length);
  });

  it("counts internal and external links on the kept parent", () => {
    const city = capture();
    expect(find(city.root, (n) => n.tag === "p")?.links).toEqual({ internal: 1, external: 0 });
    const paris = find(city.root, (n) => n.tag === "li" && (n.text ?? 0) > 6)!;
    expect(paris.links).toEqual({ internal: 0, external: 1 });
  });

  it("notes where links lead: fingerprints of the site's pages, domains of other sites", () => {
    expect(capture().linksTo).toEqual({ pages: [linkKey("/wiki/Viennoiserie")], sites: [["example.com", 1]] });

    const city = capture(`<body>
      <a href="./Croissant">soi-même</a> <a href="#haut">ancre</a>
      <a href="./Pain_au_chocolat">a</a> <a href="/wiki/Pain_au_chocolat/?x=1#y">b</a> <a href="./Champs-%C3%89lys%C3%A9es">c</a>
      <a href="https://www.github.com/a">d</a> <a href="https://github.com/b">e</a> <a href="https://doi.org/1">f</a>
      <a href="http://192.168.1.2/admin">g</a> <a href="http://nas.local/">h</a>
    </body>`);
    expect(city.linksTo?.pages).toEqual([linkKey("/wiki/Pain_au_chocolat"), linkKey("/wiki/Champs-Élysées")]);
    expect(city.linksTo?.sites).toEqual([["github.com", 2], ["doi.org", 1]]);
    expect(JSON.stringify(city)).not.toContain("Pain_au_chocolat");
    expect(validateCityDoc(city).ok).toBe(true);
  });

  it("skips generated identifiers", () => {
    const city = capture();
    expect(city.root.children![0].label).toBeUndefined();
    const empty = city.root.children![1].children!.at(-1)!;
    expect(empty.tag).toBe("div");
    expect(empty.label).toBeUndefined();
    expect(empty.text).toBeUndefined();
  });

  it("produces a valid file", () => {
    const result = validateCityDoc(capture());
    expect(result.ok).toBe(true);
  });

  it("finds the real image of a lazy load", () => {
    const city = capture(`<body><img src="data:image/gif;base64,R0lGOD" data-src="/vraie.jpg" width="300" height="200"></body>`);
    expect(city.root.children![0].img?.src).toBe("https://fr.wikipedia.org/vraie.jpg");
  });

  it("withstands a very deep DOM", () => {
    const deep = `<body>${"<div>".repeat(5000)}fond${"</div>".repeat(5000)}</body>`;
    const city = capture(deep);
    expect(validateCityDoc(city).ok).toBe(true);
  });
});

describe("captureDocument on the displayed page (live)", () => {
  it("goes through display: contents and wrappers without area, ignores what is hidden", () => {
    document.body.innerHTML = `
      <div id="enveloppe" style="display: contents"><section id="dedans"><p>Bonjour tout le monde</p></section></div>
      <div id="vide"><p>Dans une boîte sans surface</p></div>
      <div id="cache" style="display: none"><p>caché</p></div>`;
    const restore = mimicBrowserLayout((el) =>
      el.id === "vide" ? { left: 0, top: 0, width: 0, height: 0 } : { left: 0, top: 0, width: 200, height: 30 },
    );
    try {
      const city = captureDocument(document, { source: "bookmarklet", url: "https://exemple.org/", live: true });
      expect(city.root.children?.map((n) => `${n.tag}${n.label ?? ""}`)).toEqual(["section#dedans", "p"]);
      expect(JSON.stringify(city)).not.toContain("#cache");
      expect(city.page?.domSize).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  it("notes broken images, not those waiting for their lazy load", () => {
    document.body.innerHTML = `
      <img id="cassee" src="https://exemple.org/disparue.jpg" alt="disparue">
      <img id="attente" src="https://exemple.org/plus-bas.jpg" loading="lazy">
      <img id="vue" src="https://exemple.org/vue.jpg">
      <img id="vecteur" src="https://exemple.org/logo.svg">`;
    const state: Record<string, [boolean, number]> = { cassee: [true, 0], attente: [false, 0], vue: [true, 640], vecteur: [true, 0] };
    for (const img of document.querySelectorAll("img")) {
      const [complete, size] = state[img.id];
      Object.defineProperty(img, "complete", { value: complete });
      Object.defineProperty(img, "naturalWidth", { value: size });
      Object.defineProperty(img, "naturalHeight", { value: size });
    }
    const restore = mimicBrowserLayout(() => ({ left: 0, top: 0, width: 200, height: 120 }));
    try {
      const city = captureDocument(document, { source: "bookmarklet", url: "https://exemple.org/", live: true });
      const broken = (src: string) => find(city.root, (n) => n.img?.src === src)?.img?.broken;
      expect(broken("https://exemple.org/disparue.jpg")).toBe(true);
      expect(broken("https://exemple.org/plus-bas.jpg")).toBeUndefined();
      expect(broken("https://exemple.org/vue.jpg")).toBeUndefined();
      expect(broken("https://exemple.org/logo.svg")).toBeUndefined();
      expect(validateCityDoc(city).ok).toBe(true);
    } finally {
      restore();
    }
  });

  it("notes that a page declares itself adults only (rating tag), and only that page", () => {
    document.body.innerHTML = `<p>Bonjour</p>`;
    const restore = mimicBrowserLayout(() => ({ left: 0, top: 0, width: 200, height: 30 }));
    const adult = (meta: string) => {
      document.head.innerHTML = meta;
      return captureDocument(document, { source: "bookmarklet", url: "https://exemple.org/", live: true }).page?.adult;
    };
    try {
      expect(adult(`<meta name="RATING" content="RTA-5042-1996-1400-1577-RTA">`)).toBe(true);
      expect(adult(`<meta name="rating" content=" adult ">`)).toBe(true);
      expect(adult(`<meta name="rating" content="general">`)).toBeUndefined();
      expect(adult(`<meta name="description" content="adult">`)).toBeUndefined();
      expect(adult("")).toBeUndefined();
    } finally {
      document.head.innerHTML = "";
      restore();
    }
  });
});
