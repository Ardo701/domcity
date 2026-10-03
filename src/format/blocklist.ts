import type { CityDoc } from "./types";
import { siteHost } from "./url";

/**
 * Les sites refusés : DOMCity n'en construit pas de ville, ne les publie pas, et ne charge jamais
 * leurs images (même accrochées dans la ville d'un autre site). Aujourd'hui, des sites pour adultes.
 *
 * Liste tenue par le moteur, comme les traqueurs : l'allonger masque aussi les villes déjà publiées
 * (pages de ville et de site introuvables, absentes de la galerie et de la recherche). Elle ne
 * peut pas être complète : le favori refuse aussi toute page qui se déclare réservée aux adultes
 * (balise rating, `page.adult`), et le signalement reste le recours pour le reste.
 *
 * Un domaine couvre ses sous-domaines (« pornhub.com » couvre « fr.pornhub.com »). Pas de mots
 * clés : « sex » refuserait essex.ac.uk, « porn » la ville de Pornic, « xxx » le magasin XXXLutz.
 */
export const BLOCKED_SITES: readonly string[] = [
  // Vidéos
  "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "youporn.com", "redtube.com", "tube8.com",
  "spankbang.com", "eporner.com", "youjizz.com", "tnaflix.com", "empflix.com", "drtuber.com", "txxx.com",
  "hclips.com", "upornia.com", "porntrex.com", "beeg.com", "motherless.com", "sunporno.com", "4tube.com",
  "porntube.com", "pornone.com", "porn.com", "pornhat.com", "thumbzilla.com", "keezmovies.com", "spankwire.com",
  "nuvid.com", "hqporner.com", "porndig.com", "pornerbros.com", "tukif.com",
  // Webcams
  "chaturbate.com", "stripchat.com", "bongacams.com", "livejasmin.com", "cam4.com", "camsoda.com",
  "myfreecams.com", "flirt4free.com", "imlive.com", "streamate.com", "xlovecam.com", "xhamsterlive.com",
  // Abonnements et créateurs
  "onlyfans.com", "fansly.com", "manyvids.com", "clips4sale.com",
  // Studios
  "brazzers.com", "realitykings.com", "bangbros.com", "naughtyamerica.com", "digitalplayground.com", "mofos.com",
  "twistys.com", "babes.com", "vixen.com", "blacked.com", "tushy.com", "evilangel.com", "kink.com",
  "teamskeet.com", "metart.com", "dorcelclub.com", "jacquieetmicheltv.net",
  // Dessins
  "nhentai.net", "hanime.tv", "e-hentai.org", "exhentai.org", "gelbooru.com", "paheal.net",
  // Serveurs d'images de ces sites (leurs vignettes s'accrochent dans d'autres pages)
  "phncdn.com", "xvideos-cdn.com", "xnxx-cdn.com", "xhcdn.com", "rdtcdn.com", "ypncdn.com", "highwebmedia.com",
];

/** Extensions réservées aux sites pour adultes : tous leurs sites sont refusés. */
export const BLOCKED_TLDS: readonly string[] = ["xxx", "porn", "adult", "sex"];

const BLOCKED = new Set(BLOCKED_SITES);

/** Vrai si ce domaine, ou l'un de ceux qui le contiennent, est refusé. */
export function isBlockedHost(hostname: string): boolean {
  const labels = siteHost(hostname).split(".");
  if (BLOCKED_TLDS.includes(labels[labels.length - 1])) return true;
  for (let i = 0; i < labels.length - 1; i += 1) {
    if (BLOCKED.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

/** Vrai si l'adresse (d'une page, d'une image) mène à un site refusé. */
export function isBlockedUrl(url: string): boolean {
  try {
    return isBlockedHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Pourquoi cette ville ne se construit pas (le texte montré à la personne), ou null. */
export function cityRefusal(doc: CityDoc): string | null {
  if (doc.page?.adult) return "Cette page se déclare réservée aux adultes : DOMCity n'en construit pas de ville.";
  if (isBlockedUrl(doc.url)) return "Ce site est sur la liste des sites refusés par DOMCity (sites pour adultes, notamment).";
  return null;
}
