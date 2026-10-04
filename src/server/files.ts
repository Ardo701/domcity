import "server-only";
import { AwsClient } from "aws4fetch";
import { cityKey, thumbKey } from "@/format/shared";
import { storeConfig, type CloudConfig, type LocalConfig } from "./config";

/**
 * City files: city/<slug>.json.gz (the city) and city/<slug>.jpg (the thumbnail).
 * They never change once written: cached for a year everywhere.
 */
export interface FileStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** The file, or null if it does not exist. */
  get(key: string): Promise<Uint8Array | null>;
  remove(keys: string[]): Promise<void>;
  publicUrl(key: string): string;
}

const IMMUTABLE = "public, max-age=31536000, immutable";

export { cityKey, thumbKey };

function r2Files(config: CloudConfig): FileStore {
  const client = new AwsClient({
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = (key: string) =>
    `https://${config.r2AccountId}.r2.cloudflarestorage.com/${config.r2Bucket}/${key}`;
  const publicUrl = (key: string) => `${config.filesPublicUrl}/${key}`;

  return {
    async put(key, body, contentType) {
      // We sign, then send the body itself. Next's fetch rebuilds a Request object from its
      // stream (request.body): the length is lost, the upload goes out in chunks and R2 refuses it (411).
      const signed = await client.sign(endpoint(key), {
        method: "PUT",
        body: body as BodyInit,
        headers: { "content-type": contentType, "cache-control": IMMUTABLE },
      });
      const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: body as BodyInit });
      if (!response.ok) throw new Error(`R2 ${response.status} writing ${key}`);
    },
    async get(key) {
      const response = await client.fetch(endpoint(key));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`R2 ${response.status} reading ${key}`);
      return new Uint8Array(await response.arrayBuffer());
    },
    async remove(keys) {
      await Promise.all(
        keys.map(async (key) => {
          const response = await client.fetch(endpoint(key), { method: "DELETE" });
          if (!response.ok && response.status !== 404) throw new Error(`R2 ${response.status} deleting ${key}`);
        }),
      );
      // Cloudflare's cache would otherwise keep a copy: it is purged if a token is provided.
      if (config.cloudflareZoneId && config.cloudflareApiToken) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${config.cloudflareZoneId}/purge_cache`, {
          method: "POST",
          headers: { authorization: `Bearer ${config.cloudflareApiToken}`, "content-type": "application/json" },
          body: JSON.stringify({ files: keys.map(publicUrl) }),
        }).catch(() => undefined);
      }
    },
    publicUrl,
  };
}

function localFiles(config: LocalConfig): FileStore {
  const resolve = async (key: string) => {
    const path = await import("node:path");
    const root = path.resolve(config.dataDir, "files");
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) throw new Error("invalid file key");
    return full;
  };
  return {
    async put(key, body) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const full = await resolve(key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, body);
    },
    async get(key) {
      const fs = await import("node:fs/promises");
      try {
        return new Uint8Array(await fs.readFile(await resolve(key)));
      } catch {
        return null;
      }
    },
    async remove(keys) {
      const fs = await import("node:fs/promises");
      await Promise.all(keys.map(async (key) => fs.rm(await resolve(key), { force: true })));
    },
    publicUrl: (key) => `/api/dev-files/${key}`,
  };
}

/** Reads a local file (route /api/dev-files, development only). */
export async function readLocalFile(key: string): Promise<Uint8Array | null> {
  const config = storeConfig();
  if (config.mode !== "local") return null;
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const root = path.resolve(config.dataDir, "files");
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) return null;
  try {
    return new Uint8Array(await fs.readFile(full));
  } catch {
    return null;
  }
}

export function fileStore(): FileStore | null {
  const config = storeConfig();
  if (config.mode === "cloud") return r2Files(config);
  if (config.mode === "local") return localFiles(config);
  return null;
}
