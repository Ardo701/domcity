import Link from "next/link";
import { wikiPath } from "@/capture/wikipedia";
import { KINDS, LEGEND_GROUPS, type Kind } from "@/format/taxonomy";
import { IsoCity } from "@/ui/IsoCity";
import { KindSwatch } from "@/ui/KindSwatch";
import { Wordmark } from "@/ui/Logo";
import { EXAMPLES, HERO_SAMPLE } from "@/ui/samples";
import { WikiSearch } from "@/ui/WikiSearch";
import styles from "./page.module.css";

const LEGEND_KINDS = (Object.keys(KINDS) as Kind[]).filter((k) => k !== "terrain");

const STEPS = [
  {
    n: "01",
    title: "Relevé",
    text: "On lit la structure de la page : ses balises, la quantité de texte, les titres, les images. Jamais le contenu entier, seulement sa forme.",
  },
  {
    n: "02",
    title: "Urbanisme",
    text: "Chaque élément reçoit une parcelle, rangée dans l'ordre de la page, du nord au sud. Plus un élément est imbriqué, plus son quartier prend de la hauteur.",
  },
  {
    n: "03",
    title: "Construction",
    text: "La ville est bâtie dans votre navigateur. Survolez un bâtiment pour savoir ce qu'il était, cliquez pour l'inspecter, puis passez en promenade.",
  },
];

export default function Home() {
  return (
    <div className={`${styles.sheet} graph-paper`}>
      <div className={styles.frame} aria-hidden>
        {["A", "B", "C", "D", "E", "F"].map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>

      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="DOMCity, accueil">
          <Wordmark />
        </Link>
        <nav className={styles.nav} aria-label="Sections">
          <a href="#legende">La légende</a>
          <a href="#methode">La méthode</a>
        </nav>
        <span className={`${styles.edition} mono-caps`}>Relevé expérimental · v0.1</span>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={`${styles.kicker} mono-caps`}>
              <span className={styles.square} aria-hidden />
              Planche 01 · Urbanisme du web
            </p>
            <h1 className={styles.title}>
              Chaque page web
              <br />
              est une <em>ville.</em>
            </h1>
            <p className={styles.lead}>
              Donnez un article, DOMCity en relève le plan et le construit en 3D. Les sections deviennent des
              quartiers, les paragraphes des habitations, les titres des monuments. Ensuite, on s&apos;y promène.
            </p>

            <WikiSearch />

            <div className={styles.examples}>
              <span className="mono-caps">Essayer</span>
              <ul>
                {EXAMPLES.map((e) => (
                  <li key={`${e.lang}-${e.title}`}>
                    <Link href={wikiPath(e.lang, e.title)}>
                      {e.title}
                      {e.lang !== "fr" && <span className={styles.exampleLang}>{e.lang}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className={`${styles.note} mono-caps`}>
              Pour l&apos;instant : Wikipédia. Bientôt : n&apos;importe quel site, depuis vos favoris.
            </p>
          </div>

          <figure className={styles.figure}>
            <IsoCity
              className={styles.iso}
              doc={HERO_SAMPLE}
              title="Une page de démonstration construite en ville : quartiers, immeubles, monument, rivière."
              annotations={[
                { match: (l) => l.kind === "monument", tag: "h1", name: "Monument" },
                { match: (l) => l.kind === "belfry", tag: "h2", name: "Beffroi" },
                { match: (l) => l.kind === "tower" && l.node.text === 5200, tag: "div", name: "Immeuble" },
                { match: (l) => l.kind === "billboard" && l.node.img?.w === 420, tag: "img", name: "Panneau" },
                { match: (l) => l.kind === "river", tag: "hr", name: "Rivière" },
                { match: (l) => l.kind === "estate", tag: "ul", name: "Lotissement" },
                { match: (l) => l.kind === "park", tag: "aside", name: "Parc" },
                { match: (l) => l.kind === "port", tag: "footer", name: "Port" },
              ]}
            />
            <figcaption className="mono-caps">
              Fig. 1 · Une page de démonstration, relevée et construite par le moteur de DOMCity
            </figcaption>
          </figure>
        </section>

        <section id="legende" className={styles.section}>
          <div className={styles.sectionHead}>
            <p className="mono-caps">Planche 02</p>
            <h2>La légende du plan</h2>
            <p className={styles.sectionLead}>
              Chaque balise HTML a sa place dans la ville. Les couleurs suivent un plan de zonage : des tons calmes
              pour le bâti courant, du vif pour ce qui compte.
            </p>
          </div>

          <div className={styles.legend}>
            {LEGEND_GROUPS.map((group) => (
              <div key={group} className={styles.legendGroup}>
                <h3 className="mono-caps">{group}</h3>
                <ul>
                  {LEGEND_KINDS.filter((k) => KINDS[k].group === group).map((k) => (
                    <li key={k}>
                      <KindSwatch kind={k} size={34} />
                      <div>
                        <p className={styles.kindName}>{KINDS[k].name}</p>
                        <p className={styles.kindTags}>{KINDS[k].tags}</p>
                        <p className={styles.kindBlurb}>{KINDS[k].blurb}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="methode" className={styles.section}>
          <div className={styles.sectionHead}>
            <p className="mono-caps">Planche 03</p>
            <h2>La méthode</h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className={styles.stepNumber}>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className={styles.cartouche}>
        <div>
          <span className="mono-caps">Projet</span>
          <strong>DOMCity</strong>
        </div>
        <div>
          <span className="mono-caps">Relevé</span>
          <p>Dans votre navigateur. Rien n&apos;est envoyé à nos serveurs.</p>
        </div>
        <div>
          <span className="mono-caps">Sources</span>
          <p>
            Articles de{" "}
            <a href="https://fr.wikipedia.org" target="_blank" rel="noreferrer">
              Wikipédia
            </a>
            , sous licence CC BY-SA.
          </p>
        </div>
        <div>
          <span className="mono-caps">Échelle</span>
          <p>1 étage ≈ 1,6 m · hauteur logarithmique</p>
        </div>
      </footer>
    </div>
  );
}
