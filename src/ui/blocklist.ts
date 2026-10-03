import { readBlocklist, type Blocklist } from "@/format/blocklist";

/**
 * The list of refused sites, downloaded once per page (the browser and Vercel keep it for
 * a few minutes). The browser checks on its own: nothing about the visited page goes to DOMCity.
 *
 * If the server does not answer (network down, sharing not configured), the list is empty: the city
 * is built anyway, on this screen only. Publishing, for its part, always checks on the server.
 */
let pending: Promise<Blocklist> | null = null;

export function loadBlocklist(): Promise<Blocklist> {
  pending ??= fetch("/api/blocklist")
    .then(async (response) => {
      if (!response.ok) throw new Error(`refused sites list: ${response.status}`);
      return readBlocklist(await response.json());
    })
    .catch(() => {
      // Retry on the next city rather than keeping a failure.
      pending = null;
      return new Map();
    });
  return pending;
}
