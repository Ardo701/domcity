import Link from "next/link";
import type { ReactNode } from "react";
import type { LotInfo } from "@/city/describe";
import type { ImageStatus } from "@/city/textures";
import { useLocale } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { KINDS_TEXT } from "@/i18n/messages/kinds";
import { KindSwatch } from "@/ui/KindSwatch";
import { FitImage } from "./FitImage";
import styles from "./explorer.module.css";

/** Detailed card of the selected element. */
export function Inspector({
  info,
  number = info.id,
  page,
  imageStatus,
  canFocus,
  onClose,
  onSelect,
  onFocus,
  onViewImage,
}: {
  info: LotInfo;
  /** Number of the element in its page (in the megalopolis, the lots of all pages follow each other). */
  number?: number;
  /** In the megalopolis: the element's page, and its own city. */
  page?: { path: string; href: string };
  imageStatus?: ImageStatus;
  canFocus: boolean;
  onClose: () => void;
  onSelect: (id: number) => void;
  onFocus: () => void;
  onViewImage: () => void;
}) {
  const locale = useLocale();
  const m = CITY[locale].inspector;
  const chars = KINDS_TEXT[locale].chars;
  const added = info.ownText || info.gallery;
  // An image from a refused site is neither shown nor described (its alt text can be as crude as the image).
  const refused = info.img?.refused === true;
  const parent = info.path.length > 1 ? info.path[info.path.length - (added ? 1 : 2)] : null;
  const rows: Array<[string, ReactNode]> = [
    [m.ownText, chars(info.text)],
    [m.totalText, chars(info.textTotal)],
    [m.inside, info.children > 0 ? m.insideValue(info.children, info.descendants) : m.none],
    [m.depth, m.level(info.depth)],
  ];
  if (info.floors) rows.push([m.height, m.floors(info.floors)]);
  if (info.links) rows.splice(3, 0, [m.links, m.linksValue(info.links.internal, info.links.external)]);
  if (info.rect) {
    const [, y, w, h] = info.rect;
    rows.push([m.onPage, m.onPageValue(w, h, y)]);
  }
  if (info.background) {
    rows.push([
      m.background,
      <span key="fond" className={styles.colorValue}>
        <span className={styles.colorChip} style={{ background: info.background }} aria-hidden />
        {info.background}
      </span>,
    ]);
  }

  return (
    <aside className={styles.inspector} aria-label={m.label}>
      <div className={styles.inspectorHead}>
        <KindSwatch kind={info.kind} size={40} />
        <div>
          <p className={`${styles.inspectorKicker} mono-caps`}>{m.number(number)}</p>
          <h2>{info.name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
          ×
        </button>
      </div>

      {page && (
        <p className={styles.inspectorPage}>
          <span className="mono-caps">{m.page}</span>
          <span className={styles.inspectorPagePath}>{page.path}</span>
          <Link href={page.href}>{m.ownCity}</Link>
        </p>
      )}

      <code className={styles.selector}>
        {info.ownText ? m.directTextOf(parent?.selector ?? "") : info.gallery ? m.imagesOf(parent?.selector ?? "") : `<${info.selector}>`}
      </code>
      <p className={styles.blurb}>{info.blurb}</p>

      {info.heading && <blockquote className={styles.heading}>{info.heading}</blockquote>}

      {info.img && (
        <div className={styles.imageBlock}>
          {refused ? (
            <p className={styles.imageMissing}>{m.refused}</p>
          ) : info.img.src ? (
            <button type="button" className={styles.imagePreview} onClick={onViewImage} aria-label={m.viewImage}>
              <FitImage src={info.img.src} alt={info.img.alt ?? ""} minSide={160} lazy />
            </button>
          ) : (
            <p className={styles.imageMissing}>{m.noAddress}</p>
          )}
          {imageStatus && !refused && <p className={`${styles.imageStatus} mono-caps`}>{m.status[imageStatus]}</p>}
          {info.img.alt && !refused && <p className={styles.alt}>{info.img.alt}</p>}
        </div>
      )}

      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="mono-caps">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.pathBlock}>
        <p className="mono-caps">{m.path}</p>
        <ol className={styles.path}>
          {info.path.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={step.id === info.id ? "true" : undefined}
                title={step.name}
              >
                {step.selector}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.actions}>
        {canFocus && (
          <button type="button" className={styles.primary} onClick={onFocus}>
            {m.approach}
          </button>
        )}
        {parent && !added && (
          <button type="button" className={styles.secondary} onClick={() => onSelect(parent.id)}>
            {m.parent}
          </button>
        )}
      </div>
    </aside>
  );
}
