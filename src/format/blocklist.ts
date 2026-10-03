import type { CityDoc, CityNode } from "./types";

/**
 * Les sites refusés : DOMCity n'en construit pas de ville, ne les publie pas, et ne charge jamais
 * leurs images (même accrochées dans la ville d'un autre site). Sites pour adultes, banques,
 * données personnelles… : six catégories, toutes traitées de la même façon.
 *
 * La liste vit dans la base (table `blocked_domains`, voir docs/sites-refuses.md), pas dans le code :
 * on l'allonge dans Supabase sans redéployer. La base refuse elle-même de créer la ville d'un site
 * de la liste, et ses fonctions de lecture l'ignorent. Le navigateur télécharge la liste entière
 * (`/api/blocklist`) et vérifie seul : rien de la page visitée ne part avant la publication.
 *
 * Un domaine couvre ses sous-domaines (« pornhub.com » couvre « fr.pornhub.com ») ; une entrée sans
 * point est une extension (« xxx »). Même règle que `domain_suffixes` dans la base.
 */

export const BLOCK_CATEGORIES = ["adult", "violence", "bank", "private", "gambling", "danger"] as const;
export type BlockCategory = (typeof BLOCK_CATEGORIES)[number];

/** Ce que dit DOMCity d'un site refusé, selon sa catégorie. */
const REASONS: Record<BlockCategory, string> = {
  adult: "Ce site est sur la liste des sites refusés par DOMCity : sites pour adultes.",
  violence: "Ce site est sur la liste des sites refusés par DOMCity : images violentes ou choquantes.",
  bank: "Ce site est sur la liste des sites refusés par DOMCity : banques et services financiers, dont les pages montrent des comptes et des noms.",
  private:
    "Ce site est sur la liste des sites refusés par DOMCity : messageries, comptes, administration, santé… des pages qui montrent la vie d'une personne.",
  gambling: "Ce site est sur la liste des sites refusés par DOMCity : jeux d'argent.",
  danger: "Ce site est sur la liste des sites refusés par DOMCity : pistage, logiciels espions ou téléchargements piratés.",
};

/** La liste, telle que la rend la base : domaine (ou extension) → catégorie. */
export type Blocklist = ReadonlyMap<string, BlockCategory>;

export const isBlockCategory = (value: unknown): value is BlockCategory =>
  (BLOCK_CATEGORIES as readonly unknown[]).includes(value);

/** Le domaine et tous ceux qui le contiennent : fr.pornhub.com, pornhub.com, com. */
export function domainSuffixes(hostname: string): string[] {
  const labels = hostname.toLowerCase().replace(/\.+$/, "").split(".");
  return labels.map((_, i) => labels.slice(i).join("."));
}

/** La catégorie qui refuse cet hôte (l'entrée la plus précise), ou undefined. */
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

/** Vrai si l'adresse (d'une page, d'une image) mène à un site refusé. */
export function isBlockedUrl(url: string, list: Blocklist): boolean {
  const host = hostOf(url);
  return host !== null && blockedCategory(host, list) !== undefined;
}

/** Pourquoi cette ville ne se construit pas (le texte montré à la personne), ou null. */
export function cityRefusal(doc: CityDoc, list: Blocklist): string | null {
  if (doc.page?.adult) return "Cette page se déclare réservée aux adultes : DOMCity n'en construit pas de ville.";
  const host = hostOf(doc.url);
  const category = host ? blockedCategory(host, list) : undefined;
  return category ? REASONS[category] : null;
}

/**
 * La ville sans ce qui vient d'un site refusé : ses images restent à leur place mais perdent leur
 * adresse et leur texte (il peut être aussi cru qu'elles), et les sites refusés quittent ses départs.
 * Rend la même ville quand rien n'est à retirer.
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

/** Lit la liste envoyée par le serveur ({ adult: [...], bank: [...] }), en ignorant ce qui ne la suit pas. */
export function readBlocklist(data: unknown): Map<string, BlockCategory> {
  const list = new Map<string, BlockCategory>();
  if (!data || typeof data !== "object") return list;
  for (const [category, domains] of Object.entries(data as Record<string, unknown>)) {
    if (!isBlockCategory(category) || !Array.isArray(domains)) continue;
    for (const domain of domains) if (typeof domain === "string") list.set(domain, category);
  }
  return list;
}
