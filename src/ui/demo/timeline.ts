/**
 * The timing of the demo, in seconds. A 16 s loop:
 * drag the bookmarklet into the bar, type a site's address, click the bookmarklet (the capture),
 * then the page lies down into a plan, its blocks rise from the ground, and the engine's real model appears.
 */
export const DURATION = 16;

export const T = {
  toButton: [0.3, 1.1],
  press: 1.1,
  drag: [1.3, 2.5],
  dropHint: 2.05,
  drop: 2.5,
  toAddress: [3.1, 3.7],
  focus: 3.7,
  typing: 3.9,
  enter: 4.95,
  load: [4.95, 5.6],
  swap: 5.3,
  toBookmark: [5.8, 6.5],
  click: 6.5,
  scan: [6.7, 7.9],
  newTab: 8.1,
  park: [8.4, 9.0],
  flatten: [9.0, 9.75],
  tilt: [9.9, 10.75],
  rise: [10.55, 11.95],
  reveal: [11.95, 12.55],
  toMonument: [12.4, 13.3],
  hover: 13.3,
  reset: [15.2, 15.65],
  back: [15.7, 16],
} as const;

/** The three steps under the scene, with the instant shown when the animation is stopped. */
export const STEPS = [
  { n: 1, from: 0, to: 3.1, still: 2.9 },
  { n: 2, from: 3.1, to: 9.0, still: 7.75 },
  { n: 3, from: 9.0, to: DURATION, still: 14.2 },
] as const;

/** The typed address (example.org), letter by letter, at a slightly irregular pace like real typing. */
const GAPS = [0.09, 0.07, 0.1, 0.08, 0.11, 0.07, 0.09, 0.12, 0.08, 0.09, 0.1];
export const KEYSTROKES = GAPS.map((_, i) => T.typing + GAPS.slice(0, i).reduce((sum, gap) => sum + gap, 0));

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ease = {
  linear: (k: number) => k,
  in: (k: number) => k * k * k,
  out: (k: number) => 1 - (1 - k) ** 3,
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
  /** Overshoots its target a little, then settles on it: a block rising from the ground. */
  back: (k: number) => {
    const c1 = 1.3;
    return 1 + (c1 + 1) * (k - 1) ** 3 + c1 * (k - 1) ** 2;
  },
};

/** Progress between two instants (0 before, 1 after), passed through a curve. */
export function prog(t: number, from: number, to: number, curve: (k: number) => number = ease.linear): number {
  return curve(clamp01((t - from) / (to - from)));
}

/** Present between two instants, with a fade in and out. */
export function fade(t: number, from: number, to: number, fadeIn = 0.2, fadeOut = 0.2): number {
  return Math.min(prog(t, from, from + fadeIn), 1 - prog(t, to - fadeOut, to));
}

type Key = readonly [time: number, x: number, y: number];

/** The mouse's path: from one point to another in a slight arc, accelerating then braking. */
export function along(t: number, keys: readonly Key[]): [number, number] {
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, x0, y0] = keys[i];
    const [t1, x1, y1] = keys[i + 1];
    if (t > t1) continue;
    const k = t1 > t0 ? ease.inOut(clamp01((t - t0) / (t1 - t0))) : 1;
    const cx = (x0 + x1) / 2 - (y1 - y0) * 0.14;
    const cy = (y0 + y1) / 2 + (x1 - x0) * 0.14;
    const u = 1 - k;
    return [u * u * x0 + 2 * u * k * cx + k * k * x1, u * u * y0 + 2 * u * k * cy + k * k * y1];
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
}
