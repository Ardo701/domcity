import { isoBox } from "./iso";

/** Le repère DOMCity : quatre blocs, dont un monument orange. Dessinés du fond vers l'avant. */
const MARK = [
  ...isoBox(0, 0, 0, 1, 2.6, 1, "#ff4b12"),
  ...isoBox(1.2, 0, 0, 1, 1.7, 1, "#e8c891"),
  ...isoBox(0, 0, 1.2, 1, 1.1, 1, "#f6f3ec"),
  ...isoBox(1.2, 0, 1.2, 1, 0.7, 1, "#d3d1cb"),
];

export function LogoMark({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-2.1 -2.75 4.2 5.1"
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
