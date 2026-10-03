import { describe, expect, it } from "vitest";
import { blockedCategory, cityRefusal, domainSuffixes, isBlockedUrl, readBlocklist, withoutBlocked, type Blocklist } from "./blocklist";
import type { CityDoc } from "./types";

// Un extrait de la liste de la base (la vraie est vérifiée dans src/server/blocklist.test.ts).
const LIST: Blocklist = new Map([
  ["pornhub.com", "adult"],
  ["phncdn.com", "adult"],
  ["xxx", "adult"],
  ["bnpparibas.com", "bank"],
  ["mail.google.com", "private"],
]);

const DOC: CityDoc = {
  format: 1,
  source: "bookmarklet",
  url: "https://exemple.org/forum",
  title: "Essai",
  capturedAt: "2026-10-03T00:00:00.000Z",
  linksTo: { pages: ["0a1b2c3d"], sites: [["pornhub.com", 4], ["wikipedia.org", 2], ["fr.pornhub.com", 1]] },
  root: {
    tag: "body",
    children: [
      { tag: "h1", text: 5, heading: "Forum" },
      {
        tag: "section",
        children: [
          { tag: "img", img: { src: "https://ei.phncdn.com/a.jpg", alt: "un texte cru", w: 320, h: 180 } },
          { tag: "img", img: { src: "https://upload.wikimedia.org/b.png", alt: "Une carte", w: 300, h: 200 } },
        ],
      },
    ],
  },
};

describe("sites refusés", () => {
  it("un domaine couvre ses sous-domaines, une entrée sans point est une extension", () => {
    expect(domainSuffixes("Fr.PornHub.com.")).toEqual(["fr.pornhub.com", "pornhub.com", "com"]);
    for (const host of ["pornhub.com", "fr.pornhub.com", "WWW.PORNHUB.COM.", "ei.phncdn.com", "rule34.xxx", "a.b.xxx"]) {
      expect(blockedCategory(host, LIST), host).toBe("adult");
    }
    expect(blockedCategory("mabanque.bnpparibas.com", LIST)).toBe("bank");
  });

  it("une entrée précise ne touche que son sous-domaine, et rien ne refuse ce qui ne fait que ressembler", () => {
    expect(blockedCategory("mail.google.com", LIST)).toBe("private");
    for (const host of ["google.com", "www.google.com", "notpornhub.com", "pornhub.com.exemple.org", "pornic.fr", "xxx.fr", "xxxlutz.de"]) {
      expect(blockedCategory(host, LIST), host).toBeUndefined();
    }
  });

  it("lit l'hôte d'une adresse d'image, et ignore une adresse illisible", () => {
    expect(isBlockedUrl("https://ei.phncdn.com/videos/a.jpg", LIST)).toBe(true);
    expect(isBlockedUrl("https://upload.wikimedia.org/a.jpg", LIST)).toBe(false);
    expect(isBlockedUrl("pas une adresse", LIST)).toBe(false);
  });

  it("dit pourquoi une ville ne se construit pas, selon la catégorie", () => {
    expect(cityRefusal(DOC, LIST)).toBeNull();
    expect(cityRefusal({ ...DOC, url: "https://www.pornhub.com/x" }, LIST)).toMatch(/sites pour adultes/);
    expect(cityRefusal({ ...DOC, url: "https://mabanque.bnpparibas.com/" }, LIST)).toMatch(/banques/);
    expect(cityRefusal({ ...DOC, url: "https://mail.google.com/mail/u/0" }, LIST)).toMatch(/messageries/);
    expect(cityRefusal({ ...DOC, page: { adult: true } }, new Map())).toMatch(/réservée aux adultes/);
  });

  it("retire d'une ville les images et les départs des sites refusés, sans toucher au reste", () => {
    const clean = withoutBlocked(DOC, LIST);
    const [hidden, kept] = clean.root.children![1].children!;
    // L'image garde sa place et sa taille, perd son adresse et son texte.
    expect(hidden.img).toEqual({ src: "", w: 320, h: 180, refused: true });
    expect(kept).toBe(DOC.root.children![1].children![1]);
    expect(clean.root.children![0]).toBe(DOC.root.children![0]);
    expect(clean.linksTo).toEqual({ pages: ["0a1b2c3d"], sites: [["wikipedia.org", 2]] });
    // L'original n'est pas modifié ; une ville sans rien à retirer est rendue telle quelle.
    expect(DOC.root.children![1].children![0].img?.src).toBe("https://ei.phncdn.com/a.jpg");
    expect(withoutBlocked(clean, LIST)).toBe(clean);
    expect(withoutBlocked(DOC, new Map())).toBe(DOC);
  });

  it("lit la liste envoyée par le serveur et ignore ce qui ne la suit pas", () => {
    const list = readBlocklist({ adult: ["pornhub.com"], bank: ["bnpparibas.com", 3], inconnue: ["exemple.org"] });
    expect([...list]).toEqual([
      ["pornhub.com", "adult"],
      ["bnpparibas.com", "bank"],
    ]);
    expect(readBlocklist(null).size).toBe(0);
  });
});
