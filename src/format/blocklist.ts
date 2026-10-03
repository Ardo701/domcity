import type { CityDoc, CityNode } from "./types";

/**
 * Refused sites: DOMCity builds no city for them, does not publish them, and never loads
 * their images (even when hung in another site's city). Adult sites, banks,
 * personal data...: six categories, all treated the same way.
 *
 * The list lives in the database (table `blocked_domains`, see docs/refused-sites.md), not in the code:
 * it grows in Supabase without redeploying. The database itself refuses to create the city of a site
 * on the list, and its read functions ignore it. The browser downloads the whole list
 * (`/api/blocklist`) and checks on its own: nothing about the visited page leaves before publishing.
 *
 * A domain covers its subdomains ("pornhub.com" covers "fr.pornhub.com"); an entry without
 * a dot is an extension ("xxx"). Same rule as `domain_suffixes` in the database.
 */

export const BLOCK_CATEGORIES = ["adult", "violence", "bank", "private", "gambling", "danger"] as const;
export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

/** The name of each category, to show them to the visitor (Créer une ville page). */
export const BLOCK_LABELS: Record<BlockCategory, string> = {
  adult: "Sites pour adultes",
  violence: "Violence et images choquantes",
  bank: "Banques et services financiers",
  private: "Données personnelles : messageries, comptes, impôts, santé",
  gambling: "Jeux d'argent",
  danger: "Sites dangereux : pistage, logiciels espions, téléchargements piratés",
};

/** What DOMCity says about a refused site, according to its category. */
const REASONS: Record<BlockCategory, string> = {
  adult: "Ce site est sur la liste des sites refusés par DOMCity : sites pour adultes.",
  violence: "Ce site est sur la liste des sites refusés par DOMCity : images violentes ou choquantes.",
  bank: "Ce site est sur la liste des sites refusés par DOMCity : banques et services financiers, dont les pages montrent des comptes et des noms.",
  private:
    "Ce site est sur la liste des sites refusés par DOMCity : messageries, comptes, administration, santé… des pages qui montrent la vie d'une personne.",
  gambling: "Ce site est sur la liste des sites refusés par DOMCity : jeux d'argent.",
  danger: "Ce site est sur la liste des sites refusés par DOMCity : pistage, logiciels espions ou téléchargements piratés.",
};

/** The list, as the database returns it: domain (or extension) → category. */
export type Blocklist = ReadonlyMap<string, BlockCategory>;

export const isBlockCategory = (value: unknown): value is BlockCategory =>
  (BLOCK_CATEGORIES as readonly unknown[]).includes(value);

/** The domain and all those that contain it: fr.pornhub.com, pornhub.com, com. */
export function domainSuffixes(hostname: string): string[] {
  const labels = hostname.toLowerCase().replace(/\.+$/, "").split(".");
  return labels.map((_, i) => labels.slice(i).join("."));
}

/** The category that refuses this host (the most precise entry), or undefined. */
export function blockedCategory(hostname: string, list: Blocklist): BlockCategory | undefined {
  for (const suffix of domainSuffixes(hostname)) {
    const category = list.get(suffix);
    if (category) return category;
  }
  return undefined;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/** True if the address (of a page, of an image) leads to a refused site. */
export function isBlockedUrl(url: string, list: Blocklist): boolean {
  const host = hostOf(url);
  return host !== null && blockedCategory(host, list) !== undefined;
}

/** Why this city is not built (the text shown to the person), or null. */
export function cityRefusal(doc: CityDoc, list: Blocklist): string | null {
  if (doc.page?.adult) return "Cette page se déclare réservée aux adultes : DOMCity n'en construit pas de ville.";
  const host = hostOf(doc.url);
  const category = host ? blockedCategory(host, list) : undefined;
  return category ? REASONS[category] : null;
}

/**
 * The city without what comes from a refused site: its images stay in place but lose their
 * address and their text (it can be as crude as they are), and refused sites leave its departures.
 * Returns the same city when there is nothing to remove.
 */
export function withoutBlocked(doc: CityDoc, list: Blocklist): CityDoc {
  if (list.size === 0) return doc;
  let changed = false;

  const clean = (node: CityNode): CityNode => {
    let img = node.img;
    if (img?.src && isBlockedUrl(img.src, list)) {
      const { w, h, broken } = img;
      img = { src: "", ...(w !== undefined && { w }), ...(h !== undefined && { h }), ...(broken && { broken }), refused: true };
    }
    let children = node.children;
    if (children) {
      const next = children.map(clean);
      if (next.some((child, i) => child !== children![i])) children = next;
    }
    if (img === node.img && children === node.children) return node;
    changed = true;
    return { ...node, img, children };
  };

  const root = clean(doc.root);
  const sites = doc.linksTo?.sites;
  const keptSites = sites?.filter(([domain]) => blockedCategory(domain, list) === undefined);
  if (sites && keptSites && keptSites.length !== sites.length) changed = true;
  if (!changed) return doc;
  return {
    ...doc,
    root,
    ...(doc.linksTo && { linksTo: { ...doc.linksTo, ...(keptSites && { sites: keptSites }) } }),
  };
}

/** Reads the list sent by the server ({ adult: [...], bank: [...] }), ignoring whatever does not follow it. */
export function readBlocklist(data: unknown): Map<string, BlockCategory> {
  const list = new Map<string, BlockCategory>();
  if (!data || typeof data !== "object") return list;
  for (const [category, domains] of Object.entries(data as Record<string, unknown>)) {
    if (!isBlockCategory(category) || !Array.isArray(domains)) continue;
    for (const domain of domains) if (typeof domain === "string") list.set(domain, category);
  }
  return list;
}
