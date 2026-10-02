import type { ReactNode } from "react";
import { formatChars, formatCount, type LotInfo } from "@/city/describe";
import type { ImageStatus } from "@/city/textures";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

const IMAGE_STATUS: Record<ImageStatus, string> = {
  loading: "Chargement de l'affiche…",
  shown: "Affichée sur le panneau",
  blocked: "Le site de l'image interdit de l'utiliser en 3D. Elle reste visible ici.",
  missing: "Introuvable : l'image a disparu de son site.",
};

/** Fiche détaillée de l'élément sélectionné. */
export function Inspector({
  info,
  imageStatus,
  canFocus,
  onClose,
  onSelect,
  onFocus,
  onViewImage,
}: {
  info: LotInfo;
  imageStatus?: ImageStatus;
  canFocus: boolean;
  onClose: () => void;
  onSelect: (id: number) => void;
  onFocus: () => void;
  onViewImage: () => void;
}) {
  const parent = info.path.length > 1 ? info.path[info.path.length - (info.ownText ? 1 : 2)] : null;
  const rows: Array<[string, ReactNode]> = [
    ["Texte propre", formatChars(info.text)],
    ["Texte en tout", formatChars(info.textTotal)],
    ["Éléments dedans", info.children > 0 ? `${formatCount(info.children)} directs, ${formatCount(info.descendants)} en tout` : "aucun"],
    ["Profondeur", `niveau ${info.depth}`],
  ];
  if (info.floors) rows.push(["Hauteur", `${formatCount(info.floors)} étage${info.floors > 1 ? "s" : ""}`]);
  if (info.links) {
    rows.splice(3, 0, ["Liens", `${formatCount(info.links.internal)} internes · ${formatCount(info.links.external)} externes`]);
  }
  if (info.rect) {
    const [, y, w, h] = info.rect.map(formatCount);
    rows.push(["Sur la page", `${w} × ${h} px, à ${y} px du haut`]);
  }
  if (info.background) {
    rows.push([
      "Fond réel",
      <span key="fond" className={styles.colorValue}>
        <span className={styles.colorChip} style={{ background: info.background }} aria-hidden />
        {info.background}
      </span>,
    ]);
  }

  return (
    <aside className={styles.inspector} aria-label="Inspecteur">
      <div className={styles.inspectorHead}>
        <KindSwatch kind={info.kind} size={40} />
        <div>
          <p className={`${styles.inspectorKicker} mono-caps`}>Élément n° {info.id}</p>
          <h2>{info.name}</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer l'inspecteur">
          ×
        </button>
      </div>

      <code className={styles.selector}>{info.ownText ? `texte direct de <${parent?.selector}>` : `<${info.selector}>`}</code>
      <p className={styles.blurb}>{info.blurb}</p>

      {info.heading && <blockquote className={styles.heading}>{info.heading}</blockquote>}

      {info.img && (
        <div className={styles.imageBlock}>
          {info.img.src ? (
            <button type="button" className={styles.imagePreview} onClick={onViewImage} aria-label="Voir l'image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.img.src} alt={info.img.alt ?? ""} referrerPolicy="no-referrer" loading="lazy" />
            </button>
          ) : (
            <p className={styles.imageMissing}>Pas d&apos;adresse d&apos;image.</p>
          )}
          {imageStatus && <p className={`${styles.imageStatus} mono-caps`}>{IMAGE_STATUS[imageStatus]}</p>}
          {info.img.alt && <p className={styles.alt}>{info.img.alt}</p>}
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
        <p className="mono-caps">Adresse dans la page</p>
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
            Approcher
          </button>
        )}
        {parent && !info.ownText && (
          <button type="button" className={styles.secondary} onClick={() => onSelect(parent.id)}>
            Voir le parent
          </button>
        )}
      </div>
    </aside>
  );
}
