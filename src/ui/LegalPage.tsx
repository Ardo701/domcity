import styles from "./LegalPage.module.css";
import { LEGAL_UPDATED } from "./publisher";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Une page légale (mentions, conditions, confidentialité) : en-tête du site, texte, pied de page. */
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

/** Une information de l'éditeur, ou un repère bien visible tant qu'elle n'est pas renseignée. */
export function Fill({ value, missing }: { value: string; missing: string }) {
  return value ? <>{value}</> : <mark className={styles.todo}>À compléter : {missing}</mark>;
}
