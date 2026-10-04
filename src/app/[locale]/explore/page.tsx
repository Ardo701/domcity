import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SiteCard } from "@/format/shared";
import { EXPLORE } from "@/i18n/messages/pages";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { fileStore, thumbKey } from "@/server/files";
import { recentSites } from "@/server/store";
import { CitySearch } from "@/ui/CitySearch";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteGallery } from "@/ui/SiteGallery";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "../subpage.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(EXPLORE);
  return { title: m.title, description: m.description };
}

/** The most the database returns at once (`recent_sites`). */
const LATEST = 60;

// The gallery updates every minute.
export const revalidate = 60;

export default async function ExplorePage() {
  const files = sharingEnabled() ? fileStore() : null;
  if (!files) notFound();
  const m = await getMessages(EXPLORE);
  let sites: SiteCard[] = [];
  try {
    sites = await recentSites(LATEST);
  } catch (error) {
    console.error("gallery", error);
  }
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="explore" />

      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.title}>{m.title}</h1>
          <p className={styles.lead}>{m.lead}</p>
        </div>
        <CitySearch />
        <section aria-label={m.latest}>
          <SiteGallery sites={sites} thumbUrl={(slug) => files.publicUrl(thumbKey(slug))} />
          {sites.length === LATEST && (
            <p className={styles.more}>{m.more(LATEST)}</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
