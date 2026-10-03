import { formatChars, formatCount, ROAD_NAMES, type LotInfo } from "@/city/describe";
import type { HoverPart } from "@/city/view";
import { KindSwatch, RoadSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

/**
 * Hover tooltip: what this building was in the page. On a street, `info` is the card
 * of the container that had it drawn: the tooltip names the street, then that container. The airport
 * is not an element: its tooltip counts the links of the whole page (or the whole site, in
 * the megalopolis) to other sites; an airfield's, those of its page. Factories and cameras
 * are not either: they tell the page's scripts and trackers.
 */
export function Tooltip({
  info,
  part,
  page,
  scope = "toute la page",
  x,
  y,
  centered,
}: {
  info: LotInfo | null;
  part: HoverPart;
  /** In the megalopolis: the page the hovered element (or airfield) belongs to. */
  page?: string;
  /** What the airport serves: the page, or the whole site. */
  scope?: string;
  x: number;
  y: number;
  centered: boolean;
}) {
  const width = 300;
  const left = centered ? window.innerWidth / 2 + 28 : Math.min(x + 18, window.innerWidth - width - 12);
  const top = centered ? window.innerHeight / 2 + 28 : y + 18 > window.innerHeight - 190 ? y - 170 : y + 18;

  if (part?.kind === "airport") {
    const { airport } = part;
    const small = airport.kind === "aerodrome";
    const runways = airport.runways.length;
    const first = airport.destinations.slice(0, 3).map(([domain]) => domain);
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
        {small && page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
        <div className={styles.tooltipHead}>
          <KindSwatch kind="airport" size={26} />
          <div>
            <p className={styles.tooltipName}>{small ? "Aérodrome" : "Aéroport"}</p>
            <p className={styles.tooltipSelector}>hors les murs · {small ? "cette page" : scope}</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>{formatCount(airport.external)} liens vers d&apos;autres sites</li>
          <li>
            {small
              ? `1 piste courte · ${airport.planes} petit${airport.planes > 1 ? "s" : ""} avion${airport.planes > 1 ? "s" : ""}`
              : `${runways} piste${runways > 1 ? "s" : ""} · ${airport.planes} avion${airport.planes > 1 ? "s" : ""} aux portes`}
          </li>
          {first.length > 0 && (
            <li>
              Vers {first.join(", ")}
              {airport.destinations.length > first.length ? "…" : ""}
            </li>
          )}
          <li>{small ? "Clic : les départs de cette page" : "Clic : le tableau des départs"}</li>
        </ul>
      </div>
    );
  }
  if (part?.kind === "industry") {
    const { scripts, factories } = part.industry;
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
        {page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
        <div className={styles.tooltipHead}>
          <KindSwatch kind="factory" size={26} />
          <div>
            <p className={styles.tooltipName}>Usines</p>
            <p className={styles.tooltipSelector}>ceinture verte · toute la page</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>
            {formatCount(scripts)} script{scripts > 1 ? "s" : ""} dans la page
          </li>
          <li>
            {formatCount(factories.length)} usine{factories.length > 1 ? "s" : ""}, une pour six scripts
          </li>
          <li>Pas dans la page : le JavaScript qu&apos;elle fait tourner</li>
        </ul>
      </div>
    );
  }

  if (part?.kind === "surveillance") {
    const { trackers, cameras } = part.surveillance;
    const first = trackers.slice(0, 3);
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
        {page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
        <div className={styles.tooltipHead}>
          <KindSwatch kind="camera" size={26} />
          <div>
            <p className={styles.tooltipName}>Caméras de surveillance</p>
            <p className={styles.tooltipSelector}>au bord des rues · toute la page</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>
            {formatCount(trackers.length)} traqueur{trackers.length > 1 ? "s" : ""} publicitaire{trackers.length > 1 ? "s" : ""} ·{" "}
            {formatCount(cameras.length)} caméras
          </li>
          <li>
            {first.join(", ")}
            {trackers.length > first.length ? "…" : ""}
          </li>
          <li>Ils suivent les visiteurs d&apos;un site à l&apos;autre</li>
        </ul>
      </div>
    );
  }

  if (!info) return null;

  if (part?.kind === "road") {
    const road = part.style;
    const between =
      info.children > 1
        ? `entre les ${formatCount(info.children)} éléments de ce <${info.selector}>`
        : `le long de ce que contient <${info.selector}>`;
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
        {page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
        <div className={styles.tooltipHead}>
          <RoadSwatch size={26} />
          <div>
            <p className={styles.tooltipName}>{ROAD_NAMES[road]}</p>
            <p className={styles.tooltipSelector}>
              dans &lt;{info.selector}&gt; · {info.name.toLowerCase()}
            </p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>Pas dans la page : la ville la trace</li>
          <li>{between}</li>
        </ul>
      </div>
    );
  }

  const facts: string[] = [];
  if (info.textTotal > 0) {
    facts.push(info.children > 0 ? `${formatChars(info.textTotal)} en tout` : formatChars(info.text));
  }
  if (info.children > 0) facts.push(`${formatCount(info.children)} élément${info.children > 1 ? "s" : ""} dedans`);
  if (info.links && info.links.internal + info.links.external > 0) {
    facts.push(`${formatCount(info.links.internal)} lien${info.links.internal > 1 ? "s" : ""} interne${info.links.internal > 1 ? "s" : ""} · ${formatCount(info.links.external)} externe${info.links.external > 1 ? "s" : ""}`);
  }
  if (info.img?.w && info.img?.h) facts.push(`${info.img.w} × ${info.img.h} px`);

  return (
    <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
      {page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
      <div className={styles.tooltipHead}>
        <KindSwatch kind={info.kind} size={26} />
        <div>
          <p className={styles.tooltipName}>{info.name}</p>
          <p className={styles.tooltipSelector}>
            {info.ownText ? "texte direct" : info.gallery ? `images de <${info.selector}>` : `<${info.selector}>`}
          </p>
        </div>
      </div>
      {info.heading && <p className={styles.tooltipHeading}>« {info.heading} »</p>}
      {info.img?.alt && !info.heading && <p className={styles.tooltipAlt}>{info.img.alt}</p>}
      {facts.length > 0 && (
        <ul className={styles.tooltipFacts}>
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
