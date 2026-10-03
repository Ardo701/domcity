"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteCityPath, sharedCityPath } from "@/format/shared";
import styles from "./Account.module.css";
import { useMyCities, type MyCity } from "./savedCities";

const deletePath = (city: MyCity) => deleteCityPath(city.slug, city.token);

function sharedOn(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Copie le lien secret complet : c'est la seule façon de supprimer la ville depuis un autre navigateur. */
function CopySecret({ city }: { city: MyCity }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${deletePath(city)}`);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2200);
  };
  return (
    <button type="button" className={styles.action} onClick={copy} aria-live="polite">
      {state === "copied" ? "Lien copié" : state === "failed" ? "Copie impossible" : "Copier le lien secret"}
    </button>
  );
}

/** Les villes publiées depuis ce navigateur : les revoir, garder leur lien secret, les supprimer. */
export function AccountCities() {
  const cities = useMyCities();

  // Pas encore lues (rendu serveur, première image) : rien plutôt qu'un « aucune ville » trompeur.
  if (cities === null) return <div className={styles.pending} />;

  if (cities.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Aucune ville publiée depuis ce navigateur.</p>
        <p>
          Relevez une page avec le favori, puis cliquez sur « Publier » : la ville apparaîtra ici, avec le lien qui
          permet de la supprimer.
        </p>
        <Link href="/create" className={styles.start}>
          Créer une ville <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <section className={styles.cities} aria-labelledby="vos-villes">
      <div className={styles.citiesHead}>
        <h2 id="vos-villes">Vos villes publiées</h2>
        <span className="mono-caps">
          {cities.length} ville{cities.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className={styles.list}>
        {cities.map((city) => {
          const date = sharedOn(city.sharedAt);
          return (
            <li key={city.slug}>
              <div className={styles.cityText}>
                <Link href={sharedCityPath(city.slug)} className={styles.cityTitle}>
                  {city.title}
                </Link>
                <p className={styles.cityMeta}>
                  {date && <>Publiée le {date} · </>}
                  {sharedCityPath(city.slug)}
                </p>
              </div>
              <div className={styles.actions}>
                <Link href={sharedCityPath(city.slug)} className={styles.action}>
                  Voir
                </Link>
                <CopySecret city={city} />
                <Link href={deletePath(city)} className={`${styles.action} ${styles.danger}`}>
                  Supprimer
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>
        Ces villes ne sont gardées que dans ce navigateur. Un autre navigateur, une navigation privée ou
        l&apos;effacement des données du site ne les connaissent pas, et leur lien secret serait perdu : copiez-le pour
        celles que vous voudrez peut-être supprimer un jour.
      </p>
    </section>
  );
}
