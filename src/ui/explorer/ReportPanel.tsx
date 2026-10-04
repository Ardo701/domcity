"use client";

import { useEffect, useState } from "react";
import { REPORT_REASONS, type ReportReason } from "@/format/shared";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import styles from "./explorer.module.css";

/** Reports a city. Three reports from different people hide it. */
export function ReportPanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const m = useMessages(CITY).report;
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
        setState({ error: data.error ?? m.failed });
        return;
      }
      setState("done");
    } catch {
      setState({ error: m.offline });
    }
  };

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="report-title">
      <section className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <p className="mono-caps">{m.kicker}</p>
            <h2 id="report-title">{m.title}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
            ×
          </button>
        </div>

        {state === "done" ? (
          <>
            <p className={styles.blurb}>{m.done}</p>
            <div className={styles.actionsRow}>
              <button type="button" className={styles.secondary} onClick={onClose}>
                {m.close}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={send} className={styles.reportForm}>
            <fieldset>
              <legend className="mono-caps">{m.reason}</legend>
              {REPORT_REASONS.map((key) => (
                <label key={key} className={styles.radio}>
                  <input type="radio" name="reason" value={key} checked={reason === key} onChange={() => setReason(key)} />
                  {m.reasons[key]}
                </label>
              ))}
            </fieldset>
            <label className={styles.textareaLabel}>
              <span className="mono-caps">{m.details}</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} />
            </label>
            {typeof state === "object" && (
              <p className={styles.errorLine} role="alert">
                {state.error}
              </p>
            )}
            <div className={styles.actionsRow}>
              <button type="submit" className={styles.primary} disabled={state === "sending"}>
                {state === "sending" ? m.sending : m.submit}
              </button>
              <button type="button" className={styles.secondary} onClick={onClose}>
                {m.cancel}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
