import type { CityStats } from "@/city/layout";
import type { CityVersion } from "@/format/shared";
import type { CityPage } from "@/format/types";
import { LIMITS } from "@/format/limits";
import { useLocale } from "@/i18n/client";
import { formatCount } from "@/i18n/format";
import { CITY } from "@/i18n/messages/city";
import type { Locale } from "@/i18n/locale";
import styles from "./explorer.module.css";

/** What the bookmarklet learned about the whole page: scripts, third-party sites, weight. */
function pageFacts(page: CityPage | undefined, locale: Locale): string[] {
  if (!page) return [];
  const m = CITY[locale].cartouche;
  const facts: string[] = [];
  if (page.scripts !== undefined) facts.push(m.scripts(page.scripts));
  if (page.thirdParty?.length) facts.push(m.thirdParty(page.thirdParty.length, page.thirdParty.length >= LIMITS.maxThirdParty));
  if (page.bytes) facts.push(m.loaded(page.bytes));
  return facts;
}

/** The sheet's cartouche: title, source, capture date and the city's figures. */
export function Cartouche({
  title,
  url,
  capturedAt,
  stats,
  page,
  kicker,
  kickerNote,
  shared,
  versions,
  currentSlug,
  onPickVersion,
}: {
  title: string;
  url: string;
  capturedAt: string;
  stats: CityStats;
  page?: CityPage;
  kicker: string;
  /** Detail shown on hover over the top mention (city captured by a visitor...). */
  kickerNote?: string;
  shared?: { views: number };
  versions?: CityVersion[];
  currentSlug?: string;
  onPickVersion?: (slug: string) => void;
}) {
  const locale = useLocale();
  const m = CITY[locale].cartouche;
  const figures: Array<[string, number]> = [
    [m.buildings, stats.buildings],
    [m.districts, stats.districts],
    [m.monuments, stats.monuments],
    [m.posters, stats.billboards],
  ];
  if (stats.rivers > 0) figures.push([m.canals, stats.rivers]);
  if (stats.vacant > 0) figures.push([m.sites, stats.vacant]);
  const facts = pageFacts(page, locale);

  return (
    <section className={styles.cartouche} aria-label={m.label}>
      <div className={styles.cartoucheRow}>
        <span className={`mono-caps ${kickerNote ? styles.kickerNote : ""}`} title={kickerNote}>
          {kicker}
        </span>
        <span className="mono-caps">{m.captured(capturedAt)}</span>
      </div>
      <h2 className={styles.cartoucheTitle}>{title}</h2>
      <a className={styles.cartoucheUrl} href={url} target="_blank" rel="noreferrer">
        {url.replace(/^https:\/\//, "")}
      </a>
      {versions && onPickVersion && (
        <label className={styles.versions}>
          <span className="mono-caps">{m.version}</span>
          <select value={currentSlug} onChange={(e) => onPickVersion(e.target.value)}>
            {versions.map((v, i) => (
              <option key={v.slug} value={v.slug}>
                {m.versionDate(v.capturedAt)}
                {i === 0 ? m.latest : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <dl className={styles.cartoucheStats}>
        {figures.map(([label, value]) => (
          <div key={label}>
            <dd>{formatCount(value, locale)}</dd>
            <dt className="mono-caps">{label}</dt>
          </div>
        ))}
        <div>
          <dd>{stats.maxDepth}</dd>
          <dt className="mono-caps">{m.levels}</dt>
        </div>
        {shared && (
          <div>
            <dd>{formatCount(shared.views, locale)}</dd>
            <dt className="mono-caps">{m.visits}</dt>
          </div>
        )}
      </dl>
      {facts.length > 0 && (
        <p className={`${styles.cartoucheFacts} mono-caps`} title={m.measured}>
          {facts.join(" · ")}
        </p>
      )}
    </section>
  );
}
