import { useEffect, type RefObject } from "react";

/**
 * Les outils sont à droite de la barre du haut, et passent dessous quand la place manque :
 * sa hauteur change avec la largeur de l'écran. Les panneaux se placent sous elle grâce à la
 * variable `--bar-bottom`, posée sur le conteneur de la vue.
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
    // Le haut de la barre change aussi d'un écran à l'autre, sans qu'elle change de taille.
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [bar]);
}
