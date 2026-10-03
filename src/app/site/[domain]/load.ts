import { cache } from "react";
import { siteHost } from "@/format/url";
import { sharingEnabled } from "@/server/config";
import { getSite } from "@/server/store";

/** Le domaine de l'adresse, tel que la base le range (sans « www. », en minuscules). */
export const readDomain = (raw: string) => {
  try {
    return siteHost(decodeURIComponent(raw));
  } catch {
    return siteHost(raw);
  }
};

/** Le résumé d'un site, ou null s'il n'a aucune ville (ou si le partage est éteint). */
export const loadSite = cache(async (domain: string) => {
  if (!sharingEnabled() || !/^[a-z0-9.-]{3,253}$/.test(domain)) return null;
  return getSite(domain);
});
