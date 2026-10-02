"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fetchWikipediaCity, WikiNotFoundError, wikiPath, type WikiLang } from "@/capture/wikipedia";
import { describeLot } from "@/city/describe";
import { layoutCity, type CityLayout } from "@/city/layout";
import type { ImageStatus } from "@/city/textures";
import type { CityView, ViewMode, WalkState } from "@/city/view";
import type { CityDoc } from "@/format/types";
import { LogoMark } from "@/ui/Logo";
import { WikiSearch } from "@/ui/WikiSearch";
import { Cartouche } from "./Cartouche";
import { ImageViewer } from "./ImageViewer";
import { Inspector } from "./Inspector";
import { LegendPanel } from "./LegendPanel";
import { LoadingPanel, LOADING_STEPS } from "./LoadingPanel";
import { NorthArrow } from "./NorthArrow";
import { Tooltip } from "./Tooltip";
import { WalkOverlay } from "./WalkOverlay";
import styles from "./explorer.module.css";

type Status =
  | { phase: "loading"; step: number }
  | { phase: "ready" }
  | { phase: "error"; title: string; message: string };

/** Laisse le navigateur afficher l'étape en cours. Le minuteur prend le relais dans un onglet en arrière-plan, où requestAnimationFrame est suspendu. */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 60);
  });

// La promenade capture la souris : pas de sens sur un écran tactile.
const COARSE = "(pointer: coarse)";
const subscribePointer = (onChange: () => void) => {
  const query = matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const hasFinePointer = () => !matchMedia(COARSE).matches;

/** Une instance par article (voir la clé dans la page) : l'état repart de zéro à chaque relevé. */
export function CityExplorer({ lang, title }: { lang: WikiLang; title: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<CityView | null>(null);
  const [status, setStatus] = useState<Status>({ phase: "loading", step: 0 });
  const [doc, setDoc] = useState<CityDoc | null>(null);
  const [layout, setLayout] = useState<CityLayout | null>(null);
  const [hover, setHover] = useState<{ id: number; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<ViewMode>("aerial");
  const [walking, setWalking] = useState<WalkState>("off");
  const [legendOpen, setLegendOpen] = useState(false);
  const [imageStatus, setImageStatus] = useState<Record<number, ImageStatus>>({});
  const [viewing, setViewing] = useState<number | null>(null);
  const canWalk = useSyncExternalStore(subscribePointer, hasFinePointer, () => true);

  useEffect(() => {
    const controller = new AbortController();
    let view: CityView | null = null;
    let cancelled = false;

    (async () => {
      try {
        const result = await fetchWikipediaCity(lang, title, controller.signal);
        if (cancelled) return;
        if (result.title !== title) {
          // Titre exact après redirection : on corrige l'adresse sans recharger.
          window.history.replaceState(null, "", wikiPath(lang, result.title));
        }
        setDoc(result.doc);
        setStatus({ phase: "loading", step: 1 });
        await nextFrame();

        const cityLayout = layoutCity(result.doc);
        if (cancelled) return;
        setLayout(cityLayout);
        setStatus({ phase: "loading", step: 2 });
        await nextFrame();

        const { CityView } = await import("@/city/view");
        if (cancelled || !stageRef.current) return;
        view = new CityView(stageRef.current, cityLayout, {
          onHover: (id, screen) => setHover(id === null ? null : { id, x: screen?.x ?? -1, y: screen?.y ?? -1 }),
          onSelect: setSelected,
          onModeChange: setMode,
          onWalkChange: setWalking,
          onImageStatus: (id, s) => setImageStatus((prev) => ({ ...prev, [id]: s })),
        });
        viewRef.current = view;
        setStatus({ phase: "loading", step: 3 });
        await nextFrame();
        if (!cancelled) setStatus({ phase: "ready" });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        if (error instanceof WikiNotFoundError) {
          setStatus({ phase: "error", title: "Terrain introuvable", message: error.message });
        } else {
          setStatus({
            phase: "error",
            title: "Relevé interrompu",
            message: "Wikipédia n'a pas pu être joint. Vérifiez votre connexion, puis réessayez.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      view?.dispose();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, [lang, title]);

  const hoverInfo = useMemo(
    () => (layout && hover ? describeLot(layout, hover.id) : null),
    [layout, hover],
  );
  const selectedInfo = useMemo(
    () => (layout && selected !== null ? describeLot(layout, selected) : null),
    [layout, selected],
  );

  const select = useCallback((id: number | null, focus = false) => viewRef.current?.select(id, focus), []);
  const switchMode = (next: ViewMode) => {
    setLegendOpen(false);
    viewRef.current?.setMode(next);
  };

  const ready = status.phase === "ready";
  const sourceUrl = doc?.url ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;

  return (
    <div className={styles.shell}>
      <div ref={stageRef} className={styles.stage} />

      <header className={styles.bar}>
        <Link href="/" className={styles.home} aria-label="DOMCity, accueil">
          <LogoMark size={26} />
          <span>
            DOM<b>City</b>
          </span>
        </Link>
        <div className={styles.place}>
          <span className="mono-caps">{lang}.wikipedia.org</span>
          <h1 title={doc?.title ?? title}>{doc?.title ?? title}</h1>
        </div>
        <div className={styles.search}>
          <WikiSearch compact initialLang={lang} />
        </div>
      </header>

      {ready && (
        <div className={styles.tools}>
          {canWalk && (
            <div className={styles.segmented} role="group" aria-label="Façon de visiter">
              <button type="button" aria-pressed={mode === "aerial"} onClick={() => switchMode("aerial")}>
                Vue aérienne
              </button>
              <button type="button" aria-pressed={mode === "walk"} onClick={() => switchMode("walk")}>
                Promenade
              </button>
            </div>
          )}
          {mode === "aerial" && (
            <button type="button" className={styles.tool} onClick={() => viewRef.current?.resetView()}>
              Recadrer
            </button>
          )}
          <button
            type="button"
            className={styles.tool}
            aria-expanded={legendOpen}
            onClick={() => setLegendOpen((open) => !open)}
          >
            Légende
          </button>
        </div>
      )}

      {ready && legendOpen && <LegendPanel onClose={() => setLegendOpen(false)} />}

      {ready && layout && doc && mode === "aerial" && (
        <Cartouche title={doc.title} url={sourceUrl} capturedAt={doc.capturedAt} stats={layout.stats} />
      )}

      {ready && <NorthArrow />}

      {ready && mode === "aerial" && (
        <p className={`${styles.hint} mono-caps`}>
          Glisser : se déplacer · Clic droit : tourner · Molette : zoomer · Clic : inspecter · Double-clic : approcher
        </p>
      )}

      {ready && mode === "walk" && (
        <WalkOverlay
          state={walking}
          onStart={() => viewRef.current?.startWalk()}
          onLeave={() => switchMode("aerial")}
        />
      )}

      {ready && hoverInfo && hover && (hover.x >= 0 || walking === "locked") && (
        <Tooltip info={hoverInfo} x={hover.x} y={hover.y} centered={walking === "locked"} />
      )}

      {ready && selectedInfo && (
        <Inspector
          info={selectedInfo}
          imageStatus={imageStatus[selectedInfo.id]}
          canFocus={mode === "aerial"}
          onClose={() => select(null)}
          onSelect={(id) => select(id)}
          onFocus={() => select(selectedInfo.id, true)}
          onViewImage={() => setViewing(selectedInfo.id)}
        />
      )}

      {viewing !== null && layout?.lots[viewing]?.node.img && (
        <ImageViewer image={layout.lots[viewing].node.img!} onClose={() => setViewing(null)} />
      )}

      {status.phase === "loading" && (
        <LoadingPanel
          title={doc?.title ?? title}
          step={status.step}
          count={layout?.lots.length}
          steps={LOADING_STEPS}
        />
      )}

      {status.phase === "error" && (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            <p className="mono-caps">Erreur de relevé</p>
            <h2>{status.title}</h2>
            <p>{status.message}</p>
            <WikiSearch initialLang={lang} />
            <Link href="/" className={styles.back}>
              ← Retour à l&apos;accueil
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
