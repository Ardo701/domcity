"use client";

import { useLinkStatus } from "next/link";
import styles from "./Gallery.module.css";
import { LogoLoader } from "./LogoLoader";

/**
 * Sur la miniature d'une carte, pendant que sa page se charge : l'image se grise et le repère se bâtit, puis tombe.
 * Toujours présent (rien ne bouge dans la carte) ; l'animation n'est montée qu'au clic, pour repartir du début.
 */
export function CardPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={styles.pending} data-pending={pending ? "" : undefined}>
      {pending && <LogoLoader size={76} />}
    </span>
  );
}
