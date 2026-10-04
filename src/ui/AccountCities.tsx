"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cityKey, deleteCityPath, sharedCityPath, thumbKey } from "@/format/shared";
import { useMessages } from "@/i18n/client";
import { ACCOUNT } from "@/i18n/messages/pages";
import styles from "./Account.module.css";
import { CardPending } from "./CardPending";
import gallery from "./Gallery.module.css";
import { loadSharedCity } from "./loadShared";
import { updateCity, useMyCities, type MyCity } from "./savedCities";

const deletePath = (city: MyCity) => deleteCityPath(city.slug, city.token);

const validDate = (iso: string) => !Number.isNaN(new Date(iso).getTime());

/** The readable address: without "https://", nor a home page's trailing slash. */
const readableUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * The address of the captured page. Cities published before it was kept do not have it: it is read once from the
 * city file (on R2, already cleaned by the server), then kept. Failing that, the city's address.
 */
function usePageUrl(city: MyCity, filesBase: string): string | null {
  const [found, setFound] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (city.pageUrl) return;
    const controller = new AbortController();
    loadSharedCity(`${filesBase}${cityKey(city.slug)}`, controller.signal)
      .then((doc) => {
        setFound(doc.url);
        updateCity(city.slug, { pageUrl: doc.url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [city.pageUrl, city.slug, filesBase]);
  const url = city.pageUrl ?? found;
  if (url) return readableUrl(url);
  return failed ? sharedCityPath(city.slug) : null;
}

/** Copies the city's public link, the one that gets shared. */
function CopyLink({ city }: { city: MyCity }) {
  const labels = useMessages(ACCOUNT).copy;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharedCityPath(city.slug)}`);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2200);
  };
  return (
    <button type="button" className={styles.action} onClick={copy} aria-live="polite">
      {labels[state]}
    </button>
  );
}

/**
 * A published city, as a card like in the gallery: its thumbnail and title (which lead to the city), copy its
 * link, delete it. A city without a thumbnail, or deleted from another browser, keeps the gallery's hatching.
 */
function CityCard({ city, filesBase }: { city: MyCity; filesBase: string }) {
  const m = useMessages(ACCOUNT);
  const [broken, setBroken] = useState(false);
  const href = sharedCityPath(city.slug);
  const page = usePageUrl(city, filesBase);
  return (
    <li>
      <article className={`${gallery.card} ${styles.card}`}>
        <Link href={href} className={gallery.thumb} tabIndex={-1} aria-hidden>
          {!broken && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${filesBase}${thumbKey(city.slug)}`} alt="" loading="lazy" onError={() => setBroken(true)} />
          )}
          <CardPending />
        </Link>
        <div className={`${gallery.body} ${styles.cardBody}`}>
          <Link href={href} className={`${gallery.title} ${styles.cardTitle}`}>
            {city.title}
          </Link>
          <span className={gallery.where} title={page ?? undefined}>
            {page ?? "\u00a0"}
          </span>
          {validDate(city.sharedAt) && <span className={`${gallery.meta} mono-caps`}>{m.published(city.sharedAt)}</span>}
          <div className={styles.actions}>
            <CopyLink city={city} />
            <Link href={deletePath(city)} className={`${styles.action} ${styles.danger}`}>
              {m.remove}
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

/** The cities published from this browser: see them again, keep their secret link, delete them. */
export function AccountCities({ filesBase }: { filesBase: string }) {
  const cities = useMyCities();
  const m = useMessages(ACCOUNT);

  // Not read yet (server rendering, first frame): nothing rather than a misleading "no city".
  if (cities === null) return <div className={styles.pending} />;

  if (cities.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{m.emptyTitle}</p>
        <p>{m.emptyText}</p>
        <Link href="/create" className={styles.start}>
          {m.create} <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.cities} aria-labelledby="your-cities">
      <div className={styles.citiesHead}>
        <h2 id="your-cities">{m.heading}</h2>
        <span className="mono-caps">{m.count(cities.length)}</span>
      </div>
      <ul className={gallery.grid}>
        {cities.map((city) => (
          <CityCard key={city.slug} city={city} filesBase={filesBase} />
        ))}
      </ul>
      <p className={styles.note}>{m.note}</p>
    </section>
  );
}
