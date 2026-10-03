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
 * jsdom does no layout: we imitate what the browser answers to the capture.
 * checkVisibility follows the browser's rule (hidden if an ancestor is display: none,
 * no box for display: contents); each element gets the box given by `boxOf`.
 * Returns the function that puts jsdom back as it was.
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
