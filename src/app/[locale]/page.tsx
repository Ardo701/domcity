import Link from "next/link";
import { gateArch } from "@/city/layout";
import type { SiteCard } from "@/format/shared";
import { KINDS, LEGEND_GROUPS, type Kind } from "@/format/taxonomy";
import { HOME } from "@/i18n/messages/home";
import { KINDS_TEXT } from "@/i18n/messages/kinds";
import { getLocale } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { fileStore, thumbKey } from "@/server/files";
import { recentSites } from "@/server/store";
import { AccountLink } from "@/ui/AccountLink";
import { CitySearch } from "@/ui/CitySearch";
import { CityFigure } from "@/ui/CityFigure";
import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import { InkLink } from "@/ui/InkLink";
import { KindSwatch } from "@/ui/KindSwatch";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteGallery } from "@/ui/SiteGallery";
import { SiteHeader } from "@/ui/SiteHeader";
import { HERO_SAMPLE } from "@/ui/samples";
import styles from "./page.module.css";

const LEGEND_KINDS = (Object.keys(KINDS) as Kind[]).filter((k) => k !== "terrain");

// The gallery updates every minute.
export const revalidate = 60;

export default async function Home() {
  const locale = await getLocale();
  const m = HOME[locale];
  const kinds = KINDS_TEXT[locale];
  const sharing = sharingEnabled();
  let recent: SiteCard[] = [];
  if (sharing) {
    try {
      recent = await recentSites(9);
    } catch (error) {
      console.error("gallery", error);
    }
  }
  const files = sharing ? fileStore() : null;

  return (
    <div className={`${styles.sheet} graph-paper`}>
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>
              {m.title[0]}
              <br />
              {m.title[1]}
              <br />
              <em>{m.titleEnd}</em>
            </h1>
            <p className={styles.lead}>{m.lead}</p>

            <InkLink href="/create" arrow className={styles.cta}>
              {m.cta}
            </InkLink>
          </div>

          <figure className={styles.figure}>
            <CityFigure
              className={styles.iso}
              doc={HERO_SAMPLE}
              figure={HERO_FIGURE}
              title={m.figureTitle}
              annotations={[
                { match: (l) => l.kind === "monument", tag: "h1", name: m.figure.monument },
                {
                  match: (l) => l.kind === "gate",
                  tag: "header",
                  name: m.figure.gate,
                  at: (lot, city) => {
                    const arch = city.decor.find((d) => d.type === "gate" && d.owner === lot.id);
                    return arch && [arch.x + arch.w / 2, gateArch(arch).top, arch.z + arch.d / 2];
                  },
                },
                { match: (l) => l.kind === "tower" && l.node.text === 5200, tag: "div", name: m.figure.tower },
                { match: (l) => l.kind === "belfry", tag: "h2", name: m.figure.belfry },
                { match: (l) => l.kind === "billboard" && l.node.img?.w === 420, tag: "img", name: m.figure.poster },
                { match: (l) => l.kind === "river", tag: "hr", name: m.figure.canal },
                { match: (l) => l.kind === "estate", tag: "ul", name: m.figure.estate },
                { match: (l) => l.kind === "embassy", tag: "iframe", name: m.figure.embassy },
                { match: (l) => l.kind === "port", tag: "footer", name: m.figure.harbor },
              ]}
            />
          </figure>
        </section>

        {sharing && files && (
          <section id="cities" className={styles.section}>
            <div className={styles.sectionHead}>
              <h2>{m.shared.title}</h2>
              <p className={styles.sectionLead}>{m.shared.lead}</p>
            </div>
            <div className={styles.sharedTools}>
              <CitySearch />
              <AccountLink />
            </div>
            <SiteGallery sites={recent} thumbUrl={(slug) => files.publicUrl(thumbKey(slug))} />
            {recent.length > 0 && (
              <Link href="/explore" className={styles.allCities}>
                {m.shared.all} <span aria-hidden>→</span>
              </Link>
            )}
          </section>
        )}

        <section id="legend" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{m.legend.title}</h2>
            <p className={styles.sectionLead}>{m.legend.lead}</p>
          </div>

          <div className={styles.legend}>
            {LEGEND_GROUPS.map((group) => (
              <div key={group} className={styles.legendGroup}>
                <h3 className="mono-caps">{kinds.groups[group]}</h3>
                <ul>
                  {LEGEND_KINDS.filter((k) => KINDS[k].group === group).map((k) => (
                    <li key={k}>
                      <KindSwatch kind={k} size={48} />
                      <div>
                        <p className={styles.kindName}>{kinds.kinds[k].name}</p>
                        <p className={styles.kindTags}>{kinds.kinds[k].tags}</p>
                        <p className={styles.kindBlurb}>{kinds.kinds[k].blurb}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="method" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{m.method.title}</h2>
          </div>
          <ol className={styles.steps}>
            {m.method.steps.map((s, i) => (
              <li key={i}>
                <span className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
