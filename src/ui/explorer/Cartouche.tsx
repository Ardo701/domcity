import type { CityStats } from "@/city/layout";
import { formatCount } from "@/city/describe";
import styles from "./explorer.module.css";

/** Le cartouche de la planche : titre, source, date du relevé et chiffres de la ville. */
export function Cartouche({
  title,
  url,
  capturedAt,
  stats,
}: {
  title: string;
  url: string;
  capturedAt: string;
  stats: CityStats;
}) {
  const date = new Date(capturedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        <span className="mono-caps">DOMCity · Planche</span>
        <span className="mono-caps">Relevé du {date.replaceAll("/", ".")}</span>
      </div>
      <h2 className={styles.cartoucheTitle}>{title}</h2>
      <a className={styles.cartoucheUrl} href={url} target="_blank" rel="noreferrer">
        {url.replace(/^https:\/\//, "")}
      </a>
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
      </dl>
    </section>
  );
}
