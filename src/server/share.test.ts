import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CityDoc } from "@/format/types";

// Local database (PGlite + real migrations) in a throwaway folder.
const dataDir = mkdtempSync(join(tmpdir(), "domcity-test-"));
process.env.DOMCITY_DATA_DIR = dataDir;
for (const key of ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "R2_BUCKET"]) delete process.env[key];

const { readThumbnail, readUploadedCity, shareCity, deleteSharedCity, statsOf, ShareError, RecentVersion, recentPageVersions } =
  await import("./share");
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

/** A JPEG header (JFIF then SOF0) that announces this size. */
const jpeg = (width: number, height: number) =>
  new Uint8Array([
    ...[0xff, 0xd8],
    ...[0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    ...[0xff, 0xc0, 0, 17, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
    ...[0xff, 0xd9],
  ]);
const JPEG = jpeg(1200, 630);

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

describe("uploaded files", () => {
  it("accepts a valid compressed city", () => {
    const doc = readUploadedCity(new Uint8Array(gzipSync(JSON.stringify(DOC))));
    expect(doc.title).toBe("Les livres");
  });

  it("refuses a gzip bomb", () => {
    const bomb = new Uint8Array(gzipSync(Buffer.alloc(64 * 1024 * 1024, 32)));
    expect(() => readUploadedCity(bomb)).toThrow(ShareError);
  });

  it("refuses a malformed city", () => {
    const bad = { ...DOC, root: { tag: "BODY<script>" } };
    expect(() => readUploadedCity(new Uint8Array(gzipSync(JSON.stringify(bad))))).toThrow(expect.objectContaining({ code: "cityInvalid" }));
  });

  it("refuses to publish a local or intranet page", async () => {
    for (const url of ["http://localhost:3000/admin", "http://192.168.1.20/", "https://nas.local/photos"]) {
      await expect(shareCity({ ...DOC, url }, null)).rejects.toMatchObject({ code: "localPage" });
    }
  });

  it("refuses to publish a refused site (the database list), or a page that declares itself adults only", async () => {
    const cases: Array<[string, string]> = [
      ["https://fr.pornhub.com/", "adult"],
      ["https://www.exemple.xxx/page", "adult"],
      ["https://mabanque.bnpparibas/fr/connexion", "bank"],
      ["https://mail.google.com/mail/u/0/", "private"],
    ];
    for (const [url, refusal] of cases) {
      await expect(shareCity({ ...DOC, url }, null)).rejects.toMatchObject({ status: 403, code: "refused", detail: refusal });
    }
    await expect(shareCity({ ...DOC, page: { adult: true } }, null)).rejects.toMatchObject({ code: "refused", detail: "adult-page" });
  });

  it("only accepts JPEG thumbnails", () => {
    expect(readThumbnail(JPEG)).toBe(JPEG);
    expect(() => readThumbnail(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow(expect.objectContaining({ code: "thumbNotJpeg" }));
    // An image other than the engine's (a screenshot, a photo) does not have its format.
    expect(() => readThumbnail(jpeg(800, 600))).toThrow(expect.objectContaining({ code: "thumbSize", detail: "1200 × 630" }));
    expect(() => readThumbnail(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toThrow(expect.objectContaining({ code: "thumbSize" }));
  });
});

describe("sharing from start to finish (local database)", () => {
  let slug = "";
  let token = "";
  let pageUrl = "";

  beforeAll(async () => {
    ({ slug, token, pageUrl } = await shareCity(DOC, JPEG));
  }, 60_000);

  it("publishes the city with a cleaned address", async () => {
    const city = await store.getCapture(slug);
    expect(city).toMatchObject({ domain: "exemple.org", path: "/livres", title: "Les livres", source: "bookmarklet" });
    // The address the browser keeps in "Your account": the same, cleaned.
    expect(pageUrl).toBe("https://exemple.org/livres");
    expect(city?.stats.thumbnail).toBe(true);
    expect(city?.stats.monuments).toBe(1);
  });

  it("stores the compressed file, readable again", async () => {
    const file = await readLocalFile(cityKey(slug));
    expect(file).not.toBeNull();
    const doc = readUploadedCity(file!);
    expect(doc.url).toBe("https://exemple.org/livres");
  });

  it("finds it through search, even with a typo", async () => {
    const hits = await store.searchSites("exmple");
    expect(hits.some((h) => h.domain === "exemple.org")).toBe(true);
  });

  it("refuses a wrong token, accepts the right one, then erases everything", async () => {
    expect(await deleteSharedCity(slug, "mauvais-jeton-de-test-123")).toBe(false);
    expect(await deleteSharedCity(slug, token)).toBe(true);
    expect(await store.getCapture(slug)).toBeNull();
    expect(await readLocalFile(cityKey(slug))).toBeNull();
  });
});

describe("sites first (local database)", () => {
  const page = (url: string, title: string): CityDoc => ({ ...DOC, url, title });
  let reinette = "";
  let accueil = "";

  beforeAll(async () => {
    // A page of the site first, without a thumbnail; the home page next.
    ({ slug: reinette } = await shareCity(page("https://vergers.fr/pommes/reinette", "La reinette"), null));
  }, 60_000);

  it("a site exists as soon as one of its pages is shared, even without its home page", async () => {
    expect(await store.getSite("vergers.fr")).toMatchObject({ domain: "vergers.fr", pagesCount: 1 });
    const pages = await store.sitePageList("vergers.fr", 60, 0);
    expect(pages).toMatchObject([{ path: "/pommes/reinette", title: "La reinette", slug: reinette, capturesCount: 1 }]);
  });

  it("the gallery shows the site once, with the thumbnail of its home page", async () => {
    ({ slug: accueil } = await shareCity(page("https://vergers.fr/", "Les vergers"), JPEG));
    // A second version of the page, confirmed (the first is less than 30 days old).
    await shareCity(page("https://vergers.fr/pommes/reinette", "La reinette"), null, { newVersionOf: reinette });
    const sites = (await store.recentSites(60)).filter((site) => site.domain === "vergers.fr");
    expect(sites).toEqual([
      expect.objectContaining({ pagesCount: 2, capturesCount: 3, cover: { slug: accueil, thumbnail: true } }),
    ]);
  });

  it("lists a site's pages in address order, in chunks", async () => {
    const all = await store.sitePageList("vergers.fr", 60, 0);
    expect(all.map((p) => p.path)).toEqual(["/", "/pommes/reinette"]);
    expect(all[1].capturesCount).toBe(2);
    expect(all[1].slug).not.toBe(reinette); // the latest version
    expect((await store.sitePageList("vergers.fr", 1, 1)).map((p) => p.path)).toEqual(["/pommes/reinette"]);
  });

  it("search returns one result per site, with the matching pages listed underneath", async () => {
    const byTitle = await store.searchSites("reinete");
    const hit = byTitle.find((h) => h.domain === "vergers.fr");
    expect(hit).toMatchObject({ pagesCount: 2, pagesMatched: 1, pages: [{ path: "/pommes/reinette", title: "La reinette" }] });
    const [latest] = await store.sitePageList("vergers.fr", 1, 1);
    expect(hit?.pages[0].slug).toBe(latest.slug);

    const byDomain = await store.searchSites("vergrs");
    expect(byDomain.filter((h) => h.domain === "vergers.fr")).toHaveLength(1);
  });
});

/** The local database opened by the server: maintained here as it would be in Supabase. */
const sql = async (text: string, params: unknown[] = []) => {
  const pools = (globalThis as unknown as { __domcityPg?: Map<string, Promise<{ query(sql: string, params?: unknown[]): Promise<unknown> }>> })
    .__domcityPg;
  await (await pools!.get(dataDir)!).query(text, params);
};

describe("a page already published (local database)", () => {
  const MILL: CityDoc = { ...DOC, url: "https://moulins.fr/farines", title: "Les farines" };
  const pageVersions = async () => (await store.pageVersions("moulins.fr", "/farines")).map((version) => version.slug);
  /** Ages the versions of the page, as if they had been published this many days ago (and its page with them). */
  const age = async (days: number) => {
    const pages = "select p.id from public.pages p join public.sites s on s.id = p.site_id where s.domain = 'moulins.fr'";
    await sql(`update public.captures set captured_at = now() - make_interval(days => $1) where page_id in (${pages})`, [days]);
    await sql(
      `update public.pages p set last_capture_at = (select max(c.captured_at) from public.captures c
         where c.page_id = p.id and c.status = 'visible') where p.id in (${pages})`,
    );
  };
  let first = "";

  beforeAll(async () => {
    ({ slug: first } = await shareCity(MILL, null));
  }, 60_000);

  it("asks to confirm a new version less than 30 days after the latest, whatever it holds", async () => {
    const error = await shareCity(MILL, JPEG).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RecentVersion);
    expect(error).toMatchObject({ existing: { slug: first } });
    expect(Date.now() - Date.parse((error as InstanceType<typeof RecentVersion>).existing.capturedAt)).toBeLessThan(60_000);
    expect(await pageVersions()).toEqual([first]);
  });

  it("publishes once confirmed over the latest version, and asks again if another one came in between", async () => {
    await expect(shareCity(MILL, null, { newVersionOf: "AbCdEfGh" })).rejects.toBeInstanceOf(RecentVersion);
    const { slug } = await shareCity(MILL, null, { newVersionOf: first });
    expect(await pageVersions()).toEqual([slug, first]);
    await expect(shareCity(MILL, null, { newVersionOf: first })).rejects.toMatchObject({ existing: { slug } });
  });

  it("publishes without asking once the latest version is 30 days old", async () => {
    await age(29);
    await expect(shareCity(MILL, null)).rejects.toBeInstanceOf(RecentVersion);
    await age(30);
    const { slug } = await shareCity(MILL, null);
    expect((await pageVersions())[0]).toBe(slug);
  });

  it("a hidden version (reports) does not count", async () => {
    // The latest version is a minute old, the others 30 days: hidden, it no longer asks for a confirmation.
    const [latest] = await pageVersions();
    await sql("update public.captures set status = 'hidden' where slug = $1", [latest]);
    const { slug } = await shareCity(MILL, null);
    expect((await pageVersions())[0]).toBe(slug);
  });

  it("lists the site's pages published less than 30 days ago, for the share panel to warn before publishing", async () => {
    const [latest] = await pageVersions();
    const [page] = await recentPageVersions("moulins.fr");
    expect(page).toMatchObject({ path: "/farines", slug: latest, thumbnail: `/api/dev-files/city/${latest}.jpg` });
    expect(Date.now() - Date.parse(page.capturedAt)).toBeLessThan(60_000);
    await age(30);
    expect(await recentPageVersions("moulins.fr")).toEqual([]);
    expect(await recentPageVersions("inconnu.fr")).toEqual([]);
  });
});

describe("refused sites (local database)", () => {
  it("removes images and departures from refused sites from the stored city", async () => {
    const doc: CityDoc = {
      ...DOC,
      url: "https://forum-essai.fr/fil",
      linksTo: { sites: [["pornhub.com", 3], ["wikipedia.org", 1]] },
      root: {
        tag: "body",
        children: [
          { tag: "img", img: { src: "https://ei.phncdn.com/v/a.jpg", alt: "texte cru", w: 320, h: 180 } },
          { tag: "img", img: { src: "https://forum-essai.fr/logo.png", w: 300, h: 100 } },
        ],
      },
    };
    const { slug, token } = await shareCity(doc, null);
    const stored = readUploadedCity((await readLocalFile(cityKey(slug)))!);
    expect(stored.root.children!.map((node) => node.img)).toEqual([
      { src: "", w: 320, h: 180, refused: true },
      { src: "https://forum-essai.fr/logo.png", w: 300, h: 100 },
    ]);
    expect(stored.linksTo?.sites).toEqual([["wikipedia.org", 1]]);
    await deleteSharedCity(slug, token);
  });

  it("the database itself refuses to create the city of a site on the list", async () => {
    await expect(
      store.createCapture({
        domain: "fr.pornhub.com",
        path: "/",
        source: "bookmarklet",
        title: "Essai",
        sizeBytes: 10,
        stats: statsOf(DOC),
        deleteTokenHash: hashToken("jeton-de-test-refuse"),
      }),
    ).rejects.toThrow(/blocked_domain/);
  });

  it("a site added to the list after publishing no longer appears anywhere, then comes back if it leaves the list", async () => {
    const { slug } = await shareCity({ ...DOC, url: "https://plus-tard.fr/", title: "Plus tard" }, null);
    expect(await store.getCapture(slug)).not.toBeNull();

    await sql("insert into public.blocked_domains (domain, category, note) values ('plus-tard.fr', 'danger', 'test')");
    expect(await store.getCapture(slug)).toBeNull();
    expect(await store.getSite("plus-tard.fr")).toBeNull();
    expect(await store.sitePageList("plus-tard.fr", 60, 0)).toEqual([]);
    expect(await store.sitePages("plus-tard.fr")).toEqual([]);
    expect(await store.siteCity("plus-tard.fr")).toEqual([]);
    expect(await store.pageVersions("plus-tard.fr", "/")).toEqual([]);
    expect((await store.recentSites(60)).map((site) => site.domain)).not.toContain("plus-tard.fr");
    expect((await store.searchSites("plus-tard")).map((hit) => hit.domain)).not.toContain("plus-tard.fr");
    expect(await store.knownSites(["plus-tard.fr"])).toEqual([]);
    expect((await store.blocklist()).get("plus-tard.fr")).toBe("danger");
    await expect(shareCity({ ...DOC, url: "https://plus-tard.fr/autre" }, null)).rejects.toMatchObject({ status: 403 });

    await sql("delete from public.blocked_domains where domain = 'plus-tard.fr'");
    expect(await store.getCapture(slug)).not.toBeNull();
    expect(await store.knownSites(["plus-tard.fr"])).toEqual([{ domain: "plus-tard.fr", pages: 1 }]);
  });
});
