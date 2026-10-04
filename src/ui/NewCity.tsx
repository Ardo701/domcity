"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMessages } from "@/i18n/client";
import { RECEPTION } from "@/i18n/messages/reception";
import { REFUSAL } from "@/i18n/messages/refusal";
import { CityExplorer } from "@/ui/explorer/CityExplorer";
import { InkLink } from "@/ui/InkLink";
import styles from "@/ui/explorer/explorer.module.css";
import { ReceiveError, receiveCity, type ReceivedCity } from "@/ui/receiveCity";

type State =
  | { phase: "waiting" }
  | { phase: "ready"; received: ReceivedCity }
  | { phase: "error"; error: ReceiveError };

/** The city sent by the bookmarklet: we wait for it, check it, then build it. */
export function NewCity({ canShare }: { canShare: boolean }) {
  const [state, setState] = useState<State>({ phase: "waiting" });
  const m = useMessages(RECEPTION);
  const refusals = useMessages(REFUSAL).reasons;

  useEffect(() => {
    let alive = true;
    receiveCity().then(
      (received) => alive && setState({ phase: "ready", received }),
      (error: unknown) => {
        if (alive) setState({ phase: "error", error: error instanceof ReceiveError ? error : new ReceiveError("unknown") });
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
            <h2>{m.waiting}</h2>
            <p className={styles.waitingText}>{m.waitingText}</p>
            <div className={`${styles.progress} ${styles.progressWaiting}`} aria-hidden>
              <span />
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.errorWrap}>
          <section className={styles.error} role="alert">
            <h2>{m.errors[state.error.code].title}</h2>
            <p>{state.error.refusal ? refusals[state.error.refusal] : m.errors[state.error.code].message}</p>
            {/* The main action takes the home page button: install the bookmarklet, or leave a refused site. */}
            <div className={styles.actionsRow}>
              {state.error.refused ? (
                <InkLink href="/" size="small">
                  {m.home}
                </InkLink>
              ) : (
                <>
                  <InkLink href="/create" size="small">
                    {m.install}
                  </InkLink>
                  <Link href="/" className={styles.secondary}>
                    {m.home}
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
