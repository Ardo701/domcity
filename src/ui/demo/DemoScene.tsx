import type { ReactNode } from "react";
import { LogoMark } from "@/ui/Logo";
import styles from "./Demo.module.css";
import {
  BARS,
  SCENE,
  VIEW,
  lerpCamera,
  mixColor,
  viewPoint,
  type DemoCamera,
  type DemoCity,
  type DemoLot,
  type PageRect,
} from "./scene";
import { DURATION, KEYSTROKES, T, TYPED, along, clamp01, ease, fade, lerp, prog } from "./timeline";

/**
 * The bookmarklet demo, frame by frame: everything visible is computed from the instant t.
 * A browser drawn in the style of the sheet (paper, ink, rules), not a copy of a real one.
 */

const INK = "#15151a";
const INK_3 = "#6b675b";
const PAPER = "#eeeae1";
const RAISED = "#f6f3ec";
const SUNK = "#e4dfd3";
const RULE = "#cbc3b2";
const SIGNAL = "#ff4b12";
const SIGNAL_DEEP = "#c73a08";
const BEACON = "#ffd23f";
/** The sample page: an ordinary site, on a white background. */
const SITE_BG = "#fdfcf9";
const SITE_TEXT = "#d6d1c5";

type P = [number, number];
const pts = (list: P[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const mixP = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const corners = (r: PageRect): P[] => [
  [r.x, r.y],
  [r.x + r.w, r.y],
  [r.x + r.w, r.y + r.h],
  [r.x, r.y + r.h],
];
/** The top of a city box at altitude y: northwest, northeast, southeast, southwest corners. */
const footprint = (cam: DemoCamera, x: number, y: number, z: number, w: number, d: number): P[] => [
  viewPoint(cam, x, y, z),
  viewPoint(cam, x + w, y, z),
  viewPoint(cam, x + w, y, z + d),
  viewPoint(cam, x, y, z + d),
];

// ---------- The gestures ----------

/** The places the mouse goes to, in the scene (bars included). */
const AT = {
  rest: [520, 432] as P,
  button: [102, VIEW.top + 214] as P,
  slot: [194, 80] as P,
  address: [330, 49] as P,
  bookmark: [196, 80] as P,
  parked: [606, 452] as P,
};

function cursorPath(city: DemoCity) {
  const monument: P = [city.hover[0], city.hover[1] + VIEW.top];
  return [
    [0, ...AT.rest],
    [T.toButton[0], ...AT.rest],
    [T.toButton[1], ...AT.button],
    [T.drag[0], ...AT.button],
    [T.drag[1], ...AT.slot],
    [T.toAddress[0], ...AT.slot],
    [T.toAddress[1], ...AT.address],
    [T.toBookmark[0], ...AT.address],
    [T.toBookmark[1], ...AT.bookmark],
    [T.park[0], ...AT.bookmark],
    [T.park[1], ...AT.parked],
    [T.toMonument[0], ...AT.parked],
    [T.toMonument[1], ...monument],
    [T.reset[0], ...monument],
    [DURATION, ...AT.rest],
  ] as const;
}

const CLICKS = [T.press, T.focus, T.click];

/** The moment the capture sweep passes over an element of the page. */
const passOf = (page: PageRect) => lerp(T.scan[0], T.scan[1], page.y / VIEW.height);

// ---------- The browser ----------

function Tab({ x, active, title, icon }: { x: number; active: boolean; title: string; icon: ReactNode }) {
  const w = 172;
  return (
    <g>
      {active && (
        <path
          d={`M${x - 6} 32 Q${x} 32 ${x} 26 V10 Q${x} 6 ${x + 4} 6 H${x + w - 4} Q${x + w} 6 ${x + w} 10 V26 Q${x + w} 32 ${x + w + 6} 32`}
          fill={RAISED}
          stroke={INK}
          strokeWidth={1}
        />
      )}
      <g transform={`translate(${x + 10} 13)`}>{icon}</g>
      <text x={x + 28} y={22} className={styles.sans} fontSize={9} fontWeight={600} fill={active ? INK : INK_3}>
        {title}
      </text>
      <path d={`M${x + w - 16} 16 l5 5 M${x + w - 11} 16 l-5 5`} stroke={INK_3} strokeWidth={1} />
    </g>
  );
}

const SiteIcon = () => (
  <g>
    <rect width={11} height={11} rx={2} fill={INK} />
    <rect x={3} y={3} width={5} height={5} fill={SIGNAL} />
  </g>
);

function Tabs({ t }: { t: number }) {
  const second = t >= T.newTab && t < T.reset[1];
  const loading = t >= T.enter && t < T.swap;
  const onSite = t >= T.swap && t < T.back[0];
  const grow = prog(t, T.newTab, T.newTab + 0.28, ease.out);
  return (
    <g>
      <rect width={SCENE.width} height={BARS.tabs} fill={SUNK} />
      {[16, 28, 40].map((cx) => (
        <circle key={cx} cx={cx} cy={16} r={4} fill="none" stroke={INK} strokeWidth={1} />
      ))}
      <Tab
        x={56}
        active={!second}
        title={onSite ? "Exemple" : "Créer une ville · DOMCity"}
        icon={
          loading ? (
            <circle cx={5.5} cy={5.5} r={4} fill="none" stroke={INK} strokeWidth={1.4} strokeDasharray="14 12" transform={`rotate(${t * 720} 5.5 5.5)`} />
          ) : onSite ? (
            <SiteIcon />
          ) : (
            <LogoMark size={12} />
          )
        }
      />
      {second && (
        <g opacity={grow * (1 - prog(t, T.reset[0], T.reset[1]))} transform={`translate(${(1 - grow) * -40} 0)`}>
          <Tab x={234} active title="DOMCity" icon={<LogoMark size={12} />} />
        </g>
      )}
    </g>
  );
}

function AddressBar({ t }: { t: number }) {
  const top = BARS.tabs;
  const focused = t >= T.focus && t < T.enter;
  const typed = KEYSTROKES.filter((at) => t >= at).length;
  let text = "domcity.app/create";
  if (t >= T.typing && t < T.enter) text = TYPED.slice(0, typed);
  else if (t >= T.enter && t < T.newTab) text = TYPED;
  else if (t >= T.newTab && t < T.back[0]) text = "domcity.app/nouveau";
  const selected = t >= T.focus && t < T.typing;
  const caret = focused && (t >= T.typing || Math.floor((t - T.focus) * 5) % 2 === 0);
  // Martian Mono: about 0.74 em per character.
  const charWidth = 9.5 * 0.74;
  return (
    <g>
      <rect y={top} width={SCENE.width} height={BARS.toolbar} fill={RAISED} />
      <path d={`M24 ${top + 17} h-8 m3 -3 l-3 3 l3 3`} stroke={INK} strokeWidth={1.2} fill="none" />
      <path d={`M34 ${top + 17} h8 m-3 -3 l3 3 l-3 3`} stroke={INK_3} strokeWidth={1.2} fill="none" />
      <path d={`M60 ${top + 13.5} a4.5 4.5 0 1 0 1.2 3.5`} stroke={INK} strokeWidth={1.2} fill="none" />
      <rect
        x={72}
        y={top + 7}
        width={552}
        height={20}
        rx={3}
        fill={PAPER}
        stroke={focused ? INK : RULE}
        strokeWidth={focused ? 1.4 : 1}
      />
      <path d={`M82 ${top + 16} h6 v5 h-6 z M83.5 ${top + 16} v-2 a1.5 1.5 0 0 1 3 0 v2`} stroke={INK_3} strokeWidth={1} fill="none" />
      {selected && <rect x={95} y={top + 10} width={text.length * charWidth + 2} height={14} fill={BEACON} />}
      <text x={96} y={top + 20.5} className={styles.mono} fontSize={9.5} fill={t >= T.enter || focused ? INK : "#3f3f48"}>
        {text}
      </text>
      {caret && <rect x={96 + text.length * charWidth + 1} y={top + 10.5} width={1.2} height={13} fill={INK} />}
    </g>
  );
}

function Chip({ x, w, label, icon }: { x: number; w: number; label: string; icon: ReactNode }) {
  return (
    <g>
      <g transform={`translate(${x + 5} 74)`}>{icon}</g>
      <text x={x + 19} y={82.5} className={styles.sans} fontSize={8.5} fontWeight={600} fill={INK}>
        {label}
      </text>
      <rect x={x} y={70} width={w} height={19} rx={2} fill="none" />
    </g>
  );
}

function Bookmarks({ t }: { t: number }) {
  const top = BARS.tabs + BARS.toolbar;
  const shown = prog(t, T.drop, T.drop + 0.12) * (1 - prog(t, T.reset[0], T.reset[0] + 0.4));
  const pop = lerp(0.6, 1, prog(t, T.drop, T.drop + 0.32, ease.back));
  const hovered = fade(t, T.toBookmark[1] - 0.25, T.click + 0.35, 0.1, 0.15);
  const pressed = fade(t, T.click, T.click + 0.16, 0.03, 0.08);
  return (
    <g>
      <rect y={top} width={SCENE.width} height={BARS.bookmarks} fill={RAISED} />
      <Chip x={10} w={58} label="Météo" icon={<circle cx={4.5} cy={4.5} r={4} fill="#7f9bab" />} />
      <Chip x={74} w={70} label="Recettes" icon={<circle cx={4.5} cy={4.5} r={4} fill="#b0654b" />} />
      {t >= T.dropHint && t < T.drop && Math.floor(t * 8) % 2 === 0 && (
        <rect x={149} y={71} width={2} height={17} fill={INK} />
      )}
      {shown > 0 && (
        <g opacity={shown} transform={`translate(194 ${top + 13}) scale(${pop}) translate(-194 ${-(top + 13)})`}>
          <rect x={152} y={70} width={84} height={19} rx={2} fill={mixColor(RAISED, "#ded8ca", Math.max(hovered * 0.6, pressed))} />
          <g transform="translate(157 73)">
            <LogoMark size={12} />
          </g>
          <text x={172} y={82.5} className={styles.sans} fontSize={8.5} fontWeight={700} fill={INK}>
            DOMCity
          </text>
        </g>
      )}
      <line x1={0} y1={VIEW.top - 0.5} x2={SCENE.width} y2={VIEW.top - 0.5} stroke={INK} strokeWidth={1} />
    </g>
  );
}

// ---------- The pages ----------

/** The button to drag, as it is on the Créer une ville page. */
function Stamp({ x, y, scale = 1, pressed = 0 }: { x: number; y: number; scale?: number; pressed?: number }) {
  const shift = pressed * 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={3} y={3} width={124} height={38} rx={3} fill={INK} />
      <g transform={`translate(${shift} ${shift})`}>
        <rect width={124} height={38} rx={3} fill={RAISED} stroke={INK} strokeWidth={1.5} />
        <g transform="translate(9 9)">
          <LogoMark size={20} />
        </g>
        <text x={35} y={27} className={styles.display} fontSize={20}>
          DOMCITY
        </text>
      </g>
    </g>
  );
}

function DomcityPage({ t }: { t: number }) {
  const opacity = t < T.back[0] ? 1 - prog(t, T.enter + 0.1, T.swap) : prog(t, T.back[0], T.back[1] - 0.05);
  if (opacity <= 0) return null;
  const pressed = fade(t, T.press, T.drag[0] + 0.05, 0.05, 0.1);
  return (
    <g opacity={opacity}>
      <g transform="translate(24 10)">
        <LogoMark size={18} />
      </g>
      <text x={46} y={24} className={styles.display} fontSize={16}>
        DOM<tspan fill={SIGNAL}>CITY</tspan>
      </text>
      <text y={23} className={styles.sans} fontSize={8.5} fontWeight={600} fill={INK}>
        <tspan x={128}>Découvrir</tspan>
        <tspan x={184}>Créer une ville</tspan>
        <tspan x={262}>Votre compte</tspan>
      </text>
      <line x1={184} y1={27} x2={246} y2={27} stroke={SIGNAL} strokeWidth={1.4} />
      <rect x={574} y={12} width={42} height={16} rx={2} fill="none" stroke={INK} strokeWidth={1} />
      <text x={583} y={23} className={styles.sans} fontSize={7.5} fontWeight={700}>
        GitHub
      </text>
      <line x1={24} y1={36} x2={616} y2={36} stroke={INK} strokeWidth={1} />

      <text x={24} y={86} className={styles.display} fontSize={40}>
        TOUT LE WEB EST
      </text>
      <text x={24} y={126} className={styles.display} fontSize={40} fill={SIGNAL}>
        CONSTRUCTIBLE.
      </text>
      {[300, 330, 190].map((w, i) => (
        <rect key={i} x={24} y={140 + i * 9} width={w} height={3} rx={1} fill={RULE} />
      ))}

      <rect x={24} y={176} width={400} height={74} rx={3} fill="rgba(246,243,236,0.75)" stroke={INK} strokeWidth={1.2} strokeDasharray="5 3" />
      <Stamp x={40} y={195} pressed={pressed} />
      <text x={182} y={208} className={styles.sans} fontSize={8.5} fontWeight={700}>
        <tspan fill={SIGNAL_DEEP} fontSize={11}>
          ↖
        </tspan>{" "}
        Glissez ce bouton dans votre barre de favoris
      </text>
      <rect x={182} y={219} width={200} height={3} rx={1} fill={RULE} />
      <rect x={182} y={228} width={150} height={3} rx={1} fill={RULE} />

      <line x1={24} y1={278} x2={616} y2={278} stroke={RULE} strokeWidth={1} />
      <text x={24} y={298} className={styles.mono} fontSize={7} fill={INK_3} letterSpacing={0.6}>
        MODE D&apos;EMPLOI
      </text>
      <text x={24} y={326} className={styles.display} fontSize={26}>
        TROIS GESTES
      </text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <text x={24 + i * 200} y={350} className={styles.mono} fontSize={7} fill={SIGNAL_DEEP}>
            0{i + 1}
          </text>
          <rect x={24 + i * 200} y={358} width={150} height={3} rx={1} fill={RULE} />
          <rect x={24 + i * 200} y={367} width={110} height={3} rx={1} fill={RULE} />
        </g>
      ))}
    </g>
  );
}

/** The content of an element of the sample page: words, headings, lines of text, list... */
function Content({ lot }: { lot: DemoLot }) {
  const { page: r, look } = lot;
  switch (look.type) {
    case "words":
      return (
        <text x={r.x + 2} y={r.y + r.h / 2 + 3} className={styles.sans} fontSize={8.5} fontWeight={600} fill="#3f3f48">
          {look.text}
        </text>
      );
    case "title":
      return (
        <text x={r.x} y={r.y + r.h - (look.size > 20 ? 7 : 3)} className={styles.display} fontSize={look.size} fill={INK}>
          {look.text.toUpperCase()}
        </text>
      );
    case "lines": {
      const count = Math.max(1, Math.floor((r.h + 2) / 6.4));
      return (
        <g fill={look.footer ? "#c9c3b5" : SITE_TEXT}>
          {Array.from({ length: count }, (_, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y + 2 + i * 6.4}
              width={r.w * (i === count - 1 && count > 1 ? 0.6 : 0.98 - (i % 3) * 0.04)}
              height={2.6}
              rx={1}
            />
          ))}
        </g>
      );
    }
    case "rule":
      return <line x1={r.x} y1={r.y + r.h / 2} x2={r.x + r.w} y2={r.y + r.h / 2} stroke="#cfc9bc" strokeWidth={1} />;
    case "bullet":
      return (
        <g>
          <circle cx={r.x + 3} cy={r.y + r.h / 2} r={1.4} fill={INK_3} />
          <rect x={r.x + 9} y={r.y + r.h / 2 - 1.3} width={look.width} height={2.6} rx={1} fill={SITE_TEXT} />
        </g>
      );
    case "empty":
      return <rect x={r.x + 0.5} y={r.y + 0.5} width={r.w - 1} height={r.h - 1} fill="none" stroke="#d3cdc0" strokeDasharray="3 2" />;
    case "embed":
      return (
        <g>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#ebe9e3" stroke="#d3cdc0" />
          <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={13} fill="none" stroke={INK_3} strokeWidth={1.2} />
          <path d={`M${r.x + r.w / 2 - 4} ${r.y + r.h / 2 - 6} l10 6 l-10 6 z`} fill={INK_3} />
        </g>
      );
    default:
      return null;
  }
}

function SitePage({ t, lots }: { t: number; lots: DemoLot[] }) {
  const out = 1 - prog(t, T.newTab, T.newTab + 0.45);
  if (t < T.swap || out <= 0) return null;
  const appear = (r: PageRect) => prog(t, T.swap + (r.y / VIEW.height) * 0.35, T.swap + (r.y / VIEW.height) * 0.35 + 0.2);
  return (
    <g opacity={out}>
      <rect width={VIEW.width} height={VIEW.height} fill={SITE_BG} opacity={prog(t, T.swap - 0.05, T.swap + 0.1)} />
      <g opacity={appear({ x: 0, y: 0, w: 0, h: 0 })}>
        <line x1={0} y1={44.5} x2={VIEW.width} y2={44.5} stroke="#e2ddd2" />
      </g>
      <g opacity={appear({ x: 0, y: 342, w: 0, h: 0 })}>
        <rect y={342} width={VIEW.width} height={46} fill="#f1eee7" />
        <line x1={0} y1={342.5} x2={VIEW.width} y2={342.5} stroke="#e2ddd2" />
      </g>
      {lots.map((lot, i) => (
        <g key={i} opacity={appear(lot.page)}>
          <Content lot={lot} />
        </g>
      ))}
    </g>
  );
}

// ---------- The page becomes a city ----------

function City({ t, city }: { t: number; city: DemoCity }) {
  if (t < T.scan[0] || t >= T.reveal[1]) return null;
  const cam = lerpCamera(city.plan, city.final, prog(t, T.tilt[0], T.tilt[1], ease.inOut));
  const vanish = 1 - prog(t, T.reveal[0] + 0.15, T.reveal[1]);
  const tint = t < T.newTab ? 0.36 : lerp(0.36, 0.84, prog(t, T.newTab, T.newTab + 0.5));
  /** Laid flat into a plan: from the page to its footprint on the ground (top of the page first). */
  const flat = (r: PageRect) => {
    const delay = (r.y / VIEW.height) * 0.16 + (r.x / VIEW.width) * 0.05;
    return prog(t, T.flatten[0] + delay, T.flatten[1] - 0.21 + delay, ease.inOut);
  };
  const morph = (r: PageRect, target: P[], a: number) => (a >= 1 ? target : corners(r).map((p, i) => mixP(p, target[i], a)));
  const count = city.buildings.length;

  const groundOpacity = prog(t, T.flatten[0] + 0.3, T.flatten[1]);
  const base = city.base;
  const baseTop = footprint(cam, base.x, base.y, base.z, base.w, base.d);
  const baseFoot = footprint(cam, base.x, 0, base.z, base.w, base.d);

  return (
    <g opacity={vanish}>
      {groundOpacity > 0 && (
        <g opacity={groundOpacity}>
          <polygon points={pts([baseFoot[0], baseFoot[3], baseTop[3], baseTop[0]])} fill="#323337" />
          <polygon points={pts([baseFoot[3], baseFoot[2], baseTop[2], baseTop[3]])} fill="#2a2b2f" />
          <polygon points={pts(baseTop)} fill={base.color} />
          {city.ground.map((slab, i) => (
            <polygon key={i} points={pts(footprint(cam, slab.x, slab.y, slab.z, slab.w, slab.d))} fill={slab.color} />
          ))}
        </g>
      )}

      {city.containers.map((lot, i) => {
        const pass = passOf(lot.page);
        if (t < pass) return null;
        const a = flat(lot.page);
        const opacity = prog(t, pass, pass + 0.16) * (1 - clamp01((a - 0.4) / 0.6));
        if (opacity <= 0) return null;
        const quad = morph(lot.page, footprint(cam, lot.x, lot.y + lot.h, lot.z, lot.w, lot.d), a);
        return (
          <polygon key={i} points={pts(quad)} fill="none" stroke={INK_3} strokeWidth={0.9} strokeDasharray="3 2" opacity={opacity} />
        );
      })}

      {city.buildings.map((lot, i) => {
        const pass = passOf(lot.page);
        if (t < pass) return null;
        const seen = prog(t, pass, pass + 0.16);
        const a = flat(lot.page);
        const monument = lot.rank === count - 1;
        const start = T.rise[0] + (lot.rank / Math.max(1, count - 1)) * (T.rise[1] - T.rise[0] - 0.7);
        const growing = prog(t, start, start + (monument ? 0.7 : 0.45));
        const rise = ease.back(growing);
        const stroke = { stroke: INK, strokeWidth: lerp(1, 0.5, a), strokeOpacity: lerp(1, 0.55, a) * seen, strokeLinejoin: "round" as const };
        if (growing <= 0) {
          const quad = morph(lot.page, footprint(cam, lot.x, lot.y, lot.z, lot.w, lot.d), a);
          return (
            <polygon key={i} points={pts(quad)} fill={mixColor(BEACON, lot.top, a)} fillOpacity={lerp(tint, 1, a) * seen} {...stroke} />
          );
        }
        const h = lot.h * rise;
        const foot = footprint(cam, lot.x, lot.y, lot.z, lot.w, lot.d);
        const top = footprint(cam, lot.x, lot.y + h, lot.z, lot.w, lot.d);
        return (
          <g key={i}>
            <polygon points={pts([foot[0], foot[3], top[3], top[0]])} fill={lot.west} {...stroke} />
            <polygon points={pts([foot[3], foot[2], top[2], top[3]])} fill={lot.south} {...stroke} />
            <polygon points={pts(top)} fill={lot.top} {...stroke} />
          </g>
        );
      })}
    </g>
  );
}

/** The page's images: first in the page, then lying at the foot of their facade, then raised as posters. */
function Panels({ t, city }: { t: number; city: DemoCity }) {
  if (t < T.swap || t >= T.reveal[1]) return null;
  const cam = lerpCamera(city.plan, city.final, prog(t, T.tilt[0], T.tilt[1], ease.inOut));
  const vanish = 1 - prog(t, T.reveal[0] + 0.15, T.reveal[1]);
  return (
    <g opacity={vanish}>
      {city.panels.map((lot, i) => {
        const r = lot.page;
        const appear = prog(t, T.swap + (r.y / VIEW.height) * 0.35, T.swap + (r.y / VIEW.height) * 0.35 + 0.2);
        const delay = (r.y / VIEW.height) * 0.16 + (r.x / VIEW.width) * 0.05;
        const a = prog(t, T.flatten[0] + delay, T.flatten[1] - 0.21 + delay, ease.inOut);
        const up = prog(t, T.rise[0] + 0.3, T.rise[0] + 0.85, ease.inOut);
        const angle = (up * Math.PI) / 2;
        // The hinge: the bottom of the poster, against its facade; lying down, it rests on the ground.
        const west = lot.panel!.mount === "west";
        const hingeY = lerp(0.56, lot.y, up);
        const left: [number, number, number] = west ? [lot.x, hingeY, lot.z] : [lot.x, hingeY, lot.z + lot.d];
        const across: [number, number, number] = west ? [0, 0, lot.d] : [lot.w, 0, 0];
        const out: [number, number, number] = west ? [-1, 0, 0] : [0, 0, 1];
        const at = (s: number, rise: number): P => {
          const lift = rise * lot.h;
          return viewPoint(
            cam,
            left[0] + s * across[0] + lift * Math.cos(angle) * out[0],
            left[1] + lift * Math.sin(angle),
            left[2] + s * across[2] + lift * Math.cos(angle) * out[2],
          );
        };
        const target = [at(0, 1), at(1, 1), at(1, 0), at(0, 0)];
        const quad = a >= 1 ? target : corners(r).map((p, j) => mixP(p, target[j], a));
        const [o, x, , y] = quad;
        const matrix = [x[0] - o[0], x[1] - o[1], y[0] - o[0], y[1] - o[1], o[0], o[1]].map((v) => v.toFixed(3)).join(" ");
        const pass = passOf(r);
        const tinted = t >= pass ? prog(t, pass, pass + 0.16) * (1 - prog(t, T.newTab, T.newTab + 0.4)) : 0;
        return (
          <g key={i} opacity={appear}>
            <image href={lot.panel!.src} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${matrix})`} />
            <polygon
              points={pts(quad)}
              fill={tinted > 0 ? BEACON : "none"}
              fillOpacity={0.36 * tinted}
              stroke={INK}
              strokeWidth={lerp(1, 0.5, a)}
              strokeOpacity={Math.max(tinted, a * 0.55)}
            />
          </g>
        );
      })}
    </g>
  );
}

/** The capture: a yellow sweep goes down the page, each element is outlined, a few tags are named. */
function Scan({ t, city }: { t: number; city: DemoCity }) {
  const labels = [...city.containers, ...city.buildings, ...city.panels].filter((lot) => lot.label);
  const sweep = prog(t, T.scan[0], T.scan[1]);
  const line = fade(t, T.scan[0], T.scan[1] + 0.15, 0.1, 0.25);
  const out = 1 - prog(t, T.newTab, T.newTab + 0.35);
  if (t < T.scan[0] || out <= 0) return null;
  const y = sweep * VIEW.height;
  return (
    <g>
      {line > 0 && (
        <g opacity={line}>
          <rect y={y - 26} width={VIEW.width} height={26} fill="url(#demo-sweep)" />
          <line x1={0} y1={y} x2={VIEW.width} y2={y} stroke={BEACON} strokeWidth={2} />
        </g>
      )}
      {labels.map((lot, i) => {
        const pass = passOf(lot.page);
        const shown = prog(t, pass, pass + 0.18) * out;
        if (shown <= 0) return null;
        const text = lot.label!;
        const w = text.length * 5.2 + 7;
        const x = Math.min(lot.page.x + 3, VIEW.width - w - 3);
        const top = lot.page.y + 3;
        return (
          <g key={i} opacity={shown}>
            <rect x={x} y={top} width={w} height={11} rx={1.5} fill={INK} />
            <text x={x + 3.5} y={top + 8} className={styles.mono} fontSize={7} fill={RAISED}>
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** The city rendered by the engine, then what DOMCity displays around it: the title, Partager, the hover tooltip. */
function Rendered({ t, city }: { t: number; city: DemoCity }) {
  const shown = prog(t, T.reveal[0], T.reveal[1]) * (1 - prog(t, T.reset[0], T.reset[1]));
  if (shown <= 0) return null;
  const [hx, hy] = city.hover;
  const zoom = 1 + 0.035 * prog(t, T.reveal[1], T.reset[0], ease.inOut);
  const chrome = prog(t, T.reveal[0] + 0.3, T.reveal[1] + 0.2) * (1 - prog(t, T.reset[0], T.reset[1]));
  const bubble = fade(t, T.hover, T.reset[0] + 0.1, 0.18, 0.25);
  const lift = (1 - prog(t, T.hover, T.hover + 0.25, ease.out)) * 4;
  const bx = hx + 18;
  const by = hy - 48 + lift;
  return (
    <g>
      <g opacity={shown} transform={`translate(${hx} ${hy}) scale(${zoom}) translate(${-hx} ${-hy})`}>
        <image href={city.image.src} x={city.image.x} y={city.image.y} width={city.image.width} height={city.image.height} />
      </g>
      {chrome > 0 && (
        <g opacity={chrome}>
          <text x={16} y={34} className={styles.display} fontSize={20}>
            EXEMPLE
          </text>
          <text x={16} y={46} className={styles.mono} fontSize={6.5} fill={INK_3} letterSpacing={0.5}>
            EXEMPLE.ORG · VOTRE RELEVÉ · NON PUBLIÉ
          </text>
          <rect x={550} y={19} width={74} height={22} rx={2} fill={INK} />
          <rect x={548} y={17} width={74} height={22} rx={2} fill={RAISED} stroke={INK} strokeWidth={1.2} />
          <text x={585} y={32} textAnchor="middle" className={styles.display} fontSize={11}>
            PARTAGER
          </text>
        </g>
      )}
      {bubble > 0 && (
        <g opacity={bubble}>
          <rect x={bx} y={by} width={136} height={58} rx={3} fill={RAISED} stroke={INK} strokeWidth={1} />
          <rect x={bx} y={by} width={3.5} height={58} fill={SIGNAL} />
          <text x={bx + 12} y={by + 21} className={styles.display} fontSize={16}>
            MONUMENT
          </text>
          <text x={bx + 12} y={by + 33} className={styles.mono} fontSize={7.5} fill={SIGNAL_DEEP}>
            &lt;h1&gt;
          </text>
          <text x={bx + 12} y={by + 48} className={styles.sans} fontSize={9} fontWeight={600}>
            « Exemple »
          </text>
        </g>
      )}
    </g>
  );
}

function Loading({ t, elements }: { t: number; elements: number }) {
  const bars = [
    [T.load[0], T.load[1]],
    [T.newTab, T.newTab + 0.5],
  ];
  return (
    <g>
      {bars.map(([from, to], i) =>
        t >= from && t < to + 0.15 ? (
          <rect key={i} width={VIEW.width * prog(t, from, to, ease.out)} height={2} fill={SIGNAL} opacity={1 - prog(t, to, to + 0.15)} />
        ) : null,
      )}
      {t >= T.newTab && t < T.flatten[0] + 0.4 && (
        <text x={116} y={25} className={styles.mono} fontSize={7} fill={INK_3} letterSpacing={0.5} opacity={fade(t, T.newTab + 0.2, T.flatten[0] + 0.4, 0.2, 0.3)}>
          RÉCEPTION DU RELEVÉ · {elements} ÉLÉMENTS
        </text>
      )}
    </g>
  );
}

// ---------- The mouse ----------

function Pointer({ t, city }: { t: number; city: DemoCity }) {
  const [x, y] = along(t, cursorPath(city));
  const holding = t >= T.press && t < T.drop;
  const tap = CLICKS.some((c) => t >= c && t < c + 0.14);
  const scale = tap ? 0.86 : holding ? 0.92 : 1;
  const ghost = t >= T.drag[0] && t < T.drop + 0.12;
  const landing = prog(t, T.drop, T.drop + 0.12);
  return (
    <g>
      {ghost && (
        <g opacity={0.78 * (1 - landing) * prog(t, T.drag[0], T.drag[0] + 0.12)}>
          <Stamp x={x - 52} y={y - 16} scale={0.84 * (1 - landing * 0.4)} />
        </g>
      )}
      {CLICKS.map((c) => {
        const k = prog(t, c, c + 0.45);
        return k > 0 && k < 1 ? (
          <circle key={c} cx={x} cy={y} r={3 + 13 * ease.out(k)} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.6 * (1 - k)} />
        ) : null;
      })}
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path
          d="M0 0 L0 16 L4.2 12.2 L7 19 L9.6 17.9 L6.9 11.3 L12.5 11.1 Z"
          fill={RAISED}
          stroke={INK}
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

// ---------- The scene ----------

export function DemoScene({ t, city, label }: { t: number; city: DemoCity; label: string }) {
  const lots = [...city.containers, ...city.buildings, ...city.panels];
  return (
    <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} role="img" aria-label={label} fill={INK}>
      <defs>
        <clipPath id="demo-frame">
          <rect width={SCENE.width} height={SCENE.height} rx={4} />
        </clipPath>
        <clipPath id="demo-view">
          <rect width={VIEW.width} height={VIEW.height} />
        </clipPath>
        <pattern id="demo-grid" width={16} height={16} patternUnits="userSpaceOnUse">
          <path d="M16 0 H0 V16" fill="none" stroke="rgba(21,21,26,0.06)" strokeWidth={1} />
        </pattern>
        <linearGradient id="demo-sweep" x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={BEACON} stopOpacity={0} />
          <stop offset={1} stopColor={BEACON} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <g clipPath="url(#demo-frame)">
        <Tabs t={t} />
        <AddressBar t={t} />
        <Bookmarks t={t} />
        <g transform={`translate(0 ${VIEW.top})`} clipPath="url(#demo-view)">
          <rect width={VIEW.width} height={VIEW.height} fill={PAPER} />
          <rect width={VIEW.width} height={VIEW.height} fill="url(#demo-grid)" />
          <DomcityPage t={t} />
          <SitePage t={t} lots={lots} />
          <City t={t} city={city} />
          <Panels t={t} city={city} />
          <Scan t={t} city={city} />
          <Rendered t={t} city={city} />
          <Loading t={t} elements={lots.length + 1} />
        </g>
        <Pointer t={t} city={city} />
      </g>
      <rect x={0.75} y={0.75} width={SCENE.width - 1.5} height={SCENE.height - 1.5} rx={4} fill="none" stroke={INK} strokeWidth={1.5} />
    </svg>
  );
}
