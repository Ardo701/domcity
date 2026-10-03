import { describe, expect, it } from "vitest";
import { blockedCategory, cityRefusal, domainSuffixes, isBlockedUrl, readBlocklist, withoutBlocked, type Blocklist } from "./blocklist";
import type { CityDoc } from "./types";

// An excerpt of the database list (the real one is checked in src/server/blocklist.test.ts).
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

describe("refused sites", () => {
  it("a domain covers its subdomains, an entry without a dot is an extension", () => {
    expect(domainSuffixes("Fr.PornHub.com.")).toEqual(["fr.pornhub.com", "pornhub.com", "com"]);
    for (const host of ["pornhub.com", "fr.pornhub.com", "WWW.PORNHUB.COM.", "ei.phncdn.com", "rule34.xxx", "a.b.xxx"]) {
      expect(blockedCategory(host, LIST), host).toBe("adult");
    }
    expect(blockedCategory("mabanque.bnpparibas.com", LIST)).toBe("bank");
  });

  it("a precise entry only affects its subdomain, and nothing refuses what merely looks similar", () => {
    expect(blockedCategory("mail.google.com", LIST)).toBe("private");
    for (const host of ["google.com", "www.google.com", "notpornhub.com", "pornhub.com.exemple.org", "pornic.fr", "xxx.fr", "xxxlutz.de"]) {
      expect(blockedCategory(host, LIST), host).toBeUndefined();
    }
  });

  it("reads the host of an image address, and ignores an unreadable address", () => {
    expect(isBlockedUrl("https://ei.phncdn.com/videos/a.jpg", LIST)).toBe(true);
    expect(isBlockedUrl("https://upload.wikimedia.org/a.jpg", LIST)).toBe(false);
    expect(isBlockedUrl("pas une adresse", LIST)).toBe(false);
  });

  it("says why a city is not built, according to the category", () => {
    expect(cityRefusal(DOC, LIST)).toBeNull();
    expect(cityRefusal({ ...DOC, url: "https://www.pornhub.com/x" }, LIST)).toMatch(/sites pour adultes/);
    expect(cityRefusal({ ...DOC, url: "https://mabanque.bnpparibas.com/" }, LIST)).toMatch(/banques/);
    expect(cityRefusal({ ...DOC, url: "https://mail.google.com/mail/u/0" }, LIST)).toMatch(/messageries/);
    expect(cityRefusal({ ...DOC, page: { adult: true } }, new Map())).toMatch(/réservée aux adultes/);
  });

  it("removes images and departures from refused sites from a city, without touching the rest", () => {
    const clean = withoutBlocked(DOC, LIST);
    const [hidden, kept] = clean.root.children![1].children!;
    // The image keeps its place and size, loses its address and its text.
    expect(hidden.img).toEqual({ src: "", w: 320, h: 180, refused: true });
    expect(kept).toBe(DOC.root.children![1].children![1]);
    expect(clean.root.children![0]).toBe(DOC.root.children![0]);
    expect(clean.linksTo).toEqual({ pages: ["0a1b2c3d"], sites: [["wikipedia.org", 2]] });
    // The original is not modified; a city with nothing to remove is returned as is.
    expect(DOC.root.children![1].children![0].img?.src).toBe("https://ei.phncdn.com/a.jpg");
    expect(withoutBlocked(clean, LIST)).toBe(clean);
    expect(withoutBlocked(DOC, new Map())).toBe(DOC);
  });

  it("reads the list sent by the server and ignores whatever does not follow it", () => {
    const list = readBlocklist({ adult: ["pornhub.com"], bank: ["bnpparibas.com", 3], inconnue: ["exemple.org"] });
    expect([...list]).toEqual([
      ["pornhub.com", "adult"],
      ["bnpparibas.com", "bank"],
    ]);
    expect(readBlocklist(null).size).toBe(0);
  });
});
