import { locale as localeParam } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, type Locale, type Messages } from "./locale";

/** The language of the page being rendered: the [locale] segment, set by the proxy. Server Components only. */
export async function getLocale(): Promise<Locale> {
  const value = await localeParam();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The messages of the page's language. */
export async function getMessages<T>(messages: Messages<T>): Promise<T> {
  return messages[await getLocale()];
}
