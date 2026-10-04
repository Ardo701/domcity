import { longDate } from "@/i18n/format";
import { COMMON } from "@/i18n/messages/common";
import { getLocale, getMessages } from "@/i18n/server";
import styles from "./LegalPage.module.css";
import { LEGAL_UPDATED } from "./publisher";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** A legal page (notice, terms, privacy): site header, text, footer. */
export async function LegalPage({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  const locale = await getLocale();
  const m = COMMON[locale].legalPage;
  return (
    <div className={`${styles.sheet} graph-paper`}>
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.head}>
          <p className="mono-caps">
            {m.updated} {longDate(LEGAL_UPDATED, locale)}
          </p>
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
export async function Fill({ value, missing }: { value: string; missing: string }) {
  if (value) return <>{value}</>;
  const m = (await getMessages(COMMON)).legalPage;
  return (
    <mark className={styles.todo}>
      {m.missing} {missing}
    </mark>
  );
}
