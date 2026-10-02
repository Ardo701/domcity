"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fetchWikipediaCity, WikiNotFoundError, wikiPath, type WikiLang } from "@/capture/wikipedia";
import { describeLot } from "@/city/describe";
import { layoutCity, type CityLayout } from "@/city/layout";
import type { ImageStatus } from "@/city/textures";
import type { CityView, ViewMode, WalkState } from "@/city/view";
import { sitePath, type CityVersion, type SharedCity } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { loadSharedCity } from "@/ui/loadShared";
import { LogoMark } from "@/ui/Logo";
import { WikiSearch } from "@/ui/WikiSearch";
import { Cartouche } from "./Cartouche";
import { ImageViewer } from "./ImageViewer";
import { Inspector } from "./Inspector";
import { LegendPanel } from "./LegendPanel";
import { LoadingPanel } from "./LoadingPanel";
import { NorthArrow } from "./NorthArrow";
import { ReportPanel } from "./ReportPanel";
import { SharePanel } from "./SharePanel";
import { Tooltip } from "./Tooltip";
import { WalkOverlay } from "./WalkOverlay";
import styles from "./explorer.module.css";

/** D'où vient la ville : un article relevé à l'instant, ou une ville déjà partagée. */
export type CitySource =
  | { kind: "wikipedia"; lang: WikiLang; title: string }
  | { kind: "shared"; city: SharedCity; fileUrl: string; versions: CityVersion[] };

type Status =
  | { phase: "loading"; step: number }
  | { phase: "ready" }
  | { phase: "error"; title: string; message: string };

const WIKI_STEPS = ["Relevé de l'article sur Wikipédia", "Tracé du plan et des rues", "Construction", "Mise en lumière"];
const SHARED_STEPS = ["Ouverture de la ville partagée", "Tracé du plan et des rues", "Construction", "Mise en lumière"];

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

/** Une instance par ville (voir la clé dans les pages) : l'état repart de zéro à chaque relevé. */
export function CityExplorer({ source, canShare = false }: { source: CitySource; canShare?: boolean }) {
  const router = useRouter();
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
  const [panel, setPanel] = useState<"share" | "report" | null>(null);
  const [copied, setCopied] = useState(false);
  const canWalk = useSyncExternalStore(subscribePointer, hasFinePointer, () => true);

  const shared = source.kind === "shared" ? source : null;
  const wiki = source.kind === "wikipedia" ? source : null;
  // Clé stable du relevé : on ne recharge que si la ville demandée change.
  const sourceKey = shared ? `c/${shared.city.slug}` : `w/${wiki!.lang}/${wiki!.title}`;

  useEffect(() => {
    const controller = new AbortController();
    let view: CityView | null = null;
    let cancelled = false;

    (async () => {
      try {
        let cityDoc: CityDoc;
        if (source.kind === "shared") {
          cityDoc = await loadSharedCity(source.fileUrl, controller.signal);
        } else {
          const result = await fetchWikipediaCity(source.lang, source.title, controller.signal);
          if (result.title !== source.title) {
            // Titre exact après redirection : on corrige l'adresse sans recharger.
            window.history.replaceState(null, "", wikiPath(source.lang, result.title));
          }
          cityDoc = result.doc;
        }
        if (cancelled) return;
        setDoc(cityDoc);
        setStatus({ phase: "loading", step: 1 });
        await nextFrame();

        const cityLayout = layoutCity(cityDoc);
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

        if (source.kind === "shared") countView(source.city.slug);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        if (error instanceof WikiNotFoundError) {
          setStatus({ phase: "error", title: "Terrain introuvable", message: error.message });
        } else if (source.kind === "shared") {
          setStatus({
            phase: "error",
            title: "Ville inaccessible",
            message: "Le fichier de cette ville n'a pas pu être chargé. Réessayez dans un instant.",
          });
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
    // La source est figée pour une instance (clé dans la page) : sourceKey suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

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
  const takeSnapshot = useCallback(
    () => viewRef.current?.snapshot(doc?.title ?? "", (doc?.url ?? "").replace(/^https:\/\//, "")) ?? Promise.resolve(null),
    [doc],
  );
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // presse-papiers refusé : l'adresse reste dans la barre du navigateur
    }
  };

  const ready = status.phase === "ready";
  const host = shared ? shared.city.domain : `${wiki!.lang}.wikipedia.org`;
  const displayTitle = doc?.title ?? (shared ? shared.city.title : wiki!.title);
  const sourceUrl = doc?.url ?? (shared ? `https://${shared.city.domain}${shared.city.path}` : "");

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
          {shared ? (
            <Link href={sitePath(host)} className="mono-caps" title="Toutes les pages de ce site">
              {host}
            </Link>
          ) : (
            <span className="mono-caps">{host}</span>
          )}
          <h1 title={displayTitle}>{displayTitle}</h1>
        </div>
        <div className={styles.search}>
          <WikiSearch compact initialLang={wiki?.lang ?? "fr"} />
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
          {wiki && canShare && mode === "aerial" && (
            <button type="button" className={`${styles.tool} ${styles.toolAccent}`} onClick={() => setPanel("share")}>
              Partager
            </button>
          )}
          {shared && (
            <>
              <button type="button" className={styles.tool} onClick={copyLink}>
                {copied ? "Lien copié" : "Copier le lien"}
              </button>
              <button type="button" className={styles.tool} onClick={() => setPanel("report")}>
                Signaler
              </button>
            </>
          )}
        </div>
      )}

      {ready && legendOpen && <LegendPanel onClose={() => setLegendOpen(false)} />}

      {ready && layout && doc && mode === "aerial" && (
        <Cartouche
          title={doc.title}
          url={sourceUrl}
          capturedAt={doc.capturedAt}
          stats={layout.stats}
          shared={shared ? { views: shared.city.views } : undefined}
          versions={shared && shared.versions.length > 1 ? shared.versions : undefined}
          currentSlug={shared?.city.slug}
          onPickVersion={(slug) => router.push(`/c/${slug}`)}
        />
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

      {panel === "share" && wiki && doc && (
        <SharePanel doc={doc} lang={wiki.lang} title={doc.title} takeSnapshot={takeSnapshot} onClose={() => setPanel(null)} />
      )}

      {panel === "report" && shared && <ReportPanel slug={shared.city.slug} onClose={() => setPanel(null)} />}

      {status.phase === "loading" && (
        <LoadingPanel
          title={displayTitle}
          step={status.step}
          count={layout?.lots.length}
          steps={shared ? SHARED_STEPS : WIKI_STEPS}
        />
      )}

      {status.phase === "error" && (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            <p className="mono-caps">Erreur de relevé</p>
            <h2>{status.title}</h2>
            <p>{status.message}</p>
            <WikiSearch initialLang={wiki?.lang ?? "fr"} />
            <Link href="/" className={styles.back}>
              ← Retour à l&apos;accueil
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}

/** Une visite par ville et par session de navigateur. */
function countView(slug: string) {
  const key = `domcity:vue:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // stockage indisponible : on compte quand même
  }
  const url = `/api/captures/${slug}/view`;
  if (!navigator.sendBeacon?.(url)) void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}
