"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CityExplorer } from "@/ui/explorer/CityExplorer";
import styles from "@/ui/explorer/explorer.module.css";
import { ReceiveError, receiveCity, type ReceivedCity } from "@/ui/receiveCity";

type State =
  | { phase: "waiting" }
  | { phase: "ready"; received: ReceivedCity }
  | { phase: "error"; title: string; message: string };

/** La ville envoyée par le favori : on l'attend, on la vérifie, puis on la construit. */
export function NewCity({ canShare }: { canShare: boolean }) {
  const [state, setState] = useState<State>({ phase: "waiting" });

  useEffect(() => {
    let alive = true;
    receiveCity().then(
      (received) => alive && setState({ phase: "ready", received }),
      (error: unknown) => {
        if (!alive) return;
        if (error instanceof ReceiveError) setState({ phase: "error", title: error.title, message: error.message });
        else setState({ phase: "error", title: "Relevé illisible", message: "La ville reçue n'a pas pu être lue. Relancez le favori." });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  if (state.phase === "ready") {
    const { doc, outdated } = state.received;
    return <CityExplorer key={doc.capturedAt} source={{ kind: "capture", city: doc, outdated }} canShare={canShare} />;
  }

  return (
    <div className={styles.shell}>
      {state.phase === "waiting" ? (
        <div className={styles.loadingWrap}>
          <section className={styles.loading} aria-live="polite" aria-busy="true">
            <p className="mono-caps">Favori DOMCity</p>
            <h2>Réception du relevé</h2>
            <p className={styles.waitingText}>La page d&apos;origine envoie sa structure à DOMCity.</p>
            <div className={`${styles.progress} ${styles.progressWaiting}`} aria-hidden>
              <span />
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            <p className="mono-caps">Favori DOMCity</p>
            <h2>{state.title}</h2>
            <p>{state.message}</p>
            <div className={styles.actionsRow}>
              <Link href="/installer" className={styles.primary}>
                Installer le favori
              </Link>
              <Link href="/" className={styles.secondary}>
                Retour à l&apos;accueil
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
