"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { forgetCity } from "./savedCities";
import styles from "./Sheet.module.css";

// Le jeton est après le « # » : il n'est jamais envoyé au serveur dans l'adresse, ni gardé dans ses journaux.
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readToken = () => decodeURIComponent(window.location.hash.slice(1));

export function DeleteCity({ slug, title }: { slug: string; title: string | null }) {
  const token = useSyncExternalStore(subscribeHash, readToken, () => "");
  const [state, setState] = useState<"confirm" | "sending" | "done" | { error: string }>("confirm");

  const remove = async () => {
    setState("sending");
    try {
      const response = await fetch(`/api/captures/${slug}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState({ error: data.error ?? "La suppression a échoué." });
        return;
      }
      forgetCity(slug);
      window.history.replaceState(null, "", window.location.pathname);
      setState("done");
    } catch {
      setState({ error: "Connexion impossible. Réessayez dans un instant." });
    }
  };

  if (state === "done") {
    return (
      <div className={styles.card}>
        <p>La ville a été supprimée, avec ses fichiers. Son lien public ne mène plus nulle part.</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.ghost}>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.card}>
        <p>
          Ce lien est incomplet : il manque le jeton secret, la partie après le « # ». Utilisez le lien de suppression
          complet reçu au moment du partage.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p>
        {title ? (
          <>
            Vous allez supprimer la ville <strong>« {title} »</strong>.
          </>
        ) : (
          <>Vous allez supprimer cette ville.</>
        )}{" "}
        Son lien public cessera de fonctionner. C&apos;est définitif.
      </p>
      {typeof state === "object" && <p className={styles.alert}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={remove} disabled={state === "sending"}>
          {state === "sending" ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <Link href={`/c/${slug}`} className={styles.ghost}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
