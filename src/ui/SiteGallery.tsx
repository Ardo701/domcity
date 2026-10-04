import { sitePath, type SiteCard } from "@/format/shared";
import { COMMON } from "@/i18n/messages/common";
import { getMessages } from "@/i18n/server";
import { Gallery, GalleryCard, GalleryEmpty } from "./Gallery";

/** The most recently updated sites, each with the thumbnail of one of its pages. */
export async function SiteGallery({ sites, thumbUrl }: { sites: SiteCard[]; thumbUrl: (slug: string) => string }) {
  const m = (await getMessages(COMMON)).gallery;
  if (sites.length === 0) {
    return <GalleryEmpty>{m.empty}</GalleryEmpty>;
  }
  return (
    <Gallery>
      {sites.map((site) => (
        <GalleryCard
          key={site.domain}
          href={sitePath(site.domain)}
          thumb={site.cover.thumbnail ? thumbUrl(site.cover.slug) : null}
          title={site.domain}
          where={m.cities(site.pagesCount)}
          meta={[m.visits(site.views), site.lastCaptureAt && m.updated(site.lastCaptureAt)]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </Gallery>
  );
}
