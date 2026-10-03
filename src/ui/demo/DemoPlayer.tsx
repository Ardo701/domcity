"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const LABEL =
  "Démonstration : sur la page Créer une ville, on glisse le bouton DOMCity dans la barre de favoris ; on ouvre un site, " +
  "on clique sur le favori qui relève la page ; DOMCity l'ouvre dans un nouvel onglet, où la page se couche en plan puis " +
  "sort de terre en ville.";

/**
 * La démonstration de bout en bout, en boucle. Elle ne tourne que visible à l'écran ; les étapes y mènent,
 * et un bouton l'arrête. Si l'on a demandé moins d'animations, elle reste arrêtée sur la ville (les étapes
 * montrent chacune leur image, le bouton la lance).
 */
export function DemoPlayer({ city }: { city: DemoCity }) {
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED).matches, () => false);
  // « auto » : elle tourne, sauf si l'on a demandé moins d'animations.
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
      // Au retour d'un onglet en arrière-plan, on reprend où l'on en était, sans saut.
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setTime((value) => (value + dt) % DURATION);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, visible]);

  // En développement : window.__demo(7.7) arrête la démonstration sur un instant, pour l'examiner.
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
        <DemoScene t={t} city={city} label={LABEL} />
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
                  <b>{step.n}</b> {step.label}
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
          aria-label={playing ? "Mettre la démonstration en pause" : "Lancer la démonstration"}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden>
            {playing ? <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" /> : <path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor" />}
          </svg>
        </button>
      </div>
    </figure>
  );
}
