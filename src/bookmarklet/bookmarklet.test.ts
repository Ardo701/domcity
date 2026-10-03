// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateCityDoc } from "@/format/schema";
import { mimicBrowserLayout } from "@/test/layout";
import type { CityDoc } from "@/format/types";
import { bookmarkletHref } from "./href";
import { BOOKMARKLET_VERSION, MESSAGES, packCity, unpackCity } from "./protocol";

const ORIGIN = "https://domcity.test";

describe("the bookmarklet on a page", () => {
  interface FakeTab {
    closed: boolean;
    close: () => void;
    postMessage: ReturnType<typeof vi.fn>;
  }
  let tab: FakeTab;
  let restoreLayout: () => void;

  const send = (data: unknown, origin = ORIGIN) => {
    const event = new MessageEvent("message", { data, origin });
    Object.defineProperty(event, "source", { value: tab });
    window.dispatchEvent(event);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    document.title = "Les livres";
    document.documentElement.lang = "fr";
    document.body.innerHTML = `
      <header><nav><a href="/">Accueil</a></nav></header>
      <main>
        <h1>Les livres</h1>
        <section style="background-color: rgb(255, 210, 63)"><p>Un texte de quarante caractères environ.</p></section>
        <div id="cache" style="display: none"><p>caché</p></div>
        <my-card></my-card>
      </main>
      <script src="https://www.googletagmanager.com/gtm.js"></script>
      <!-- un commentaire -->`;
    const card = document.querySelector("my-card")!;
    card.attachShadow({ mode: "open" }).innerHTML = "<article><h2>Dans le composant</h2><slot></slot></article>";
    card.innerHTML = "<p>Contenu projeté</p>";

    restoreLayout = mimicBrowserLayout();
    tab = { closed: false, close: vi.fn(), postMessage: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreLayout();
  });

  const runBookmarklet = () => {
    // What the browser does on click: decode the link, then run the code in the page.
    new Function(decodeURIComponent(bookmarkletHref(ORIGIN).slice("javascript:".length)))();
  };

  const receivedCity = (): CityDoc => {
    expect(tab.postMessage).toHaveBeenCalledTimes(1);
    const [message, target] = tab.postMessage.mock.calls[0];
    expect(target).toBe(ORIGIN);
    expect(message).toMatchObject({ type: MESSAGES.city, version: BOOKMARKLET_VERSION });
    const result = validateCityDoc(message.city);
    if (!result.ok) throw new Error(result.error);
    return result.doc;
  };

  it("opens DOMCity, then sends the city only to DOMCity once the tab is ready", () => {
    runBookmarklet();
    expect(window.open).toHaveBeenCalledWith(`${ORIGIN}/nouveau`, "_blank");

    send({ type: MESSAGES.ready }, "https://intrus.example");
    expect(tab.postMessage).not.toHaveBeenCalled();

    send({ type: MESSAGES.ready });
    const city = receivedCity();
    expect(city).toMatchObject({ source: "bookmarklet", title: "Les livres", lang: "fr" });
    // The test page is http://localhost:3000/: cleaned address (https, no port).
    expect(city.url).toBe("https://localhost/");
  });

  it("captures what is displayed: web components, colors, third-party scripts", () => {
    runBookmarklet();
    send({ type: MESSAGES.ready });
    const city = receivedCity();
    const json = JSON.stringify(city);

    expect(json).not.toContain("#cache");
    const tags: string[] = [];
    const walk = (node: CityDoc["root"]) => {
      tags.push(node.tag);
      node.children?.forEach(walk);
    };
    walk(city.root);
    expect(tags).toEqual(expect.arrayContaining(["article", "h2", "p"]));
    expect(json).toContain('"heading":"Dans le composant"');
    expect(json).toContain('"bg":"#ffd23f"');
    expect(json).toContain('"rect":[10,20,300,40]');
    expect(city.page).toMatchObject({ scripts: 1, comments: 1, thirdParty: ["www.googletagmanager.com"] });
  });

  it("goes quiet once the city is received", () => {
    runBookmarklet();
    send({ type: MESSAGES.ready });
    send({ type: MESSAGES.received });
    vi.advanceTimersByTime(5000);
    send({ type: MESSAGES.ready });
    expect(tab.postMessage).toHaveBeenCalledTimes(1);
  });
});

describe("plan B: the city in the address fragment", () => {
  const city: CityDoc = {
    format: 1,
    source: "bookmarklet",
    url: "https://exemple.org/livres",
    title: "Les livres, édition spéciale",
    capturedAt: "2026-10-02T12:00:00.000Z",
    root: { tag: "body", children: [{ tag: "h1", text: 10, heading: "Les livres" }] },
  };

  it("round-trips without loss, in characters safe for an address", async () => {
    const packed = await packCity(city);
    expect(packed).toMatch(new RegExp(`^${BOOKMARKLET_VERSION}\\.[A-Za-z0-9_-]+$`));
    expect(await unpackCity(packed)).toEqual({ version: BOOKMARKLET_VERSION, data: city });
  });

  it("refuses an unreadable fragment", async () => {
    await expect(unpackCity("1.pas du base64")).rejects.toThrow();
    await expect(unpackCity("rien")).rejects.toThrow();
  });
});
