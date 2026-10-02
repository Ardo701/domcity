import type { CityStats } from "@/city/layout";
import { formatCount } from "@/city/describe";
import type { CityVersion } from "@/format/shared";
import styles from "./explorer.module.css";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", ".");

const longDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Le cartouche de la planche : titre, source, date du relevé et chiffres de la ville. */
export function Cartouche({
  title,
  url,
  capturedAt,
  stats,
  shared,
  versions,
  currentSlug,
  onPickVersion,
}: {
  title: string;
  url: string;
  capturedAt: string;
  stats: CityStats;
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
  if (stats.rivers > 0) figures.push(["Rivières", stats.rivers]);
  if (stats.vacant > 0) figures.push(["Terrains vagues", stats.vacant]);

  return (
    <section className={styles.cartouche} aria-label="Cartouche">
      <div className={styles.cartoucheRow}>
        <span className="mono-caps">{shared ? "Ville partagée" : "DOMCity · Planche"}</span>
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
    </section>
  );
}
