/**
 * Les liens d'une page vers les autres pages de son site, pour tracer les autoroutes de la mégalopole.
 *
 * On ne garde pas leurs adresses, seulement une empreinte de chacune : la mégalopole calcule
 * l'empreinte de ses propres pages et regarde lesquelles sont visées. Une adresse privée
 * (un dépôt, un dossier client) ne se lit pas dans la ville partagée.
 * Sans dépendance : ce fichier est compilé dans le favori.
 */

/** Chemin tel que DOMCity range ses pages : sans / doublé ni / final, les caractères décodés. */
export function linkPath(pathname: string): string {
  let path = pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";
  try {
    // « Champs-%C3%89lys%C3%A9es » et « Champs-Élysées » désignent la même page.
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** Empreinte d'un chemin (FNV-1a, 32 bits) : huit chiffres hexadécimaux. */
export function linkKey(path: string): string {
  const value = linkPath(path);
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
