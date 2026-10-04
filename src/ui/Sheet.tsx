import Link from "next/link";
import { COMMON } from "@/i18n/messages/common";
import { getMessages } from "@/i18n/server";
import { Wordmark } from "./Logo";
import styles from "./Sheet.module.css";

/** "Drawing sheet" layout for secondary pages: frame, header, content. */
export async function Sheet({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  const m = await getMessages(COMMON);
  return (
    <div className={`${styles.sheet} graph-paper`}>
      <header className={styles.topbar}>
        <Link href="/" aria-label={m.homeLabel} className={styles.brand}>
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
