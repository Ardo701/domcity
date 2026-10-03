"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { fetchWikipediaCity, WikiNotFoundError, wikiPath, type WikiLang } from "@/capture/wikipedia";
import { describeLot } from "@/city/describe";
import { layoutCity, type CityLayout } from "@/city/layout";
import { isSpecial } from "@/city/world";
import type { ImageStatus } from "@/city/textures";
import type { CityView, HoverPart, ViewMode, WalkState } from "@/city/view";
import { cityRefusal, withoutBlocked } from "@/format/blocklist";
import { sharedCityPath, sitePath, type CityVersion, type SharedCity } from "@/format/shared";
import type { CityDoc } from "@/format/types";
import { isPublicHost, siteHost } from "@/format/url";
import { loadBlocklist } from "@/ui/blocklist";
import { InkLink } from "@/ui/InkLink";
import { loadSharedCity } from "@/ui/loadShared";
import { LogoMark } from "@/ui/Logo";
import { WikiSearch } from "@/ui/WikiSearch";
import { Cartouche } from "./Cartouche";
import { Departures } from "./Departures";
import { ImageViewer } from "./ImageViewer";
import { Inspector } from "./Inspector";
import { AmbiancePanel } from "./AmbiancePanel";
import { LegendPanel } from "./LegendPanel";
import { LoadingPanel } from "./LoadingPanel";
import { NorthArrow } from "./NorthArrow";
import { PerfMeter } from "./PerfMeter";
import { ReportPanel } from "./ReportPanel";
import { SharePanel } from "./SharePanel";
import { Tooltip } from "./Tooltip";
import { useBarBottom } from "./useBarBottom";
import { WalkOverlay } from "./WalkOverlay";
import styles from "./explorer.module.css";

/** Where the city comes from: an article captured just now, a page captured by the bookmarklet, or an already shared city. */
export type CitySource =
  | { kind: "wikipedia"; lang: WikiLang; title: string }
  | { kind: "capture"; city: CityDoc; outdated: boolean }
  | { kind: "shared"; city: SharedCity; fileUrl: string; versions: CityVersion[] };

type Status =
  | { phase: "loading"; step: number }
  | { phase: "ready" }
  | { phase: "error"; title: string; message: string; refused?: boolean };

const WIKI_STEPS = ["Relevé de l'article sur Wikipédia", "Tracé du plan et des rues", "Construction", "Mise en lumière"];
const SHARED_STEPS = ["Ouverture de la ville partagée", "Tracé du plan et des rues", "Construction", "Mise en lumière"];
const CAPTURE_STEPS = ["Lecture du relevé", "Tracé du plan et des rues", "Construction", "Mise en lumière"];

/** Lets the browser display the current step. The timer takes over in a background tab, where requestAnimationFrame is suspended. */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 60);
  });

// The walk captures the mouse: it makes no sense on a touch screen.
const COARSE = "(pointer: coarse)";
const subscribePointer = (onChange: () => void) => {
  const query = matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const hasFinePointer = () => !matchMedia(COARSE).matches;

/** The FPS meter stays shown from one city to the next, in this browser. */
const PERF_KEY = "domcity:fps";
function readPerf(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(PERF_KEY) === "1";
  } catch {
    return false;
  }
}

/** One instance per city (see the key in the pages): the state starts from zero at each capture. */
export function CityExplorer({ source, canShare = false }: { source: CitySource; canShare?: boolean }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  useBarBottom(barRef);
  const viewRef = useRef<CityView | null>(null);
  const [status, setStatus] = useState<Status>({ phase: "loading", step: 0 });
  const [doc, setDoc] = useState<CityDoc | null>(null);
  const [layout, setLayout] = useState<CityLayout | null>(null);
  const [hover, setHover] = useState<{ id: number; x: number; y: number; part: HoverPart } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<ViewMode>("aerial");
  const [walking, setWalking] = useState<WalkState>("off");
  const [legendOpen, setLegendOpen] = useState(false);
  const [ambianceOpen, setAmbianceOpen] = useState(false);
  const [realColors, setRealColors] = useState(false);
  const [imageStatus, setImageStatus] = useState<Record<number, ImageStatus>>({});
  const [viewing, setViewing] = useState<number | null>(null);
  const [panel, setPanel] = useState<"share" | "report" | null>(null);
  const [departures, setDepartures] = useState(false);
  const [copied, setCopied] = useState(false);
  const [measuring, setMeasuring] = useState(readPerf);
  const canWalk = useSyncExternalStore(subscribePointer, hasFinePointer, () => true);

  const shared = source.kind === "shared" ? source : null;
  const wiki = source.kind === "wikipedia" ? source : null;
  const capture = source.kind === "capture" ? source : null;
  // Stable key of the capture: we only reload if the requested city changes.
  const sourceKey = shared
    ? `c/${shared.city.slug}`
    : capture
      ? `n/${capture.city.url}/${capture.city.capturedAt}`
      : `w/${wiki!.lang}/${wiki!.title}`;

  useEffect(() => {
    const controller = new AbortController();
    let view: CityView | null = null;
    let cancelled = false;

    (async () => {
      try {
        // The list of refused sites downloads while the city arrives.
        const blocked = loadBlocklist();
        let cityDoc: CityDoc;
        if (source.kind === "shared") {
          cityDoc = await loadSharedCity(source.fileUrl, controller.signal);
        } else if (source.kind === "capture") {
          cityDoc = source.city;
        } else {
          const result = await fetchWikipediaCity(source.lang, source.title, controller.signal);
          if (result.title !== source.title) {
            // Exact title after redirect: we fix the address without reloading.
            window.history.replaceState(null, "", wikiPath(source.lang, result.title));
          }
          cityDoc = result.doc;
        }
        const list = await blocked;
        if (cancelled) return;
        const refusal = cityRefusal(cityDoc, list);
        if (refusal) {
          setStatus({ phase: "error", title: "Site refusé", message: refusal, refused: true });
          return;
        }
        // Images from refused sites are never requested, even in another site's city.
        cityDoc = withoutBlocked(cityDoc, list);
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
          onHover: (id, screen, part) =>
            setHover(id === null ? null : { id, x: screen?.x ?? -1, y: screen?.y ?? -1, part }),
          onSelect: (id) => {
            setSelected(id);
            if (id !== null) setDepartures(false);
          },
          onAirport: () => setDepartures(true),
          onModeChange: setMode,
          onWalkChange: setWalking,
          onImageStatus: (id, s) => setImageStatus((prev) => ({ ...prev, [id]: s })),
        });
        viewRef.current = view;
        view.setMeasuring(readPerf());
        // In development: the view is reachable from the console (rendering experiments, captures).
        if (process.env.NODE_ENV !== "production") (window as unknown as { __domcity?: CityView }).__domcity = view;
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
        } else if (source.kind === "capture") {
          setStatus({
            phase: "error",
            title: "Construction impossible",
            message: "Ce relevé n'a pas pu être bâti. Relancez le favori depuis la page, ou essayez une autre page.",
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
    // The source is fixed for an instance (key in the page): sourceKey is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const hoverInfo = useMemo(
    // The airport is not a lot: its tooltip reads from the plan, not the page.
    () => (layout && hover && !isSpecial(hover.part) ? describeLot(layout, hover.id) : null),
    [layout, hover],
  );
  const selectedInfo = useMemo(
    () => (layout && selected !== null ? describeLot(layout, selected) : null),
    [layout, selected],
  );

  const select = useCallback((id: number | null, focus = false) => viewRef.current?.select(id, focus), []);
  const toggleMeasuring = () => {
    const next = !measuring;
    setMeasuring(next);
    viewRef.current?.setMeasuring(next);
    try {
      localStorage.setItem(PERF_KEY, next ? "1" : "0");
    } catch {
      // storage refused: the setting holds for this visit only
    }
  };
  const switchMode = (next: ViewMode) => {
    setLegendOpen(false);
    setAmbianceOpen(false);
    viewRef.current?.setMode(next);
  };
  const takeSnapshot = useCallback(() => viewRef.current?.thumbnail() ?? Promise.resolve(null), []);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard refused: the address stays in the browser's address bar
    }
  };

  const ready = status.phase === "ready";
  const host = shared
    ? shared.city.domain
    : capture
      ? siteHost(new URL(capture.city.url).hostname)
      : `${wiki!.lang}.wikipedia.org`;
  const displayTitle = doc?.title ?? (shared ? shared.city.title : capture ? capture.city.title : wiki!.title);
  const sourceUrl = doc?.url ?? (shared ? `https://${shared.city.domain}${shared.city.path}` : "");
  // A local page (localhost, intranet...) can be visited, but not published.
  const shareable = canShare && (wiki !== null || (capture !== null && isPublicHost(host)));
  const kicker = shared
    ? shared.city.source === "bookmarklet"
      ? "Relevé par un visiteur"
      : "Ville partagée"
    : capture
      ? "Votre relevé · non publié"
      : "DOMCity · Planche";

  return (
    <div className={styles.shell}>
      <div ref={stageRef} className={styles.stage} />

      <header ref={barRef} className={styles.bar}>
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
        {/* The tools, on the right of the bar (below it on a narrow screen). */}
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
              onClick={() => {
                setAmbianceOpen(false);
                setLegendOpen((open) => !open);
              }}
            >
              Légende
            </button>
            {layout?.ambiance && (
              <button
                type="button"
                className={styles.tool}
                aria-expanded={ambianceOpen}
                onClick={() => {
                  setLegendOpen(false);
                  setAmbianceOpen((open) => !open);
                }}
              >
                Ambiance
              </button>
            )}
            <button
              type="button"
              className={styles.tool}
              aria-pressed={measuring}
              onClick={toggleMeasuring}
              title="Afficher les images par seconde"
            >
              FPS
            </button>
            {shareable && mode === "aerial" && (
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
      </header>

      {ready && legendOpen && <LegendPanel onClose={() => setLegendOpen(false)} />}
      {ready && ambianceOpen && layout?.ambiance && (
        <AmbiancePanel
          ambiances={[layout.ambiance.info]}
          realColors={realColors}
          onRealColors={(on) => {
            setRealColors(on);
            viewRef.current?.setRealColors(on);
          }}
          onClose={() => setAmbianceOpen(false)}
        />
      )}

      {ready && capture?.outdated && (
        <p className={styles.notice} role="status">
          Votre favori date d&apos;une version précédente. <Link href="/create">Réinstallez-le</Link> pour
          profiter des derniers relevés.
        </p>
      )}

      {ready && layout && doc && mode === "aerial" && (
        <Cartouche
          title={doc.title}
          url={sourceUrl}
          capturedAt={doc.capturedAt}
          stats={layout.stats}
          page={doc.page}
          kicker={kicker}
          kickerNote={
            shared?.city.source === "bookmarklet"
              ? "Relevé avec le favori DOMCity par un visiteur : DOMCity ne peut pas vérifier qu'il est fidèle à la page."
              : undefined
          }
          shared={shared ? { views: shared.city.views } : undefined}
          versions={shared && shared.versions.length > 1 ? shared.versions : undefined}
          currentSlug={shared?.city.slug}
          onPickVersion={(slug) => router.push(sharedCityPath(slug))}
        />
      )}

      {ready && <NorthArrow viewRef={viewRef} />}

      {ready && measuring && <PerfMeter viewRef={viewRef} shifted={selectedInfo !== null} />}

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

      {ready && hover && (hoverInfo || isSpecial(hover.part)) && (hover.x >= 0 || walking === "locked") && (
        <Tooltip
          info={hoverInfo}
          part={hover.part}
          x={hover.x}
          y={hover.y}
          centered={walking === "locked"}
        />
      )}

      {ready && departures && !selectedInfo && layout?.airport && (
        <Departures airport={layout.airport} scope="toute la page" onClose={() => setDepartures(false)} />
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

      {panel === "share" && (wiki || capture) && doc && (
        <SharePanel
          doc={doc}
          source={wiki ? { kind: "wikipedia", lang: wiki.lang } : { kind: "bookmarklet" }}
          takeSnapshot={takeSnapshot}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "report" && shared && <ReportPanel slug={shared.city.slug} onClose={() => setPanel(null)} />}

      {status.phase === "loading" && (
        <LoadingPanel
          title={displayTitle}
          step={status.step}
          count={layout?.lots.length}
          steps={shared ? SHARED_STEPS : capture ? CAPTURE_STEPS : WIKI_STEPS}
        />
      )}

      {status.phase === "error" && (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            {!status.refused && <p className="mono-caps">Erreur de relevé</p>}
            <h2>{status.title}</h2>
            <p>{status.message}</p>
            {status.refused ? (
              // As in /new: the home page button, the only way out of a refused site.
              <div className={styles.actionsRow}>
                <InkLink href="/" size="small">
                  Retour à l&apos;accueil
                </InkLink>
              </div>
            ) : (
              <>
                {/* A misspelled article: another one can be searched for. */}
                {wiki && <WikiSearch initialLang={wiki.lang} />}
                <Link href="/" className={styles.back}>
                  ← Retour à l&apos;accueil
                </Link>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** One visit per city and per browser session. */
function countView(slug: string) {
  const key = `domcity:vue:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // storage unavailable: we count anyway
  }
  const url = `/api/captures/${slug}/view`;
  if (!navigator.sendBeacon?.(url)) void fetch(url, { method: "POST", keepalive: true }).catch(() => undefined);
}
