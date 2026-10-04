"use client";

import Link from "next/link";
import { useMessages } from "@/i18n/client";
import { COMMON } from "@/i18n/messages/common";
import styles from "./Account.module.css";
import { useMyCities } from "./savedCities";

/** The button to the account, with the number of cities published from this browser when there are some. */
export function AccountLink() {
  const count = useMyCities()?.length ?? 0;
  const m = useMessages(COMMON).accountLink;
  return (
    <Link href="/account" className={styles.accountLink}>
      <span>{m.label}</span>
      {count > 0 && (
        <span className={styles.count} aria-label={m.count(count)}>
          {count}
        </span>
      )}
      <span aria-hidden className={styles.arrow}>
        →
      </span>
    </Link>
  );
}
