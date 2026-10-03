// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKMARKLET_VERSION, MESSAGES, packCity } from "@/bookmarklet/protocol";
import type { CityDoc } from "@/format/types";

const CITY: CityDoc = {
  format: 1,
  source: "bookmarklet",
  url: "https://exemple.org/livres",
  title: "Les livres",
  capturedAt: "2026-10-02T12:00:00.000Z",
  root: { tag: "body", children: [{ tag: "h1", text: 10, heading: "Les livres" }] },
};

/** Le module garde une seule réception par chargement de page : on le recharge à chaque test. */
async function freshReceive() {
  vi.resetModules();
  return (await import("./receiveCity")).receiveCity;
}

function setOpener(value: unknown) {
  Object.defineProperty(window, "opener", { value, configurable: true, writable: true });
}

function reply(source: unknown, data: unknown, origin: string) {
  const event = new MessageEvent("message", { data, origin });
  Object.defineProperty(event, "source", { value: source });
  window.dispatchEvent(event);
}

describe("réception d'une ville dans /nouveau", () => {
  const blocklist = vi.fn<(url: string) => Promise<Response>>();

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/nouveau");
    // La liste des sites refusés, telle que la sert /api/blocklist.
    blocklist.mockReset().mockImplementation(async () => Response.json({ adult: ["pornhub.com"], bank: ["bnpparibas.com"] }));
    vi.stubGlobal("fetch", blocklist);
  });

  afterEach(() => {
    setOpener(null);
    vi.unstubAllGlobals();
  });

  it("appelle le favori, accepte sa ville et confirme la réception", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    expect(opener.postMessage).toHaveBeenCalledWith({ type: MESSAGES.ready }, "*");

    reply({ postMessage: vi.fn() }, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://exemple.org");
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://www.exemple.org");
    const received = await pending;

    expect(received).toEqual({ doc: CITY, outdated: false });
    expect(opener.postMessage).toHaveBeenLastCalledWith({ type: MESSAGES.received }, "https://www.exemple.org");
    expect(JSON.parse(sessionStorage.getItem("domcity:nouveau")!).doc.title).toBe("Les livres");
  });

  it("refuse une ville qui ne vient pas du site qu'elle décrit", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://intrus.example");
    await expect(pending).rejects.toThrow(/ne vient pas/);
  });

  it("refuse un site de la liste, ou une page qui se déclare réservée aux adultes, sans rien garder", async () => {
    const cases: Array<[CityDoc, string]> = [
      [{ ...CITY, url: "https://fr.pornhub.com/video" }, "https://fr.pornhub.com"],
      [{ ...CITY, url: "https://mabanque.bnpparibas.com/comptes" }, "https://mabanque.bnpparibas.com"],
      [{ ...CITY, page: { adult: true } }, "https://exemple.org"],
    ];
    for (const [city, origin] of cases) {
      const opener = { postMessage: vi.fn() };
      setOpener(opener);
      const pending = (await freshReceive())();
      reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city }, origin);
      await expect(pending).rejects.toMatchObject({ title: "Site refusé", refused: true });
      expect(sessionStorage.getItem("domcity:nouveau")).toBeNull();
    }
    // Le navigateur a téléchargé la liste : il n'a rien envoyé de la page visitée.
    expect(blocklist).toHaveBeenCalledWith("/api/blocklist");
  });

  it("construit quand même la ville si la liste ne peut pas être lue (rien ne sera publié sans le serveur)", async () => {
    blocklist.mockImplementation(async () => new Response("", { status: 503 }));
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://exemple.org");
    expect((await pending).doc).toEqual(CITY);
  });

  it("signale un favori d'une version précédente", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION - 1, city: CITY }, "https://exemple.org");
    expect((await pending).outdated).toBe(true);
  });

  it("lit le plan B dans l'ancre, puis l'efface de l'adresse", async () => {
    window.history.replaceState(null, "", `/nouveau#ville=${await packCity(CITY)}`);
    const received = await (await freshReceive())();
    expect(received.doc).toEqual(CITY);
    expect(window.location.hash).toBe("");
  });

  it("explique quoi faire quand rien n'a été envoyé", async () => {
    await expect((await freshReceive())()).rejects.toThrow(/favori DOMCity/);
  });
});
