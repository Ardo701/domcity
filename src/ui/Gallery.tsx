import Link from "next/link";
import type { ReactNode } from "react";
import { CardPending } from "./CardPending";
import styles from "./Gallery.module.css";

/** A grid of thumbnail cards: the gallery's sites, a site's pages. */
export function Gallery({ children }: { children: ReactNode }) {
  return <ul className={styles.grid}>{children}</ul>;
}

export function GalleryCard({
  href,
  thumb,
  title,
  where,
  meta,
}: {
  href: string;
  /** Address of the thumbnail, or null: hatching instead. */
  thumb: string | null;
  title: string;
  where: string;
  meta: string;
}) {
  return (
    <li>
      <Link href={href} className={styles.card}>
        <span className={styles.thumb}>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" />
          )}
          <CardPending />
        </span>
        <span className={styles.body}>
          <span className={styles.title}>{title}</span>
          <span className={styles.where}>{where}</span>
          <span className={`${styles.meta} mono-caps`}>{meta}</span>
        </span>
      </Link>
    </li>
  );
}

/** An empty slot in the grid: what is not captured yet, and how to capture it. */
export function GalleryGap({ label, title, where, children }: { label: string; title: string; where: string; children: ReactNode }) {
  return (
    <li>
      <div className={`${styles.card} ${styles.gap}`}>
        <span className={styles.thumb}>
          <span className={`${styles.gapLabel} mono-caps`}>{label}</span>
        </span>
        <span className={styles.body}>
          <span className={styles.title}>{title}</span>
          <span className={styles.where}>{where}</span>
          <span className={styles.gapText}>{children}</span>
        </span>
      </div>
    </li>
  );
}

export function GalleryEmpty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
