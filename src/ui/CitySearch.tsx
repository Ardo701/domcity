"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { linkPath } from "@/format/links";
import { sharedCityPath, sitePath, type SearchHit } from "@/format/shared";
import { useMessages } from "@/i18n/client";
import { SEARCH } from "@/i18n/messages/search";
import styles from "./CitySearch.module.css";

/**
 * Search among the cities already shared: a site name or a page title.
 * One result per site; the pages whose title matches are listed underneath and lead straight to their city.
 */
export function CitySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const m = useMessages(SEARCH);

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
        <span className="visually-hidden">{m.label}</span>
        <span className={styles.icon} aria-hidden>
          ⌕
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {visible && (
        <ul className={styles.results} aria-live="polite">
          {visible.length === 0 && <li className={styles.empty}>{m.empty}</li>}
          {visible.map((hit) => (
            <li key={hit.domain}>
              <Link href={sitePath(hit.domain)}>
                <span className={`${styles.kind} mono-caps`}>{m.site}</span>
                <span className={styles.name}>{hit.domain}</span>
                <span className={styles.where}>{m.cities(hit.pagesCount)}</span>
              </Link>
              {hit.pages.length > 0 && (
                <ul className={styles.pages}>
                  {hit.pages.map((page) => (
                    <li key={page.slug}>
                      <Link href={sharedCityPath(page.slug)}>
                        <span className={`${styles.kind} mono-caps`}>{m.page}</span>
                        <span className={styles.name}>{page.title ?? linkPath(page.path)}</span>
                        <span className={styles.where}>{linkPath(page.path)}</span>
                      </Link>
                    </li>
                  ))}
                  {hit.pagesMatched > hit.pages.length && (
                    <li className={styles.others}>
                      {m.others(hit.pagesMatched - hit.pages.length)} <Link href={sitePath(hit.domain)}>{m.sitePage}</Link>
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
