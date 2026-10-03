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

/** The module keeps a single reception per page load: it is reloaded for each test. */
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

describe("receiving a city in /nouveau", () => {
  const blocklist = vi.fn<(url: string) => Promise<Response>>();

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/nouveau");
    // The list of refused sites, as /api/blocklist serves it.
    blocklist.mockReset().mockImplementation(async () => Response.json({ adult: ["pornhub.com"], bank: ["bnpparibas.com"] }));
    vi.stubGlobal("fetch", blocklist);
  });

  afterEach(() => {
    setOpener(null);
    vi.unstubAllGlobals();
  });

  it("calls the bookmarklet, accepts its city and confirms reception", async () => {
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

  it("refuses a city that does not come from the site it describes", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://intrus.example");
    await expect(pending).rejects.toThrow(/ne vient pas/);
  });

  it("refuses a site on the list, or a page that declares itself adults only, without keeping anything", async () => {
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
    // The browser downloaded the list: it sent nothing about the visited page.
    expect(blocklist).toHaveBeenCalledWith("/api/blocklist");
  });

  it("still builds the city if the list cannot be read (nothing will be published without the server)", async () => {
    blocklist.mockImplementation(async () => new Response("", { status: 503 }));
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION, city: CITY }, "https://exemple.org");
    expect((await pending).doc).toEqual(CITY);
  });

  it("reports a bookmarklet from a previous version", async () => {
    const opener = { postMessage: vi.fn() };
    setOpener(opener);
    const pending = (await freshReceive())();
    reply(opener, { type: MESSAGES.city, version: BOOKMARKLET_VERSION - 1, city: CITY }, "https://exemple.org");
    expect((await pending).outdated).toBe(true);
  });

  it("reads plan B from the fragment, then erases it from the address", async () => {
    window.history.replaceState(null, "", `/nouveau#ville=${await packCity(CITY)}`);
    const received = await (await freshReceive())();
    expect(received.doc).toEqual(CITY);
    expect(window.location.hash).toBe("");
  });

  it("explains what to do when nothing was sent", async () => {
    await expect((await freshReceive())()).rejects.toThrow(/favori DOMCity/);
  });
});
