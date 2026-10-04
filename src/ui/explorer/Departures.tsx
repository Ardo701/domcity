"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Airport } from "@/city/layout";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { sitePath, type KnownSite } from "@/format/shared";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

/**
 * The departures board: the sites targeted by the page's links (or the whole site's, in
 * the megalopolis; or a single page's, for an airfield), from most to least targeted. Those that
 * have cities on DOMCity can be opened.
 */
export function Departures({ airport, scope, onClose }: { airport: Airport; scope: string; onClose: () => void }) {
  const m = useMessages(CITY).departures;
  const [known, setKnown] = useState<Map<string, number>>(new Map());
  const destinations = airport.destinations;
  const flying = new Set(airport.flights.map((flight) => flight.domain));
  const small = airport.kind === "aerodrome";

  useEffect(() => {
    if (destinations.length === 0) return;
    const controller = new AbortController();
    const query = destinations.map(([domain]) => domain).join(",");
    fetch(`/api/sites/known?d=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { sites: [] }))
      .then((data: { sites: KnownSite[] }) => setKnown(new Map(data.sites.map((site) => [site.domain, site.pages]))))
      .catch(() => undefined);
    return () => controller.abort();
  }, [destinations]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className={styles.inspector} aria-label={m.label}>
      <div className={styles.inspectorHead}>
        <KindSwatch kind="airport" size={40} />
        <div>
          <p className={`${styles.inspectorKicker} mono-caps`}>
            {small ? m.airfield : m.outside} · {scope}
          </p>
          <h2>{m.title}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
          ×
        </button>
      </div>
      <p className={styles.blurb}>
        {small ? m.airfieldBlurb(airport.external) : m.airportBlurb(airport.external)}
      </p>
      {destinations.length === 0 ? (
        <p className={styles.blurb}>{m.unknown}</p>
      ) : (
        <ol className={styles.board}>
          {destinations.map(([domain, links], i) => {
            const pages = known.get(domain);
            return (
              <li key={domain}>
                <span className={styles.boardFlight}>DC {String(i + 1).padStart(3, "0")}</span>
                <span className={styles.boardDomain} title={domain}>
                  {domain}
                </span>
                <span className={styles.boardLinks}>{m.links(links)}</span>
                <span className={styles.boardStatus}>
                  {pages ? (
                    <Link href={sitePath(domain)} title={m.pagesOnDomcity(pages)}>
                      {m.seeCity}
                    </Link>
                  ) : flying.has(domain) ? (
                    m.inFlight
                  ) : (
                    m.onTime
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
