import Link from "next/link";
import { wikiPath } from "@/capture/wikipedia";
import { gateArch } from "@/city/layout";
import type { CityCard } from "@/format/shared";
import { KINDS, LEGEND_GROUPS, type Kind } from "@/format/taxonomy";
import { sharingEnabled } from "@/server/config";
import { fileStore, thumbKey } from "@/server/files";
import { recentCaptures } from "@/server/store";
import { CityGallery } from "@/ui/CityGallery";
import { GithubLink } from "@/ui/GithubLink";
import { CitySearch } from "@/ui/CitySearch";
import { CityFigure } from "@/ui/CityFigure";
import { HERO_FIGURE } from "@/ui/heroFigure.generated";
import { KindSwatch } from "@/ui/KindSwatch";
import { Wordmark } from "@/ui/Logo";
import { MyCities } from "@/ui/MyCities";
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
    text: "Chaque élément reçoit sa parcelle, dans l'ordre de la page, du nord au sud. De grandes avenues séparent les parties de la page ; les éléments simples se serrent en pâtés de maisons.",
  },
  {
    n: "03",
    title: "Construction",
    text: "La ville est bâtie dans votre navigateur. Survolez un bâtiment pour savoir ce qu'il était, cliquez pour l'inspecter, puis passez en promenade.",
  },
];

// La galerie se met à jour toutes les minutes.
export const revalidate = 60;

export default async function Home() {
  const sharing = sharingEnabled();
  let recent: CityCard[] = [];
  if (sharing) {
    try {
      recent = await recentCaptures(9);
    } catch (error) {
      console.error("galerie", error);
    }
  }
  const files = sharing ? fileStore() : null;

  return (
    <div className={`${styles.sheet} graph-paper`}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="DOMCity, accueil">
          <Wordmark />
        </Link>
        <nav className={styles.nav} aria-label="Sections">
          <Link href="/installer">Le favori</Link>
          {sharing && <a href="#villes">Les villes</a>}
          <a href="#legende">La légende</a>
          <a href="#methode">La méthode</a>
        </nav>
        <GithubLink />
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>
              Chaque page web
              <br />
              est une <em>ville.</em>
            </h1>
            <p className={styles.lead}>
              Donnez un article, ou relevez n&apos;importe quel site avec le favori : DOMCity en relève le plan et
              le construit en 3D. Les sections deviennent des quartiers, les paragraphes des habitations, les titres
              des monuments. Ensuite, on s&apos;y promène.
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

            <Link href="/installer" className={styles.bookmarkletCta}>
              <span className="mono-caps">N&apos;importe quel site</span>
              <strong>Créer une ville</strong>
              <span aria-hidden className={styles.ctaArrow}>
                →
              </span>
            </Link>
          </div>

          <figure className={styles.figure}>
            <CityFigure
              className={styles.iso}
              doc={HERO_SAMPLE}
              figure={HERO_FIGURE}
              title="Une page de démonstration construite en ville : monument, beffrois, tours de bureaux, affiche, canal, lotissement, ambassade, port."
              annotations={[
                { match: (l) => l.kind === "monument", tag: "h1", name: "Monument" },
                {
                  match: (l) => l.kind === "gate",
                  tag: "header",
                  name: "Porte",
                  at: (lot, city) => {
                    const arch = city.decor.find((d) => d.type === "gate" && d.owner === lot.id);
                    return arch && [arch.x + arch.w / 2, gateArch(arch).top, arch.z + arch.d / 2];
                  },
                },
                { match: (l) => l.kind === "tower" && l.node.text === 5200, tag: "div", name: "Tour de bureaux" },
                { match: (l) => l.kind === "belfry", tag: "h2", name: "Beffroi" },
                { match: (l) => l.kind === "billboard" && l.node.img?.w === 420, tag: "img", name: "Affiche" },
                { match: (l) => l.kind === "river", tag: "hr", name: "Canal" },
                { match: (l) => l.kind === "estate", tag: "ul", name: "Lotissement" },
                { match: (l) => l.kind === "embassy", tag: "iframe", name: "Ambassade" },
                { match: (l) => l.kind === "port", tag: "footer", name: "Port" },
              ]}
            />
            <figcaption className="mono-caps">
              Fig. 1 · Une page de démonstration, relevée et construite par le moteur de DOMCity
            </figcaption>
          </figure>
        </section>

        {sharing && files && (
          <section id="villes" className={styles.section}>
            <div className={styles.sectionHead}>
              <p className="mono-caps">Planche 01</p>
              <h2>Les villes partagées</h2>
              <p className={styles.sectionLead}>
                Chaque ville publiée garde la date de son relevé. Cherchez un site ou une page, ou parcourez les
                dernières constructions.
              </p>
            </div>
            <div className={styles.sharedTools}>
              <CitySearch />
              <MyCities />
            </div>
            <CityGallery cities={recent} thumbUrl={(slug) => files.publicUrl(thumbKey(slug))} />
          </section>
        )}

        <section id="legende" className={styles.section}>
          <div className={styles.sectionHead}>
            <p className="mono-caps">Planche {sharing ? "02" : "01"}</p>
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
            <p className="mono-caps">Planche {sharing ? "03" : "02"}</p>
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
          <p>Dans votre navigateur. Rien ne part sans votre clic sur « Publier ».</p>
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
          <p>1 étage ≈ 3 m · hauteur logarithmique</p>
        </div>
      </footer>
    </div>
  );
}
