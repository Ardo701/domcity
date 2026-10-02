"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  WIKI_LANGS,
  parseWikipediaUrl,
  suggestWikipedia,
  wikiPath,
  type WikiLang,
  type WikiSuggestion,
} from "@/capture/wikipedia";
import styles from "./WikiSearch.module.css";

export function WikiSearch({
  compact = false,
  initialLang = "fr",
  autoFocus = false,
}: {
  compact?: boolean;
  initialLang?: WikiLang;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [lang, setLang] = useState<WikiLang>(initialLang);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<WikiSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || parseWikipediaUrl(q)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      suggestWikipedia(lang, q, controller.signal)
        .then((items) => {
          setSuggestions(items);
          setActive(-1);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const go = (targetLang: WikiLang, title: string) => {
    if (!title.trim()) return;
    setOpen(false);
    setPending(true);
    router.push(wikiPath(targetLang, title));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const fromUrl = parseWikipediaUrl(query);
    if (fromUrl) return go(fromUrl.lang, fromUrl.title);
    const picked = active >= 0 ? suggestions[active]?.title : undefined;
    go(lang, picked ?? query);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2 && suggestions.length > 0;

  return (
    <form className={`${styles.form} ${compact ? styles.compact : ""}`} onSubmit={submit} role="search">
      <div className={styles.field} ref={boxRef}>
        <label className={styles.lang}>
          <span className="visually-hidden">Langue de Wikipédia</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as WikiLang)}>
            {WIKI_LANGS.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.prefix} aria-hidden>
          {lang}.wikipedia.org/wiki/
        </span>
        <input
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={compact ? "Autre article" : "Paris, Croissant, Jazz…"}
          aria-label="Article Wikipédia à construire"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
        />
        <button className={styles.submit} type="submit" disabled={pending || !query.trim()}>
          <span className={styles.label}>{pending ? "Relevé…" : compact ? "Aller" : "Construire la ville"}</span>
          <span aria-hidden className={styles.arrow}>→</span>
        </button>

        {showList && (
          <ul className={styles.list} id={listId} role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.title}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? styles.active : undefined}
                onPointerDown={(e) => {
                  e.preventDefault();
                  go(lang, s.title);
                }}
                onPointerEnter={() => setActive(i)}
              >
                <span className={styles.optionIndex}>{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
