import { useEffect, type RefObject } from "react";

/**
 * The tools are on the right of the top bar, and move below it when space runs out:
 * its height changes with the screen width. The panels go below it thanks to the
 * `--bar-bottom` variable, set on the view's container.
 */
export function useBarBottom(bar: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = bar.current;
    const shell = el?.parentElement;
    if (!el || !shell) return;
    const update = () => shell.style.setProperty("--bar-bottom", `${Math.round(el.offsetTop + el.offsetHeight)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // The top of the bar also changes from one screen to another, without the bar changing size.
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [bar]);
}
