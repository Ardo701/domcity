/**
 * The DOMCity bookmarklet: captures the displayed page and sends it to DOMCity.
 *
 * Compiled into a single line by scripts/build-bookmarklet.mts. The whole code is
 * in the bookmarklet: nothing is loaded or injected into the page, which makes it work
 * even on sites that forbid it (GitHub, X...). It only reads.
 */

import { captureDocument } from "@/capture/capture";
import type { CityDoc } from "@/format/types";
import { BOOKMARKLET_VERSION, HASH_KEY, MESSAGES, NEW_CITY_PATH, packCity } from "./protocol";

/** Replaced by the DOMCity address when the "Create a city" page builds the link. */
const ORIGIN = "__DOMCITY_ORIGIN__";

/** How long to listen to the DOMCity tab while it loads, even slowly. */
const LISTEN_MS = 120_000;
/** A tab closed this fast was not closed by the person: the site cut the link. */
const CUT_MS = 15_000;

/**
 * The bookmarklet runs on another site: it cannot read the language chosen on DOMCity. It speaks the
 * language of the browser, like DOMCity by default: French if the browser asks for it, English otherwise.
 */
const FRENCH = /^fr\b/i.test(navigator.language);

const SAY = {
  noTransfer: [
    "this browser cannot send the city. Try with a recent browser.",
    "ce navigateur ne sait pas transmettre la ville. Essayez avec un navigateur récent.",
  ],
  notWeb: ["only web pages (http or https) become cities.", "seules les pages web (http ou https) deviennent des villes."],
  failed: ["capturing this page failed.", "le relevé de cette page a échoué."],
} as const;

function say(message: keyof typeof SAY) {
  alert(FRENCH ? `DOMCity : ${SAY[message][1]}` : `DOMCity: ${SAY[message][0]}`);
}

/** Plan B: the city travels in the address fragment, and opens in this tab. */
async function openHere(city: CityDoc) {
  try {
    // The bookmarklet runs on sites other than DOMCity: Next navigation does not exist here.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `${ORIGIN}${NEW_CITY_PATH}#${HASH_KEY}${await packCity(city)}`;
  } catch {
    say("noTransfer");
  }
}

function run() {
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    say("notWeb");
    return;
  }

  // The tab opens right away, while the click still counts as a user gesture:
  // later, the popup blocker would stop it.
  let tab: Window | null = null;
  try {
    tab = window.open(`${ORIGIN}${NEW_CITY_PATH}`, "_blank");
  } catch {
    tab = null;
  }

  let city: CityDoc;
  try {
    city = captureDocument(document, {
      source: "bookmarklet",
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang || undefined,
      live: true,
    });
  } catch {
    tab?.close();
    say("failed");
    return;
  }

  if (!tab) {
    void openHere(city);
    return;
  }
  const opened = tab;

  const start = Date.now();
  let sentAt = 0;
  let done = false;
  const onMessage = (event: MessageEvent) => {
    if (done || event.origin !== ORIGIN || !event.source) return;
    const type = (event.data as { type?: unknown } | null)?.type;
    if (type === MESSAGES.ready && Date.now() - sentAt > 2000) {
      sentAt = Date.now();
      (event.source as Window).postMessage({ type: MESSAGES.city, version: BOOKMARKLET_VERSION, city }, ORIGIN);
    } else if (type === MESSAGES.received) {
      stop();
    }
  };
  const watch = setInterval(() => {
    const elapsed = Date.now() - start;
    if (opened.closed) {
      stop();
      // Some sites isolate the windows they open (COOP header): we open the city here.
      if (elapsed < CUT_MS && sentAt === 0) void openHere(city);
    } else if (elapsed > LISTEN_MS) {
      stop();
    }
  }, 250);
  const stop = () => {
    done = true;
    clearInterval(watch);
    window.removeEventListener("message", onMessage);
  };
  window.addEventListener("message", onMessage);
}

run();
