"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useMessages } from "@/i18n/client";
import { COMMON } from "@/i18n/messages/common";
import { GithubLink, GithubMark, REPO_URL } from "./GithubLink";
import { LanguageSwitch } from "./LanguageSwitch";
import { Wordmark } from "./Logo";
import styles from "./SiteHeader.module.css";

export type SitePage = "explore" | "create" | "account";

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > 4;

/**
 * The top bar: the brand (back to the home page), "Explore", "Create a city", the account, GitHub, the language.
 * It stays at the top when the page scrolls; its rule then widens to the edges of the screen.
 * On a phone, the links move into a full-screen menu, behind a three-line button.
 */
export function HeaderBar({ sharing, current }: { sharing: boolean; current?: SitePage }) {
  const scrolled = useSyncExternalStore(subscribeScroll, isScrolled, () => false);
  const [open, setOpen] = useState(false);
  const m = useMessages(COMMON);

  const links: Array<{ page: SitePage; href: string; label: string }> = [
    ...(sharing ? [{ page: "explore" as const, href: "/explore", label: m.nav.explore }] : []),
    { page: "create", href: "/create", label: m.nav.create },
    ...(sharing ? [{ page: "account" as const, href: "/account", label: m.nav.account }] : []),
  ];
  const here = (page: SitePage) => (current === page ? "page" : undefined);

  // Menu open: the page no longer scrolls, Escape closes it, and it closes again if the screen gets wider.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 641px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <header className={styles.topbar} data-scrolled={scrolled || open || undefined} data-open={open || undefined}>
      <Link href="/" className={styles.brand} aria-label={m.homeLabel} onClick={() => setOpen(false)}>
        <Wordmark />
      </Link>

      <nav className={styles.nav} aria-label={m.nav.label}>
        {links.map((link) => (
          <Link key={link.page} href={link.href} aria-current={here(link.page)}>
            {link.label}
          </Link>
        ))}
      </nav>
      <GithubLink label={m.githubLabel} className={styles.github} />
      <LanguageSwitch className={styles.lang} />

      <button
        type="button"
        className={styles.burger}
        aria-expanded={open}
        aria-controls="phone-menu"
        aria-label={open ? m.menu.close : m.menu.open}
        onClick={() => setOpen((was) => !was)}
      >
        <span />
        <span />
        <span />
      </button>

      <div id="phone-menu" className={styles.menu} inert={!open}>
        <nav aria-label={m.menu.label}>
          <ul className={styles.menuLinks}>
            {links.map((link, i) => (
              <li key={link.page} style={{ "--i": i } as React.CSSProperties}>
                <Link href={link.href} aria-current={here(link.page)} onClick={() => setOpen(false)}>
                  <span className={`${styles.menuIndex} mono-caps`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.menuLabel}>{link.label}</span>
                  <span aria-hidden className={styles.menuArrow}>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.menuFoot} style={{ "--i": links.length } as React.CSSProperties}>
          <div className={styles.menuTools}>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={styles.menuGithub}>
              <GithubMark />
              <span className="mono-caps">{m.menu.github}</span>
            </a>
            <LanguageSwitch />
          </div>
          <p className="mono-caps">{m.tagline}</p>
        </div>
      </div>
    </header>
  );
}
