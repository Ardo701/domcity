import { isoBox } from "./iso";
import { LOGO_BLOCKS, LOGO_VIEWBOX, LogoMark } from "./Logo";
import styles from "./LogoLoader.module.css";

/**
 * Chargement : les quatre blocs du repère sortent de terre l'un après l'autre, du plus petit au monument,
 * sur leurs parcelles tracées en pointillés ; une fois la ville bâtie, ils s'effondrent ensemble, et ça recommence.
 * Animation SVG (SMIL) : les sommets de chaque face passent de la hauteur zéro à la vraie hauteur, la perspective
 * reste juste à chaque instant. Un SVG ajouté à la page démarre sa propre horloge : la boucle part du début.
 */
const CYCLE = 2.6;
const BUILD = 0.16;
const FALL = 0.11;
// Les plus petits d'abord, le monument en dernier.
const ORDER = [...LOGO_BLOCKS].sort((a, b) => a.height - b.height);

const t = (value: number) => value.toFixed(3);
const EASE = {
  hold: "0 0 1 1",
  rise: "0.25 0.9 0.35 1",
  fall: "0.65 0 0.95 0.6",
};

const BLOCKS = LOGO_BLOCKS.map((block) => {
  const rank = ORDER.indexOf(block);
  const start = 0.05 + rank * 0.13;
  const built = start + BUILD;
  const fall = 0.72 + rank * 0.025;
  const down = fall + FALL;
  const flat = isoBox(block.x, 0, block.z, 1, 0, 1, block.color);
  const full = isoBox(block.x, 0, block.z, 1, block.height, 1, block.color);
  return {
    plot: flat[2].points,
    shown: { values: "0;1;0", keyTimes: `0;${t(start)};${t(down)}` },
    keyTimes: [0, start, built, fall, down, 1].map(t).join(";"),
    faces: full.map((face, i) => ({
      fill: face.fill,
      values: [flat[i], flat[i], face, face, flat[i], flat[i]].map((f) => f.points).join(";"),
      from: flat[i].points,
    })),
  };
});

const SPLINES = [EASE.hold, EASE.rise, EASE.hold, EASE.fall, EASE.hold].join(";");

export function LogoLoader({ size = 64 }: { size?: number }) {
  return (
    <>
      <svg className={styles.animated} width={size} height={size} viewBox={LOGO_VIEWBOX} aria-hidden focusable="false">
        {BLOCKS.map((block, i) => (
          <polygon
            key={`parcelle-${i}`}
            points={block.plot}
            fill="none"
            stroke="#15151a"
            strokeWidth={0.05}
            strokeDasharray="0.12 0.09"
            strokeLinejoin="round"
          />
        ))}
        {BLOCKS.map((block, i) => (
          <g key={`bloc-${i}`} opacity={0}>
            <animate attributeName="opacity" calcMode="discrete" {...block.shown} dur={`${CYCLE}s`} repeatCount="indefinite" />
            {block.faces.map((face, j) => (
              <polygon key={j} points={face.from} fill={face.fill} stroke="#15151a" strokeWidth={0.07} strokeLinejoin="round">
                <animate
                  attributeName="points"
                  values={face.values}
                  keyTimes={block.keyTimes}
                  calcMode="spline"
                  keySplines={SPLINES}
                  dur={`${CYCLE}s`}
                  repeatCount="indefinite"
                />
              </polygon>
            ))}
          </g>
        ))}
      </svg>
      <span className={styles.still}>
        <LogoMark size={size} />
      </span>
    </>
  );
}
