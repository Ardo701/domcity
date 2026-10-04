import Link from "next/link";
import { COMMON } from "@/i18n/messages/common";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { GithubMark, REPO_URL } from "./GithubLink";
import { LanguageSwitch } from "./LanguageSwitch";
import { Wordmark } from "./Logo";
import styles from "./SiteFooter.module.css";

/** The footer of the site's pages: the brand, the pages, the project, the legal pages, the language. */
export async function SiteFooter() {
  const sharing = sharingEnabled();
  const m = await getMessages(COMMON);
  const f = m.footer;
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.about}>
          <Link href="/" className={styles.brand} aria-label={m.homeLabel}>
            <Wordmark />
          </Link>
          <p>{f.about}</p>
        </div>

        <nav className={styles.columns} aria-label={f.label}>
          <div>
            <h2 className="mono-caps">{f.cities}</h2>
            <ul>
              {sharing && (
                <li>
                  <Link href="/explore">{m.nav.explore}</Link>
                </li>
              )}
              <li>
                <Link href="/create">{m.nav.create}</Link>
              </li>
              {sharing && (
                <li>
                  <Link href="/account">{m.nav.account}</Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mono-caps">{f.project}</h2>
            <ul>
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className={styles.github}>
                  <GithubMark />
                  {f.sourceCode}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mono-caps">{f.legal}</h2>
            <ul>
              <li>
                <Link href="/legal">{f.legalNotice}</Link>
              </li>
              <li>
                <Link href="/terms">{f.terms}</Link>
              </li>
              <li>
                <Link href="/privacy">{f.privacy}</Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className={styles.bottom}>
        <span className="mono-caps">© 2026 DOMCity</span>
        <LanguageSwitch />
        <a href="#" className="mono-caps">
          {f.top}
        </a>
      </div>
    </footer>
  );
}
