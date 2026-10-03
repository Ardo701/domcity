import Link from "next/link";
import { sharingEnabled } from "@/server/config";
import { GithubMark, REPO_URL } from "./GithubLink";
import { Wordmark } from "./Logo";
import styles from "./SiteFooter.module.css";

/** The footer of the site's pages: the brand, the pages, the project, the legal pages. */
export function SiteFooter() {
  const sharing = sharingEnabled();
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.about}>
          <Link href="/" className={styles.brand} aria-label="DOMCity, accueil">
            <Wordmark />
          </Link>
          <p>Chaque page web est une ville. Relevez une page, DOMCity la construit en 3D et vous la fait visiter.</p>
        </div>

        <nav className={styles.columns} aria-label="Pied de page">
          <div>
            <h2 className="mono-caps">Villes</h2>
            <ul>
              {sharing && (
                <li>
                  <Link href="/explore">Découvrir</Link>
                </li>
              )}
              <li>
                <Link href="/create">Créer une ville</Link>
              </li>
              {sharing && (
                <li>
                  <Link href="/account">Votre compte</Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mono-caps">Projet</h2>
            <ul>
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className={styles.github}>
                  <GithubMark />
                  Code source
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mono-caps">Légal</h2>
            <ul>
              <li>
                <Link href="/legal">Mentions légales</Link>
              </li>
              <li>
                <Link href="/terms">Conditions d&apos;utilisation</Link>
              </li>
              <li>
                <Link href="/privacy">Confidentialité</Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className={styles.bottom}>
        <span className="mono-caps">© 2026 DOMCity</span>
        <a href="#" className="mono-caps">
          Haut de page ↑
        </a>
      </div>
    </footer>
  );
}
