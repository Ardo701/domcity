"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { CityView } from "@/city/view";
import styles from "./explorer.module.css";

/** Distance du « N » au centre de la rose, en pixels. */
const LETTER = 25;

/**
 * Le nord de la ville, c'est le haut de la page. La flèche tourne avec la caméra pour le montrer
 * où qu'on regarde ; le « N » la suit en restant droit. Un clic remet le nord en haut de l'écran.
 */
export function NorthArrow({ viewRef }: { viewRef: RefObject<CityView | null> }) {
  const needle = useRef<SVGGElement>(null);
  const letter = useRef<SVGTextElement>(null);

  // La vue ne redessine que quand la caméra bouge : on lit son cap à chaque image, sans repasser par React.
  useEffect(() => {
    let frame = 0;
    let last = Number.NaN;
    const follow = () => {
      frame = requestAnimationFrame(follow);
      const heading = viewRef.current?.heading;
      if (heading === undefined || heading === last) return;
      last = heading;
      const turn = (heading * Math.PI) / 180;
      needle.current?.setAttribute("transform", `rotate(${heading.toFixed(2)})`);
      letter.current?.setAttribute("x", (Math.sin(turn) * LETTER).toFixed(2));
      letter.current?.setAttribute("y", (-Math.cos(turn) * LETTER).toFixed(2));
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [viewRef]);

  return (
    <button
      type="button"
      className={styles.north}
      onClick={() => viewRef.current?.faceNorth()}
      title="Remettre le haut de la page en haut de l'écran"
      aria-label="Nord : haut de la page. Remettre le nord en haut de l'écran"
    >
      <svg width="64" height="64" viewBox="-32 -32 64 64" aria-hidden>
        <circle className={styles.northDial} r="17.5" />
        <g ref={needle}>
          <path d="M0 -15 L10 13 L0 6.5 L-10 13 Z" fill="#f6f3ec" stroke="#15151a" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M0 -15 L0 6.5 L-10 13 Z" fill="#15151a" />
        </g>
        <text
          ref={letter}
          x="0"
          y={-LETTER}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--display)"
          fontWeight="900"
          fontSize="13"
        >
          N
        </text>
      </svg>
      <span className="mono-caps">Haut de page</span>
    </button>
  );
}
