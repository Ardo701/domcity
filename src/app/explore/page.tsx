import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SiteCard } from "@/format/shared";
import { sharingEnabled } from "@/server/config";
import { fileStore, thumbKey } from "@/server/files";
import { recentSites } from "@/server/store";
import { CitySearch } from "@/ui/CitySearch";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteGallery } from "@/ui/SiteGallery";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "../subpage.module.css";

export const metadata: Metadata = {
  title: "Découvrir les villes",
  description: "Les pages web construites en villes 3D et partagées sur DOMCity, rangées par site : cherchez-en un, ou parcourez les derniers mis à jour.",
};

/** The most the database returns at once (`recent_sites`). */
const LATEST = 60;

// The gallery updates every minute.
export const revalidate = 60;

export default async function ExplorePage() {
  const files = sharingEnabled() ? fileStore() : null;
  if (!files) notFound();
  let sites: SiteCard[] = [];
  try {
    sites = await recentSites(LATEST);
  } catch (error) {
    console.error("galerie", error);
  }
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="explore" />

      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.title}>Découvrir les villes</h1>
          <p className={styles.lead}>
            Chaque page partagée est devenue une ville, rangée avec les autres pages de son site. Cherchez un site ou
            une page, ou parcourez les derniers sites mis à jour.
          </p>
        </div>
        <CitySearch />
        <section aria-label="Les derniers sites mis à jour">
          <SiteGallery sites={sites} thumbUrl={(slug) => files.publicUrl(thumbKey(slug))} />
          {sites.length === LATEST && (
            <p className={styles.more}>Les {LATEST} derniers sites mis à jour. Pour les autres, cherchez-les par leur nom.</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
