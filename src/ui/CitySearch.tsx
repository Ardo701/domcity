"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { linkPath } from "@/format/links";
import { sharedCityPath, sitePath, type SearchHit } from "@/format/shared";
import styles from "./CitySearch.module.css";

/**
 * Recherche dans les villes déjà partagées : un nom de site ou un titre de page.
 * Un résultat par site ; les pages dont le titre répond sont rangées dessous et mènent droit à leur ville.
 */
export function CitySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: { results: SearchHit[] }) => setResults(data.results))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = query.trim().length >= 2 ? results : null;

  return (
    <div className={styles.wrap}>
      <label className={styles.field}>
        <span className="visually-hidden">Chercher une ville partagée</span>
        <span className={styles.icon} aria-hidden>
          ⌕
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un site ou une page : amazon, croissant…"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {visible && (
        <ul className={styles.results} aria-live="polite">
          {visible.length === 0 && <li className={styles.empty}>Aucune ville pour l&apos;instant. À vous de la créer.</li>}
          {visible.map((hit) => (
            <li key={hit.domain}>
              <Link href={sitePath(hit.domain)}>
                <span className={`${styles.kind} mono-caps`}>Site</span>
                <span className={styles.name}>{hit.domain}</span>
                <span className={styles.where}>
                  {hit.pagesCount} ville{hit.pagesCount > 1 ? "s" : ""}
                </span>
              </Link>
              {hit.pages.length > 0 && (
                <ul className={styles.pages}>
                  {hit.pages.map((page) => (
                    <li key={page.slug}>
                      <Link href={sharedCityPath(page.slug)}>
                        <span className={`${styles.kind} mono-caps`}>Page</span>
                        <span className={styles.name}>{page.title ?? linkPath(page.path)}</span>
                        <span className={styles.where}>{linkPath(page.path)}</span>
                      </Link>
                    </li>
                  ))}
                  {hit.pagesMatched > hit.pages.length && (
                    <li className={styles.others}>
                      et {hit.pagesMatched - hit.pages.length} autre{hit.pagesMatched - hit.pages.length > 1 ? "s" : ""} sur{" "}
                      <Link href={sitePath(hit.domain)}>la page du site</Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
