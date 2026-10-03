import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CityDoc } from "@/format/types";

// Base locale (PGlite + vraies migrations) dans un dossier jetable.
const dataDir = mkdtempSync(join(tmpdir(), "domcity-test-"));
process.env.DOMCITY_DATA_DIR = dataDir;
for (const key of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "R2_BUCKET"]) delete process.env[key];

const { readThumbnail, readUploadedCity, shareCity, deleteSharedCity, statsOf, ShareError } = await import("./share");
const { hashToken } = await import("./security");
const store = await import("./store");
const { readLocalFile, cityKey } = await import("./files");

const DOC: CityDoc = {
  format: 1,
  source: "bookmarklet",
  url: "https://www.exemple.org/livres/?ref=pub#haut",
  title: "Les livres",
  capturedAt: "2026-10-02T12:00:00.000Z",
  root: {
    tag: "body",
    children: [
      { tag: "h1", text: 10, heading: "Les livres" },
      { tag: "section", children: [{ tag: "p", text: 400 }, { tag: "img", img: { src: "https://exemple.org/a.jpg", w: 300, h: 200 } }] },
    ],
  },
};

/** Un en-tête de JPEG (JFIF puis SOF0) qui annonce cette taille. */
const jpeg = (width: number, height: number) =>
  new Uint8Array([
    ...[0xff, 0xd8],
    ...[0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    ...[0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
    ...[0xff, 0xd9],
  ]);
const JPEG = jpeg(1200, 630);

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

describe("fichiers envoyés", () => {
  it("accepte une ville valide compressée", () => {
    const doc = readUploadedCity(new Uint8Array(gzipSync(JSON.stringify(DOC))));
    expect(doc.title).toBe("Les livres");
  });

  it("refuse une bombe gzip", () => {
    const bomb = new Uint8Array(gzipSync(Buffer.alloc(64 * 1024 * 1024, 32)));
    expect(() => readUploadedCity(bomb)).toThrow(ShareError);
  });

  it("refuse une ville mal formée", () => {
    const bad = { ...DOC, root: { tag: "BODY<script>" } };
    expect(() => readUploadedCity(new Uint8Array(gzipSync(JSON.stringify(bad))))).toThrow(/Ville invalide/);
  });

  it("refuse de publier une page locale ou d'intranet", async () => {
    for (const url of ["http://localhost:3000/admin", "http://192.168.1.20/", "https://nas.local/photos"]) {
      await expect(shareCity({ ...DOC, url }, null)).rejects.toThrow(/locales/);
    }
  });

  it("refuse de publier un site refusé, ou une page qui se déclare réservée aux adultes", async () => {
    for (const url of ["https://fr.pornhub.com/", "https://www.exemple.xxx/page"]) {
      await expect(shareCity({ ...DOC, url }, null)).rejects.toMatchObject({ status: 403 });
    }
    await expect(shareCity({ ...DOC, page: { adult: true } }, null)).rejects.toThrow(/réservée aux adultes/);
  });

  it("n'accepte que des miniatures JPEG", () => {
    expect(readThumbnail(JPEG)).toBe(JPEG);
    expect(() => readThumbnail(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow(/JPEG/);
    // Une autre image que celle du moteur (une capture d'écran, une photo) n'a pas son format.
    expect(() => readThumbnail(jpeg(800, 600))).toThrow(/1200 × 630/);
    expect(() => readThumbnail(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toThrow(/1200 × 630/);
  });
});

describe("partage de bout en bout (base locale)", () => {
  let slug = "";
  let token = "";

  beforeAll(async () => {
    ({ slug, token } = await shareCity(DOC, JPEG));
  }, 60_000);

  it("publie la ville avec une adresse nettoyée", async () => {
    const city = await store.getCapture(slug);
    expect(city).toMatchObject({ domain: "exemple.org", path: "/livres", title: "Les livres", source: "bookmarklet" });
    expect(city?.stats.thumbnail).toBe(true);
    expect(city?.stats.monuments).toBe(1);
  });

  it("stocke le fichier compressé, relisible", async () => {
    const file = await readLocalFile(cityKey(slug));
    expect(file).not.toBeNull();
    const doc = readUploadedCity(file!);
    expect(doc.url).toBe("https://exemple.org/livres");
  });

  it("la retrouve par la recherche, même avec une faute", async () => {
    const hits = await store.searchSites("exmple");
    expect(hits.some((h) => h.domain === "exemple.org")).toBe(true);
  });

  it("refuse un mauvais jeton, accepte le bon, puis efface tout", async () => {
    expect(await deleteSharedCity(slug, "mauvais-jeton-de-test-123")).toBe(false);
    expect(await deleteSharedCity(slug, token)).toBe(true);
    expect(await store.getCapture(slug)).toBeNull();
    expect(await readLocalFile(cityKey(slug))).toBeNull();
  });
});

describe("les sites au premier plan (base locale)", () => {
  const page = (url: string, title: string): CityDoc => ({ ...DOC, url, title });
  let reinette = "";
  let accueil = "";

  beforeAll(async () => {
    // Une page du site d'abord, sans miniature ; l'accueil ensuite.
    ({ slug: reinette } = await shareCity(page("https://vergers.fr/pommes/reinette", "La reinette"), null));
  }, 60_000);

  it("un site existe dès qu'une de ses pages est partagée, même sans son accueil", async () => {
    expect(await store.getSite("vergers.fr")).toMatchObject({ domain: "vergers.fr", pagesCount: 1 });
    const pages = await store.sitePageList("vergers.fr", 60, 0);
    expect(pages).toMatchObject([{ path: "/pommes/reinette", title: "La reinette", slug: reinette, capturesCount: 1 }]);
  });

  it("la galerie montre le site une fois, avec la miniature de son accueil", async () => {
    ({ slug: accueil } = await shareCity(page("https://vergers.fr/", "Les vergers"), JPEG));
    await shareCity(page("https://vergers.fr/pommes/reinette", "La reinette"), null);
    const sites = (await store.recentSites(60)).filter((site) => site.domain === "vergers.fr");
    expect(sites).toEqual([
      expect.objectContaining({ pagesCount: 2, capturesCount: 3, cover: { slug: accueil, thumbnail: true } }),
    ]);
  });

  it("liste les pages d'un site dans l'ordre des adresses, par morceaux", async () => {
    const all = await store.sitePageList("vergers.fr", 60, 0);
    expect(all.map((p) => p.path)).toEqual(["/", "/pommes/reinette"]);
    expect(all[1].capturesCount).toBe(2);
    expect(all[1].slug).not.toBe(reinette); // la dernière version
    expect((await store.sitePageList("vergers.fr", 1, 1)).map((p) => p.path)).toEqual(["/pommes/reinette"]);
  });

  it("la recherche rend un résultat par site, les pages qui répondent rangées dessous", async () => {
    const byTitle = await store.searchSites("reinete");
    const hit = byTitle.find((h) => h.domain === "vergers.fr");
    expect(hit).toMatchObject({ pagesCount: 2, pagesMatched: 1, pages: [{ path: "/pommes/reinette", title: "La reinette" }] });
    const [latest] = await store.sitePageList("vergers.fr", 1, 1);
    expect(hit?.pages[0].slug).toBe(latest.slug);

    const byDomain = await store.searchSites("vergrs");
    expect(byDomain.filter((h) => h.domain === "vergers.fr")).toHaveLength(1);
  });
});

describe("un site refusé après avoir été publié (base locale)", () => {
  it("n'apparaît plus nulle part : ville, site, galerie, recherche, départs", async () => {
    // Écrit directement dans la base, comme une ville publiée avant que son site entre dans la liste.
    const slug = await store.createCapture({
      domain: "pornhub.com",
      path: "/",
      source: "bookmarklet",
      title: "Essai",
      sizeBytes: 10,
      stats: statsOf(DOC),
      deleteTokenHash: hashToken("jeton-de-test-refuse"),
    });
    expect(await store.publishCapture(slug)).toBe(true);

    expect(await store.getCapture(slug)).toBeNull();
    expect(await store.getSite("pornhub.com")).toBeNull();
    expect(await store.sitePageList("pornhub.com", 60, 0)).toEqual([]);
    expect(await store.siteCity("pornhub.com")).toEqual([]);
    expect((await store.recentSites(60)).map((site) => site.domain)).not.toContain("pornhub.com");
    expect((await store.searchSites("pornhub")).map((hit) => hit.domain)).not.toContain("pornhub.com");
    expect(await store.knownSites(["pornhub.com"])).toEqual([]);
  });
});
