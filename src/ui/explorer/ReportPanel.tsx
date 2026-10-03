"use client";

import { useEffect, useState } from "react";
import { REPORT_REASONS, type ReportReason } from "@/format/shared";
import styles from "./explorer.module.css";

/** Reports a city. Three reports from different people hide it. */
export function ReportPanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("offensive");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"form" | "sending" | "done" | { error: string }>("form");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch(`/api/captures/${slug}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setState({ error: data.error ?? "Le signalement a échoué." });
        return;
      }
      setState("done");
    } catch {
      setState({ error: "Connexion impossible." });
    }
  };

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="report-title">
      <section className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <p className="mono-caps">Modération</p>
            <h2 id="report-title">Signaler cette ville</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        {state === "done" ? (
          <>
            <p className={styles.blurb}>Merci, c&apos;est noté. Si d&apos;autres visiteurs la signalent aussi, la ville sera masquée.</p>
            <div className={styles.actionsRow}>
              <button type="button" className={styles.secondary} onClick={onClose}>
                Fermer
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={send} className={styles.reportForm}>
            <fieldset>
              <legend className="mono-caps">Motif</legend>
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((key) => (
                <label key={key} className={styles.radio}>
                  <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
                  {REPORT_REASONS[key]}
                </label>
              ))}
            </fieldset>
            <label className={styles.textareaLabel}>
              <span className="mono-caps">Précisions (facultatif)</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} />
            </label>
            {typeof state === "object" && (
              <p className={styles.errorLine} role="alert">
                {state.error}
              </p>
            )}
            <div className={styles.actionsRow}>
              <button type="submit" className={styles.primary} disabled={state === "sending"}>
                {state === "sending" ? "Envoi…" : "Envoyer le signalement"}
              </button>
              <button type="button" className={styles.secondary} onClick={onClose}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
