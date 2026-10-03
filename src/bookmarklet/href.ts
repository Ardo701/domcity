import { BOOKMARKLET_CODE } from "./generated";

export const ORIGIN_PLACEHOLDER = "__DOMCITY_ORIGIN__";

/** The `javascript:` link to drag into the bookmarks, which points back to this site. */
export function bookmarkletHref(siteUrl: string): string {
  const origin = new URL(siteUrl).origin;
  return `javascript:${encodeURIComponent(BOOKMARKLET_CODE.replaceAll(ORIGIN_PLACEHOLDER, origin))}`;
}
