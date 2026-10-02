import Link from "next/link";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={`${styles.wrap} graph-paper`}>
      <section className={styles.card}>
        <KindSwatch kind="vacant" size={64} />
        <p className="mono-caps">Erreur 404</p>
        <h1>Terrain vague</h1>
        <p>Rien n&apos;a été construit à cette adresse.</p>
        <Link href="/">Retour à l&apos;accueil →</Link>
      </section>
    </main>
  );
}
