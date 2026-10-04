import "server-only";
import { revalidatePath } from "next/cache";
import { LOCALES } from "@/i18n/locale";

/** The pages that list the latest sites, as the cache knows them: the proxy serves "/" from "/en" or "/fr". */
export const GALLERY_PATHS = LOCALES.flatMap((locale) => [`/${locale}`, `/${locale}/explore`]);

/**
 * The home page and Explore are rebuilt at most once a minute, and the first visit after that minute still gets
 * the old copy. After a publication, a deletion or a report, their copies are dropped: the next visit rebuilds them.
 */
export function refreshGalleries() {
  for (const path of GALLERY_PATHS) revalidatePath(path);
}
