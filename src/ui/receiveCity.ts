import { BOOKMARKLET_VERSION, HASH_KEY, MESSAGES, unpackCity, type CityMessage } from "@/bookmarklet/protocol";
import { cityRefusal } from "@/format/blocklist";
import { validateCityDoc } from "@/format/schema";
import type { CityDoc } from "@/format/types";
import { siteHost } from "@/format/url";
import { loadBlocklist } from "./blocklist";

export interface ReceivedCity {
  doc: CityDoc;
  /** The bookmarklet that sent it dates from a previous version. */
  outdated: boolean;
}

export class ReceiveError extends Error {
  constructor(
    readonly title: string,
    message: string,
    /** The site is refused by DOMCity: no offer to (re)install the bookmarklet. */
    readonly refused = false,
  ) {
    super(message);
  }
}

/** Keeps the received city for the tab's session: a reload does not lose it. */
const SAVED_KEY = "domcity:nouveau";
/** If the bookmarklet does not answer within this delay, the original page was closed or has changed. */
const WAIT_MS = 20_000;

let pending: Promise<ReceivedCity> | null = null;

/**
 * Receives the city sent by the bookmarklet. A single reception per page load,
 * even if the screen is mounted twice (React strict mode in development).
 */
export function receiveCity(): Promise<ReceivedCity> {
  pending ??= receive().then(screen);
  return pending;
}

/** Refused sites (the database list, checked right here): no city, and nothing is kept. */
async function screen(received: ReceivedCity): Promise<ReceivedCity> {
  const refusal = cityRefusal(received.doc, await loadBlocklist());
  if (refusal) {
    forget();
    throw new ReceiveError("Site refusé", refusal, true);
  }
  return keep(received);
}

async function receive(): Promise<ReceivedCity> {
  // Bookmarklet plan B: the compressed city in the address fragment.
  const hash = window.location.hash;
  if (hash.startsWith(`#${HASH_KEY}`)) {
    window.history.replaceState(null, "", window.location.pathname);
    let unpacked: Awaited<ReturnType<typeof unpackCity>>;
    try {
      unpacked = await unpackCity(hash.slice(HASH_KEY.length + 1));
    } catch {
      throw new ReceiveError("Relevé illisible", "L'adresse de cette page est incomplète ou abîmée. Relancez le favori depuis la page à relever.");
    }
    return { doc: check(unpacked.data), outdated: unpacked.version < BOOKMARKLET_VERSION };
  }

  // Reload (or back): the city received earlier. Not before: a tab opened from
  // DOMCity inherits the session storage of the one that opens it, with another city in it.
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === "reload" || navigation?.type === "back_forward") {
    const saved = readSaved();
    if (saved) return saved;
  }

  const opener = window.opener as Window | null;
  if (!opener) {
    throw new ReceiveError(
      "Aucun relevé reçu",
      "Cette page reçoit les villes envoyées par le favori DOMCity. Ouvrez la page à relever, puis cliquez sur le favori.",
    );
  }

  return new Promise<ReceivedCity>((resolve, reject) => {
    const finish = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(ping);
      clearTimeout(timeout);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== opener) return;
      const message = event.data as Partial<CityMessage> | null;
      if (message?.type !== MESSAGES.city) return;
      finish();
      try {
        const doc = check(message.city);
        // The city must come from the site it describes.
        if (siteHost(new URL(doc.url).hostname) !== siteHost(new URL(event.origin).hostname)) {
          throw new ReceiveError("Relevé refusé", "Cette ville ne vient pas de la page qu'elle prétend décrire.");
        }
        opener.postMessage({ type: MESSAGES.received }, event.origin);
        resolve({ doc, outdated: (Number(message.version) || 0) < BOOKMARKLET_VERSION });
      } catch (error) {
        reject(error);
      }
    };
    window.addEventListener("message", onMessage);
    // We call the bookmarklet until it answers: it may finish its capture after we load.
    const call = () => opener.postMessage({ type: MESSAGES.ready }, "*");
    const ping = setInterval(call, 400);
    const timeout = setTimeout(() => {
      finish();
      reject(
        new ReceiveError(
          "Le relevé n'est pas arrivé",
          "La page d'origine ne répond plus : elle a peut-être été fermée ou rechargée. Relancez le favori depuis cette page.",
        ),
      );
    }, WAIT_MS);
    call();
  });
}

function check(data: unknown): CityDoc {
  const result = validateCityDoc(data);
  if (!result.ok || result.doc.source !== "bookmarklet") {
    throw new ReceiveError("Relevé illisible", "La ville reçue ne suit pas le format de DOMCity. Réinstallez le favori, puis réessayez.");
  }
  return result.doc;
}

function keep(received: ReceivedCity): ReceivedCity {
  try {
    sessionStorage.setItem(SAVED_KEY, JSON.stringify(received));
  } catch {
    // storage full or refused: the city will be lost on reload, nothing more
  }
  return received;
}

function forget() {
  try {
    sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // storage unavailable: nothing was kept there
  }
}

function readSaved(): ReceivedCity | null {
  try {
    const raw = sessionStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as ReceivedCity;
    const result = validateCityDoc(saved.doc);
    return result.ok ? { doc: result.doc, outdated: Boolean(saved.outdated) } : null;
  } catch {
    return null;
  }
}
