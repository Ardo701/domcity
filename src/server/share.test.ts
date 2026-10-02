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

const { readThumbnail, readUploadedCity, shareCity, deleteSharedCity, ShareError } = await import("./share");
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

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);

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

  it("n'accepte que des miniatures JPEG", () => {
    expect(readThumbnail(JPEG)).toBe(JPEG);
    expect(() => readThumbnail(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow(/JPEG/);
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
    const hits = await store.searchCities("exmple");
    expect(hits.some((h) => h.domain === "exemple.org")).toBe(true);
  });

  it("refuse un mauvais jeton, accepte le bon, puis efface tout", async () => {
    expect(await deleteSharedCity(slug, "mauvais-jeton-de-test-123")).toBe(false);
    expect(await deleteSharedCity(slug, token)).toBe(true);
    expect(await store.getCapture(slug)).toBeNull();
    expect(await readLocalFile(cityKey(slug))).toBeNull();
  });
});
