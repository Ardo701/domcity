import { readBlocklist, type Blocklist } from "@/format/blocklist";

/**
 * La liste des sites refusés, téléchargée une fois par page (le navigateur et Vercel la gardent
 * quelques minutes). Le navigateur vérifie seul : rien de la page visitée ne part chez DOMCity.
 *
 * Si le serveur ne répond pas (réseau coupé, partage pas configuré), la liste est vide : la ville se
 * construit quand même, sur cet écran seulement. La publication, elle, vérifie toujours sur le serveur.
 */
let pending: Promise<Blocklist> | null = null;

export function loadBlocklist(): Promise<Blocklist> {
  pending ??= fetch("/api/blocklist")
    .then(async (response) => {
      if (!response.ok) throw new Error(`liste des sites refusés : ${response.status}`);
      return readBlocklist(await response.json());
    })
    .catch(() => {
      // Réessayer à la prochaine ville plutôt que garder un échec.
      pending = null;
      return new Map();
    });
  return pending;
}
