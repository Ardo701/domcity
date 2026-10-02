import { BOOKMARKLET_CODE } from "./generated";

export const ORIGIN_PLACEHOLDER = "__DOMCITY_ORIGIN__";

/** Le lien `javascript:` à glisser dans les favoris, qui renvoie vers ce site-ci. */
export function bookmarkletHref(siteUrl: string): string {
  const origin = new URL(siteUrl).origin;
  return `javascript:${encodeURIComponent(BOOKMARKLET_CODE.replaceAll(ORIGIN_PLACEHOLDER, origin))}`;
}
