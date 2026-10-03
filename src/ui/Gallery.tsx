import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Gallery.module.css";

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Une grille de cartes à miniature : les sites de la galerie, les pages d'un site. */
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
  /** Adresse de la miniature, ou null : des hachures à la place. */
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

/** Une place vide dans la grille : ce qui n'est pas encore relevé, et comment le relever. */
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
