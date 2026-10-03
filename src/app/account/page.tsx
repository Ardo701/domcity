import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sharingEnabled } from "@/server/config";
import { AccountCities } from "@/ui/AccountCities";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "../subpage.module.css";

export const metadata: Metadata = {
  title: "Votre compte",
  description: "Les villes que vous avez publiées depuis ce navigateur, avec leur lien secret de suppression.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  if (!sharingEnabled()) notFound();
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="account" />

      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.title}>Votre compte</h1>
          <p className={styles.lead}>
            Ni inscription ni mot de passe : votre compte, c&apos;est ce navigateur. DOMCity s&apos;y souvient des villes
            que vous publiez, avec le lien secret qui permet de les supprimer.
          </p>
        </div>
        <AccountCities />
      </main>

      <footer className={home.cartouche}>
        <div>
          <span className="mono-caps">Projet</span>
          <strong>DOMCity</strong>
        </div>
        <div>
          <span className="mono-caps">Compte</span>
          <p>Sans inscription. Vos villes sont gardées dans ce navigateur, nulle part ailleurs.</p>
        </div>
        <div>
          <span className="mono-caps">Suppression</span>
          <p>Par le lien secret reçu au partage. Le serveur n&apos;en garde que l&apos;empreinte.</p>
        </div>
        <div>
          <span className="mono-caps">Relevé</span>
          <p>Seulement la forme de la page : jamais son texte, sauf les titres.</p>
        </div>
      </footer>
    </div>
  );
}
