"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { WikiLang } from "@/capture/wikipedia";
import { sharedCityPath } from "@/format/shared";
import type { CityDoc, CityNode } from "@/format/types";
import { normalizePageUrl } from "@/format/url";
import { gzipCity } from "@/ui/loadShared";
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

/** Wikipédia : le serveur relève l'article lui-même. Favori : la ville part telle quelle. */
export type ShareSource = { kind: "wikipedia"; lang: WikiLang } | { kind: "bookmarklet" };

/** Aperçu de ce qui sera publié, puis les deux liens : public et secret. */
export function SharePanel({
  doc,
  source,
  takeSnapshot,
  onClose,
}: {
  doc: CityDoc;
  source: ShareSource;
  takeSnapshot: () => Promise<Blob | null>;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ step: "preview" });
  const [thumb, setThumb] = useState<{ blob: Blob; url: string } | null>(null);
  const [title, setTitle] = useState(doc.title);
  const headings = useMemo(() => headingsOf(doc.root), [doc]);
  const address = useMemo(() => normalizePageUrl(doc.url), [doc]);
  const bookmarklet = source.kind === "bookmarklet";
  const thirdParty = doc.page?.thirdParty?.length ?? 0;
  const linkTargets = useMemo(() => {
    const pages = doc.linksTo?.pages?.length ?? 0;
    const sites = doc.linksTo?.sites?.map(([domain]) => domain) ?? [];
    const out: string[] = [];
    if (pages > 0) {
      out.push(`${pages} autre${pages > 1 ? "s" : ""} page${pages > 1 ? "s" : ""} du site (une empreinte de chaque adresse, pas l'adresse)`);
    }
    if (sites.length > 0) {
      out.push(`${sites.length} site${sites.length > 1 ? "s" : ""} (${sites.slice(0, 6).join(", ")}${sites.length > 6 ? "…" : ""})`);
    }
    return out;
  }, [doc]);

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
    const publishedTitle = title.replace(/\s+/g, " ").trim() || doc.title;
    const form = new FormData();
    try {
      if (source.kind === "wikipedia") {
        form.set("source", "wikipedia");
        form.set("lang", source.lang);
        form.set("title", doc.title);
      } else {
        form.set("source", "bookmarklet");
        form.set("city", await gzipCity({ ...doc, title: publishedTitle.slice(0, 300) }), "ville.json.gz");
      }
      if (thumb) form.set("thumbnail", thumb.blob, "miniature.jpg");
      const response = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await response.json()) as {
        slug?: string;
        title?: string;
        pageUrl?: string;
        url?: string;
        deleteUrl?: string;
        token?: string;
        error?: string;
      };
      if (!response.ok || !data.slug || !data.url || !data.deleteUrl || !data.token) {
        setState({ step: "error", message: data.error ?? "Le partage a échoué." });
        return;
      }
      rememberCity({
        slug: data.slug,
        title: data.title ?? publishedTitle,
        token: data.token,
        sharedAt: new Date().toISOString(),
        pageUrl: data.pageUrl,
      });
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
            <h2 id="share-title">{bookmarklet ? title || doc.title : doc.title}</h2>
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
              <Link href={sharedCityPath(state.slug)} className={styles.primary}>
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
                <span className="mono-caps">Rendu de la maquette…</span>
              )}
            </div>
            <p className={styles.thumbNote}>
              L&apos;image de la ville est faite par DOMCity : toute la maquette, toujours vue du même angle. Elle sert
              d&apos;aperçu sur les réseaux et dans la galerie.
            </p>

            {bookmarklet && (
              <>
                <label className={styles.titleField}>
                  <span className="mono-caps">Titre publié</span>
                  <input
                    value={title}
                    maxLength={300}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={state.step === "sending"}
                  />
                </label>
                <p className={styles.privacy}>
                  <strong>Page privée ? Ne la publiez pas.</strong> Messagerie, compte client, document interne : sa
                  structure et ses titres deviendraient visibles de tous. La ville portera la mention « relevé par un
                  visiteur ».
                </p>
              </>
            )}

            <div className={styles.published}>
              <p className="mono-caps">Ce qui sera publié</p>
              <ul>
                {address && (
                  <li>
                    L&apos;adresse de la page, sans ses paramètres : <code className={styles.address}>{address.domain}{address.path}</code>
                  </li>
                )}
                <li>La structure de la page : les balises, leur imbrication, la quantité de texte.</li>
                <li>Les adresses des images, pas les images elles-mêmes.</li>
                {bookmarklet && (
                  <li>
                    La position et la couleur de fond de chaque élément, les images cassées, le nombre de
                    commentaires HTML
                    {thirdParty > 0 ? `, le nombre de scripts et les ${thirdParty} sites tiers contactés par la page` : ""}.
                  </li>
                )}
                {linkTargets.length > 0 && <li>Où mènent ses liens : {linkTargets.join(", et ")}.</li>}
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
