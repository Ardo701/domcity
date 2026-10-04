"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale, type Messages } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set by the root layout: the language of the page, for the components that run in the browser. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** The messages of the page's language. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[useLocale()];
}

/**
 * Keeps the choice in the cookie, then reloads: the proxy serves the page in the new language.
 * A full reload rather than a refresh, so that no page already loaded stays in the old language.
 */
export function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
  window.location.reload();
}
