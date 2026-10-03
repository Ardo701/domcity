import styles from "./LegalPage.module.css";
import { LEGAL_UPDATED } from "./publisher";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** A legal page (notice, terms, privacy): site header, text, footer. */
export function LegalPage({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${styles.sheet} graph-paper`}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.head}>
          <p className="mono-caps">Mise à jour : {LEGAL_UPDATED}</p>
          <h1>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
        </div>
        <div className={styles.prose}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A piece of publisher information, or a highly visible marker as long as it is not filled in. */
export function Fill({ value, missing }: { value: string; missing: string }) {
  return value ? <>{value}</> : <mark className={styles.todo}>À compléter : {missing}</mark>;
}
