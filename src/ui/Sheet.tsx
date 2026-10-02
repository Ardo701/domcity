import Link from "next/link";
import { Wordmark } from "./Logo";
import styles from "./Sheet.module.css";

/** Mise en page « planche » des pages secondaires : cadre, en-tête, contenu. */
export function Sheet({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.sheet} graph-paper`}>
      <header className={styles.topbar}>
        <Link href="/" aria-label="DOMCity, accueil" className={styles.brand}>
          <Wordmark />
        </Link>
      </header>
      <main className={styles.main}>
        <p className={`${styles.kicker} mono-caps`}>
          <span className={styles.square} aria-hidden />
          {kicker}
        </p>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
