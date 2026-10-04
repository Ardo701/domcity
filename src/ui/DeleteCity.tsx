"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { sharedCityPath } from "@/format/shared";
import { useMessages } from "@/i18n/client";
import { DELETE } from "@/i18n/messages/pages";
import { forgetCity } from "./savedCities";
import styles from "./Sheet.module.css";

// The token is after the "#": it is never sent to the server in the address, nor kept in its logs.
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readToken = () => decodeURIComponent(window.location.hash.slice(1));

export function DeleteCity({ slug, title }: { slug: string; title: string | null }) {
  const m = useMessages(DELETE);
  const router = useRouter();
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
        setState({ error: data.error ?? m.failed });
        return;
      }
      forgetCity(slug);
      window.history.replaceState(null, "", window.location.pathname);
      setState("done");
      // The pages kept by the browser (home page, Explore) still show the city: they are fetched again.
      router.refresh();
    } catch {
      setState({ error: m.offline });
    }
  };

  if (state === "done") {
    return (
      <div className={styles.card}>
        <p>{m.done}</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.ghost}>
            {m.home}
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.card}>
        <p>{m.incomplete}</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p>
        {title ? (
          <>
            {m.confirmNamed} <strong>{m.quoted(title)}</strong>.
          </>
        ) : (
          <>{m.confirm}</>
        )}{" "}
        {m.final}
      </p>
      {typeof state === "object" && <p className={styles.alert}>{state.error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={remove} disabled={state === "sending"}>
          {state === "sending" ? m.deleting : m.submit}
        </button>
        <Link href={sharedCityPath(slug)} className={styles.ghost}>
          {m.cancel}
        </Link>
      </div>
    </div>
  );
}
