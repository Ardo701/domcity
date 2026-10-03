"use client";

import { useLinkStatus } from "next/link";
import styles from "./Gallery.module.css";
import { LogoLoader } from "./LogoLoader";

/**
 * On a card's thumbnail, while its page loads: the image turns gray and the logo builds itself, then falls.
 * Always present (nothing moves in the card); the animation is only mounted on click, to restart from the beginning.
 */
export function CardPending() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={styles.pending} data-pending={pending ? "" : undefined}>
      {pending && <LogoLoader size={76} />}
    </span>
  );
}
