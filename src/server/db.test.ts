import { beforeAll, describe, expect, it, vi } from "vitest";

// Une fausse API Supabase qui, comme la vraie, ne rend jamais plus de 1 000 lignes par réponse.
const MAX_ROWS = 1000;
const LIST = Array.from({ length: 2345 }, (_, i) => ({ domain: `site-${String(i).padStart(4, "0")}.com`, category: "adult" }));
const calls: Array<[number, number]> = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: (fn: string) => {
      const rows = fn === "blocklist" ? LIST : [{ slug: "abc" }];
      const page = (from: number, to: number) => ({ data: rows.slice(from, Math.min(to + 1, from + MAX_ROWS)), error: null });
      return {
        range: (from: number, to: number) => {
          calls.push([from, to]);
          return Promise.resolve(page(from, to));
        },
        then: (resolve: (value: unknown) => void) => resolve(page(0, rows.length)),
      };
    },
  }),
}));

let rpc: typeof import("./db").rpc;

beforeAll(async () => {
  for (const [key, value] of Object.entries({
    SUPABASE_URL: "https://exemple.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "cle-publique-de-test",
    SUPABASE_SECRET_KEY: "cle-secrete-de-test",
    R2_ACCOUNT_ID: "compte",
    R2_ACCESS_KEY_ID: "acces",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "domcity-villes",
    FILES_PUBLIC_URL: "https://files.exemple.org",
  })) {
    vi.stubEnv(key, value);
  }
  ({ rpc } = await import("./db"));
});

describe("lectures sur Supabase", () => {
  it("lit toutes les lignes, page par page, au-delà du plafond de 1 000 de l'API", async () => {
    const rows = await rpc("public")!.rows<{ domain: string }>("blocklist", {});
    expect(rows).toHaveLength(LIST.length);
    expect(rows.at(-1)).toEqual(LIST.at(-1));
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("une petite réponse ne coûte qu'une requête", async () => {
    calls.length = 0;
    expect(await rpc("public")!.rows("get_capture", { p_slug: "abc" })).toEqual([{ slug: "abc" }]);
    expect(calls).toHaveLength(1);
  });
});
