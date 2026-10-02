import { useEffect } from "react";
import type { CityImage } from "@/format/types";
import styles from "./explorer.module.css";

/**
 * L'image en grand, dans une fenêtre ordinaire. Afficher une image d'un autre
 * site est toujours permis : c'est seulement la 3D qui a besoin d'autorisation.
 */
export function ImageViewer({ image, onClose }: { image: CityImage; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label="Image" onClick={onClose}>
      <figure onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt ?? ""} referrerPolicy="no-referrer" />
        <figcaption>
          <span>{image.alt || "Sans texte alternatif"}</span>
          <a href={image.src} target="_blank" rel="noreferrer" className="mono-caps">
            Ouvrir l&apos;original
          </a>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
