/**
 * Relevé d'une page : Document → ville (JSON).
 *
 * Fonctionne sur un document analysé (Wikipédia via DOMParser) comme sur la
 * page affichée (bookmarklet, avec `live`). Aucune dépendance : ce fichier est
 * compilé tel quel dans le bookmarklet (scripts/build-bookmarklet.mts).
 */

import { LIMITS } from "@/format/limits";
import { linkKey } from "@/format/links";
import { HEADING_TEXT_TAGS, KEPT_TAGS, LEAF_TAGS, SKIPPED_TAGS } from "@/format/taxonomy";
import {
  FORMAT_VERSION,
  type CaptureSource,
  type CityDoc,
  type CityLinksTo,
  type CityNode,
  type CityPage,
} from "@/format/types";
import { isPublicHost, isSameSite, normalizePageUrl, rootDomain, siteHost } from "@/format/url";

export interface CaptureOptions {
  source: CaptureSource;
  /** Adresse de la page, pour résoudre les liens et les images relatifs. */
  url: string;
  title?: string;
  lang?: string;
  /**
   * Page affichée dans le navigateur : on lit aussi ce que seul le rendu connaît
   * (positions, éléments masqués, couleurs, composants web, ressources chargées).
   */
  live?: boolean;
  now?: Date;
}

/** Dans un tableau, seuls ces éléments deviennent des bâtiments ; le reste est du texte de champ. */
const KEPT_IN_TABLE = new Set(["img", "video", "canvas", "iframe", "svg"]);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const SHOW_COMMENT = 0x80;

/** Où mènent les liens : empreintes des pages du site, domaines des autres sites, avec leur nombre. */
interface LinkTally {
  self: string;
  pages: Map<string, number>;
  sites: Map<string, number>;
}

interface Frame {
  node: Node;
  parent: CityNode;
  depth: number;
  inTable: boolean;
  /** Fond visible sous ce nœud (celui du parent gardé le plus proche), en mode `live`. */
  bg?: string;
}

export function captureDocument(doc: Document, options: CaptureOptions): CityDoc {
  const address = normalizePageUrl(options.url);
  const pageUrl = address?.url ?? options.url;
  const pageHost = safeHostname(options.url);
  const view = options.live ? doc.defaultView : null;
  const colors = view ? colorReader(doc) : null;
  const root: CityNode = { tag: "body" };
  let budget = LIMITS.maxNodes - 1;
  let pageBg: string | undefined;
  const tally: LinkTally = { self: linkKey(address?.path ?? "/"), pages: new Map(), sites: new Map() };

  const body = doc.body;
  if (body) {
    const label = labelOf(body);
    if (label) root.label = label;

    if (view && colors) {
      // Le fond de <body>, sinon celui de <html>, sinon le blanc du navigateur.
      pageBg =
        colors(view.getComputedStyle(body).backgroundColor) ??
        colors(view.getComputedStyle(doc.documentElement).backgroundColor) ??
        "#ffffff";
      root.bg = pageBg;
    }

    // Parcours en profondeur avec une pile : pas de récursion, même sur un DOM très profond.
    const stack: Frame[] = [];
    pushChildren(stack, body, root, 0, false, pageBg);

    while (stack.length > 0) {
      const { node, parent, depth, inTable, bg } = stack.pop()!;

      if (node.nodeType === TEXT_NODE) {
        addText(parent, textLength(node.nodeValue));
        continue;
      }
      if (node.nodeType !== ELEMENT_NODE) continue;

      const el = node as Element;
      const tag = el.localName.toLowerCase();
      if (SKIPPED_TAGS.has(tag)) continue;

      let box: DOMRect | null = null;
      if (view) {
        const visibility = visibilityOf(el, view);
        if (visibility === "hidden") continue;
        if (visibility === "contents") {
          // display: contents : l'élément n'a pas de boîte, ses enfants si.
          pushChildren(stack, el, parent, depth, inTable, bg);
          continue;
        }
      }

      if (tag === "a") countLink(parent, el.getAttribute("href"), options.url, pageHost, tally);

      let keep =
        KEPT_TAGS.has(tag) &&
        tag !== "body" &&
        budget > 0 &&
        depth < LIMITS.maxDepth &&
        (!inTable || KEPT_IN_TABLE.has(tag));

      if (keep && view) {
        box = el.getBoundingClientRect();
        // Sans surface (conteneur de flottants, enveloppe vide…), l'élément ne fait pas un bâtiment.
        if (box.width === 0 && box.height === 0 && tag !== "hr") keep = false;
      }

      if (!keep) {
        // Élément transparent : son texte et ses enfants remontent au parent gardé.
        pushChildren(stack, el, parent, depth, inTable, bg);
        continue;
      }

      const city = describeElement(el, tag, options);
      if (!city) continue;
      let ownBg = bg;
      if (view && box) {
        city.rect = [
          Math.round(box.left + view.scrollX),
          Math.round(box.top + view.scrollY),
          Math.round(box.width),
          Math.round(box.height),
        ];
        const color = colors?.(view.getComputedStyle(el).backgroundColor);
        if (color && color !== bg) {
          city.bg = color;
          ownBg = color;
        }
      }
      budget -= 1;
      (parent.children ??= []).push(city);

      const isLeaf = LEAF_TAGS.has(tag) || /^h[1-6]$/.test(tag);
      if (!isLeaf) pushChildren(stack, el, city, depth + 1, inTable || tag === "table", ownBg);
    }
  }

  const title = (options.title ?? doc.title ?? "").trim() || address?.path || pageUrl;
  const result: CityDoc = {
    format: FORMAT_VERSION,
    source: options.source,
    url: pageUrl,
    title: title.slice(0, 300),
    capturedAt: (options.now ?? new Date()).toISOString(),
    root,
  };
  if (options.lang) result.lang = options.lang.slice(0, 16);
  if (view && colors) result.page = pageFacts(doc, view, options.url, pageHost, colors, pageBg);
  const linksTo = linksOf(tally);
  if (linksTo) result.linksTo = linksTo;
  return result;
}

/** Les plus visés d'abord, puis par ordre alphabétique : le même relevé donne toujours le même fichier. */
function ranked(counts: Map<string, number>, max: number): Array<[string, number]> {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, max);
}

function linksOf(tally: LinkTally): CityLinksTo | undefined {
  const linksTo: CityLinksTo = {};
  if (tally.pages.size > 0) linksTo.pages = ranked(tally.pages, LIMITS.maxLinkedPages).map(([key]) => key);
  if (tally.sites.size > 0) linksTo.sites = ranked(tally.sites, LIMITS.maxLinkedSites);
  return linksTo.pages || linksTo.sites ? linksTo : undefined;
}

function pushChildren(stack: Frame[], el: Node, parent: CityNode, depth: number, inTable: boolean, bg?: string) {
  // À l'envers, pour dépiler dans l'ordre du document.
  const children = childNodesOf(el);
  for (let i = children.length - 1; i >= 0; i -= 1) {
    stack.push({ node: children[i], parent, depth, inTable, bg });
  }
}

/**
 * Les enfants tels qu'ils sont affichés. Un composant web montre son arbre fantôme
 * (shadow DOM ouvert), et chaque <slot> de cet arbre reçoit des éléments de la page.
 */
function childNodesOf(node: Node): ArrayLike<Node> {
  const el = node as Element;
  if (el.shadowRoot) return el.shadowRoot.childNodes;
  if (el.localName === "slot" && typeof (el as HTMLSlotElement).assignedNodes === "function") {
    const assigned = (el as HTMLSlotElement).assignedNodes();
    if (assigned.length > 0) return assigned;
  }
  return node.childNodes;
}

function describeElement(el: Element, tag: string, options: CaptureOptions): CityNode | null {
  const city: CityNode = { tag };
  const label = labelOf(el);
  if (label) city.label = label;

  if (/^h[1-6]$/.test(tag) || tag === "button" || tag === "textarea" || tag === "select") {
    // Sur la page affichée, le texte tel qu'on le lit : un <br> fait une espace, le texte masqué disparaît.
    const shown = options.live ? (el as HTMLElement).innerText : undefined;
    const text = collapse(shown ?? el.textContent);
    if (text.length > 0) city.text = text.length;
    if (HEADING_TEXT_TAGS.has(tag) && text.length > 0) {
      city.heading = truncate(text, 120);
    }
  }

  if (tag === "img") {
    const image = describeImage(el as HTMLImageElement, options);
    if (!image) return null;
    city.img = image;
  }

  return city;
}

/** Attributs où les sites rangent la vraie image tant qu'elle n'est pas chargée (chargement différé). */
const LAZY_SRC = ["data-src", "data-lazy-src", "data-original"];

function describeImage(img: HTMLImageElement, options: CaptureOptions): CityNode["img"] | null {
  const candidates = [options.live ? img.currentSrc || img.src : img.getAttribute("src") ?? ""];
  for (const name of LAZY_SRC) candidates.push(img.getAttribute(name) ?? "");
  let src = "";
  for (const raw of candidates) {
    src = imageUrl(raw, options.url);
    if (src) break;
  }

  let w: number | undefined;
  let h: number | undefined;
  if (options.live) {
    const box = img.getBoundingClientRect();
    w = Math.round(box.width) || img.naturalWidth || undefined;
    h = Math.round(box.height) || img.naturalHeight || undefined;
  } else {
    w = numberAttr(img, "width") ?? numberAttr(img, "data-file-width");
    h = numberAttr(img, "height") ?? numberAttr(img, "data-file-height");
  }

  // Pixel espion de 1×1 : ce n'est pas une image, on l'ignore.
  if (w !== undefined && h !== undefined && w <= 2 && h <= 2) return null;

  const image: NonNullable<CityNode["img"]> = { src };
  const alt = collapse(img.getAttribute("alt"));
  if (alt) image.alt = truncate(alt, 300);
  if (w) image.w = w;
  if (h) image.h = h;
  return image;
}

/** Adresse absolue http(s) d'une image, ou "" (data:, blob:, trop longue, illisible). */
function imageUrl(raw: string, base: string): string {
  const value = raw.trim();
  if (!value || /^(data|blob):/i.test(value)) return "";
  try {
    const resolved = new URL(value, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return "";
    return resolved.href.length <= LIMITS.maxUrl ? resolved.href : "";
  } catch {
    return "";
  }
}

function countLink(parent: CityNode, href: string | null, pageUrl: string, pageHost: string, tally: LinkTally) {
  if (!href) return;
  const value = href.trim();
  if (!value || value.startsWith("#") || /^(javascript|mailto|tel|data):/i.test(value)) return;
  let target: URL;
  try {
    target = new URL(value, pageUrl);
  } catch {
    return;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") return;
  const links = (parent.links ??= { internal: 0, external: 0 });
  if (isSameSite(pageHost, target.hostname)) {
    links.internal += 1;
    const key = linkKey(target.pathname);
    if (key !== tally.self) tally.pages.set(key, (tally.pages.get(key) ?? 0) + 1);
  } else {
    links.external += 1;
    // Un intranet ou une machine locale ne se nomme pas dans une ville partagée.
    const host = siteHost(target.hostname);
    if (isPublicHost(host) && /^[a-z0-9.-]{1,253}$/.test(host)) tally.sites.set(host, (tally.sites.get(host) ?? 0) + 1);
  }
}

/** Masqué (display: none, visibility: hidden…), sans boîte à lui (display: contents), ou visible. */
function visibilityOf(el: Element, view: Window): "visible" | "hidden" | "contents" {
  const check = (el as HTMLElement).checkVisibility;
  if (typeof check !== "function") return "visible";
  if (check.call(el, { opacityProperty: false, visibilityProperty: true })) return "visible";
  return view.getComputedStyle(el).display === "contents" ? "contents" : "hidden";
}

/** Ce que la page a chargé, ses scripts, ses commentaires et ses couleurs. */
function pageFacts(
  doc: Document,
  view: Window,
  base: string,
  pageHost: string,
  colors: (value: string) => string | undefined,
  background: string | undefined,
): CityPage {
  let scripts = 0;
  for (const script of Array.from(doc.getElementsByTagName("script"))) {
    const type = (script.getAttribute("type") ?? "").trim().toLowerCase();
    if (!type || type === "module" || type.includes("javascript")) scripts += 1;
  }

  let comments = 0;
  const walker = doc.createTreeWalker(doc, SHOW_COMMENT);
  while (walker.nextNode()) comments += 1;

  const page: CityPage = { domSize: doc.getElementsByTagName("*").length, scripts, comments };

  // Hôtes tiers : ressources mesurées par le navigateur, plus les scripts, cadres et styles de la page.
  const hosts = new Map<string, number>();
  const siteRoot = rootDomain(pageHost);
  const note = (raw: string | null) => {
    if (!raw) return;
    try {
      const url = new URL(raw, base);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      const host = url.hostname.toLowerCase();
      if (!/^[a-z0-9.-]{1,253}$/.test(host) || rootDomain(host) === siteRoot) return;
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
    } catch {
      // adresse illisible : ignorée
    }
  };

  const perf = view.performance;
  const resources = typeof perf?.getEntriesByType === "function" ? perf.getEntriesByType("resource") : [];
  let bytes = 0;
  for (const entry of resources) {
    note(entry.name);
    bytes += (entry as PerformanceResourceTiming).transferSize || 0;
  }
  const navigation = typeof perf?.getEntriesByType === "function" ? perf.getEntriesByType("navigation")[0] : undefined;
  bytes += (navigation as PerformanceNavigationTiming | undefined)?.transferSize || 0;
  if (resources.length > 0) page.resources = resources.length;
  if (bytes > 0) page.bytes = Math.round(bytes);

  for (const el of Array.from(doc.querySelectorAll("script[src], iframe[src]"))) note(el.getAttribute("src"));
  for (const el of Array.from(doc.querySelectorAll("link[rel~='stylesheet'][href]"))) note(el.getAttribute("href"));
  if (hosts.size > 0) {
    page.thirdParty = [...hosts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, LIMITS.maxThirdParty)
      .map(([host]) => host);
  }

  const palette: NonNullable<CityPage["colors"]> = {};
  if (background) palette.background = background;
  const text = doc.body ? colors(view.getComputedStyle(doc.body).color) : undefined;
  if (text) palette.text = text;
  const link = doc.querySelector("main a[href], article a[href], a[href]");
  const linkColor = link ? colors(view.getComputedStyle(link).color) : undefined;
  if (linkColor) palette.link = linkColor;
  if (Object.keys(palette).length > 0) page.colors = palette;

  return page;
}

const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i;

/**
 * Couleur calculée → #rrggbb, ou undefined si elle est (presque) transparente.
 * Les couleurs modernes (oklch, color()…) passent par un pixel de canevas. Résultats mis en cache.
 */
function colorReader(doc: Document): (value: string) => string | undefined {
  const cache = new Map<string, string | undefined>();
  let ctx: CanvasRenderingContext2D | null | undefined;

  return (value) => {
    if (cache.has(value)) return cache.get(value);
    let rgba: [number, number, number, number] | null = null;
    const match = RGB.exec(value);
    if (match) {
      const alpha = match[4] === undefined ? 1 : Number(match[4]) / (match[5] ? 100 : 1);
      rgba = [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
    } else if (value && value !== "transparent") {
      if (ctx === undefined) {
        try {
          const canvas = doc.createElement("canvas");
          canvas.width = canvas.height = 1;
          ctx = canvas.getContext("2d", { willReadFrequently: true });
        } catch {
          ctx = null;
        }
      }
      if (ctx) {
        try {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "#000";
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          rgba = [r, g, b, a / 255];
        } catch {
          rgba = null;
        }
      }
    }
    const hex =
      rgba && rgba[3] >= 0.5
        ? `#${rgba
            .slice(0, 3)
            .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
            .join("")}`
        : undefined;
    cache.set(value, hex);
    return hex;
  };
}

function addText(node: CityNode, length: number) {
  if (length > 0) node.text = (node.text ?? 0) + length;
}

function textLength(value: string | null): number {
  if (!value) return 0;
  return value.replace(/\s+/g, " ").trim().length;
}

function collapse(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function numberAttr(el: Element, name: string): number | undefined {
  const value = Number.parseFloat(el.getAttribute(name) ?? "");
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** id ou classe lisible. Les identifiants générés (mwAB, :r1:, css-1x2y3z…) ne disent rien : on les saute. */
export function labelOf(el: Element): string | undefined {
  const id = el.getAttribute("id")?.trim();
  if (id && !looksGenerated(id)) return `#${id.slice(0, 40)}`;
  const firstClass = el.getAttribute("class")?.trim().split(/\s+/)[0];
  if (firstClass && !looksGenerated(firstClass)) return `.${firstClass.slice(0, 40)}`;
  return undefined;
}

function looksGenerated(value: string): boolean {
  return (
    /^mw[A-Za-z0-9_-]{1,8}$/.test(value) ||
    value.startsWith(":") ||
    /^(css|sc|jsx|svelte|emotion)-[a-z0-9]{4,}$/i.test(value) ||
    /[0-9a-f]{8,}/i.test(value) ||
    value.length > 48
  );
}
