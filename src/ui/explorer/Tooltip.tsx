import { formatChars, formatCount, ROAD_NAMES, type LotInfo } from "@/city/describe";
import type { RoadStyle } from "@/city/layout";
import { KindSwatch, RoadSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

/**
 * Bulle de survol : ce qu'était ce bâtiment dans la page. Sur une rue, `info` est la fiche
 * du conteneur qui l'a fait tracer : la bulle nomme la rue, puis ce conteneur.
 */
export function Tooltip({
  info,
  road,
  x,
  y,
  centered,
}: {
  info: LotInfo;
  road?: RoadStyle | null;
  x: number;
  y: number;
  centered: boolean;
}) {
  const width = 300;
  const left = centered ? window.innerWidth / 2 + 28 : Math.min(x + 18, window.innerWidth - width - 12);
  const top = centered ? window.innerHeight / 2 + 28 : y + 18 > window.innerHeight - 190 ? y - 170 : y + 18;

  if (road) {
    const between =
      info.children > 1
        ? `entre les ${formatCount(info.children)} éléments de ce <${info.selector}>`
        : `le long de ce que contient <${info.selector}>`;
    return (
      <div className={styles.tooltip} style={{ left, top, width }} role="status" aria-live="polite">
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
      <div className={styles.tooltipHead}>
        <KindSwatch kind={info.kind} size={26} />
        <div>
          <p className={styles.tooltipName}>{info.name}</p>
          <p className={styles.tooltipSelector}>
            {info.ownText ? "texte direct" : `<${info.selector}>`}
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
