import { sharingEnabled } from "@/server/config";
import { HeaderBar, type SitePage } from "./HeaderBar";

/**
 * The header of the site's pages, the same everywhere. The server only knows whether sharing is on
 * (without it, neither "Découvrir" nor the account); the rest (scrolling, phone menu) happens in the browser.
 */
export function SiteHeader({ current }: { current?: SitePage }) {
  return <HeaderBar sharing={sharingEnabled()} current={current} />;
}
