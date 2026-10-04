"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WikiLang } from "@/capture/wikipedia";
import { sharedCityPath, type ExistingVersion, type RecentVersionAnswer } from "@/format/shared";
import type { CityDoc, CityNode } from "@/format/types";
import { isPublicHost, normalizePageUrl } from "@/format/url";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
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

/** Wikipedia: the server captures the article itself. Bookmarklet: the city is sent as is. */
export type ShareSource = { kind: "wikipedia"; lang: WikiLang } | { kind: "bookmarklet" };

/** Preview of what will be published, then the two links: public and secret. */
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
  const m = useMessages(CITY).share;
  const [state, setState] = useState<State>({ step: "preview" });
  const [thumb, setThumb] = useState<{ blob: Blob; url: string } | null>(null);
  const [title, setTitle] = useState(doc.title);
  const headings = useMemo(() => headingsOf(doc.root), [doc]);
  const address = useMemo(() => normalizePageUrl(doc.url), [doc]);
  // The page's city published less than 30 days ago, if any: the panel warns before publishing a new version.
  const [existing, setExisting] = useState<ExistingVersion | null>(null);
  const notice = useRef<HTMLParagraphElement>(null);
  const bookmarklet = source.kind === "bookmarklet";
  const thirdParty = doc.page?.thirdParty?.length ?? 0;
  const linkTargets = useMemo(() => {
    const pages = doc.linksTo?.pages?.length ?? 0;
    const sites = doc.linksTo?.sites?.map(([domain]) => domain) ?? [];
    const out: string[] = [];
    if (pages > 0) out.push(m.otherPages(pages));
    if (sites.length > 0) out.push(m.sites(sites.length, `${sites.slice(0, 6).join(", ")}${sites.length > 6 ? "…" : ""}`));
    return out;
  }, [doc, m]);

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

  // Asked with the site's name only: the page is looked for here, its address does not leave the browser.
  useEffect(() => {
    if (!address || !isPublicHost(address.domain)) return;
    const controller = new AbortController();
    fetch(`/api/sites/recent?d=${encodeURIComponent(address.domain)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((data: { pages?: Array<ExistingVersion & { path: string }> }) => {
        const page = data.pages?.find((candidate) => candidate.path === address.path);
        if (page) setExisting((current) => current ?? { slug: page.slug, capturedAt: page.capturedAt });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [address]);

  // Learned when publishing (a version published in the meantime): the warning is at the top of the panel.
  useEffect(() => {
    if (existing) notice.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [existing]);

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
        form.set("city", await gzipCity({ ...doc, title: publishedTitle.slice(0, 300) }), "city.json.gz");
      }
      if (thumb) form.set("thumbnail", thumb.blob, "thumbnail.jpg");
      // The warning was shown: publishing is confirming over that version.
      if (existing) form.set("newVersionOf", existing.slug);
      const response = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await response.json()) as Partial<RecentVersionAnswer> & {
        slug?: string;
        title?: string;
        pageUrl?: string;
        url?: string;
        deleteUrl?: string;
        token?: string;
        error?: string;
      };
      if (response.status === 409 && data.existing) {
        setExisting(data.existing);
        setState({ step: "preview" });
        return;
      }
      if (!response.ok || !data.slug || !data.url || !data.deleteUrl || !data.token) {
        setState({ step: "error", message: data.error ?? m.failed });
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
      setState({ step: "error", message: m.offline });
    }
  };

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-labelledby="share-title">
      <section className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <p className="mono-caps">{state.step === "done" ? m.published : m.kicker}</p>
            <h2 id="share-title">{bookmarklet ? title || doc.title : doc.title}</h2>
          </div>
          {state.step !== "sending" && (
            <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
              ×
            </button>
          )}
        </div>

        {state.step === "done" ? (
          <div className={styles.shareDone}>
            <CopyField label={m.publicLink} value={state.url} />
            <CopyField label={m.secretLink} value={state.deleteUrl} secret />
            <p className={styles.warning}>{m.warning}</p>
            <div className={styles.actionsRow}>
              <Link href={sharedCityPath(state.slug)} className={styles.primary}>
                {m.seeCity}
              </Link>
              <button type="button" className={styles.secondary} onClick={onClose}>
                {m.close}
              </button>
            </div>
          </div>
        ) : (
          <>
            {existing && (
              <p ref={notice} className={styles.recentVersion} role="status">
                {m.recent(existing.capturedAt)}{" "}
                {/* In a new tab: this city stays here, ready to be published after comparing. */}
                <Link href={sharedCityPath(existing.slug)} target="_blank" rel="noopener" prefetch={false}>
                  {m.seeExisting}
                </Link>
              </p>
            )}
            <div className={styles.thumbFrame}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb.url} alt={m.thumbAlt} />
              ) : (
                <span className="mono-caps">{m.rendering}</span>
              )}
            </div>
            <p className={styles.thumbNote}>{m.thumbNote}</p>

            {bookmarklet && (
              <>
                <label className={styles.titleField}>
                  <span className="mono-caps">{m.titleField}</span>
                  <input
                    value={title}
                    maxLength={300}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={state.step === "sending"}
                  />
                </label>
                <p className={styles.privacy}>{m.privacy}</p>
              </>
            )}

            <div className={styles.published}>
              <p className="mono-caps">{m.whatTitle}</p>
              <ul>
                {address && (
                  <li>
                    {m.address}{" "}
                    <code className={styles.address}>
                      {address.domain}
                      {address.path}
                    </code>
                  </li>
                )}
                <li>{m.structure}</li>
                <li>{m.images}</li>
                {bookmarklet && <li>{m.bookmarklet(thirdParty)}</li>}
                {linkTargets.length > 0 && <li>{m.linksTo(linkTargets)}</li>}
                <li>{m.headings(headings.length)}</li>
              </ul>
              {headings.length > 0 && (
                <p className={styles.headingList}>
                  {headings.slice(0, 12).join(" · ")}
                  {headings.length > 12 ? m.moreHeadings(headings.length - 12) : ""}
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
                {state.step === "sending" ? m.publishing : existing ? m.publishNew : m.publish}
              </button>
              <button type="button" className={styles.secondary} onClick={onClose} disabled={state.step === "sending"}>
                {m.cancel}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
