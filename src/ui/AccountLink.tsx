"use client";

import Link from "next/link";
import styles from "./Account.module.css";
import { useMyCities } from "./savedCities";

/** Le bouton vers le compte, avec le nombre de villes publiées depuis ce navigateur quand il y en a. */
export function AccountLink() {
  const count = useMyCities()?.length ?? 0;
  return (
    <Link href="/account" className={styles.accountLink}>
      <span>Vos villes publiées</span>
      {count > 0 && (
        <span className={styles.count} aria-label={`${count} ville${count > 1 ? "s" : ""}`}>
          {count}
        </span>
      )}
      <span aria-hidden className={styles.arrow}>
        →
      </span>
    </Link>
  );
}
