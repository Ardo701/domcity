import { sharingEnabled } from "@/server/config";
import { HeaderBar, type SitePage } from "./HeaderBar";

/**
 * L'en-tête des pages du site, le même partout. Le serveur sait seulement si le partage est ouvert
 * (sans lui, ni « Découvrir » ni le compte) ; le reste (défilement, menu du téléphone) se joue dans le navigateur.
 */
export function SiteHeader({ current }: { current?: SitePage }) {
  return <HeaderBar sharing={sharingEnabled()} current={current} />;
}
