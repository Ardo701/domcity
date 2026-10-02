// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
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
  it("garde la structure et l'ordre de la page", () => {
    const city = capture();
    expect(city.root.tag).toBe("body");
    expect(city.root.children?.map((n) => n.tag)).toEqual(["section", "section"]);
    const first = city.root.children![0];
    expect(first.children?.map((n) => n.tag)).toEqual(["h1", "p", "div", "hr", "table"]);
  });

  it("compte le texte sans les scripts ni les styles, et remonte le texte des éléments transparents", () => {
    const city = capture();
    const p = find(city.root, (n) => n.tag === "p")!;
    // les espaces en bord de nœud texte ne comptent pas : 20 + 12 + 10 + 1
    expect(p.text).toBe(43);
    expect(JSON.stringify(city)).not.toContain("tracking");
  });

  it("garde le texte des titres h1 à h3", () => {
    const city = capture();
    expect(find(city.root, (n) => n.tag === "h1")?.heading).toBe("Croissant (viennoiserie)");
    expect(find(city.root, (n) => n.tag === "h2")?.heading).toBe("Histoire");
  });

  it("résout les images, ignore les pixels espions", () => {
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

  it("dans un tableau, ne garde que les images", () => {
    const city = capture();
    const table = find(city.root, (n) => n.tag === "table")!;
    expect(table.children?.map((n) => n.tag)).toEqual(["img"]);
    expect(table.text).toBe("Calories".length + "beaucoup".length);
  });

  it("compte les liens internes et externes sur le parent gardé", () => {
    const city = capture();
    expect(find(city.root, (n) => n.tag === "p")?.links).toEqual({ internal: 1, external: 0 });
    const paris = find(city.root, (n) => n.tag === "li" && (n.text ?? 0) > 6)!;
    expect(paris.links).toEqual({ internal: 0, external: 1 });
  });

  it("saute les identifiants générés", () => {
    const city = capture();
    expect(city.root.children![0].label).toBeUndefined();
    const empty = city.root.children![1].children!.at(-1)!;
    expect(empty.tag).toBe("div");
    expect(empty.label).toBeUndefined();
    expect(empty.text).toBeUndefined();
  });

  it("produit un fichier valide", () => {
    const result = validateCityDoc(capture());
    expect(result.ok).toBe(true);
  });

  it("trouve la vraie image d'un chargement différé", () => {
    const city = capture(`<body><img src="data:image/gif;base64,R0lGOD" data-src="/vraie.jpg" width="300" height="200"></body>`);
    expect(city.root.children![0].img?.src).toBe("https://fr.wikipedia.org/vraie.jpg");
  });

  it("résiste à un DOM très profond", () => {
    const deep = `<body>${"<div>".repeat(5000)}fond${"</div>".repeat(5000)}</body>`;
    const city = capture(deep);
    expect(validateCityDoc(city).ok).toBe(true);
  });
});

describe("captureDocument sur la page affichée (live)", () => {
  it("traverse display: contents et les enveloppes sans surface, ignore ce qui est masqué", () => {
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
});
