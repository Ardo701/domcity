import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { formatCount } from "@/city/describe";
import { sharedCityPath } from "@/format/shared";
import { siteHost } from "@/format/url";
import { sharingEnabled } from "@/server/config";
import { getSite, sitePages } from "@/server/store";
import { Sheet } from "@/ui/Sheet";
import styles from "@/ui/Sheet.module.css";

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
    title: domain,
    description: `${site.pagesCount} page${site.pagesCount > 1 ? "s" : ""} de ${domain} construite${site.pagesCount > 1 ? "s" : ""} en villes 3D sur DOMCity.`,
  };
}

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

export default async function SitePage(props: PageProps<"/s/[domain]">) {
  const domain = readDomain((await props.params).domain);
  const site = await load(domain);
  if (!site) notFound();
  const pages = await sitePages(domain);

  return (
    <Sheet kicker="Site" title={domain}>
      <dl className={styles.figures}>
        <div>
          <dd>{formatCount(site.pagesCount)}</dd>
          <dt className="mono-caps">Pages</dt>
        </div>
        <div>
          <dd>{formatCount(site.capturesCount)}</dd>
          <dt className="mono-caps">Versions</dt>
        </div>
        <div>
          <dd>{formatCount(site.views)}</dd>
          <dt className="mono-caps">Visites</dt>
        </div>
      </dl>
      <p className={styles.note}>
        Chaque page a sa ville, et chaque nouveau relevé en garde une version datée. Bientôt, la mégalopole : toutes
        ces pages assemblées en une seule ville.
      </p>
      <ul className={styles.pages}>
        {pages.map((page) => (
          <li key={page.path}>
            <div>
              <p className={styles.pagePath}>{page.path}</p>
              {page.title && <p className={styles.pageTitle}>{page.title}</p>}
              <p className={styles.pageMeta}>
                {page.capturesCount} version{page.capturesCount > 1 ? "s" : ""} · dernier relevé le{" "}
                {date(page.lastCaptureAt)}
              </p>
            </div>
            {page.latestSlug && (
              <Link href={sharedCityPath(page.latestSlug)} className={styles.button}>
                Voir la ville →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
