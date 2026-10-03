import "server-only";
import { AwsClient } from "aws4fetch";
import { cityKey, thumbKey } from "@/format/shared";
import { storeConfig, type CloudConfig, type LocalConfig } from "./config";

/**
 * Fichiers des villes : city/<slug>.json.gz (la ville) et city/<slug>.jpg (la miniature).
 * Ils ne changent jamais une fois écrits : cache d'un an partout.
 */
export interface FileStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
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
      // On signe, puis on envoie le corps lui-même. Le fetch de Next refait un objet Request à partir de son
      // flux (request.body) : la longueur se perd, l'envoi part en morceaux et R2 le refuse (411).
      const signed = await client.sign(endpoint(key), {
        method: "PUT",
        body: body as BodyInit,
        headers: { "content-type": contentType, "cache-control": IMMUTABLE },
      });
      const response = await fetch(signed.url, { method: "PUT", headers: signed.headers, body: body as BodyInit });
      if (!response.ok) throw new Error(`R2 ${response.status} en écrivant ${key}`);
    },
    async remove(keys) {
      await Promise.all(
        keys.map(async (key) => {
          const response = await client.fetch(endpoint(key), { method: "DELETE" });
          if (!response.ok && response.status !== 404) throw new Error(`R2 ${response.status} en supprimant ${key}`);
        }),
      );
      // Le cache de Cloudflare garderait sinon une copie : on la purge si un jeton est fourni.
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
    if (!full.startsWith(root + path.sep)) throw new Error("clé de fichier invalide");
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
    async remove(keys) {
      const fs = await import("node:fs/promises");
      await Promise.all(keys.map(async (key) => fs.rm(await resolve(key), { force: true })));
    },
    publicUrl: (key) => `/api/dev-files/${key}`,
  };
}

/** Lecture d'un fichier local (route /api/dev-files, développement uniquement). */
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
