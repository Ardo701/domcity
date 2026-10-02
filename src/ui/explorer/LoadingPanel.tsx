import { formatCount } from "@/city/describe";
import styles from "./explorer.module.css";

export function LoadingPanel({
  title,
  step,
  count,
  steps,
}: {
  title: string;
  step: number;
  count?: number;
  steps: string[];
}) {
  return (
    <div className={styles.loadingWrap}>
      <section className={styles.loading} aria-live="polite" aria-busy="true">
        <p className="mono-caps">Chantier en cours</p>
        <h2>{title}</h2>
        <ol className={styles.loadingSteps}>
          {steps.map((label, i) => (
            <li key={label} data-state={i < step ? "done" : i === step ? "active" : "todo"}>
              <span className={styles.loadingMark} aria-hidden>
                {i < step ? "■" : i === step ? "▣" : "□"}
              </span>
              {label}
              {i === 2 && count ? ` de ${formatCount(count)} éléments` : ""}
            </li>
          ))}
        </ol>
        <div className={styles.progress} aria-hidden>
          <span style={{ width: `${((step + 0.6) / steps.length) * 100}%` }} />
        </div>
      </section>
    </div>
  );
}
