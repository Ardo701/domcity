import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CITY_META } from "@/i18n/messages/site";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { cityKey, fileStore, thumbKey } from "@/server/files";
import { SLUG_PATTERN } from "@/server/security";
import { getCapture, pageVersions } from "@/server/store";
import { CityExplorer } from "@/ui/explorer/CityExplorer";

const load = cache(async (slug: string) => {
  if (!sharingEnabled() || !SLUG_PATTERN.test(slug)) return null;
  return getCapture(slug);
});

export async function generateMetadata(props: PageProps<"/[locale]/city/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const city = await load(slug);
  const m = await getMessages(CITY_META);
  if (!city) return { title: m.notFound };

  const image = city.stats.thumbnail === false ? undefined : fileStore()!.publicUrl(thumbKey(slug));
  const description = m.description(
    `${city.domain}${city.path}`,
    city.stats.buildings ?? 0,
    city.stats.districts ?? 0,
    city.stats.monuments ?? 0,
  );
  return {
    title: city.title,
    description,
    openGraph: {
      type: "website",
      title: `${city.title} · DOMCity`,
      description,
      images: image ? [{ url: image, width: 1200, height: 630, alt: m.imageAlt(city.title) }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${city.title} · DOMCity`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedCityPage(props: PageProps<"/[locale]/city/[slug]">) {
  const { slug } = await props.params;
  const city = await load(slug);
  if (!city) notFound();
  const versions = city.pageVersions > 1 ? await pageVersions(city.domain, city.path) : [];
  const fileUrl = fileStore()!.publicUrl(cityKey(slug));
  return <CityExplorer key={slug} source={{ kind: "shared", city, fileUrl, versions }} />;
}
