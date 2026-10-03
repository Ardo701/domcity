"use client";

import Link, { useLinkStatus } from "next/link";
import { useId, type ReactNode } from "react";
import styles from "./InkLink.module.css";
import { LogoLoader } from "./LogoLoader";

/**
 * Le bouton principal de DOMCity (« Créer une ville » sur l'accueil) : blanc cassé, et au survol l'orange
 * tombe au centre comme une goutte et s'étale jusqu'aux bords, au bord ondulé par un bruit.
 * Chaque bouton a son propre filtre SVG : deux boutons sur une même page ne partagent pas d'identifiant.
 * Pendant que la page visée se charge, le repère se bâtit et tombe à la place de la flèche.
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
  /** « large » : l'accueil ; « small » : les fenêtres (réception du favori, site refusé). */
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

/** La flèche, ou le repère animé tant que la navigation n'est pas finie (useLinkStatus : dans le lien). */
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
