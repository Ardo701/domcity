import type { WalkState } from "@/city/view";
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
  if (state === "locked") {
    return (
      <>
        <div className={styles.crosshair} aria-hidden />
        <p className={`${styles.walkHint} mono-caps`}>Échap : libérer la souris</p>
      </>
    );
  }
  if (state === "free") {
    return (
      <p className={`${styles.walkHint} mono-caps`}>
        Glisser : regarder · ZQSD : avancer · Espace / Maj : monter, descendre · Échap : pause
      </p>
    );
  }

  return (
    <div className={styles.walkWrap}>
      <section className={styles.walk}>
        <p className="mono-caps">Mode promenade</p>
        <h2>On descend dans la rue</h2>
        <div className={styles.walkGrid}>
          <div className={styles.keys}>
            <span />
            <Key>Z</Key>
            <span />
            <Key>Q</Key>
            <Key>S</Key>
            <Key>D</Key>
          </div>
          <p>Avancer, reculer, aller de côté. Sur un clavier anglais : W A S D.</p>
          <div className={styles.keysRow}>
            <Key wide>Espace</Key>
            <Key wide>Maj</Key>
          </div>
          <p>Monter et descendre, comme un drone.</p>
          <div className={styles.keysRow}>
            <Key wide>Souris</Key>
          </div>
          <p>Regarder autour. Un clic sur un bâtiment l&apos;inspecte.</p>
        </div>
        <div className={styles.walkActions}>
          <button type="button" className={styles.primary} onClick={onStart}>
            Commencer la promenade
          </button>
          <button type="button" className={styles.secondary} onClick={onLeave}>
            Revenir à la vue aérienne
          </button>
        </div>
      </section>
    </div>
  );
}
