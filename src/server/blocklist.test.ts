import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BLOCK_CATEGORIES, blockedCategory, type BlockCategory } from "@/format/blocklist";
import { SUPABASE_DEFAULTS } from "./db";

// The real starting list, in a fresh database (PGlite + all migrations).
let db: PGlite;
let list: Map<string, BlockCategory>;

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pg_trgm, pgcrypto } });
  await db.exec(SUPABASE_DEFAULTS);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  const rows = await db.query<{ domain: string; category: BlockCategory }>("select * from public.blocklist()");
  list = new Map(rows.rows.map((row) => [row.domain, row.category]));
}, 60_000);

afterAll(() => db?.close());

const blockedInBase = async (host: string) =>
  (await db.query<{ b: boolean }>("select public.is_blocked_domain($1) as b", [host])).rows[0].b;

describe("the list of refused sites in the database", () => {
  it("is filled in all six categories", () => {
    expect(list.size).toBeGreaterThan(1000);
    for (const category of BLOCK_CATEGORIES) {
      expect([...list.values()].filter((c) => c === category).length, category).toBeGreaterThan(10);
    }
  });

  it("files each entry under a note in English, like its category", async () => {
    const notes = (await db.query<{ note: string }>("select distinct note from public.blocked_domains order by note")).rows.map((row) => row.note);
    // The French notes of the starting list and their translation, read from the migration that translates them.
    const translation = readFileSync(join(process.cwd(), "supabase", "migrations", "20261003210000_blocked_domains_notes_en.sql"), "utf8");
    const pairs = [...translation.matchAll(/\('((?:[^']|'')*)', '((?:[^']|'')*)'\)/g)].map((m) => [m[1].replaceAll("''", "'"), m[2]]);
    const english = new Set(pairs.map(([, en]) => en));
    expect(english.size).toBe(pairs.length);
    expect(notes.length).toBe(english.size);
    for (const note of notes) {
      expect(english.has(note), note).toBe(true);
      expect(note, note).toMatch(/^[A-Za-z][A-Za-z ,'-]*$/);
    }
  });

  it("refuses the expected sites, with their category", () => {
    const expected: Array<[string, BlockCategory]> = [
      ["fr.pornhub.com", "adult"],
      ["www.onlyfans.com", "adult"],
      ["rule34.xxx", "adult"],
      ["mabanque.bnpparibas", "bank"],
      ["www.credit-agricole.fr", "bank"],
      ["www.boursobank.com", "bank"],
      ["www.paypal.com", "bank"],
      ["memo.bank", "bank"],
      ["mail.google.com", "private"],
      ["outlook.live.com", "private"],
      ["cfspart.impots.gouv.fr", "private"],
      ["www.doctolib.fr", "private"],
      ["www.betclic.fr", "gambling"],
      ["grabify.link", "danger"],
      ["bestgore.com", "violence"],
    ];
    for (const [host, category] of expected) expect(blockedCategory(host, list), host).toBe(category);
  });

  it("does not refuse sites that merely look similar, nor sites next to a precise entry", () => {
    for (const host of [
      "google.com", "www.google.com", "docs.python.org", "microsoft.com", "apple.com", "essex.ac.uk", "pornic.fr",
      "xxxlutz.de", "fr.wikipedia.org", "github.com", "service-public.fr", "lemonde.fr", "banque.example.org",
    ]) {
      expect(blockedCategory(host, list), host).toBeUndefined();
    }
  });

  it("gives the same answer in the browser and in the database", async () => {
    const hosts = [
      "fr.pornhub.com", "mail.google.com", "google.com", "a.b.xxx", "xxx.fr", "mabanque.bnpparibas",
      "WWW.Chase.com.", "pornic.fr", "drive.google.com", "photos.google.com.evil.example",
    ];
    for (const host of hosts) expect(await blockedInBase(host), host).toBe(blockedCategory(host, list) !== undefined);
  });

  it("stays unreadable for visitors, except through the function that returns it whole", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.blocked_domains limit 1")).rejects.toThrow(/permission denied/);
      const rows = await db.query<{ n: number }>("select count(*)::int as n from public.blocklist()");
      expect(rows.rows[0].n).toBe(list.size);
    } finally {
      await db.exec("reset role");
    }
  });

  it("refuses a malformed entry", async () => {
    for (const domain of ["https://exemple.com", "Exemple.com", "exemple..com", "-exemple.com"]) {
      await expect(
        db.query("insert into public.blocked_domains (domain, category) values ($1, 'adult')", [domain]),
        domain,
      ).rejects.toThrow(/check/);
    }
    await expect(db.query("insert into public.blocked_domains (domain, category) values ('exemple.com', 'autre')")).rejects.toThrow(/check/);
  });
});
