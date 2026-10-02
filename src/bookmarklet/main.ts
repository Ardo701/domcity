/**
 * Le favori DOMCity : relève la page affichée et l'envoie à DOMCity.
 *
 * Compilé en une seule ligne par scripts/build-bookmarklet.mts. Le code entier est
 * dans le favori : rien n'est chargé ni injecté dans la page, ce qui le fait marcher
 * aussi sur les sites qui l'interdisent (GitHub, X…). Il ne fait que lire.
 */

import { captureDocument } from "@/capture/capture";
import type { CityDoc } from "@/format/types";
import { BOOKMARKLET_VERSION, HASH_KEY, MESSAGES, NEW_CITY_PATH, packCity } from "./protocol";

/** Remplacé par l'adresse de DOMCity quand la page « Installer » fabrique le lien. */
const ORIGIN = "__DOMCITY_ORIGIN__";

/** Temps d'écoute de l'onglet DOMCity, le temps qu'il charge, même lentement. */
const LISTEN_MS = 120_000;
/** Un onglet fermé si vite ne l'a pas été par la personne : le site a coupé le lien. */
const CUT_MS = 15_000;

function say(message: string) {
  alert(`DOMCity : ${message}`);
}

/** Plan B : la ville part dans l'ancre de l'adresse, et s'ouvre dans cet onglet. */
async function openHere(city: CityDoc) {
  try {
    // Le favori tourne sur d'autres sites que DOMCity : la navigation de Next n'existe pas ici.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `${ORIGIN}${NEW_CITY_PATH}#${HASH_KEY}${await packCity(city)}`;
  } catch {
    say("ce navigateur ne sait pas transmettre la ville. Essayez avec un navigateur récent.");
  }
}

function run() {
  if (location.protocol !== "http:" && location.protocol !== "https:") {
    say("seules les pages web (http ou https) deviennent des villes.");
    return;
  }

  // L'onglet s'ouvre tout de suite, tant que le clic compte comme un geste de la personne :
  // plus tard, le bloqueur de fenêtres l'arrêterait.
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
    say("le relevé de cette page a échoué.");
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
      // Certains sites isolent les fenêtres qu'ils ouvrent (en-tête COOP) : on ouvre la ville ici.
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
