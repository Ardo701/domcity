/**
 * Relevé d'une page : Document → ville (JSON).
 *
 * Fonctionne sur un document analysé (Wikipédia via DOMParser) comme sur la
 * page affichée (bookmarklet, avec `withLayout`). Aucune dépendance : ce
 * fichier sera compilé tel quel dans le bookmarklet.
 */

import { LIMITS } from "@/format/limits";
import { HEADING_TEXT_TAGS, KEPT_TAGS, LEAF_TAGS, SKIPPED_TAGS } from "@/format/taxonomy";
import { FORMAT_VERSION, type CaptureSource, type CityDoc, type CityNode } from "@/format/types";
import { isSameSite, normalizePageUrl } from "@/format/url";

export interface CaptureOptions {
  source: CaptureSource;
  /** Adresse de la page, pour résoudre les liens et les images relatifs. */
  url: string;
  title?: string;
  lang?: string;
  /** Lire la mise en page réelle (positions, éléments masqués). Seulement sur une page affichée. */
  withLayout?: boolean;
  now?: Date;
}

/** Dans un tableau, seuls ces éléments deviennent des bâtiments ; le reste est du texte de champ. */
const KEPT_IN_TABLE = new Set(["img", "video", "canvas", "iframe", "svg"]);

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

interface Frame {
  node: Node;
  parent: CityNode;
  depth: number;
  inTable: boolean;
}

export function captureDocument(doc: Document, options: CaptureOptions): CityDoc {
  const address = normalizePageUrl(options.url);
  const pageUrl = address?.url ?? options.url;
  const pageHost = safeHostname(options.url);
  const root: CityNode = { tag: "body" };
  let budget = LIMITS.maxNodes - 1;

  const body = doc.body;
  if (body) {
    const label = labelOf(body);
    if (label) root.label = label;

    // Parcours en profondeur avec une pile : pas de récursion, même sur un DOM très profond.
    const stack: Frame[] = [];
    pushChildren(stack, body, root, 0, false);

    while (stack.length > 0) {
      const { node, parent, depth, inTable } = stack.pop()!;

      if (node.nodeType === TEXT_NODE) {
        addText(parent, textLength(node.nodeValue));
        continue;
      }
      if (node.nodeType !== ELEMENT_NODE) continue;

      const el = node as Element;
      const tag = el.localName.toLowerCase();
      if (SKIPPED_TAGS.has(tag)) continue;
      if (options.withLayout && isHidden(el)) continue;

      if (tag === "a") countLink(parent, el.getAttribute("href"), options.url, pageHost);

      const keep =
        KEPT_TAGS.has(tag) &&
        tag !== "body" &&
        budget > 0 &&
        depth < LIMITS.maxDepth &&
        (!inTable || KEPT_IN_TABLE.has(tag));

      if (!keep) {
        // Élément transparent : son texte et ses enfants remontent au parent gardé.
        pushChildren(stack, el, parent, depth, inTable);
        continue;
      }

      const city = describeElement(el, tag, options);
      if (!city) continue;
      budget -= 1;
      (parent.children ??= []).push(city);

      const isLeaf = LEAF_TAGS.has(tag) || /^h[1-6]$/.test(tag);
      if (!isLeaf) pushChildren(stack, el, city, depth + 1, inTable || tag === "table");
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
  if (options.lang) result.lang = options.lang;
  return result;
}

function pushChildren(stack: Frame[], el: Node, parent: CityNode, depth: number, inTable: boolean) {
  // À l'envers, pour dépiler dans l'ordre du document.
  const children = el.childNodes;
  for (let i = children.length - 1; i >= 0; i -= 1) {
    stack.push({ node: children[i], parent, depth, inTable });
  }
}

function describeElement(el: Element, tag: string, options: CaptureOptions): CityNode | null {
  const city: CityNode = { tag };
  const label = labelOf(el);
  if (label) city.label = label;

  if (/^h[1-6]$/.test(tag) || tag === "button" || tag === "textarea" || tag === "select") {
    const text = collapse(el.textContent);
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

  if (options.withLayout) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0 && tag !== "hr") return null;
    const view = el.ownerDocument.defaultView;
    city.rect = [
      Math.round(box.left + (view?.scrollX ?? 0)),
      Math.round(box.top + (view?.scrollY ?? 0)),
      Math.round(box.width),
      Math.round(box.height),
    ];
  }

  return city;
}

function describeImage(img: HTMLImageElement, options: CaptureOptions): CityNode["img"] | null {
  const raw = options.withLayout ? img.currentSrc || img.src : img.getAttribute("src") ?? "";
  let src = "";
  if (raw && !raw.startsWith("data:")) {
    try {
      const resolved = new URL(raw, options.url);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") src = resolved.href;
    } catch {
      src = "";
    }
  }
  if (src.length > LIMITS.maxUrl) src = "";

  let w: number | undefined;
  let h: number | undefined;
  if (options.withLayout) {
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

function countLink(parent: CityNode, href: string | null, pageUrl: string, pageHost: string) {
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
  if (isSameSite(pageHost, target.hostname)) links.internal += 1;
  else links.external += 1;
}

function isHidden(el: Element): boolean {
  const check = (el as HTMLElement).checkVisibility;
  if (typeof check === "function") {
    return !check.call(el, { opacityProperty: false, visibilityProperty: true });
  }
  return false;
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
