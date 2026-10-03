import "server-only";

/**
 * Where shared cities live.
 *
 * - cloud: Supabase (database) + Cloudflare R2 (files). All variables must be set.
 * - local: in development, an embedded Postgres database (PGlite) and files in .data/.
 *          The same SQL migrations run on it: the real schema is tested, without an account.
 * - off:   in production without configuration, sharing is simply hidden.
 */

export interface CloudConfig {
  mode: "cloud";
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  filesPublicUrl: string;
  cloudflareZoneId?: string;
  cloudflareApiToken?: string;
}

export interface LocalConfig {
  mode: "local";
  dataDir: string;
}

export type StoreConfig = CloudConfig | LocalConfig | { mode: "off" };

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function storeConfig(): StoreConfig {
  const supabaseUrl = env("SUPABASE_URL");
  const supabasePublishableKey = env("SUPABASE_PUBLISHABLE_KEY");
  const supabaseSecretKey = env("SUPABASE_SECRET_KEY");
  const r2AccountId = env("R2_ACCOUNT_ID");
  const r2AccessKeyId = env("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const r2Bucket = env("R2_BUCKET");
  const filesPublicUrl = env("FILES_PUBLIC_URL");

  if (
    supabaseUrl && supabasePublishableKey && supabaseSecretKey &&
    r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket && filesPublicUrl
  ) {
    return {
      mode: "cloud",
      supabaseUrl,
      supabasePublishableKey,
      supabaseSecretKey,
      r2AccountId,
      r2AccessKeyId,
      r2SecretAccessKey,
      r2Bucket,
      filesPublicUrl: filesPublicUrl.replace(/\/+$/, ""),
      cloudflareZoneId: env("CLOUDFLARE_ZONE_ID"),
      cloudflareApiToken: env("CLOUDFLARE_API_TOKEN"),
    };
  }

  // Replaced at build time: in production, the local branch (and PGlite) disappears from the bundle.
  if (process.env.NODE_ENV !== "production") {
    return { mode: "local", dataDir: env("DOMCITY_DATA_DIR") ?? ".data" };
  }
  return { mode: "off" };
}

export function sharingEnabled(): boolean {
  return storeConfig().mode !== "off";
}

/** Public address of the site (share links, social previews). */
export function siteUrl(request?: Request): string {
  const configured = env("SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}

/** Salt for IP fingerprints (upload limit, reports). */
export function secretSalt(): string {
  return env("DOMCITY_SECRET") ?? "domcity-dev-salt";
}
