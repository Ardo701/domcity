import styles from "./explorer.module.css";

/** Le nord de la ville, c'est le haut de la page. */
export function NorthArrow() {
  return (
    <div className={styles.north} aria-hidden>
      <svg width="38" height="52" viewBox="0 0 38 52">
        <path d="M19 2 L31 38 L19 30 L7 38 Z" fill="#f6f3ec" stroke="#15151a" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M19 2 L19 30 L7 38 Z" fill="#15151a" />
        <text x="19" y="50" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="13">
          N
        </text>
      </svg>
      <span className="mono-caps">Haut de page</span>
    </div>
  );
}
