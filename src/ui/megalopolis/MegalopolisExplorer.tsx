"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { describeLot, formatCount } from "@/city/describe";
import { citySide, externalLinks, hasAerodrome, layoutCity, type Airport } from "@/city/layout";
import { buildMegalopolis, comparePaths, placePages, type MegaCity, type Megalopolis, type Placement } from "@/city/megalopolis";
import type { ImageStatus } from "@/city/textures";
import type { CityView, HoverPart, ViewMode, WalkState } from "@/city/view";
import { assembleWorld, isSpecial, partOf, type World } from "@/city/world";
import { sharedCityPath, type MegaPageInfo } from "@/format/shared";
import { linkPath } from "@/format/links";
import type { CityDoc } from "@/format/types";
import { loadSharedCity } from "@/ui/loadShared";
import { LogoMark } from "@/ui/Logo";
import { WikiSearch } from "@/ui/WikiSearch";
import { Departures } from "@/ui/explorer/Departures";
import { ImageViewer } from "@/ui/explorer/ImageViewer";
import { Inspector } from "@/ui/explorer/Inspector";
import { AmbiancePanel } from "@/ui/explorer/AmbiancePanel";
import { LegendPanel } from "@/ui/explorer/LegendPanel";
import { LoadingPanel } from "@/ui/explorer/LoadingPanel";
import { NorthArrow } from "@/ui/explorer/NorthArrow";
import { PerfMeter } from "@/ui/explorer/PerfMeter";
import { Tooltip } from "@/ui/explorer/Tooltip";
import { WalkOverlay } from "@/ui/explorer/WalkOverlay";
import styles from "@/ui/explorer/explorer.module.css";

/** Ce que la vue affiche d'emblée : au-delà, les pages restent à cocher (elles gardent leur place). */
const FIRST_ELEMENTS = 16_000;
const FIRST_PAGES = 16;
/** Au-delà, la mégalopole risque de ramer sur un ordinateur modeste. */
const HEAVY_ELEMENTS = 40_000;

interface Entry {
  info: MegaPageInfo;
  doc: CityDoc;
}

interface Built {
  world: World;
  mega: Megalopolis;
}

type Status = { phase: "loading"; step: number } | { phase: "ready" } | { phase: "error"; message: string };

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
    setTimeout(resolve, 60);
  });

const COARSE = "(pointer: coarse)";
const subscribePointer = (onChange: () => void) => {
  const query = matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const hasFinePointer = () => !matchMedia(COARSE).matches;

const PERF_KEY = "domcity:fps";
function readPerf(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(PERF_KEY) === "1";
  } catch {
    return false;
  }
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", ".");

/** Les villes affichées, posées à leur place, et le réseau qui les relie. */
function build(entries: Entry[], placement: Placement, checked: number[]): Built {
  const cities: MegaCity[] = checked.map((i) => ({
    page: i,
    path: entries[i].info.path,
    layout: layoutCity(entries[i].doc, { airport: "aerodrome" }),
    linksTo: entries[i].doc.linksTo?.pages ?? [],
    external: externalLinks(entries[i].doc.root),
    sites: entries[i].doc.linksTo?.sites ?? [],
  }));
  const mega = buildMegalopolis(placement, cities);
  const world = assembleWorld(
    mega.parts.map((part) => ({ layout: part.city.layout, offset: part.offset })),
    mega.land,
  );
  return { world, mega };
}

/** La page d'un aérodrome, d'usines ou de caméras (null pour le grand aéroport). */
function specialPage(built: Built, id: number): number | null {
  const entry = built.world.specials.find((candidate) => candidate.id === id);
  const part = entry ? built.mega.parts[entry.part] : undefined;
  return part ? part.city.page : null;
}

/** L'aérodrome d'une page, s'il est affiché. */
function aerodromeOf(built: Built, page: number): Airport | null {
  const entry = built.world.specials.find(
    (candidate) => candidate.special.kind === "airport" && built.mega.parts[candidate.part]?.city.page === page,
  );
  return entry?.special.kind === "airport" ? entry.special.airport : null;
}

/** Télécharge les villes, six à la fois. */
async function loadAll(pages: MegaPageInfo[], signal: AbortSignal, onProgress: (done: number) => void) {
  const docs: Array<CityDoc | null> = pages.map(() => null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < pages.length) {
      const i = next;
      next += 1;
      try {
        docs[i] = await loadSharedCity(pages[i].fileUrl, signal);
      } catch {
        docs[i] = null;
      }
      done += 1;
      onProgress(done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, pages.length) }, worker));
  return docs;
}

export function MegalopolisExplorer({ domain, pages, totalPages }: { domain: string; pages: MegaPageInfo[]; totalPages: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<CityView | null>(null);
  const entriesRef = useRef<Entry[]>([]);
  const placementRef = useRef<Placement | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [missing, setMissing] = useState<MegaPageInfo[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [status, setStatus] = useState<Status>({ phase: "loading", step: 0 });
  const [checked, setChecked] = useState<number[]>([]);
  const [built, setBuilt] = useState<Built | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [hover, setHover] = useState<{ id: number; x: number; y: number; part: HoverPart } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [mode, setMode] = useState<ViewMode>("aerial");
  const [walking, setWalking] = useState<WalkState>("off");
  const [legendOpen, setLegendOpen] = useState(false);
  const [ambianceOpen, setAmbianceOpen] = useState(false);
  const [realColors, setRealColors] = useState(false);
  // Sur un téléphone, la liste cacherait la ville : elle s'ouvre à la demande.
  const [listOpen, setListOpen] = useState(() => typeof window === "undefined" || !matchMedia("(max-width: 720px)").matches);
  /** Le tableau des départs ouvert : celui du grand aéroport, ou de l'aérodrome d'une page. */
  const [departures, setDepartures] = useState<Airport | null>(null);
  const [imageStatus, setImageStatus] = useState<Record<number, ImageStatus>>({});
  const [viewing, setViewing] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(readPerf);
  const canWalk = useSyncExternalStore(subscribePointer, hasFinePointer, () => true);

  // Téléchargement, placement, première construction.
  useEffect(() => {
    const controller = new AbortController();
    let view: CityView | null = null;
    let cancelled = false;
    (async () => {
      try {
        const docs = await loadAll(pages, controller.signal, setLoaded);
        if (cancelled) return;
        const list: Entry[] = [];
        const lost: MegaPageInfo[] = [];
        pages.forEach((info, i) => {
          const doc = docs[i];
          if (doc) list.push({ info, doc });
          else lost.push(info);
        });
        if (list.length === 0) {
          setStatus({ phase: "error", message: "Aucune ville de ce site n'a pu être chargée. Réessayez dans un instant." });
          return;
        }
        list.sort((a, b) => comparePaths(a.info.path, b.info.path));
        entriesRef.current = list;
        setEntries(list);
        setMissing(lost);
        setStatus({ phase: "loading", step: 1 });
        await nextFrame();

        const placement = placePages(
          list.map((entry) => ({ path: entry.info.path, side: citySide(entry.doc), aerodrome: hasAerodrome(entry.doc) })),
        );
        placementRef.current = placement;
        // D'emblée, les premières pages dans l'ordre des adresses, tant que la vue les tient sans peine.
        const first: number[] = [];
        let elements = 0;
        for (let i = 0; i < list.length; i += 1) {
          const weight = list[i].info.elements || 1;
          if (first.length > 0 && (elements + weight > FIRST_ELEMENTS || first.length >= FIRST_PAGES)) continue;
          first.push(i);
          elements += weight;
        }
        const result = build(list, placement, first);
        if (cancelled) return;
        setChecked(first);
        setBuilt(result);
        setStatus({ phase: "loading", step: 2 });
        await nextFrame();

        const { CityView } = await import("@/city/view");
        if (cancelled || !stageRef.current) return;
        view = new CityView(stageRef.current, result.world, {
          onHover: (id, screen, part) =>
            setHover(id === null ? null : { id, x: screen?.x ?? -1, y: screen?.y ?? -1, part }),
          onSelect: (id) => {
            setSelected(id);
            if (id !== null) setDepartures(null);
          },
          onAirport: setDepartures,
          onModeChange: setMode,
          onWalkChange: setWalking,
          onImageStatus: (id, s) => setImageStatus((prev) => ({ ...prev, [id]: s })),
        });
        viewRef.current = view;
        view.setMeasuring(readPerf());
        if (process.env.NODE_ENV !== "production") (window as unknown as { __domcity?: CityView }).__domcity = view;
        setStatus({ phase: "loading", step: 3 });
        await nextFrame();
        if (!cancelled) setStatus({ phase: "ready" });
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setStatus({ phase: "error", message: "La mégalopole n'a pas pu être bâtie. Réessayez dans un instant." });
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      view?.dispose();
      if (viewRef.current === view) viewRef.current = null;
    };
    // Les pages sont figées pour une instance (clé dans la page).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  // Cocher ou décocher : on rebâtit, sans bouger la caméra ni les autres villes.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggle = (index: number) => {
    const next = checked.includes(index) ? checked.filter((i) => i !== index) : [...checked, index].sort((a, b) => a - b);
    const openPage = departures && built ? specialPage(built, departures.id) : null;
    setChecked(next);
    setRebuilding(true);
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = null;
      const placement = placementRef.current;
      const view = viewRef.current;
      if (!placement || !view) return;
      const result = build(entriesRef.current, placement, next);
      view.setWorld(result.world);
      setBuilt(result);
      // Le grand aéroport change avec les pages affichées ; un aérodrome reste celui de sa page.
      if (departures) setDepartures(openPage === null ? (result.world.layout.airport ?? null) : aerodromeOf(result, openPage));
      setImageStatus({});
      setHover(null);
      setRebuilding(false);
    }, 280);
  };
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  const layout = built?.world.layout ?? null;
  const pageOfLot = useCallback(
    (lotId: number) => {
      if (!built) return null;
      const part = partOf(built.world, lotId);
      if (part < 0) return null;
      const entry = entries[built.mega.parts[part].city.page];
      return { entry, base: built.world.parts[part].base };
    },
    [built, entries],
  );

  /** La page d'un aérodrome, de ses usines ou de ses caméras (aucune pour le grand aéroport). */
  const pageOfSpecial = useCallback(
    (id: number) => {
      const page = built ? specialPage(built, id) : null;
      return page === null ? null : entries[page];
    },
    [built, entries],
  );
  const pageOfAirport = useCallback((airport: Airport) => pageOfSpecial(airport.id), [pageOfSpecial]);

  const hoverInfo = useMemo(
    () => (layout && hover && !isSpecial(hover.part) ? describeLot(layout, hover.id) : null),
    [layout, hover],
  );
  const hoverPage =
    hover && isSpecial(hover.part) ? pageOfSpecial(hover.id) : hover ? (pageOfLot(hover.id)?.entry ?? null) : null;
  const departuresPage = departures ? pageOfAirport(departures) : null;
  const selectedInfo = useMemo(
    () => (layout && selected !== null && layout.lots[selected] ? describeLot(layout, selected) : null),
    [layout, selected],
  );
  const selectedPage = selected !== null ? pageOfLot(selected) : null;

  const select = useCallback((id: number | null, focus = false) => viewRef.current?.select(id, focus), []);
  const switchMode = (next: ViewMode) => {
    setLegendOpen(false);
    setAmbianceOpen(false);
    viewRef.current?.setMode(next);
  };
  const toggleMeasuring = () => {
    const next = !measuring;
    setMeasuring(next);
    viewRef.current?.setMeasuring(next);
    try {
      localStorage.setItem(PERF_KEY, next ? "1" : "0");
    } catch {
      // stockage refusé : le réglage vaut pour cette visite seulement
    }
  };
  const showPage = (index: number) => {
    const placement = placementRef.current;
    if (!placement) return;
    const o = placement.origins[index];
    viewRef.current?.frameArea({ x: o.x, z: o.z, w: placement.widths[index], d: placement.sides[index] });
  };

  const ready = status.phase === "ready";
  const shownElements = checked.reduce((sum, i) => sum + (entries[i]?.info.elements ?? 0), 0);
  const latest = checked.reduce<string | null>((best, i) => {
    const at = entries[i]?.info.capturedAt;
    return at && (!best || at > best) ? at : best;
  }, null);
  const airport = layout?.airport;
  const aerodromes = built?.world.specials.filter((entry) => entry.special.kind === "airport" && entry.special.airport.kind === "aerodrome").length ?? 0;
  const steps = [
    `Ouverture des villes (${formatCount(loaded)} / ${formatCount(pages.length)})`,
    "Placement selon les adresses",
    "Tracé des autoroutes et construction",
    "Mise en lumière",
  ];

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
          <span className="mono-caps">Mégalopole</span>
          <h1 title={domain}>{domain}</h1>
        </div>
        <div className={styles.search}>
          <WikiSearch compact initialLang="fr" />
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
            onClick={() => {
              setAmbianceOpen(false);
              setLegendOpen((o) => !o);
            }}
          >
            Légende
          </button>
          <button
            type="button"
            className={styles.tool}
            aria-expanded={ambianceOpen}
            onClick={() => {
              setLegendOpen(false);
              setAmbianceOpen((o) => !o);
            }}
          >
            Ambiance
          </button>
          <button type="button" className={styles.tool} aria-pressed={measuring} onClick={toggleMeasuring} title="Afficher les images par seconde">
            FPS
          </button>
        </div>
      )}

      {ready && legendOpen && <LegendPanel onClose={() => setLegendOpen(false)} />}
      {ready && ambianceOpen && built && (
        <AmbiancePanel
          ambiances={built.mega.parts.flatMap((part) => (part.city.layout.ambiance ? [part.city.layout.ambiance.info] : []))}
          realColors={realColors}
          onRealColors={(on) => {
            setRealColors(on);
            viewRef.current?.setRealColors(on);
          }}
          onClose={() => setAmbianceOpen(false)}
        />
      )}

      {ready && mode === "aerial" && (
        <section className={styles.pagesPanel} aria-label="Pages du site">
          <button
            type="button"
            className={styles.pagesHead}
            aria-expanded={listOpen}
            onClick={() => setListOpen((open) => !open)}
          >
            <span className="mono-caps">Pages du site</span>
            <span className="mono-caps">
              {formatCount(checked.length)} / {formatCount(entries.length)} affichée{checked.length > 1 ? "s" : ""}
              {rebuilding ? " · chantier…" : ""}
            </span>
          </button>
          {listOpen && (
            <>
              <ul className={styles.pagesList}>
                {entries.map((entry, i) => {
                  const on = checked.includes(i);
                  return (
                    <li key={entry.info.path} data-on={on || undefined}>
                      <label title={linkPath(entry.info.path)}>
                        <input type="checkbox" checked={on} onChange={() => toggle(i)} />
                        <span className={styles.pagesName}>
                          <span>{entry.info.title || linkPath(entry.info.path)}</span>
                          <span className={styles.pagesPath}>{linkPath(entry.info.path)}</span>
                        </span>
                      </label>
                      <span className={styles.pagesMeta}>
                        {formatCount(entry.info.elements)} él.
                        {on && (
                          <button type="button" onClick={() => showPage(i)} title="Montrer cette ville">
                            Voir
                          </button>
                        )}
                        <Link href={sharedCityPath(entry.info.slug)} title="Sa ville seule, avec ses versions">
                          ↗
                        </Link>
                      </span>
                    </li>
                  );
                })}
                {missing.map((info) => (
                  <li key={info.path} className={styles.pagesMissing}>
                    <span className={styles.pagesPath}>{linkPath(info.path)}</span>
                    <span className={styles.pagesMeta}>indisponible</span>
                  </li>
                ))}
              </ul>
              {shownElements > HEAVY_ELEMENTS && (
                <p className={styles.pagesNote}>
                  {formatCount(shownElements)} éléments affichés : la vue peut ralentir sur un ordinateur modeste.
                </p>
              )}
              {totalPages > pages.length && (
                <p className={styles.pagesNote}>
                  Les {formatCount(pages.length)} pages relevées le plus récemment, sur {formatCount(totalPages)}.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {ready && layout && built && mode === "aerial" && (
        <section className={styles.cartouche} aria-label="Cartouche">
          <div className={styles.cartoucheRow}>
            <span className="mono-caps">Mégalopole</span>
            {latest && <span className="mono-caps">Relevé du {shortDate(latest)}</span>}
          </div>
          <h2 className={styles.cartoucheTitle}>{domain}</h2>
          <a className={styles.cartoucheUrl} href={`https://${domain}`} target="_blank" rel="noreferrer">
            {domain}
          </a>
          <dl className={styles.cartoucheStats}>
            <div>
              <dd>{formatCount(checked.length)}</dd>
              <dt className="mono-caps">Villes</dt>
            </div>
            <div>
              <dd>{formatCount(layout.stats.buildings)}</dd>
              <dt className="mono-caps">Bâtiments</dt>
            </div>
            <div>
              <dd>{formatCount(layout.stats.monuments)}</dd>
              <dt className="mono-caps">Monuments</dt>
            </div>
            <div>
              <dd>{formatCount(built.mega.links.length)}</dd>
              <dt className="mono-caps">Liaisons</dt>
            </div>
          </dl>
          <p className={`${styles.cartoucheFacts} mono-caps`}>
            {built.mega.links.length > 0 ? "Autoroute : un lien entre deux pages" : "Aucun lien entre les pages affichées"}
            {airport ? ` · aéroport : ${formatCount(airport.destinations.length)} destination${airport.destinations.length > 1 ? "s" : ""}` : ""}
            {aerodromes > 0 ? ` · ${formatCount(aerodromes)} aérodrome${aerodromes > 1 ? "s" : ""}` : ""}
          </p>
        </section>
      )}

      {ready && <NorthArrow />}
      {ready && measuring && <PerfMeter viewRef={viewRef} shifted={selectedInfo !== null || departures !== null} />}

      {ready && mode === "aerial" && (
        <p className={`${styles.hint} mono-caps`}>
          Glisser : se déplacer · Clic droit : tourner · Molette : zoomer · Clic : inspecter · Double-clic : approcher
        </p>
      )}

      {ready && mode === "walk" && (
        <WalkOverlay state={walking} onStart={() => viewRef.current?.startWalk()} onLeave={() => switchMode("aerial")} />
      )}

      {ready && hover && (hoverInfo || isSpecial(hover.part)) && (hover.x >= 0 || walking === "locked") && (
        <Tooltip
          info={hoverInfo}
          part={hover.part}
          scope="tout le site"
          page={hoverPage ? linkPath(hoverPage.info.path) : undefined}
          x={hover.x}
          y={hover.y}
          centered={walking === "locked"}
        />
      )}

      {ready && departures && !selectedInfo && (
        <Departures
          airport={departures}
          scope={departuresPage ? linkPath(departuresPage.info.path) : "tout le site"}
          onClose={() => setDepartures(null)}
        />
      )}

      {ready && selectedInfo && (
        <Inspector
          info={selectedInfo}
          number={selectedPage ? selectedInfo.id - selectedPage.base : selectedInfo.id}
          page={selectedPage ? { path: linkPath(selectedPage.entry.info.path), href: sharedCityPath(selectedPage.entry.info.slug) } : undefined}
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
        <LoadingPanel title={domain} step={status.step} count={shownElements || undefined} steps={steps} />
      )}

      {status.phase === "error" && (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            <p className="mono-caps">Erreur de chantier</p>
            <h2>Mégalopole inaccessible</h2>
            <p>{status.message}</p>
            <Link href="/" className={styles.back}>
              ← Retour à l&apos;accueil
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
