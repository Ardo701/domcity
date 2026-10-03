import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCount } from "@/city/describe";
import { linkPath } from "@/format/links";
import { megalopolisPath, sharedCityPath, sitePath } from "@/format/shared";
import { fileStore, thumbKey } from "@/server/files";
import { sitePageList } from "@/server/store";
import { Gallery, GalleryCard, GalleryGap, shortDate } from "@/ui/Gallery";
import { InkLink } from "@/ui/InkLink";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../../page.module.css";
import sub from "../../subpage.module.css";
import { loadSite, readDomain } from "./load";
import styles from "./site.module.css";

/** Pages montrées d'un coup (un site comme fr.wikipedia.org peut en avoir des milliers). */
const PER_PAGE = 60;

const count = (n: number, word: string) => `${formatCount(n)} ${word}${n > 1 ? "s" : ""}`;

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export async function generateMetadata(props: PageProps<"/site/[domain]">): Promise<Metadata> {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  if (!site) return { title: "Site introuvable" };
  const n = site.pagesCount;
  return {
    title: domain,
    description: `${count(n, "page")} de ${domain} construite${n > 1 ? "s" : ""} en ville${n > 1 ? "s" : ""} 3D sur DOMCity.`,
  };
}

/**
 * La page d'un site : ses pages relevées, chacune sa ville, et l'entrée de sa mégalopole.
 * Elle existe dès qu'une page du site est partagée, même si sa page d'accueil ne l'est pas.
 */
export default async function SitePage(props: PageProps<"/site/[domain]">) {
  const domain = readDomain((await props.params).domain);
  const site = await loadSite(domain);
  const files = fileStore();
  if (!site || !files) notFound();

  const chunks = Math.max(1, Math.ceil(site.pagesCount / PER_PAGE));
  const asked = Number((await props.searchParams).page);
  const chunk = Number.isInteger(asked) && asked >= 1 && asked <= chunks ? asked : 1;
  const pages = await sitePageList(domain, PER_PAGE, (chunk - 1) * PER_PAGE);
  if (pages.length === 0) notFound();

  // Les adresses sont rangées dans l'ordre : l'accueil, s'il est relevé, ouvre la liste.
  // Wikipédia n'a pas d'accueil à cette adresse : on ne le réclame pas.
  const homeMissing = chunk === 1 && pages[0].path !== "/" && !domain.endsWith(".wikipedia.org");
  const several = site.pagesCount > 1;
  const chunkHref = (n: number) => (n === 1 ? sitePath(domain) : `${sitePath(domain)}?page=${n}`);
  const first = (chunk - 1) * PER_PAGE + 1;

  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader />

      <main className={sub.main}>
        <div className={sub.head}>
          <p className="mono-caps">Site</p>
          <h1 className={`${sub.title} ${styles.domain}`}>{domain}</h1>
          <p className={sub.lead}>
            {several
              ? `Les pages de ${domain} relevées sur DOMCity, chacune devenue une ville. Visitez-les une par une, ou toutes ensemble dans la mégalopole, reliées par leurs liens.`
              : `Une page de ${domain} est relevée sur DOMCity. Relevez-en d'autres avec le favori : elles s'assembleront en une mégalopole.`}
          </p>
          <p className={`${styles.stats} mono-caps`}>
            {[
              count(site.pagesCount, "ville"),
              site.capturesCount > site.pagesCount && count(site.capturesCount, "version"),
              count(site.views, "visite"),
              site.lastCaptureAt && `mis à jour le ${longDate(site.lastCaptureAt)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className={styles.actions}>
            <InkLink href={several ? megalopolisPath(domain) : sharedCityPath(pages[0].slug)} size="small" arrow>
              {several ? "Visiter la mégalopole" : "Visiter la ville"}
            </InkLink>
            <a href={`https://${domain}/`} target="_blank" rel="noreferrer" className={styles.origin}>
              Ouvrir {domain} ↗
            </a>
          </div>
        </div>

        <section className={styles.pages} aria-labelledby="pages-du-site">
          <div className={styles.pagesHead}>
            <h2 id="pages-du-site">Ses pages</h2>
            {chunks > 1 && (
              <p className="mono-caps">
                {first} à {first + pages.length - 1} sur {formatCount(site.pagesCount)}
              </p>
            )}
          </div>
          <Gallery>
            {homeMissing && (
              <GalleryGap label="Pas encore relevée" title="Page d'accueil" where="/">
                Ouvrez{" "}
                <a href={`https://${domain}/`} target="_blank" rel="noreferrer">
                  {domain}
                </a>{" "}
                et cliquez sur le favori pour la construire. Pas encore de favori ? <Link href="/create">Créer une ville</Link>.
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
                  count(page.stats.buildings ?? 0, "bâtiment"),
                  page.capturesCount > 1 && count(page.capturesCount, "version"),
                  page.lastCaptureAt && shortDate(page.lastCaptureAt),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </Gallery>
          {chunks > 1 && (
            <nav className={styles.pager} aria-label="Les autres pages du site">
              {chunk > 1 && <Link href={chunkHref(chunk - 1)}>← Précédentes</Link>}
              <p className="mono-caps">
                {chunk} / {chunks}
              </p>
              {chunk < chunks && <Link href={chunkHref(chunk + 1)}>Suivantes →</Link>}
            </nav>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
