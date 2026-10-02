"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { sharedCityPath } from "@/format/shared";
import { SAVED_CITIES_KEY as KEY, type MyCity } from "./savedCities";
import styles from "./CitySearch.module.css";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const snapshot = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

/** Les villes partagées depuis ce navigateur, avec leur lien de suppression. Rien ne s'affiche s'il n'y en a pas. */
export function MyCities() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const cities = useMemo<MyCity[]>(() => {
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, [raw]);

  if (cities.length === 0) return null;
  return (
    <div className={styles.wrap}>
      <p className="mono-caps">Vos villes, sur ce navigateur</p>
      <ul className={`${styles.results} ${styles.mine}`}>
        {cities.map((city) => (
          <li key={city.slug}>
            <Link href={sharedCityPath(city.slug)}>
              <span className={`${styles.kind} mono-caps`}>Ville</span>
              <span className={styles.name}>{city.title}</span>
            </Link>
            <Link href={`/c/${city.slug}/supprimer#${city.token}`} className={styles.remove}>
              Supprimer
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
