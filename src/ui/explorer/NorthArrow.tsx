"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { CityView } from "@/city/view";
import styles from "./explorer.module.css";

/** Distance from the "N" to the center of the compass rose, in pixels. */
const LETTER = 25;

/**
 * The city's north is the top of the page. The arrow turns with the camera to show it
 * wherever we look; the "N" follows it while staying upright. A click puts north back at the top of the screen.
 */
export function NorthArrow({ viewRef }: { viewRef: RefObject<CityView | null> }) {
  const needle = useRef<SVGGElement>(null);
  const letter = useRef<SVGTextElement>(null);

  // The view only redraws when the camera moves: its heading is read every frame, without going through React.
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
