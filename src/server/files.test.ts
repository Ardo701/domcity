import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// A fake local R2: like the real one, it refuses an upload whose length is not announced (411).
// It holds a single file, city/abc.json.gz.
let server: Server;
let origin: string;
const received: Array<{ length?: string; type?: string; bytes: number }> = [];

let fileStore: typeof import("./files").fileStore;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.method === "GET") {
      const found = req.url === "/domcity-villes/city/abc.json.gz";
      res.statusCode = found ? 200 : 404;
      res.end(found ? Buffer.from([1, 2, 3]) : undefined);
      return;
    }
    let bytes = 0;
    req.on("data", (chunk: Buffer) => (bytes += chunk.length));
    req.on("end", () => {
      received.push({ length: req.headers["content-length"], type: req.headers["content-type"], bytes });
      res.statusCode = req.headers["content-length"] ? 200 : 411;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // Next's fetch: a Request object is rebuilt from its stream (request.body), without its length.
  const nativeFetch = globalThis.fetch;
  const local = (url: string) => origin + new URL(url).pathname;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      return nativeFetch(
        new Request(local(input.url), { method: input.method, headers: input.headers, body: input.body, duplex: "half" } as RequestInit),
      );
    }
    return nativeFetch(local(String(input)), init);
  });

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
  ({ fileStore } = await import("./files"));
});

afterAll(() => {
  vi.unstubAllGlobals();
  server?.close();
});

describe("files on R2", () => {
  it("announces the upload length, even through Next's fetch", async () => {
    const thumbnail = new Uint8Array(150_000).fill(7);
    await fileStore()!.put("city/abc.jpg", thumbnail, "image/jpeg");
    expect(received.at(-1)).toEqual({ length: "150000", type: "image/jpeg", bytes: 150_000 });
  });

  it("reads a file back, or null when it does not exist", async () => {
    expect(await fileStore()!.get("city/abc.json.gz")).toEqual(new Uint8Array([1, 2, 3]));
    expect(await fileStore()!.get("city/missing.json.gz")).toBeNull();
  });
});
