"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatCount } from "@/city/describe";
import type { Airport } from "@/city/layout";
import { sitePath, type KnownSite } from "@/format/shared";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

/**
 * Le tableau des départs : les sites que visent les liens de la page (ou de tout le site, dans
 * la mégalopole ; ou d'une seule page, pour un aérodrome), du plus visé au moins visé. Ceux qui
 * ont des villes sur DOMCity s'ouvrent.
 */
export function Departures({ airport, scope, onClose }: { airport: Airport; scope: string; onClose: () => void }) {
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
    <aside className={styles.inspector} aria-label="Tableau des départs">
      <div className={styles.inspectorHead}>
        <KindSwatch kind="airport" size={40} />
        <div>
          <p className={`${styles.inspectorKicker} mono-caps`}>
            {small ? "Aérodrome" : "Hors les murs"} · {scope}
          </p>
          <h2>Départs</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer le tableau des départs">
          ×
        </button>
      </div>
      <p className={styles.blurb}>
        {small
          ? `${formatCount(airport.external)} liens de cette page mènent vers d'autres sites. Ses longs courriers partent du grand aéroport du site, à l'est.`
          : `${formatCount(airport.external)} liens mènent vers d'autres sites. Chaque destination est un site visé ; les premières ont leur avion en vol.`}
      </p>
      {destinations.length === 0 ? (
        <p className={styles.blurb}>
          Ce relevé ne dit pas encore vers quels sites mènent ses liens : seules les villes relevées depuis
          octobre 2026 le savent.
        </p>
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
                <span className={styles.boardLinks}>
                  {formatCount(links)} lien{links > 1 ? "s" : ""}
                </span>
                <span className={styles.boardStatus}>
                  {pages ? (
                    <Link href={sitePath(domain)} title={`${pages} page${pages > 1 ? "s" : ""} sur DOMCity`}>
                      Voir sa ville →
                    </Link>
                  ) : flying.has(domain) ? (
                    "En vol"
                  ) : (
                    "À l'heure"
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
