import type { WalkState } from "@/city/view";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import styles from "./explorer.module.css";

function Key({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <kbd className={`${styles.key} ${wide ? styles.keyWide : ""}`}>{children}</kbd>;
}

/** Walk mode: instructions before setting off, then a crosshair (mouse captured) or a simple reminder. */
export function WalkOverlay({
  state,
  onStart,
  onLeave,
}: {
  state: WalkState;
  onStart: () => void;
  onLeave: () => void;
}) {
  const m = useMessages(CITY).walk;
  if (state === "locked") {
    return (
      <>
        <div className={styles.crosshair} aria-hidden />
        <p className={`${styles.walkHint} mono-caps`}>{m.locked}</p>
      </>
    );
  }
  if (state === "free") {
    return (
      <p className={`${styles.walkHint} mono-caps`}>{m.free}</p>
    );
  }

  return (
    <div className={styles.walkWrap}>
      <section className={styles.walk}>
        <p className="mono-caps">{m.kicker}</p>
        <h2>{m.title}</h2>
        <div className={styles.walkGrid}>
          <div className={styles.keys}>
            <span />
            <Key>{m.keys[0]}</Key>
            <span />
            <Key>{m.keys[1]}</Key>
            <Key>{m.keys[2]}</Key>
            <Key>{m.keys[3]}</Key>
          </div>
          <p>{m.move}</p>
          <div className={styles.keysRow}>
            <Key wide>{m.space}</Key>
            <Key wide>{m.shift}</Key>
          </div>
          <p>{m.fly}</p>
          <div className={styles.keysRow}>
            <Key wide>{m.mouse}</Key>
          </div>
          <p>{m.look}</p>
        </div>
        <div className={styles.walkActions}>
          <button type="button" className={styles.primary} onClick={onStart}>
            {m.start}
          </button>
          <button type="button" className={styles.secondary} onClick={onLeave}>
            {m.leave}
          </button>
        </div>
      </section>
    </div>
  );
}
