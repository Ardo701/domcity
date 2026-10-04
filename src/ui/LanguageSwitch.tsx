"use client";

import { switchLocale, useLocale, useMessages } from "@/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/i18n/locale";
import { COMMON } from "@/i18n/messages/common";
import styles from "./LanguageSwitch.module.css";

/** EN | FR: the page's language is filled in; the other one switches the site to it (and remembers it). */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const m = useMessages(COMMON).language;
  return (
    <div role="group" aria-label={m.label} className={className ? `${styles.switch} ${className}` : styles.switch}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          title={option === locale ? LOCALE_NAMES[option] : m.switchTo}
          onClick={() => option !== locale && switchLocale(option)}
          className="mono-caps"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
