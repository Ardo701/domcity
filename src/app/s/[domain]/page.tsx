import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { MegaPageInfo } from "@/format/shared";
import { siteHost } from "@/format/url";
import { sharingEnabled } from "@/server/config";
import { cityKey, fileStore } from "@/server/files";
import { getSite, siteCity, sitePages } from "@/server/store";
import { MegalopolisExplorer } from "@/ui/megalopolis/MegalopolisExplorer";

/** Au-delà, la mégalopole prend les pages relevées le plus récemment. */
const MAX_PAGES = 48;

const readDomain = (raw: string) => {
  try {
    return siteHost(decodeURIComponent(raw));
  } catch {
    return siteHost(raw);
  }
};

const load = cache(async (domain: string) => {
  if (!sharingEnabled() || !/^[a-z0-9.-]{3,253}$/.test(domain)) return null;
  return getSite(domain);
});

export async function generateMetadata(props: PageProps<"/s/[domain]">): Promise<Metadata> {
  const domain = readDomain((await props.params).domain);
  const site = await load(domain);
  if (!site) return { title: "Site introuvable" };
  return {
    title: `${domain} · mégalopole`,
    description: `${site.pagesCount} page${site.pagesCount > 1 ? "s" : ""} de ${domain} construite${site.pagesCount > 1 ? "s" : ""} en villes 3D et assemblée${site.pagesCount > 1 ? "s" : ""} en une mégalopole sur DOMCity.`,
  };
}

/** La page d'un site : toutes ses pages, chacune sa ville, assemblées en une mégalopole. */
export default async function SitePage(props: PageProps<"/s/[domain]">) {
  const domain = readDomain((await props.params).domain);
  const site = await load(domain);
  if (!site) notFound();
  const [latest, list] = await Promise.all([siteCity(domain), sitePages(domain)]);
  const versions = new Map(list.map((page) => [page.path, page.capturesCount]));
  const files = fileStore()!;
  const pages: MegaPageInfo[] = latest
    .sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1))
    .slice(0, MAX_PAGES)
    .map((page) => ({
      path: page.path,
      title: page.title,
      slug: page.slug,
      capturedAt: page.capturedAt,
      source: page.source,
      elements: page.stats.elements ?? 0,
      versions: versions.get(page.path) ?? 1,
      fileUrl: files.publicUrl(cityKey(page.slug)),
    }));
  if (pages.length === 0) notFound();
  return <MegalopolisExplorer key={domain} domain={domain} pages={pages} totalPages={site.pagesCount} />;
}
