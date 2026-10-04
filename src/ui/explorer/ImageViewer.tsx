import { useEffect } from "react";
import type { CityImage } from "@/format/types";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { FitImage } from "./FitImage";
import styles from "./explorer.module.css";

/**
 * The image enlarged, in an ordinary dialog. Displaying an image from another
 * site is always allowed: only the 3D needs permission.
 */
export function ImageViewer({ image, onClose }: { image: CityImage; onClose: () => void }) {
  const m = useMessages(CITY).viewer;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={m.label} onClick={onClose}>
      <figure onClick={(event) => event.stopPropagation()}>
        <FitImage src={image.src} alt={image.alt ?? ""} minSide={240} />
        <figcaption>
          <span>{image.alt || m.noAlt}</span>
          <a href={image.src} target="_blank" rel="noreferrer" className="mono-caps">
            {m.original}
          </a>
          <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
            ×
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
