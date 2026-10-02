import { KINDS, LEGEND_GROUPS, type Kind } from "@/format/taxonomy";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

const KIND_LIST = (Object.keys(KINDS) as Kind[]).filter((k) => k !== "terrain");

export function LegendPanel({ onClose }: { onClose: () => void }) {
  return (
    <section className={styles.legend} aria-label="Légende">
      <div className={styles.legendHead}>
        <h2>Légende</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer la légende">
          ×
        </button>
      </div>
      {LEGEND_GROUPS.map((group) => (
        <div key={group} className={styles.legendGroup}>
          <p className="mono-caps">{group}</p>
          <ul>
            {KIND_LIST.filter((k) => KINDS[k].group === group).map((k) => (
              <li key={k}>
                <KindSwatch kind={k} size={22} />
                <span className={styles.legendName}>{KINDS[k].name}</span>
                <code>{KINDS[k].tags}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className={`${styles.legendNote} mono-caps`}>
        Rues, voitures et arbres sont du décor. Survolez une rue : elle désigne le bloc de la page qu&apos;elle dessert.
      </p>
    </section>
  );
}
