"use client";

import Link, { useLinkStatus } from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./InkLink.module.css";
import { LogoLoader } from "./LogoLoader";

/**
 * The main DOMCity button ("Créer une ville" on the home page): off-white, and on hover the orange
 * drops into the center like a drop and spreads to the edges, its edge rippling with noise.
 * Each button has its own SVG filter: two buttons on the same page do not share an identifier.
 * While the target page loads, the logo builds itself and falls in place of the arrow.
 */
export function InkLink({
  href,
  children,
  size = "large",
  arrow = false,
  className,
}: {
  href: string;
  children: ReactNode;
  /** "large": the home page; "small": dialogs (bookmarklet reception, refused site). */
  size?: "large" | "small";
  arrow?: boolean;
  className?: string;
}) {
  const filter = `encre-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Link href={href} className={`${styles.ink} ${size === "small" ? styles.small : ""} ${className ?? ""}`}>
      <svg className={styles.filter} aria-hidden focusable="false">
        <filter id={filter} x="-50%" y="-200%" width="200%" height="500%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="bruit" />
          <feDisplacementMap in="SourceGraphic" in2="bruit" scale={18} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span aria-hidden className={styles.stain} style={{ filter: `url(#${filter})` }} />
      {children}
      <Trailing arrow={arrow} />
    </Link>
  );
}

/** The arrow, or the animated logo until the navigation is done (useLinkStatus: inside the link). */
function Trailing({ arrow }: { arrow: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span aria-hidden className={styles.loading}>
        <LogoLoader size={32} />
      </span>
    );
  }
  return arrow ? (
    <span aria-hidden className={styles.arrow}>
      →
    </span>
  ) : null;
}
