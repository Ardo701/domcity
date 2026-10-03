import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import styles from "./InstallDemo.module.css";

/**
 * Le geste en trois temps, dessiné comme une planche animée : glisser le favori
 * dans la barre, cliquer dessus sur une page, voir la page devenir une ville.
 */
export function InstallDemo() {
  return (
    <figure className={styles.demo}>
      <div className={styles.stage} aria-hidden>
        <div className={styles.browser}>
          <div className={styles.addressBar}>
            <span className={styles.address}>exemple.org/article</span>
          </div>
          <div className={styles.bookmarks}>
            <span className={styles.bookmark} />
            <span className={styles.bookmark} />
            <span className={styles.slot} />
          </div>
          <div className={styles.viewport}>
            <div className={styles.page}>
              <span className={styles.pageTitle} />
              <span className={styles.line} />
              <span className={styles.line} />
              <span className={styles.pageImage} />
              <span className={styles.line} />
              <span className={`${styles.line} ${styles.short}`} />
              <span className={styles.pageSide} />
            </div>
            <div className={styles.city}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={HERO_FIGURE.src} alt="" width={HERO_FIGURE.width} height={HERO_FIGURE.height} className={styles.cityDrawing} />
            </div>
          </div>
        </div>

        <span className={styles.origin}>domcity.app/create</span>

        <span className={styles.tag}>
          DOMCity
          <svg className={styles.cursor} viewBox="0 0 16 22" width="16" height="22">
            <path d="M1 1 L1 17 L5.2 13.2 L8 20 L10.6 18.9 L7.9 12.3 L13.5 12.1 Z" fill="#f6f3ec" stroke="#15151a" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <ol className={styles.steps}>
        <li className={styles.stepDrag}>
          <b>1</b> Glisser
        </li>
        <li className={styles.stepClick}>
          <b>2</b> Cliquer
        </li>
        <li className={styles.stepVisit}>
          <b>3</b> Visiter
        </li>
      </ol>
    </figure>
  );
}
