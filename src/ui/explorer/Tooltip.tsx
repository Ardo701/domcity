import type { LotInfo } from "@/city/describe";
import type { HoverPart } from "@/city/view";
import { useLocale } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { KINDS_TEXT } from "@/i18n/messages/kinds";
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
  scope,
  x,
  y,
  centered,
}: {
  info: LotInfo | null;
  part: HoverPart;
  /** In the megalopolis: the page the hovered element (or airfield) belongs to. */
  page?: string;
  /** What the airport serves: the page (default), or the whole site. */
  scope?: string;
  x: number;
  y: number;
  centered: boolean;
}) {
  const locale = useLocale();
  const m = CITY[locale].tooltip;
  const kinds = KINDS_TEXT[locale];
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
            <p className={styles.tooltipName}>{small ? m.airfield : m.airport}</p>
            <p className={styles.tooltipSelector}>{m.outside(small ? m.thisPage : (scope ?? CITY[locale].scope.page))}</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>{m.links(airport.external)}</li>
          <li>{small ? m.airfieldFleet(airport.planes) : m.airportFleet(runways, airport.planes)}</li>
          {first.length > 0 && <li>{m.to(`${first.join(", ")}${airport.destinations.length > first.length ? "…" : ""}`)}</li>}
          <li>{small ? m.airfieldClick : m.airportClick}</li>
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
            <p className={styles.tooltipName}>{m.factories}</p>
            <p className={styles.tooltipSelector}>{m.factoriesWhere}</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>{m.scripts(scripts)}</li>
          <li>{m.factoryCount(factories.length)}</li>
          <li>{m.notInPageScripts}</li>
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
            <p className={styles.tooltipName}>{m.cameras}</p>
            <p className={styles.tooltipSelector}>{m.camerasWhere}</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>{m.trackers(trackers.length, cameras.length)}</li>
          <li>
            {first.join(", ")}
            {trackers.length > first.length ? "…" : ""}
          </li>
          <li>{m.tracking}</li>
        </ul>
      </div>
    );
  }

  if (!info) return null;

  if (part?.kind === "road") {
    const road = part.style;
    const between = info.children > 1 ? m.between(info.children, info.selector) : m.along(info.selector);
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
        {page && <p className={`${styles.tooltipPage} mono-caps`}>{page}</p>}
        <div className={styles.tooltipHead}>
          <RoadSwatch size={26} />
          <div>
            <p className={styles.tooltipName}>{kinds.roads[road]}</p>
            <p className={styles.tooltipSelector}>{m.inside(info.selector, info.name)}</p>
          </div>
        </div>
        <ul className={styles.tooltipFacts}>
          <li>{m.drawn}</li>
          <li>{between}</li>
        </ul>
      </div>
    );
  }

  const facts: string[] = [];
  if (info.textTotal > 0) {
    facts.push(info.children > 0 ? m.textTotal(kinds.chars(info.textTotal)) : kinds.chars(info.text));
  }
  if (info.children > 0) facts.push(m.children(info.children));
  if (info.links && info.links.internal + info.links.external > 0) {
    facts.push(m.linkCounts(info.links.internal, info.links.external));
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
            {info.ownText ? m.directText : info.gallery ? m.imagesOf(info.selector) : `<${info.selector}>`}
          </p>
        </div>
      </div>
      {info.heading && <p className={styles.tooltipHeading}>{m.quoted(info.heading)}</p>}
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
