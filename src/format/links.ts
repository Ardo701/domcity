/**
 * A page's links to the other pages of its site, to draw the megalopolis highways.
 *
 * Their addresses are not kept, only a fingerprint of each: the megalopolis computes
 * the fingerprint of its own pages and looks at which ones are targeted. A private address
 * (a repository, a client folder) cannot be read in the shared city.
 * No dependencies: this file is compiled into the bookmarklet.
 */

/** Path as DOMCity stores its pages: no doubled or trailing /, characters decoded. */
export function linkPath(pathname: string): string {
  let path = pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";
  try {
    // "Champs-%C3%89lys%C3%A9es" and "Champs-Élysées" designate the same page.
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** Fingerprint of a path (FNV-1a, 32 bits): eight hexadecimal digits. */
export function linkKey(path: string): string {
  const value = linkPath(path);
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
