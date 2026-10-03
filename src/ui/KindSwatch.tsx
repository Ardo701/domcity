import type { Kind } from "@/format/taxonomy";
import { LEGEND_SPRITE } from "./legendSprite.generated";

/**
 * Une vignette de la légende : un morceau de ville rendu par le vrai moteur 3D (/dev/legend),
 * pris dans une seule image pour toutes. Un test vérifie que chaque genre y a la sienne.
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

/** La vignette d'un genre, pour la légende et les fiches. */
export function KindSwatch({ kind, size = 22 }: { kind: Kind; size?: number }) {
  return <Vignette name={kind} size={size} />;
}

/** Une rue, qui n'est pas un élément de la page. */
export function RoadSwatch({ size = 22 }: { size?: number }) {
  return <Vignette name="road" size={size} />;
}
