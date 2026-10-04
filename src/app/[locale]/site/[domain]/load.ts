import { cache } from "react";
import { siteHost } from "@/format/url";
import { sharingEnabled } from "@/server/config";
import { getSite } from "@/server/store";

/** The domain of the address, as the database stores it (without "www.", lowercase). */
export const readDomain = (raw: string) => {
  try {
    return siteHost(decodeURIComponent(raw));
  } catch {
    return siteHost(raw);
  }
};

/** A site's summary, or null if it has no city (or if sharing is off). */
export const loadSite = cache(async (domain: string) => {
  if (!sharingEnabled() || !/^[a-z0-9.-]{3,253}$/.test(domain)) return null;
  return getSite(domain);
});
