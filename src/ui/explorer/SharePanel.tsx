"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { WikiLang } from "@/capture/wikipedia";
import type { CityDoc, CityNode } from "@/format/types";
import { rememberCity } from "@/ui/savedCities";
import { CopyField } from "./CopyField";
import styles from "./explorer.module.css";

type State =
  | { step: "preview" }
  | { step: "sending" }
  | { step: "done"; slug: string; url: string; deleteUrl: string }
  | { step: "error"; message: string };

function headingsOf(root: CityNode): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.heading) out.push(node.heading);
    for (let i = (node.children?.length ?? 0) - 1; i >= 0; i -= 1) stack.push(node.children![i]);
  }
  return out;
}

/** Aperçu de ce qui sera publié, puis les deux liens : public et secret. */
export function SharePanel({
  doc,
  lang,
  title,
  takeSnapshot,
  onClose,
}: {
  doc: CityDoc;
  lang: WikiLang;
  title: string;
  takeSnapshot: () => Promise<Blob | null>;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ step: "preview" });
  const [thumb, setThumb] = useState<{ blob: Blob; url: string } | null>(null);
  const headings = useMemo(() => headingsOf(doc.root), [doc]);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    takeSnapshot().then((blob) => {
      if (!alive || !blob) return;
      url = URL.createObjectURL(blob);
      setThumb({ blob, url });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [takeSnapshot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state.step !== "sending") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, state.step]);

  const publish = async () => {
    setState({ step: "sending" });
    const form = new FormData();
    form.set("source", "wikipedia");
    form.set("lang", lang);
    form.set("title", title);
    if (thumb) form.set("thumbnail", thumb.blob, "miniature.jpg");
    try {
      const response = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await response.json()) as { slug?: string; url?: string; deleteUrl?: string; token?: string; error?: string };
      if (!response.ok || !data.slug || !data.url || !data.deleteUrl || !data.token) {
        setState({ step: "error", message: data.error ?? "Le partage a échoué." });
        return;
      }
      rememberCity({ slug: data.slug, title: doc.title, token: data.token, sharedAt: new Date().toISOString() });
      setState({ step: "done", slug: data.slug, url: data.url, deleteUrl: data.deleteUrl });
    } catch {
      setState({ step: "error", message: "Connexion impossible. Réessayez dans un instant." });
    }
  };

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="share-title">
      <section className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <p className="mono-caps">{state.step === "done" ? "Ville publiée" : "Partager la ville"}</p>
            <h2 id="share-title">{doc.title}</h2>
          </div>
          {state.step !== "sending" && (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
              ×
            </button>
          )}
        </div>

        {state.step === "done" ? (
          <div className={styles.shareDone}>
            <CopyField label="Lien public, à partager" value={state.url} />
            <CopyField label="Lien secret de suppression" value={state.deleteUrl} secret />
            <p className={styles.warning}>
              Le lien secret permet de supprimer la ville. Gardez-le pour vous : il n&apos;est affiché qu&apos;une
              fois. Ce navigateur s&apos;en souvient aussi, dans « Vos villes » sur l&apos;accueil.
            </p>
            <div className={styles.actionsRow}>
              <Link href={`/c/${state.slug}`} className={styles.primary}>
                Voir la ville partagée
              </Link>
              <button type="button" className={styles.secondary} onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.thumbFrame}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.url} alt="Miniature de la ville" />
              ) : (
                <span className="mono-caps">Prise de vue…</span>
              )}
            </div>
            <p className={styles.thumbNote}>
              La miniature reprend votre vue actuelle. Pour en changer, fermez, recadrez, puis revenez.
            </p>

            <div className={styles.published}>
              <p className="mono-caps">Ce qui sera publié</p>
              <ul>
                <li>La structure de la page : les balises, leur imbrication, la quantité de texte.</li>
                <li>Les adresses des images, pas les images elles-mêmes.</li>
                <li>
                  Le texte des titres, et lui seulement ({headings.length} titre{headings.length > 1 ? "s" : ""}) :
                </li>
              </ul>
              {headings.length > 0 && (
                <p className={styles.headingList}>
                  {headings.slice(0, 12).join(" · ")}
                  {headings.length > 12 ? ` · et ${headings.length - 12} autres` : ""}
                </p>
              )}
            </div>

            {state.step === "error" && (
              <p className={styles.errorLine} role="alert">
                {state.message}
              </p>
            )}

            <div className={styles.actionsRow}>
              <button type="button" className={styles.primary} onClick={publish} disabled={state.step === "sending"}>
                {state.step === "sending" ? "Publication…" : "Publier la ville"}
              </button>
              <button type="button" className={styles.secondary} onClick={onClose} disabled={state.step === "sending"}>
                Annuler
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
