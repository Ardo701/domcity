"use client";

import { useEffect, useState, type RefObject } from "react";
import type { CityView, ViewStats } from "@/city/view";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import styles from "./explorer.module.css";

/** Smooth above 50 frames per second, fine above 30, slow below. */
function grade(fps: number): "good" | "fair" | "slow" {
  return fps >= 50 ? "good" : fps >= 30 ? "fair" : "slow";
}

/** FPS meter: frames per second, time per frame, weight of the scene. */
export function PerfMeter({ viewRef, shifted }: { viewRef: RefObject<CityView | null>; shifted: boolean }) {
  const m = useMessages(CITY).perf;
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
      aria-label={m.label}
      title={m.title}
    >
      <p className={styles.perfFps} data-grade={stats && !paused ? grade(stats.fps) : undefined}>
        <strong>{stats ? stats.fps : "…"}</strong>
        <span className="mono-caps">{paused ? m.hiddenTab : "FPS"}</span>
      </p>
      <dl className={styles.perfFacts}>
        <div>
          <dt className="mono-caps">{m.frame}</dt>
          <dd>{stats && stats.frameMs > 0 ? m.ms(stats.frameMs) : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">{m.compute}</dt>
          <dd>{stats ? m.ms(stats.renderMs) : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">{m.triangles}</dt>
          <dd>{stats ? m.thousands(stats.triangles / 1000) : "…"}</dd>
        </div>
        <div>
          <dt className="mono-caps">{m.calls}</dt>
          <dd>{stats ? m.count(stats.calls) : "…"}</dd>
        </div>
      </dl>
    </section>
  );
}
