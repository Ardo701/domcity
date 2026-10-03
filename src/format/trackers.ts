/**
 * Advertising and audience measurement trackers that follow visitors from one site to another.
 * List maintained by the engine (not captured): updating it changes the cameras of all
 * cities, old and new. Audience measurement without cookies or profiles (Plausible,
 * Cloudflare), error tracking (Sentry) and consent banners are not in it.
 *
 * A domain covers its subdomains ("doubleclick.net" covers "stats.g.doubleclick.net");
 * a full address ("bat.bing.com") only covers itself, when the domain is also used for something else.
 */
export const TRACKERS: readonly string[] = [
  // Google
  "google-analytics.com", "googletagmanager.com", "doubleclick.net", "googlesyndication.com",
  "googleadservices.com", "adservice.google.com",
  // Social networks
  "facebook.net", "connect.facebook.com", "ads-twitter.com", "analytics.twitter.com", "px.ads.linkedin.com",
  "snap.licdn.com", "ct.pinterest.com", "analytics.pinterest.com", "analytics.tiktok.com", "sc-static.net",
  "tr.snapchat.com", "bat.bing.com", "mc.yandex.ru", "mc.yandex.com",
  // Session recording and behavior analysis
  "hotjar.com", "hotjar.io", "clarity.ms", "mouseflow.com", "fullstory.com", "crazyegg.com", "luckyorange.com",
  "smartlook.com", "inspectlet.com", "contentsquare.net", "quantummetric.com",
  // Audience measurement with profiles
  "segment.com", "segment.io", "mixpanel.com", "amplitude.com", "heapanalytics.com", "heap.io", "pendo.io",
  "chartbeat.com", "chartbeat.net", "parsely.com", "parse.ly", "omtrdc.net", "demdex.net", "everesttech.net",
  "tealiumiq.com", "tiqcdn.com", "hs-analytics.net", "hs-scripts.com", "xiti.com", "ati-host.net", "aticdn.net",
  "estat.com", "cxense.com", "krxd.net", "bluekai.com", "rlcdn.com", "mediarithmics.com", "weborama.fr",
  "weborama.com", "scorecardresearch.com", "quantserve.com", "quantcount.com",
  // Ad networks
  "criteo.com", "criteo.net", "taboola.com", "outbrain.com", "amazon-adsystem.com", "adnxs.com", "adsrvr.org",
  "rubiconproject.com", "pubmatic.com", "openx.net", "casalemedia.com", "indexww.com", "teads.tv", "adform.net",
  "smartadserver.com", "moatads.com", "doubleverify.com", "adsafeprotected.com", "3lift.com", "triplelift.com",
  "media.net", "sovrn.com", "lijit.com", "gumgum.com", "sharethrough.com", "bidswitch.net", "adroll.com",
  "yieldmo.com", "spotxchange.com",
];

/** The trackers among these hosts, each once, in host order (from most to least called). */
export function trackersIn(hosts: readonly string[]): string[] {
  const found: string[] = [];
  for (const host of hosts) {
    const name = host.toLowerCase().replace(/^www\./, "");
    const tracker = TRACKERS.find((entry) => name === entry || name.endsWith(`.${entry}`));
    if (tracker && !found.includes(tracker)) found.push(tracker);
  }
  return found;
}
