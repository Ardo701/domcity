import type { CityStats } from "@/city/layout";
import { formatBytes, formatCount } from "@/city/describe";
import type { CityVersion } from "@/format/shared";
import type { CityPage } from "@/format/types";
import { LIMITS } from "@/format/limits";
import styles from "./explorer.module.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", ".");

const longDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const plural = (n: number, word: string) => `${formatCount(n)} ${word}${n > 1 ? "s" : ""}`;

/** What the bookmarklet learned about the whole page: scripts, third-party sites, weight. */
function pageFacts(page: CityPage | undefined): string[] {
  if (!page) return [];
  const facts: string[] = [];
  if (page.scripts !== undefined) facts.push(plural(page.scripts, "script"));
  if (page.thirdParty?.length) {
    const more = page.thirdParty.length >= LIMITS.maxThirdParty ? "+" : "";
    facts.push(`${formatCount(page.thirdParty.length)}${more} site${page.thirdParty.length > 1 ? "s" : ""} tiers`);
  }
  if (page.bytes) facts.push(`${formatBytes(page.bytes)} chargés`);
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
  const figures: Array<[string, number]> = [
    ["Bâtiments", stats.buildings],
    ["Quartiers", stats.districts],
    ["Monuments", stats.monuments],
    ["Panneaux", stats.billboards],
  ];
  if (stats.rivers > 0) figures.push(["Canaux", stats.rivers]);
  if (stats.vacant > 0) figures.push(["Chantiers", stats.vacant]);
  const facts = pageFacts(page);

  return (
    <section className={styles.cartouche} aria-label="Cartouche">
      <div className={styles.cartoucheRow}>
        <span className={`mono-caps ${kickerNote ? styles.kickerNote : ""}`} title={kickerNote}>
          {kicker}
        </span>
        <span className="mono-caps">Relevé du {shortDate(capturedAt)}</span>
      </div>
      <h2 className={styles.cartoucheTitle}>{title}</h2>
      <a className={styles.cartoucheUrl} href={url} target="_blank" rel="noreferrer">
        {url.replace(/^https:\/\//, "")}
      </a>
      {versions && onPickVersion && (
        <label className={styles.versions}>
          <span className="mono-caps">Version</span>
          <select value={currentSlug} onChange={(e) => onPickVersion(e.target.value)}>
            {versions.map((v, i) => (
              <option key={v.slug} value={v.slug}>
                {longDate(v.capturedAt)}
                {i === 0 ? " (la plus récente)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <dl className={styles.cartoucheStats}>
        {figures.map(([label, value]) => (
          <div key={label}>
            <dd>{formatCount(value)}</dd>
            <dt className="mono-caps">{label}</dt>
          </div>
        ))}
        <div>
          <dd>{stats.maxDepth}</dd>
          <dt className="mono-caps">Niveaux</dt>
        </div>
        {shared && (
          <div>
            <dd>{formatCount(shared.views)}</dd>
            <dt className="mono-caps">Visites</dt>
          </div>
        )}
      </dl>
      {facts.length > 0 && (
        <p className={`${styles.cartoucheFacts} mono-caps`} title="Mesuré sur la page affichée, au moment du relevé">
          {facts.join(" · ")}
        </p>
      )}
    </section>
  );
}
