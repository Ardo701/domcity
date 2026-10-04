import { KINDS, LEGEND_GROUPS, type Kind } from "@/format/taxonomy";
import { useLocale } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { KINDS_TEXT } from "@/i18n/messages/kinds";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

const KIND_LIST = (Object.keys(KINDS) as Kind[]).filter((k) => k !== "terrain");

export function LegendPanel({ onClose }: { onClose: () => void }) {
  const locale = useLocale();
  const m = CITY[locale].legend;
  const text = KINDS_TEXT[locale];
  return (
    <section className={styles.legend} aria-label={m.title}>
      <div className={styles.legendHead}>
        <h2>{m.title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
          ×
        </button>
      </div>
      {LEGEND_GROUPS.map((group) => (
        <div key={group} className={styles.legendGroup}>
          <p className="mono-caps">{text.groups[group]}</p>
          <ul>
            {KIND_LIST.filter((k) => KINDS[k].group === group).map((k) => (
              <li key={k}>
                <KindSwatch kind={k} size={32} />
                <span className={styles.legendName}>{text.kinds[k].name}</span>
                <code>{text.kinds[k].tags}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className={`${styles.legendNote} mono-caps`}>{m.note}</p>
    </section>
  );
}
