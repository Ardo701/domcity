import { useState } from "react";

/** Enlarged more than four times, an image blurs: we then keep its pixels sharp. */
const SHARP_ZOOM = 4;

export interface Zoom {
  width: number;
  height: number;
  /** Sharp pixels rather than smoothed ones. */
  sharp: boolean;
}

/**
 * Enlarges an image too small to be read, by a whole number of times so that
 * all its pixels keep the same size. Nothing if it is already large enough.
 */
export function zoomFor(width: number, height: number, minSide: number): Zoom | null {
  const side = Math.max(width, height);
  if (!side) return null;
  const factor = Math.floor(minSide / side);
  if (factor < 2) return null;
  return { width: width * factor, height: height * factor, sharp: factor > SHARP_ZOOM };
}

/**
 * An image from a site, enlarged if it is small (icon, flag, pictogram):
 * its longest side reaches at least `minSide` pixels.
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
  // Real size, known once the image has loaded. Tied to its address: another image starts from zero.
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
