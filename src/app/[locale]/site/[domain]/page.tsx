import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { linkPath } from "@/format/links";
import { megalopolisPath, sharedCityPath, sitePath } from "@/format/shared";
import { SITE } from "@/i18n/messages/site";
import { getMessages } from "@/i18n/server";
import { fileStore, thumbKey } from "@/server/files";
import { sitePageList } from "@/server/store";
import { Gallery, GalleryCard, GalleryGap } from "@/ui/Gallery";
import { InkLink } from "@/ui/InkLink";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../../page.module.css";
import sub from "../../subpage.module.css";
import { loadSite, readDomain } from "./load";
import styles from "./site.module.css";

/** Pages shown at once (a site like fr.wikipedia.org can have thousands). */
const PER_PAGE = 60;

export async function generateMetadata(props: PageProps<"/[locale]/site/[domain]">): Promise<Metadata> {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  const m = await getMessages(SITE);
  if (!site) return { title: m.notFound };
  return { title: domain, description: m.description(domain, site.pagesCount) };
}

/**
 * A site's page: its captured pages, each its own city, and the entrance to its megalopolis.
 * It exists as soon as one page of the site is shared, even if its home page is not.
 */
export default async function SitePage(props: PageProps<"/[locale]/site/[domain]">) {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  const files = fileStore();
  if (!site || !files) notFound();
  const m = await getMessages(SITE);

  const chunks = Math.max(1, Math.ceil(site.pagesCount / PER_PAGE));
  const asked = Number((await props.searchParams).page);
  const chunk = Number.isInteger(asked) && asked >= 1 && asked <= chunks ? asked : 1;
  const pages = await sitePageList(domain, PER_PAGE, (chunk - 1) * PER_PAGE);
  if (pages.length === 0) notFound();

  // Addresses are sorted in order: the home page, if captured, opens the list.
  // Wikipedia has no home page at this address: we do not ask for it.
  const homeMissing = chunk === 1 && pages[0].path !== "/" && !domain.endsWith(".wikipedia.org");
  const several = site.pagesCount > 1;
  const chunkHref = (n: number) => (n === 1 ? sitePath(domain) : `${sitePath(domain)}?page=${n}`);
  const first = (chunk - 1) * PER_PAGE + 1;

  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader />

      <main className={sub.main}>
        <div className={sub.head}>
          <p className="mono-caps">{m.kicker}</p>
          <h1 className={`${sub.title} ${styles.domain}`}>{domain}</h1>
          <p className={sub.lead}>{several ? m.leadSeveral(domain) : m.leadOne(domain)}</p>
          <p className={`${styles.stats} mono-caps`}>
            {[
              m.cities(site.pagesCount),
              site.capturesCount > site.pagesCount && m.versions(site.capturesCount),
              m.visits(site.views),
              site.lastCaptureAt && m.updated(site.lastCaptureAt),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className={styles.actions}>
            <InkLink href={several ? megalopolisPath(domain) : sharedCityPath(pages[0].slug)} size="small" arrow>
              {several ? m.visitMegalopolis : m.visitCity}
            </InkLink>
            <a href={`https://${domain}/`} target="_blank" rel="noreferrer" className={styles.origin}>
              {m.open(domain)}
            </a>
          </div>
        </div>

        <section className={styles.pages} aria-labelledby="site-pages">
          <div className={styles.pagesHead}>
            <h2 id="site-pages">{m.pagesTitle}</h2>
            {chunks > 1 && <p className="mono-caps">{m.range(first, first + pages.length - 1, site.pagesCount)}</p>}
          </div>
          <Gallery>
            {homeMissing && (
              <GalleryGap label={m.homeMissing.label} title={m.homeMissing.title} where="/">
                {m.homeMissing.text(
                  <a href={`https://${domain}/`} target="_blank" rel="noreferrer">
                    {domain}
                  </a>,
                  <Link href="/create">{m.homeMissing.create}</Link>,
                )}
              </GalleryGap>
            )}
            {pages.map((page) => (
              <GalleryCard
                key={page.path}
                href={sharedCityPath(page.slug)}
                thumb={page.stats.thumbnail !== false ? files.publicUrl(thumbKey(page.slug)) : null}
                title={page.title ?? linkPath(page.path)}
                where={linkPath(page.path)}
                meta={[
                  m.buildings(page.stats.buildings ?? 0),
                  page.capturesCount > 1 && m.versions(page.capturesCount),
                  page.lastCaptureAt && m.date(page.lastCaptureAt),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </Gallery>
          {chunks > 1 && (
            <nav className={styles.pager} aria-label={m.pager.label}>
              {chunk > 1 && <Link href={chunkHref(chunk - 1)}>{m.pager.previous}</Link>}
              <p className="mono-caps">
                {chunk} / {chunks}
              </p>
              {chunk < chunks && <Link href={chunkHref(chunk + 1)}>{m.pager.next}</Link>}
            </nav>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
