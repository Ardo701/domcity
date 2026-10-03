import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MegaPageInfo } from "@/format/shared";
import { cityKey, fileStore } from "@/server/files";
import { siteCity, sitePages } from "@/server/store";
import { MegalopolisExplorer } from "@/ui/megalopolis/MegalopolisExplorer";
import { loadSite, readDomain } from "../load";

/** Beyond this, the megalopolis takes the most recently captured pages. */
const MAX_PAGES = 48;

export async function generateMetadata(props: PageProps<"/site/[domain]/megalopolis">): Promise<Metadata> {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  if (!site) return { title: "Site introuvable" };
  return {
    title: `${domain} · mégalopole`,
    description: `${site.pagesCount} page${site.pagesCount > 1 ? "s" : ""} de ${domain} construite${site.pagesCount > 1 ? "s" : ""} en villes 3D et assemblée${site.pagesCount > 1 ? "s" : ""} en une mégalopole sur DOMCity.`,
  };
}

/** All the pages of a site, each its own city, assembled into a megalopolis. */
export default async function MegalopolisPage(props: PageProps<"/site/[domain]/megalopolis">) {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
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
