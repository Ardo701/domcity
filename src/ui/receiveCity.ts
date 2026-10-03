import { BOOKMARKLET_VERSION, HASH_KEY, MESSAGES, unpackCity, type CityMessage } from "@/bookmarklet/protocol";
import { cityRefusal } from "@/format/blocklist";
import { validateCityDoc } from "@/format/schema";
import type { CityDoc } from "@/format/types";
import { siteHost } from "@/format/url";
import { loadBlocklist } from "./blocklist";

export interface ReceivedCity {
  doc: CityDoc;
  /** Le favori qui l'a envoyée date d'une version précédente. */
  outdated: boolean;
}

export class ReceiveError extends Error {
  constructor(
    readonly title: string,
    message: string,
    /** Le site est refusé par DOMCity : ni surtitre, ni proposition de (ré)installer le favori. */
    readonly refused = false,
  ) {
    super(message);
  }
}

/** Garde la ville reçue le temps de la session de l'onglet : un rechargement ne la perd pas. */
const SAVED_KEY = "domcity:nouveau";
/** Si le favori ne répond pas dans ce délai, la page d'origine a été fermée ou a changé. */
const WAIT_MS = 20_000;

let pending: Promise<ReceivedCity> | null = null;

/**
 * Reçoit la ville envoyée par le favori. Une seule réception par chargement de page,
 * même si l'écran est monté deux fois (mode strict de React en développement).
 */
export function receiveCity(): Promise<ReceivedCity> {
  pending ??= receive().then(screen);
  return pending;
}

/** Les sites refusés (la liste de la base, vérifiée ici même) : pas de ville, et rien n'est gardé. */
async function screen(received: ReceivedCity): Promise<ReceivedCity> {
  const refusal = cityRefusal(received.doc, await loadBlocklist());
  if (refusal) {
    forget();
    throw new ReceiveError("Site refusé", refusal, true);
  }
  return keep(received);
}

async function receive(): Promise<ReceivedCity> {
  // Plan B du favori : la ville compressée dans l'ancre de l'adresse.
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

  // Rechargement (ou retour) : la ville reçue tout à l'heure. Pas avant : un onglet ouvert depuis
  // DOMCity hérite de la mémoire de session de celui qui l'ouvre, avec une autre ville dedans.
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
        // La ville doit venir du site qu'elle décrit.
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
    // On appelle le favori jusqu'à ce qu'il réponde : il peut finir son relevé après notre chargement.
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
    // stockage plein ou refusé : la ville sera perdue au rechargement, rien de plus
  }
  return received;
}

function forget() {
  try {
    sessionStorage.removeItem(SAVED_KEY);
  } catch {
    // stockage indisponible : rien n'y a été gardé
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
