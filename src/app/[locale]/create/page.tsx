import type { Metadata } from "next";
import { BLOCK_CATEGORIES } from "@/format/blocklist";
import { LIMITS } from "@/format/limits";
import { CREATE } from "@/i18n/messages/create";
import { REFUSAL } from "@/i18n/messages/refusal";
import { getLocale, getMessages } from "@/i18n/server";
import { BookmarkletButton, CopyBookmarklet } from "@/ui/BookmarkletButton";
import { InstallDemo } from "@/ui/InstallDemo";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "./create.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(CREATE);
  return { title: m.title, description: m.description };
}

export default async function CreatePage() {
  const locale = await getLocale();
  const m = CREATE[locale];
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="create" />

      <main>
        <section className={`${home.hero} ${styles.hero}`}>
          <div className={home.heroText}>
            <h1 className={`${home.title} ${styles.title}`}>
              {m.heroTitle[0]}
              <br />
              <em>{m.heroTitle[1]}</em>
            </h1>
            <p className={home.lead}>{m.heroLead}</p>

            <div className={styles.dropZone}>
              <BookmarkletButton className={styles.stamp} title={m.buttonTitle} />
              <div className={styles.dropText}>
                <p className={styles.dropArrow}>
                  <span aria-hidden>↖</span> {m.dropArrow}
                </p>
                <p className={styles.dropHint}>{m.dropHint}</p>
              </div>
            </div>
          </div>

          <InstallDemo />
        </section>

        <section className={home.section}>
          <div className={home.sectionHead}>
            <p className="mono-caps">{m.howTo}</p>
            <h2>{m.gesturesTitle}</h2>
          </div>
          <ol className={home.steps}>
            {m.gestures.map((s, i) => (
              <li key={i}>
                <span className={home.stepNumber}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="captured" className={home.section}>
          <div className={home.sectionHead}>
            <p className="mono-caps">{m.transparency}</p>
            <h2>{m.readTitle}</h2>
            <p className={home.sectionLead}>{m.readLead}</p>
          </div>
          <div className={styles.ledger}>
            <div>
              <h3 className="mono-caps">{m.readColumn}</h3>
              <ul>
                {m.read.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={styles.never}>
              <h3 className="mono-caps">{m.neverColumn}</h3>
              <ul>
                {m.never.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>
                  <div>
                    {m.refusedSites}
                    <ul className={styles.categories}>
                      {BLOCK_CATEGORIES.map((category) => (
                        <li key={category}>{REFUSAL[locale].labels[category]}</li>
                      ))}
                      <li>{m.adultPages}</li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="phone" className={home.section}>
          <div className={styles.columns}>
            <div>
              <div className={home.sectionHead}>
                <p className="mono-caps">{m.manualKicker}</p>
                <h2>{m.manualTitle}</h2>
                <p className={home.sectionLead}>{m.manualLead}</p>
              </div>
              <ol className={styles.manual}>
                <li>
                  <CopyBookmarklet className={styles.copy} labels={m.copy} />
                </li>
                {m.manual.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <div className={home.sectionHead}>
                <p className="mono-caps">{m.limitsKicker}</p>
                <h2>{m.limitsTitle}</h2>
              </div>
              <dl className={styles.limits}>
                {m.limits.map((limit) => (
                  <div key={limit.title}>
                    <dt>{limit.title}</dt>
                    <dd>{limit.text(LIMITS.maxNodes)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
