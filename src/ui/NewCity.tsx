"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CityExplorer } from "@/ui/explorer/CityExplorer";
import { InkLink } from "@/ui/InkLink";
import styles from "@/ui/explorer/explorer.module.css";
import { ReceiveError, receiveCity, type ReceivedCity } from "@/ui/receiveCity";

type State =
  | { phase: "waiting" }
  | { phase: "ready"; received: ReceivedCity }
  | { phase: "error"; title: string; message: string; refused: boolean };

/** The city sent by the bookmarklet: we wait for it, check it, then build it. */
export function NewCity({ canShare }: { canShare: boolean }) {
  const [state, setState] = useState<State>({ phase: "waiting" });

  useEffect(() => {
    let alive = true;
    receiveCity().then(
      (received) => alive && setState({ phase: "ready", received }),
      (error: unknown) => {
        if (!alive) return;
        if (error instanceof ReceiveError) {
          setState({ phase: "error", title: error.title, message: error.message, refused: error.refused });
        } else {
          setState({
            phase: "error",
            title: "Relevé illisible",
            message: "La ville reçue n'a pas pu être lue. Relancez le favori.",
            refused: false,
          });
        }
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
            <h2>{state.title}</h2>
            <p>{state.message}</p>
            {/* The main action takes the home page button: install the bookmarklet, or leave a refused site. */}
            <div className={styles.actionsRow}>
              {state.refused ? (
                <InkLink href="/" size="small">
                  Retour à l&apos;accueil
                </InkLink>
              ) : (
                <>
                  <InkLink href="/create" size="small">
                    Installer le favori
                  </InkLink>
                  <Link href="/" className={styles.secondary}>
                    Retour à l&apos;accueil
                  </Link>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
