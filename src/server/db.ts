import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { storeConfig, type CloudConfig, type LocalConfig } from "./config";

/**
 * Appel des fonctions SQL du schéma (supabase/migrations), à l'identique
 * sur Supabase et sur la base locale.
 */
export interface Rpc {
  rows<T>(fn: string, args: Record<string, unknown>): Promise<T[]>;
  scalar<T>(fn: string, args: Record<string, unknown>): Promise<T>;
}

export type Access = "public" | "admin";

/** Valeur binaire (empreinte) : texte « \\x… » pour Supabase, octets pour la base locale. */
export class Bytea {
  constructor(readonly hex: string) {}
}

function supabaseArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) out[key] = value instanceof Bytea ? value.hex : value;
  return out;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

const clients = new Map<string, SupabaseClient>();

function supabase(config: CloudConfig, access: Access): SupabaseClient {
  const key = access === "admin" ? config.supabaseSecretKey : config.supabasePublishableKey;
  let client = clients.get(key);
  if (!client) {
    client = createClient(config.supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clients.set(key, client);
  }
  return client;
}

function supabaseRpc(config: CloudConfig, access: Access): Rpc {
  const call = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase(config, access).rpc(fn, supabaseArgs(args));
    if (error) throw new Error(`${fn} : ${error.message}`);
    return data;
  };
  return {
    rows: async <T>(fn: string, args: Record<string, unknown>) => ((await call(fn, args)) ?? []) as T[],
    scalar: async <T>(fn: string, args: Record<string, unknown>) => (await call(fn, args)) as T,
  };
}

// ---------------------------------------------------------------------------
// Base locale (développement et tests)
// ---------------------------------------------------------------------------

type PGliteLike = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
};

/** Ce que Supabase fournit d'office : rôles, schéma des extensions, droits par défaut. */
export const SUPABASE_DEFAULTS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema if not exists extensions;
  grant usage on schema public, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const globalForPg = globalThis as unknown as { __domcityPg?: Map<string, Promise<PGliteLike>> };

async function openLocal(config: LocalConfig): Promise<PGliteLike> {
  // Remplacé à la compilation : en production, tout ce qui suit est retiré du paquet (et PGlite avec).
  if (process.env.NODE_ENV === "production") throw new Error("base locale indisponible en production");
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
  const path = await import("node:path");
  const fs = await import("node:fs/promises");

  const dir = path.resolve(config.dataDir, "pglite");
  await fs.mkdir(dir, { recursive: true });
  const db = (await PGlite.create(dir, { extensions: { pg_trgm, pgcrypto } })) as unknown as PGliteLike;

  const roles = await db.query<{ n: number }>("select count(*)::int as n from pg_roles where rolname = 'anon'");
  if (roles.rows[0].n === 0) await db.exec(SUPABASE_DEFAULTS);

  await db.exec("create table if not exists public._local_migrations (name text primary key)");
  const applied = new Set(
    (await db.query<{ name: string }>("select name from public._local_migrations")).rows.map((r) => r.name),
  );
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    await db.exec(await fs.readFile(path.join(migrationsDir, file), "utf8"));
    await db.query("insert into public._local_migrations (name) values ($1)", [file]);
  }
  return db;
}

function localDb(config: LocalConfig): Promise<PGliteLike> {
  globalForPg.__domcityPg ??= new Map();
  const key = config.dataDir;
  let db = globalForPg.__domcityPg.get(key);
  if (!db) {
    db = openLocal(config);
    globalForPg.__domcityPg.set(key, db);
  }
  return db;
}

function toParam(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Bytea) return new Uint8Array(Buffer.from(value.hex.replace(/^\\x/, ""), "hex"));
  // Un tableau devient un tableau Postgres (text[]) ; un objet, du JSON.
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) out[key] = value.toISOString();
    else if (typeof value === "bigint") out[key] = Number(value);
    else out[key] = value;
  }
  return out as T;
}

function localRpc(config: LocalConfig): Rpc {
  const prepare = (fn: string, args: Record<string, unknown>) => {
    if (!/^[a-z_]+$/.test(fn)) throw new Error(`fonction invalide : ${fn}`);
    const keys = Object.keys(args);
    const params = keys.map((key) => toParam(args[key]));
    const named = keys.map((key, i) => `${key} => $${i + 1}`).join(", ");
    return { named, params };
  };
  return {
    async rows<T>(fn: string, args: Record<string, unknown>) {
      const db = await localDb(config);
      const { named, params } = prepare(fn, args);
      const result = await db.query<Record<string, unknown>>(`select * from public.${fn}(${named})`, params);
      return result.rows.map((row) => fromRow<T>(row));
    },
    async scalar<T>(fn: string, args: Record<string, unknown>) {
      const db = await localDb(config);
      const { named, params } = prepare(fn, args);
      const result = await db.query<Record<string, unknown>>(`select public.${fn}(${named}) as result`, params);
      return fromRow<{ result: T }>(result.rows[0]).result;
    },
  };
}

// ---------------------------------------------------------------------------

/** « public » lit comme un visiteur (droits anon) ; « admin » écrit (clé secrète, côté serveur seulement). */
export function rpc(access: Access): Rpc | null {
  const config = storeConfig();
  if (config.mode === "cloud") return supabaseRpc(config, access);
  if (config.mode === "local") return localRpc(config);
  return null;
}
