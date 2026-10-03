import { isoBox } from "./iso";

/** Le repère DOMCity : quatre blocs, dont un monument orange. Rangés du fond vers l'avant (ordre de dessin). */
export const LOGO_BLOCKS = [
  { x: 0, z: 0, height: 2.6, color: "#ff4b12" },
  { x: 1.2, z: 0, height: 1.7, color: "#e8c891" },
  { x: 0, z: 1.2, height: 1.1, color: "#f6f3ec" },
  { x: 1.2, z: 1.2, height: 0.7, color: "#d3d1cb" },
] as const;

/** Cadrage du repère, partagé avec son animation de chargement. */
export const LOGO_VIEWBOX = "-2.1 -2.75 4.2 5.1";

const MARK = LOGO_BLOCKS.flatMap((block) => isoBox(block.x, 0, block.z, 1, block.height, 1, block.color));

export function LogoMark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={LOGO_VIEWBOX}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {MARK.map((face, i) => (
        <polygon
          key={i}
          points={face.points}
          fill={face.fill}
          stroke="#15151a"
          strokeWidth={0.07}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={30} />
      <span
        style={{
          fontFamily: "var(--display)",
          fontWeight: 900,
          fontSize: 25,
          letterSpacing: "0.02em",
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        DOM<span style={{ color: "var(--signal)" }}>City</span>
      </span>
    </span>
  );
}
