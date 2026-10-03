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
/** Les quatre premières ont été collées ensemble le 3 octobre 2026 (la première charge pg_trgm pour les autres). */
const APPLIED_TOGETHER = 4;

/**
 * Comme dans le SQL Editor de Supabase : chaque nouvelle migration est collée seule, dans une
 * session neuve (aucune extension encore chargée), par un rôle qui possède les objets mais n'est
 * pas superutilisateur. Les autres tests tournent en superutilisateur et ne verraient pas, par
 * exemple, un réglage de pg_trgm refusé (« permission denied to set parameter »).
 */
describe("les migrations, appliquées une à une comme dans Supabase", () => {
  for (const file of migrations.slice(APPLIED_TOGETHER)) {
    it(`${file} s'applique seule, sans être superutilisateur`, async () => {
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
        // Les objets appartiennent au rôle qui migre, comme « postgres » sur Supabase.
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
