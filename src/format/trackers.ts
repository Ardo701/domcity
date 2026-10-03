/**
 * Traqueurs publicitaires et de mesure d'audience qui suivent les visiteurs d'un site à l'autre.
 * Liste tenue par le moteur (et non relevée) : la mettre à jour change les caméras de toutes les
 * villes, anciennes comme nouvelles. Les mesures d'audience sans cookie ni profil (Plausible,
 * Cloudflare), le suivi des erreurs (Sentry) et les bandeaux de consentement n'y sont pas.
 *
 * Un domaine couvre ses sous-domaines (« doubleclick.net » couvre « stats.g.doubleclick.net ») ;
 * une adresse complète (« bat.bing.com ») ne couvre qu'elle, quand le domaine sert aussi à autre chose.
 */
export const TRACKERS: readonly string[] = [
  // Google
  "google-analytics.com", "googletagmanager.com", "doubleclick.net", "googlesyndication.com",
  "googleadservices.com", "adservice.google.com",
  // Réseaux sociaux
  "facebook.net", "connect.facebook.com", "ads-twitter.com", "analytics.twitter.com", "px.ads.linkedin.com",
  "snap.licdn.com", "ct.pinterest.com", "analytics.pinterest.com", "analytics.tiktok.com", "sc-static.net",
  "tr.snapchat.com", "bat.bing.com", "mc.yandex.ru", "mc.yandex.com",
  // Enregistrement des visites et analyse de comportement
  "hotjar.com", "hotjar.io", "clarity.ms", "mouseflow.com", "fullstory.com", "crazyegg.com", "luckyorange.com",
  "smartlook.com", "inspectlet.com", "contentsquare.net", "quantummetric.com",
  // Mesure d'audience avec profil
  "segment.com", "segment.io", "mixpanel.com", "amplitude.com", "heapanalytics.com", "heap.io", "pendo.io",
  "chartbeat.com", "chartbeat.net", "parsely.com", "parse.ly", "omtrdc.net", "demdex.net", "everesttech.net",
  "tealiumiq.com", "tiqcdn.com", "hs-analytics.net", "hs-scripts.com", "xiti.com", "ati-host.net", "aticdn.net",
  "estat.com", "cxense.com", "krxd.net", "bluekai.com", "rlcdn.com", "mediarithmics.com", "weborama.fr",
  "weborama.com", "scorecardresearch.com", "quantserve.com", "quantcount.com",
  // Régies publicitaires
  "criteo.com", "criteo.net", "taboola.com", "outbrain.com", "amazon-adsystem.com", "adnxs.com", "adsrvr.org",
  "rubiconproject.com", "pubmatic.com", "openx.net", "casalemedia.com", "indexww.com", "teads.tv", "adform.net",
  "smartadserver.com", "moatads.com", "doubleverify.com", "adsafeprotected.com", "3lift.com", "triplelift.com",
  "media.net", "sovrn.com", "lijit.com", "gumgum.com", "sharethrough.com", "bidswitch.net", "adroll.com",
  "yieldmo.com", "spotxchange.com",
];

/** Les traqueurs parmi ces hôtes, chacun une fois, dans l'ordre des hôtes (du plus sollicité au moins). */
export function trackersIn(hosts: readonly string[]): string[] {
  const found: string[] = [];
  for (const host of hosts) {
    const name = host.toLowerCase().replace(/^www\./, "");
    const tracker = TRACKERS.find((entry) => name === entry || name.endsWith(`.${entry}`));
    if (tracker && !found.includes(tracker)) found.push(tracker);
  }
  return found;
}
