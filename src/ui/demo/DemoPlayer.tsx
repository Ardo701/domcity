"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useMessages } from "@/i18n/client";
import { DEMO } from "@/i18n/messages/demo";
import styles from "./Demo.module.css";
import { DemoScene } from "./DemoScene";
import type { DemoCity } from "./scene";
import { DURATION, STEPS, clamp01 } from "./timeline";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * The demo from start to finish, looping. It only runs while visible on screen; the steps lead to it,
 * and a button stops it. If reduced motion was requested, it stays stopped on the city (the steps
 * each show their frame, the button starts it).
 */
export function DemoPlayer({ city }: { city: DemoCity }) {
  const m = useMessages(DEMO);
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED).matches, () => false);
  // "auto": it runs, unless reduced motion was requested.
  const [mode, setMode] = useState<"auto" | "playing" | "paused">("auto");
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const still = mode === "auto" && reduced;
  const playing = mode === "playing" || (mode === "auto" && !reduced);
  const t = still ? STEPS[2].still : time;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      // When coming back from a background tab, we resume where we were, without a jump.
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setTime((value) => (value + dt) % DURATION);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, visible]);

  // In development: window.__demo(7.7) stops the demo on an instant, to examine it.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hook = window as unknown as { __demo?: (at: number) => void };
    hook.__demo = (at: number) => {
      setMode("paused");
      setTime(((at % DURATION) + DURATION) % DURATION);
    };
    return () => {
      delete hook.__demo;
    };
  }, []);

  const goTo = (step: (typeof STEPS)[number]) => {
    if (reduced && mode !== "playing") {
      setMode("paused");
      setTime(step.still);
    } else {
      setTime(step.from);
      if (mode === "paused") setMode("playing");
    }
  };

  return (
    <figure ref={ref} className={styles.demo}>
      <div className={styles.stage}>
        <DemoScene t={t} city={city} label={m.label} />
      </div>
      <div className={styles.controls}>
        <ol className={styles.steps}>
          {STEPS.map((step) => {
            const active = t >= step.from && t < step.to;
            const done = clamp01((t - step.from) / (step.to - step.from));
            return (
              <li key={step.n}>
                <button
                  type="button"
                  className={styles.step}
                  aria-current={active ? "step" : undefined}
                  onClick={() => goTo(step)}
                >
                  <b>{step.n}</b> {m.steps[step.n - 1]}
                  {playing && <span aria-hidden className={styles.progress} style={{ transform: `scaleX(${done})` }} />}
                </button>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className={styles.pause}
          onClick={() => setMode(playing ? "paused" : "playing")}
          aria-label={playing ? m.pause : m.play}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden>
            {playing ? <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" /> : <path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor" />}
          </svg>
        </button>
      </div>
    </figure>
  );
}
