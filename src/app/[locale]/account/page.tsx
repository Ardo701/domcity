import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ACCOUNT } from "@/i18n/messages/pages";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { fileStore } from "@/server/files";
import { AccountCities } from "@/ui/AccountCities";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "../subpage.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(ACCOUNT);
  return { title: m.title, description: m.description, robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  if (!sharingEnabled()) notFound();
  const m = await getMessages(ACCOUNT);
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="account" />

      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.title}>{m.title}</h1>
          <p className={styles.lead}>{m.lead}</p>
        </div>
        <AccountCities filesBase={fileStore()!.publicUrl("")} />
      </main>

      <SiteFooter />
    </div>
  );
}
