import { formatCount } from "@/city/describe";
import { sitePath, type SiteCard } from "@/format/shared";
import { Gallery, GalleryCard, GalleryEmpty, shortDate } from "./Gallery";

/** The most recently updated sites, each with the thumbnail of one of its pages. */
export function SiteGallery({ sites, thumbUrl }: { sites: SiteCard[]; thumbUrl: (slug: string) => string }) {
  if (sites.length === 0) {
    return <GalleryEmpty>Aucune ville partagée pour l&apos;instant. Construisez-en une, puis cliquez sur « Partager ».</GalleryEmpty>;
  }
  return (
    <Gallery>
      {sites.map((site) => (
        <GalleryCard
          key={site.domain}
          href={sitePath(site.domain)}
          thumb={site.cover.thumbnail ? thumbUrl(site.cover.slug) : null}
          title={site.domain}
          where={`${formatCount(site.pagesCount)} ville${site.pagesCount > 1 ? "s" : ""}`}
          meta={[
            `${formatCount(site.views)} visite${site.views > 1 ? "s" : ""}`,
            site.lastCaptureAt && `mis à jour le ${shortDate(site.lastCaptureAt)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </Gallery>
  );
}
