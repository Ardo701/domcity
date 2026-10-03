import { describe, expect, it } from "vitest";
import type { CityDoc, CityNode } from "@/format/types";
import { AERODROME, AERODROME_MIN, emblemOf, externalLinks, gridLines, layoutCity, runwaysFor, stripLayout, type Lot, type Rect } from "./layout";

function doc(root: CityNode): CityDoc {
  return {
    format: 1,
    source: "wikipedia",
    url: "https://fr.wikipedia.org/wiki/Test",
    title: "Test",
    capturedAt: "2026-10-02T12:00:00.000Z",
    root,
  };
}

const SAMPLE = doc({
  tag: "body",
  children: [
    {
      tag: "section",
      text: 40,
      children: [
        { tag: "h2", text: 8, heading: "Histoire" },
        { tag: "p", text: 900 },
        { tag: "p", text: 50 },
        { tag: "hr" },
        { tag: "div", text: 3000 },
        { tag: "img", img: { src: "https://example.com/a.jpg", w: 400, h: 200 } },
      ],
    },
    {
      tag: "div",
      children: [
        { tag: "div", children: [{ tag: "div", children: [{ tag: "p", text: 10 }] }] },
        { tag: "ul", children: [{ tag: "li", text: 5 }, { tag: "li", text: 12 }] },
      ],
    },
  ],
});

const inside = (child: Rect, parent: Rect) =>
  child.x >= parent.x - 1e-6 &&
  child.z >= parent.z - 1e-6 &&
  child.x + child.w <= parent.x + parent.w + 1e-6 &&
  child.z + child.d <= parent.z + parent.d + 1e-6;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6;

describe("stripLayout", () => {
  it("remplit le rectangle sans changer l'ordre", () => {
    const cells = stripLayout([4, 1, 1, 2, 8], { x: 0, z: 0, w: 4, d: 4 });
    const area = cells.reduce((sum, c) => sum + c.w * c.d, 0);
    expect(area).toBeCloseTo(16, 6);
    // ordre de lecture : on avance vers l'est, puis vers le sud
    for (let i = 1; i < cells.length; i += 1) {
      const sameRow = Math.abs(cells[i].z - cells[i - 1].z) < 1e-9;
      if (sameRow) expect(cells[i].x).toBeGreaterThan(cells[i - 1].x);
      else expect(cells[i].z).toBeGreaterThan(cells[i - 1].z);
    }
  });
});

describe("layoutCity", () => {
  const layout = layoutCity(SAMPLE);
  const { lots } = layout;

  it("numérote les lots en ordre de document, avec des sous-arbres contigus", () => {
    expect(lots[0].kind).toBe("terrain");
    for (const lot of lots) {
      if (lot.parent >= 0) {
        const parent = lots[lot.parent];
        expect(lot.id).toBeGreaterThan(parent.id);
        expect(lot.id).toBeLessThan(parent.subtreeEnd);
      }
    }
  });

  it("garde chaque lot dans son parent, posé sur son sol", () => {
    for (const lot of lots) {
      if (lot.parent < 0) continue;
      const parent = lots[lot.parent];
      expect(inside(lot, parent)).toBe(true);
      expect(lot.y).toBeGreaterThanOrEqual(parent.y + parent.h - 1e-6);
    }
  });

  it("entoure la ville d'un périphérique et sépare les conteneurs voisins par une rue", () => {
    expect(layout.roads.filter((r) => r.style === "ring")).toHaveLength(4);
    const section = lots.find((l) => l.kind === "district")!;
    const block = lots.find((l) => l.parent === 0 && l.kind === "block")!;
    const between = layout.roads.filter((r) => r.owner === 0 && r.style === "street");
    expect(between.length).toBeGreaterThan(0);
    for (const road of between) {
      expect(overlaps(road, section)).toBe(false);
      expect(overlaps(road, block)).toBe(false);
    }
  });

  it("arrondit les quatre coins du périphérique, sans tronçon qui mène nulle part", () => {
    const ring = layout.roads.filter((r) => r.style === "ring");
    expect(layout.joints).toHaveLength(4);
    // Le point milieu d'un côté de la case, juste au-dehors.
    const beyond = (j: Rect, side: "north" | "east" | "south" | "west") => {
      const e = 0.01;
      if (side === "north") return { x: j.x + j.w / 2, z: j.z - e };
      if (side === "south") return { x: j.x + j.w / 2, z: j.z + j.d + e };
      if (side === "west") return { x: j.x - e, z: j.z + j.d / 2 };
      return { x: j.x + j.w + e, z: j.z + j.d / 2 };
    };
    const onRing = (p: { x: number; z: number }) => ring.some((r) => p.x > r.x && p.x < r.x + r.w && p.z > r.z && p.z < r.z + r.d);
    for (const joint of layout.joints) {
      const open = (["north", "east", "south", "west"] as const).filter((side) => joint.open[side]);
      // Deux côtés voisins : un virage.
      expect(open).toHaveLength(2);
      expect(joint.open.north !== joint.open.south).toBe(true);
      // Chaque côté ouvert donne sur le périphérique, chaque côté fermé sur la ceinture verte.
      for (const side of ["north", "east", "south", "west"] as const) {
        expect(onRing(beyond(joint, side))).toBe(joint.open[side]);
      }
      for (const road of ring) expect(overlaps(joint, road)).toBe(false);
    }
  });

  it("ne bâtit jamais sur une rue", () => {
    for (const lot of lots) {
      if (lot.container) continue;
      for (const road of [...layout.roads, ...layout.joints]) expect(overlaps(lot, road)).toBe(false);
    }
  });

  it("ne superpose jamais deux voisins", () => {
    const byParent = new Map<number, Lot[]>();
    for (const lot of lots) byParent.set(lot.parent, [...(byParent.get(lot.parent) ?? []), lot]);
    for (const siblings of byParent.values()) {
      for (let i = 0; i < siblings.length; i += 1) {
        for (let j = i + 1; j < siblings.length; j += 1) {
          expect(overlaps(siblings[i], siblings[j])).toBe(false);
        }
      }
    }
  });

  it("ajoute un bâtiment pour le texte écrit directement dans un conteneur", () => {
    const section = lots.find((l) => l.kind === "district")!;
    const first = lots[section.id + 1];
    expect(first.ownText).toBe(true);
    expect(first.parent).toBe(section.id);
  });

  it("fait du texte d'un tableau, d'une liste ou d'un parc une maison, jamais un champ sur un champ", () => {
    const city = layoutCity(
      doc({
        tag: "body",
        children: [
          { tag: "table", text: 1200, children: [{ tag: "img", img: { src: "https://example.com/a.png", w: 300, h: 200 } }] },
          { tag: "ul", text: 80, children: [{ tag: "li", text: 30 }, { tag: "li", text: 40 }] },
          { tag: "aside", text: 60, children: [{ tag: "p", text: 200 }] },
          { tag: "section", text: 90, children: [{ tag: "p", text: 200 }] },
        ],
      }),
    );
    const ownKinds = Object.fromEntries(
      city.lots.filter((lot) => lot.ownText).map((lot) => [city.lots[lot.parent].node.tag, lot.kind]),
    );
    expect(ownKinds).toEqual({ table: "house", ul: "house", aside: "house", section: "tower" });
  });

  it("fait traverser le quartier par la rivière, entre les deux moitiés", () => {
    const river = lots.find((l) => l.kind === "river")!;
    const section = lots[river.parent];
    expect(river.w).toBeCloseTo(section.w, 6);
    const before = lots.find((l) => l.kind === "residence" && l.node.text === 50)!;
    const after = lots.find((l) => l.kind === "tower" && l.node.text === 3000)!;
    expect(before.z + before.d).toBeLessThanOrEqual(river.z + 1e-6);
    expect(after.z).toBeGreaterThanOrEqual(river.z + river.d - 1e-6);
  });

  it("grandit avec le texte, et le monument domine", () => {
    const short = lots.find((l) => l.node.text === 50)!;
    const tall = lots.find((l) => l.node.text === 900)!;
    expect(tall.h).toBeGreaterThan(short.h);
    const highest = Math.max(...lots.filter((l) => l.kind === "tower" || l.kind === "residence").map((l) => l.h));
    const h1 = layoutCity(doc({ tag: "body", children: [{ tag: "h1", text: 4, heading: "Titre" }, ...SAMPLE.root.children!] }))
      .lots.find((l) => l.kind === "monument")!;
    expect(h1.h).toBeGreaterThan(highest);
  });

  it("donne aux panneaux les proportions de l'image", () => {
    const board = lots.find((l) => l.kind === "billboard")!;
    expect(board.panel!.width / board.panel!.height).toBeCloseTo(2, 6);
  });

  it("fait des petites images des panonceaux et des drapeaux, pas des panneaux vides", () => {
    const icons = layoutCity(
      doc({
        tag: "body",
        children: [
          {
            tag: "table",
            children: [
              { tag: "img", img: { src: "https://upload.wikimedia.org/20px-Flag_of_Italy.svg.png", w: 20, h: 13 } },
              { tag: "img", img: { src: "https://upload.wikimedia.org/20px-Steady.svg.png", alt: "en stagnation", w: 9, h: 12 } },
              { tag: "img", img: { src: "https://example.com/x.png", alt: "Drapeau de la France", w: 20, h: 13 } },
              { tag: "img", img: { src: "https://example.com/photo.jpg", w: 400, h: 300 } },
            ],
          },
        ],
      }),
    ).lots.filter((l) => l.kind === "billboard");
    expect(icons.map((l) => l.panel!.emblem)).toEqual(["flag", "sign", "flag", undefined]);
    const [flag, sign, , photo] = icons;
    // Une enseigne tient dans un mètre et garde la forme de l'icône ; le drapeau flotte sur un mât, au toit.
    expect(Math.max(sign.panel!.width, sign.panel!.height)).toBeLessThanOrEqual(1);
    expect(sign.panel!.width / sign.panel!.height).toBeCloseTo(9 / 12, 6);
    expect(sign.panel!.mount).not.toBe("roof");
    expect(flag.panel!.mount).toBe("roof");
    expect(flag.panel!.lift).toBeGreaterThan(2);
    expect(photo.panel!.width).toBeGreaterThan(flag.panel!.width);
  });

  it("accroche les images aux façades du bâtiment le plus proche, sans case au sol", () => {
    const img = (w: number, h: number, n = 0): CityNode => ({ tag: "img", img: { src: `https://e.org/${w}-${n}.jpg`, w, h } });
    const body = (withImages: boolean): CityNode => ({
      tag: "body",
      children: [
        {
          tag: "section",
          children: [
            { tag: "p", text: 900 },
            ...(withImages ? [img(400, 300, 1), img(300, 300, 2), img(640, 360, 3), img(220, 330, 4)] : []),
            { tag: "div", children: [...(withImages ? [img(250, 167, 5)] : []), { tag: "div", text: 120, label: ".legende" }] },
            { tag: "p", text: 400 },
          ],
        },
        // Un bloc d'images seules : une galerie les porte.
        ...(withImages ? [{ tag: "div", label: ".grille", children: [img(300, 300, 6), img(300, 300, 7), img(300, 300, 8)] }] : []),
      ],
    });
    const city = layoutCity(doc(body(true)));
    const bare = layoutCity(doc(body(false)));
    const posters = city.lots.filter((l) => l.kind === "billboard");
    expect(posters).toHaveLength(8);
    const hosts = city.lots.filter((l) => !l.container && !l.hung && ["tower", "residence", "house", "gallery"].includes(l.kind));
    const solids = city.lots.filter((l) => !l.container && !l.hung && l.h > 0);
    for (const poster of posters) {
      expect(poster.hung).toBe(true);
      expect(poster.panel?.mount).not.toBe("roof");
      // Contre une façade d'un porteur, au-dessus du rez-de-chaussée, et dans aucun bâtiment.
      const host = hosts.find((h) => overlaps({ x: poster.x - 0.05, z: poster.z - 0.05, w: poster.w + 0.1, d: poster.d + 0.1 }, h));
      expect(host).toBeDefined();
      expect(poster.y).toBeGreaterThan(host!.y);
      expect(poster.y + poster.h).toBeLessThanOrEqual(host!.y + host!.h);
      for (const solid of solids) expect(overlaps(poster, solid)).toBe(false);
    }
    // L'image de la figure va sur sa légende, celles de la grille sur leur galerie.
    const legend = city.lots.find((l) => l.node.label === ".legende")!;
    const figure = posters.find((p) => p.node.img?.src.endsWith("250-5.jpg"))!;
    expect(overlaps({ x: figure.x - 0.05, z: figure.z - 0.05, w: figure.w + 0.1, d: figure.d + 0.1 }, legend)).toBe(true);
    const gallery = city.lots.find((l) => l.kind === "gallery")!;
    expect(gallery.gallery).toBe(3);
    // Plusieurs façades servent, pas une seule.
    expect(new Set(posters.map((p) => p.panel!.mount)).size).toBeGreaterThan(1);
    // Les numéros suivent toujours l'ordre de la page.
    for (const lot of city.lots) {
      if (lot.parent < 0) continue;
      const parent = city.lots[lot.parent];
      expect(lot.id).toBeGreaterThan(parent.id);
      expect(lot.id).toBeLessThan(parent.subtreeEnd);
    }
    const srcs = posters.map((p) => p.node.img!.src.replace(/.*-(\d)\.jpg/, "$1")).join("");
    expect(srcs).toBe("12345678");
    // Sans la grille, les images ne prennent pas de place : la ville a la même taille.
    const withoutGrid = layoutCity(doc({ ...body(true), children: body(true).children!.slice(0, 1) }));
    expect(withoutGrid.lots[0].w).toBeCloseTo(bare.lots[0].w, 6);
  });

  it("reconnaît un drapeau à son fichier ou à son texte, et à sa forme", () => {
    expect(emblemOf({ tag: "img", img: { src: "https://a.org/Unofficial_flag_of_X.png", w: 22, h: 15 } })).toBe("flag");
    expect(emblemOf({ tag: "img", img: { src: "https://a.org/Blason.png", alt: "Blason", w: 18, h: 20 } })).toBe("sign");
    // Carré : un logo, même s'il s'appelle « flag ».
    expect(emblemOf({ tag: "img", img: { src: "https://a.org/flag-icon.png", w: 16, h: 16 } })).toBe("sign");
    // Une image sans adresse ni taille reste un panonceau vierge ; une grande image perdue garde son panneau.
    expect(emblemOf({ tag: "img" })).toBe("sign");
    expect(emblemOf({ tag: "img", img: { src: "", w: 800, h: 600 } })).toBeUndefined();
  });

  it("cale la grille des rues transversales sur la ville, loin des bords", () => {
    expect(gridLines(-20, 100, 26)).toEqual([0, 26, 52]);
    // à moins de 0,4 pas du bord (10,4 m), pas de ligne : le bout de pâté serait trop court
    expect(gridLines(-10, 100, 26)).toEqual([26, 52, 78]);
    expect(gridLines(5, 10, 26)).toEqual([]);
  });

  it("aligne les petites rues d'un lotissement d'une rangée à l'autre", () => {
    const items: CityNode[] = Array.from({ length: 160 }, (_, i) => ({ tag: "li", text: 40 + ((i * 37) % 260) }));
    const city = layoutCity(doc({ tag: "body", children: [{ tag: "ol", children: items }] }));
    const estate = city.lots.find((lot) => lot.node.tag === "ol")!;
    const cross = city.roads.filter((road) => road.owner === estate.id && road.axis === "z");
    const rowRoads = city.roads.filter((road) => road.owner === estate.id && road.axis === "x");
    expect(rowRoads.length).toBeGreaterThan(4);
    expect(cross.length).toBeGreaterThan(rowRoads.length);
    // chaque petite rue tombe sur une ligne de la grille (tous les 26 m), jamais entre deux
    for (const road of cross) {
      const center = road.x + road.w / 2;
      expect(Math.abs(center / 26 - Math.round(center / 26))).toBeLessThan(1e-6);
    }
    // et chaque ligne traverse plusieurs rangées
    const perLine = new Map<number, number>();
    for (const road of cross) {
      const line = Math.round((road.x + road.w / 2) / 26);
      perLine.set(line, (perLine.get(line) ?? 0) + 1);
    }
    for (const count of perLine.values()) expect(count).toBeGreaterThan(2);
  });

  it("ouvre le port sur le large : un chenal jusqu'au bord, des ponts, rien de bâti dessus", () => {
    const page = (footerFirst: boolean) => {
      const footer: CityNode = { tag: "footer", children: [{ tag: "p", text: 120 }, { tag: "ul", children: [{ tag: "li", text: 20 }, { tag: "li", text: 30 }] }] };
      const main: CityNode = { tag: "main", children: [{ tag: "h1", text: 12, heading: "Titre" }, { tag: "p", text: 900 }, { tag: "div", text: 2000 }] };
      return layoutCity(doc({ tag: "body", children: footerFirst ? [footer, main] : [main, footer] }));
    };
    for (const city of [page(false), page(true)]) {
      expect(city.channels).toHaveLength(1);
      const [channel] = city.channels;
      const { minX, maxX, maxZ } = city.bounds;
      // il touche le bord de la maquette
      const touches = [channel.x - minX, maxX - (channel.x + channel.w), maxZ - (channel.z + channel.d)].some((gap) => Math.abs(gap) < 1e-6);
      expect(touches).toBe(true);
      // rien de bâti dessus, aucune chaussée ni aucun trottoir : seulement des ponts
      for (const lot of city.lots) if (!lot.container) expect(overlaps(lot, channel)).toBe(false);
      for (const road of city.roads) expect(overlaps(road, channel)).toBe(false);
      for (const plate of city.plates) expect(overlaps(plate, channel)).toBe(false);
      expect(city.bridges.some((bridge) => bridge.style === "ring")).toBe(true);
      for (const bridge of city.bridges) expect(inside(bridge, channel)).toBe(true);
    }
  });

  it("bâtit un aéroport hors les murs pour les liens vers d'autres sites, à sa mesure", () => {
    const page = (external: number) =>
      doc({
        tag: "body",
        children: [
          { tag: "section", children: [{ tag: "p", text: 400, links: { internal: 3, external } }, { tag: "p", text: 300 }] },
          { tag: "footer", children: [{ tag: "p", text: 80 }, { tag: "p", text: 60 }] },
        ],
      });
    expect(externalLinks(page(12).root)).toBe(12);
    expect(layoutCity(page(4)).airport).toBeUndefined();
    expect([5, 49, 50, 299, 300].map(runwaysFor)).toEqual([1, 1, 2, 2, 3]);

    const city = layoutCity(page(320));
    const airport = city.airport!;
    expect(airport.runways).toHaveLength(3);
    expect(airport.planes).toBeGreaterThan(0);
    // hors les murs : à l'est du socle de la ville, et compris dans ses limites
    const socle = city.lots[0];
    expect(airport.x).toBeCloseTo(socle.x + socle.w, 6);
    expect(city.bounds.maxX).toBeCloseTo(airport.x + airport.w, 6);
    for (const rect of [...airport.runways, ...airport.taxiways, airport.apron, airport.terminal, airport.tower]) {
      expect(inside(rect, airport)).toBe(true);
    }
    // une avenue le relie au périphérique, à travers la ceinture verte
    const access = city.roads.find((road) => road.x < airport.x && road.x + road.w > airport.x)!;
    expect(access.x + access.w).toBeCloseTo(airport.terminal.x, 6);
    expect(city.roads.some((road) => road.style === "ring" && Math.abs(road.x + road.w - access.x) < 1e-6)).toBe(true);
    for (const plate of city.plates) expect(overlaps(plate, access)).toBe(false);
    // le chenal du port ne passe pas par l'aéroport
    for (const channel of city.channels) expect(overlaps(channel, airport)).toBe(false);

    // Dans la mégalopole : un petit aérodrome dans sa bande, sans vols, dès AERODROME_MIN liens.
    expect(layoutCity(page(AERODROME_MIN - 1), { airport: "aerodrome" }).airport).toBeUndefined();
    expect(layoutCity(page(320), { airport: "none" }).airport).toBeUndefined();
    const small = layoutCity(page(320), { airport: "aerodrome" });
    const field = small.airport!;
    expect(field.kind).toBe("aerodrome");
    expect(field.runways).toHaveLength(1);
    expect(field.flights).toEqual([]);
    expect(field.x).toBeCloseTo(socle.x + socle.w, 6);
    expect(field.w).toBe(AERODROME);
    for (const rect of [...field.runways, ...field.taxiways, field.apron, field.terminal, field.tower]) {
      expect(inside(rect, field)).toBe(true);
    }
    const street = small.roads.find((road) => road.x < field.x && road.x + road.w > field.x)!;
    expect(street.x + street.w).toBeCloseTo(field.terminal.x, 6);
    for (const plate of small.plates) expect(overlaps(plate, street)).toBe(false);
  });

  it("compte la ville", () => {
    expect(layout.stats).toMatchObject({ districts: 1, rivers: 1, billboards: 1, monuments: 1 });
    expect(layout.stats.buildings).toBe(7);
  });

  it("est déterministe", () => {
    expect(layoutCity(SAMPLE)).toEqual(layout);
  });
});
