"use client";

import { useEffect, useState, type RefObject } from "react";
import { formatCount } from "@/city/describe";
import type { CityView, ViewStats } from "@/city/view";
import styles from "./explorer.module.css";

const ms = (value: number) => `${value.toFixed(1).replace(".", ",")} ms`;

/** Smooth above 50 frames per second, fine above 30, slow below. */
function grade(fps: number): "bon" | "moyen" | "lent" {
  return fps >= 50 ? "bon" : fps >= 30 ? "moyen" : "lent";
}

/** FPS meter: frames per second, time per frame, weight of the scene. */
export function PerfMeter({ viewRef, shifted }: { viewRef: RefObject<CityView | null>; shifted: boolean }) {
  const [stats, setStats] = useState<ViewStats | null>(null);
  // Hidden tab: the browser suspends drawing, the meter drops to zero through no fault of the city.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const view = viewRef.current;
      if (view) setStats(view.stats());
      setPaused(document.visibilityState === "hidden");
    }, 500);
    return () => clearInterval(timer);
  }, [viewRef]);

  return (
    <section
      className={`${styles.perf} ${shifted ? styles.perfShifted : ""}`}
      aria-label="Performances du rendu"
      title="Mesure en continu : tant que le compteur est affiché, la ville est redessinée à chaque image."
    >
      <p className={styles.perfFps} data-grade={stats && !paused ? grade(stats.fps) : undefined}>
        <strong>{stats ? stats.fps : "…"}</strong>
        <span className="mono-caps">{paused ? "FPS · onglet caché" : "FPS"}</span>
      </p>
      <dl className={styles.perfFacts}>
        <div>
          <dt className="mono-caps">Image</dt>
          <dd>{stats && stats.frameMs > 0 ? ms(stats.frameMs) : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">Calcul</dt>
          <dd>{stats ? ms(stats.renderMs) : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">Triangles</dt>
          <dd>{stats ? `${formatCount(stats.triangles / 1000)} k` : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">Appels</dt>
          <dd>{stats ? formatCount(stats.calls) : "…"}</dd>
        </div>
      </dl>
    </section>
  );
}
