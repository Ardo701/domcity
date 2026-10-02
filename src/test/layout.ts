import { vi } from "vitest";

type Box = { left: number; top: number; width: number; height: number };

function isRendered(element: Element): boolean {
  if (getComputedStyle(element).display === "contents") return false;
  for (let el: Element | null = element; el; el = el.parentElement) {
    if (getComputedStyle(el).display === "none") return false;
  }
  return true;
}

/**
 * jsdom ne fait aucune mise en page : on imite ce que le navigateur répond au relevé.
 * checkVisibility suit la règle du navigateur (masqué si un ancêtre est en display: none,
 * pas de boîte en display: contents) ; chaque élément reçoit la boîte donnée par `boxOf`.
 * Renvoie la fonction qui remet jsdom en l'état.
 */
export function mimicBrowserLayout(boxOf: (el: Element) => Box = () => ({ left: 10, top: 20, width: 300, height: 40 })) {
  const proto = Element.prototype as { checkVisibility?: (this: Element) => boolean };
  const original = proto.checkVisibility;
  proto.checkVisibility = function () {
    return isRendered(this);
  };
  const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const { left, top, width, height } = boxOf(this);
    return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) };
  });
  return () => {
    rect.mockRestore();
    if (original) proto.checkVisibility = original;
    else delete proto.checkVisibility;
  };
}
