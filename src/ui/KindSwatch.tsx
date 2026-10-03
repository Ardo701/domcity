import type { Kind } from "@/format/taxonomy";
import { LEGEND_SPRITE } from "./legendSprite.generated";

/**
 * A legend thumbnail: a piece of city rendered by the real 3D engine (/dev/legend),
 * taken from a single image for all of them. A test checks that each kind has its own.
 */
function Vignette({ name, size }: { name: string; size: number }) {
  const { src, columns, order } = LEGEND_SPRITE;
  const index = Math.max(0, order.indexOf(name));
  const rows = Math.ceil(order.length / columns);
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: `${columns * size}px ${rows * size}px`,
        backgroundPosition: `${-(index % columns) * size}px ${-Math.floor(index / columns) * size}px`,
      }}
    />
  );
}

/** The thumbnail of a kind, for the legend and the cards. */
export function KindSwatch({ kind, size = 22 }: { kind: Kind; size?: number }) {
  return <Vignette name={kind} size={size} />;
}

/** A street, which is not an element of the page. */
export function RoadSwatch({ size = 22 }: { size?: number }) {
  return <Vignette name="road" size={size} />;
}
