import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MegaPageInfo } from "@/format/shared";
import { SITE } from "@/i18n/messages/site";
import { getMessages } from "@/i18n/server";
import { cityKey, fileStore } from "@/server/files";
import { siteCity, sitePages } from "@/server/store";
import { MegalopolisExplorer } from "@/ui/megalopolis/MegalopolisExplorer";
import { loadSite, readDomain } from "../load";

/** Beyond this, the megalopolis takes the most recently captured pages. */
const MAX_PAGES = 48;

export async function generateMetadata(props: PageProps<"/[locale]/site/[domain]/megalopolis">): Promise<Metadata> {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  const m = await getMessages(SITE);
  if (!site) return { title: m.notFound };
  return { title: m.megaTitle(domain), description: m.megaDescription(domain, site.pagesCount) };
}

/** All the pages of a site, each its own city, assembled into a megalopolis. */
export default async function MegalopolisPage(props: PageProps<"/[locale]/site/[domain]/megalopolis">) {
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
