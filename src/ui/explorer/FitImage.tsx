import { useState } from "react";

/** Grossie plus de quatre fois, une image floute : on garde alors ses pixels nets. */
const SHARP_ZOOM = 4;

export interface Zoom {
  width: number;
  height: number;
  /** Pixels nets plutôt que lissés. */
  sharp: boolean;
}

/**
 * Agrandit une image trop petite pour être lue, d'un nombre entier de fois pour que
 * tous ses pixels gardent la même taille. Rien si elle est déjà assez grande.
 */
export function zoomFor(width: number, height: number, minSide: number): Zoom | null {
  const side = Math.max(width, height);
  if (!side) return null;
  const factor = Math.floor(minSide / side);
  if (factor < 2) return null;
  return { width: width * factor, height: height * factor, sharp: factor > SHARP_ZOOM };
}

/**
 * Une image d'un site, agrandie si elle est petite (icône, drapeau, pictogramme) :
 * son plus grand côté atteint au moins `minSide` pixels.
 */
export function FitImage({
  src,
  alt,
  minSide,
  lazy = false,
}: {
  src: string;
  alt: string;
  minSide: number;
  lazy?: boolean;
}) {
  // Taille réelle, connue une fois l'image chargée. Liée à son adresse : une autre image repart de zéro.
  const [natural, setNatural] = useState<{ src: string; width: number; height: number } | null>(null);
  const zoom = natural?.src === src ? zoomFor(natural.width, natural.height, minSide) : null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={lazy ? "lazy" : undefined}
      onLoad={(event) =>
        setNatural({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
      }
      style={
        zoom
          ? { width: zoom.width, height: zoom.height, imageRendering: zoom.sharp ? "pixelated" : undefined }
          : undefined
      }
    />
  );
}
