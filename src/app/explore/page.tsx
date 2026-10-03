import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CityCard } from "@/format/shared";
import { sharingEnabled } from "@/server/config";
import { fileStore, thumbKey } from "@/server/files";
import { recentCaptures } from "@/server/store";
import { CityGallery } from "@/ui/CityGallery";
import { CitySearch } from "@/ui/CitySearch";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "../subpage.module.css";

export const metadata: Metadata = {
  title: "Découvrir les villes",
  description: "Les pages web construites en villes 3D et partagées sur DOMCity : cherchez un site, ou parcourez les dernières.",
};

/** Le plus que la base rende d'un coup (`recent_captures`). */
const LATEST = 60;

// La galerie se met à jour toutes les minutes.
export const revalidate = 60;

export default async function ExplorePage() {
  const files = sharingEnabled() ? fileStore() : null;
  if (!files) notFound();
  let cities: CityCard[] = [];
  try {
    cities = await recentCaptures(LATEST);
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
            Chaque page partagée est devenue une ville, datée de son relevé. Cherchez un site ou une page, ou parcourez
            les dernières constructions.
          </p>
        </div>
        <CitySearch />
        <section aria-label="Les dernières villes">
          <CityGallery cities={cities} thumbUrl={(slug) => files.publicUrl(thumbKey(slug))} />
          {cities.length === LATEST && (
            <p className={styles.more}>Les {LATEST} dernières villes. Pour les autres, cherchez leur site ou leur page.</p>
          )}
        </section>
      </main>

      <footer className={home.cartouche}>
        <div>
          <span className="mono-caps">Projet</span>
          <strong>DOMCity</strong>
        </div>
        <div>
          <span className="mono-caps">Villes</span>
          <p>Publiées par leurs visiteurs, chacune datée de son relevé.</p>
        </div>
        <div>
          <span className="mono-caps">Recherche</span>
          <p>Tolérante aux fautes : « amzon » trouve amazon.com.</p>
        </div>
        <div>
          <span className="mono-caps">Relevé</span>
          <p>Seulement la forme de la page : jamais son texte, sauf les titres.</p>
        </div>
      </footer>
    </div>
  );
}
