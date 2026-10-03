import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, it } from "vitest";
import { SUPABASE_DEFAULTS } from "./db";

const dir = join(process.cwd(), "supabase");

describe("le script de vérification de la base (supabase/verification.sql)", () => {
  it("dit « ok » à chaque ligne sur une base neuve, deux fois de suite, et ne laisse rien", async () => {
    const db = await PGlite.create({ extensions: { pg_trgm, pgcrypto } });
    await db.exec(SUPABASE_DEFAULTS);
    for (const file of readdirSync(join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(join(dir, "migrations", file), "utf8"));
    }
    const script = readFileSync(join(dir, "verification.sql"), "utf8");
    for (let run = 0; run < 2; run += 1) {
      const results = await db.exec(script);
      const rows = results[results.length - 1].rows as Array<{ etape: string; statut: string; detail: string }>;
      expect(rows.length).toBeGreaterThan(15);
      expect(rows.filter((r) => r.statut !== "ok")).toEqual([]);
    }
    const left = await db.query<{ n: number }>(
      "select (select count(*) from public.sites) + (select count(*) from public.rate_events) + (select count(*) from public.blocked_domains where note = 'verification') as n",
    );
    expect(Number(left.rows[0].n)).toBe(0);
    await db.close();
  });
});
