import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { sharingEnabled } from "@/server/config";
import { cityKey, fileStore, thumbKey } from "@/server/files";
import { SLUG_PATTERN } from "@/server/security";
import { getCapture, pageVersions } from "@/server/store";
import { CityExplorer } from "@/ui/explorer/CityExplorer";

const load = cache(async (slug: string) => {
  if (!sharingEnabled() || !SLUG_PATTERN.test(slug)) return null;
  return getCapture(slug);
});

export async function generateMetadata(props: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const city = await load(slug);
  if (!city) return { title: "Ville introuvable" };

  const image = city.stats.thumbnail === false ? undefined : fileStore()!.publicUrl(thumbKey(slug));
  const description =
    `La page ${city.domain}${city.path} construite en ville 3D : ` +
    `${city.stats.buildings ?? 0} bâtiments, ${city.stats.districts ?? 0} quartiers, ${city.stats.monuments ?? 0} monuments.`;
  return {
    title: city.title,
    description,
    openGraph: {
      type: "website",
      title: `${city.title} · DOMCity`,
      description,
      images: image ? [{ url: image, width: 1200, height: 630, alt: `La ville de ${city.title}` }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${city.title} · DOMCity`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharedCityPage(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const city = await load(slug);
  if (!city) notFound();
  const versions = city.pageVersions > 1 ? await pageVersions(city.domain, city.path) : [];
  const fileUrl = fileStore()!.publicUrl(cityKey(slug));
  return <CityExplorer key={slug} source={{ kind: "shared", city, fileUrl, versions }} />;
}
