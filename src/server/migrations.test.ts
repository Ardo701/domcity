import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { describe, expect, it } from "vitest";
import { SUPABASE_DEFAULTS } from "./db";

const dir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const read = (file: string) => readFileSync(join(dir, file), "utf8");
/** The first four were pasted together on October 3, 2026 (the first one loads pg_trgm for the others). */
const APPLIED_TOGETHER = 4;

/**
 * As in the Supabase SQL Editor: each new migration is pasted alone, in a
 * fresh session (no extension loaded yet), by a role that owns the objects but is
 * not a superuser. The other tests run as superuser and would not see, for
 * example, a refused pg_trgm setting ("permission denied to set parameter").
 */
describe("migrations, applied one by one as in Supabase", () => {
  for (const file of migrations.slice(APPLIED_TOGETHER)) {
    it(`${file} applies on its own, without being a superuser`, async () => {
      const data = mkdtempSync(join(tmpdir(), "domcity-migration-"));
      const open = () => PGlite.create(data, { extensions: { pg_trgm, pgcrypto } });
      try {
        let db = await open();
        await db.exec(SUPABASE_DEFAULTS);
        await db.exec(`
          create role migrateur nologin;
          grant anon, authenticated, service_role to migrateur;
          grant usage on schema extensions to migrateur;
          grant create on schema public to migrateur;`);
        for (const before of migrations.slice(0, migrations.indexOf(file))) await db.exec(read(before));
        // The objects belong to the migrating role, like "postgres" on Supabase.
        await db.exec(`
          do $$
          declare r record;
          begin
            for r in select p.oid::regprocedure as f from pg_proc p where p.pronamespace = 'public'::regnamespace loop
              execute format('alter function %s owner to migrateur', r.f);
            end loop;
            for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' loop
              execute format('alter table public.%I owner to migrateur', r.relname);
            end loop;
          end $$;`);
        await db.close();

        db = await open();
        await db.exec("set role migrateur");
        await expect(db.exec(read(file))).resolves.toBeDefined();
        await db.close();
      } finally {
        rmSync(data, { recursive: true, force: true });
      }
    }, 60_000);
  }
});
