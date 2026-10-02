import Link from "next/link";
import { formatCount } from "@/city/describe";
import { sharedCityPath, type CityCard } from "@/format/shared";
import styles from "./CityGallery.module.css";

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** Les dernières villes partagées, avec leur miniature. */
export function CityGallery({ cities, thumbUrl }: { cities: CityCard[]; thumbUrl: (slug: string) => string }) {
  if (cities.length === 0) {
    return <p className={styles.empty}>Aucune ville partagée pour l&apos;instant. Construisez-en une, puis cliquez sur « Partager ».</p>;
  }
  return (
    <ul className={styles.grid}>
      {cities.map((city) => (
        <li key={city.slug}>
          <Link href={sharedCityPath(city.slug)} className={styles.card}>
            <span className={styles.thumb}>
              {city.stats.thumbnail !== false && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(city.slug)} alt="" loading="lazy" />
              )}
            </span>
            <span className={styles.body}>
              <span className={styles.title}>{city.title}</span>
              <span className={styles.where}>
                {city.domain}
                {city.path === "/" ? "" : city.path}
              </span>
              <span className={`${styles.meta} mono-caps`}>
                {formatCount(city.stats.buildings ?? 0)} bâtiments · {formatCount(city.views)} visites · {date(city.capturedAt)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
