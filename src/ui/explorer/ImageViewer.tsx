import { useEffect } from "react";
import type { CityImage } from "@/format/types";
import { FitImage } from "./FitImage";
import styles from "./explorer.module.css";

/**
 * The image enlarged, in an ordinary dialog. Displaying an image from another
 * site is always allowed: only the 3D needs permission.
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
        <FitImage src={image.src} alt={image.alt ?? ""} minSide={240} />
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
