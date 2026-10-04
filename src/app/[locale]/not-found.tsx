import Link from "next/link";
import { COMMON } from "@/i18n/messages/common";
import { getMessages } from "@/i18n/server";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./not-found.module.css";

export default async function NotFound() {
  const m = (await getMessages(COMMON)).notFound;
  return (
    <main className={`${styles.wrap} graph-paper`}>
      <section className={styles.card}>
        <KindSwatch kind="vacant" size={64} />
        <p className="mono-caps">{m.error}</p>
        <h1>{m.heading}</h1>
        <p>{m.text}</p>
        <Link href="/">{m.back}</Link>
      </section>
    </main>
  );
}
