"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sitePath, type SearchHit } from "@/format/shared";
import styles from "./CitySearch.module.css";

/** Recherche dans les villes déjà partagées : un nom de site ou un titre de page. */
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
            <li key={`${hit.kind}-${hit.domain}-${hit.path ?? ""}`}>
              <Link href={sitePath(hit.domain)}>
                <span className={`${styles.kind} mono-caps`}>{hit.kind === "site" ? "Site" : "Page"}</span>
                <span className={styles.name}>{hit.kind === "site" ? hit.domain : hit.title ?? hit.path}</span>
                {hit.kind === "page" && <span className={styles.where}>{hit.domain}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
