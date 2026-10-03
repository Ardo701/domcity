import type { Metadata } from "next";
import { LIMITS } from "@/format/limits";
import { BookmarkletButton, CopyBookmarklet } from "@/ui/BookmarkletButton";
import { InstallDemo } from "@/ui/InstallDemo";
import { SiteFooter } from "@/ui/SiteFooter";
import { SiteHeader } from "@/ui/SiteHeader";
import home from "../page.module.css";
import styles from "./create.module.css";

export const metadata: Metadata = {
  title: "Créer une ville",
  description:
    "Le favori DOMCity relève n'importe quelle page que vous regardez et la construit en ville 3D. Rien à installer : un simple favori.",
};

const GESTURES = [
  {
    n: "01",
    title: "Glisser",
    text: "Glissez le bouton DOMCity dans la barre de favoris de votre navigateur. Il y reste, prêt à servir.",
  },
  {
    n: "02",
    title: "Cliquer",
    text: "Sur n'importe quel site, cliquez sur le favori DOMCity. Il relève la page telle qu'elle s'affiche chez vous.",
  },
  {
    n: "03",
    title: "Visiter",
    text: "La ville s'ouvre dans un nouvel onglet. Promenez-vous, inspectez, et publiez-la si vous le souhaitez.",
  },
];

const READ = [
  "La structure de la page : les balises et leur imbrication",
  "La quantité de texte de chaque élément",
  "Le texte des titres h1 à h3, pour les graver sur les monuments",
  "Les adresses des images",
  "La position et la couleur de fond des éléments affichés",
  "Le nombre de scripts et les sites tiers contactés par la page",
  "Le nombre de commentaires laissés dans le HTML (jamais leur texte) et les images cassées",
  "Si la page se déclare réservée aux adultes : DOMCity n'en fait pas de ville",
];

const NEVER = [
  "Le texte des paragraphes, des listes ou des tableaux",
  "Ce que vous tapez dans les formulaires",
  "Vos cookies, vos mots de passe, vos sessions",
  "Les paramètres de l'adresse (après ? ou #)",
  "Les éléments masqués de la page",
];

export default function CreatePage() {
  return (
    <div className={`${home.sheet} graph-paper`}>
      <SiteHeader current="create" />

      <main>
        <section className={`${home.hero} ${styles.hero}`}>
          <div className={home.heroText}>
            <h1 className={`${home.title} ${styles.title}`}>
              Tout le web est
              <br />
              <em>constructible.</em>
            </h1>
            <p className={home.lead}>
              Le favori relève la page que vous regardez, telle qu&apos;elle s&apos;affiche chez vous, et l&apos;envoie
              à DOMCity pour la construire. Il tient dans un simple favori : rien à installer, aucune autorisation à
              donner.
            </p>

            <div className={styles.dropZone}>
              <BookmarkletButton className={styles.stamp} />
              <div className={styles.dropText}>
                <p className={styles.dropArrow}>
                  <span aria-hidden>↖</span> Glissez ce bouton dans votre barre de favoris
                </p>
                <p className={styles.dropHint}>
                  Barre masquée ? <kbd>Ctrl</kbd> <kbd>Maj</kbd> <kbd>B</kbd>, ou <kbd>⌘</kbd> <kbd>Maj</kbd> <kbd>B</kbd>{" "}
                  sur Mac. Un simple clic essaie le favori sur cette page même.
                </p>
              </div>
            </div>
          </div>

          <InstallDemo />
        </section>

        <section className={home.section}>
          <div className={home.sectionHead}>
            <p className="mono-caps">Mode d&apos;emploi</p>
            <h2>Trois gestes</h2>
          </div>
          <ol className={home.steps}>
            {GESTURES.map((s) => (
              <li key={s.n}>
                <span className={home.stepNumber}>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="releve" className={home.section}>
          <div className={home.sectionHead}>
            <p className="mono-caps">Transparence</p>
            <h2>Ce que le favori relève</h2>
            <p className={home.sectionLead}>
              Le favori ne fait que lire la page, dans votre navigateur. Rien ne quitte votre ordinateur tant que vous
              ne cliquez pas sur « Publier » : DOMCity vous montre d&apos;abord tout ce qui partira.
            </p>
          </div>
          <div className={styles.ledger}>
            <div>
              <h3 className="mono-caps">Relevé</h3>
              <ul>
                {READ.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={styles.never}>
              <h3 className="mono-caps">Jamais relevé</h3>
              <ul>
                {NEVER.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="telephone" className={home.section}>
          <div className={styles.columns}>
            <div>
              <div className={home.sectionHead}>
                <p className="mono-caps">Installation à la main</p>
                <h2>Sur téléphone</h2>
                <p className={home.sectionLead}>
                  Ou si votre navigateur refuse le glisser. Le favori est un petit programme : son adresse est son
                  code.
                </p>
              </div>
              <ol className={styles.manual}>
                <li>
                  <CopyBookmarklet className={styles.copy} />
                </li>
                <li>Ajoutez n&apos;importe quelle page à vos favoris.</li>
                <li>
                  Modifiez ce favori : appelez-le <b>DOMCity</b> et remplacez son adresse par le code copié.
                </li>
                <li>
                  Sur la page à relever, ouvrez vos favoris et touchez DOMCity. Sur Chrome pour Android, tapez plutôt «
                  DOMCity » dans la barre d&apos;adresse et choisissez le favori.
                </li>
              </ol>
            </div>

            <div>
              <div className={home.sectionHead}>
                <p className="mono-caps">Bon à savoir</p>
                <h2>Les limites</h2>
              </div>
              <dl className={styles.limits}>
                <div>
                  <dt>Pages privées</dt>
                  <dd>
                    Derrière une connexion, le favori voit ce que vous voyez. Il n&apos;envoie rien seul, mais ne publiez
                    pas une messagerie ou un compte client.
                  </dd>
                </div>
                <div>
                  <dt>Sites qui isolent leurs fenêtres</dt>
                  <dd>
                    Quelques sites coupent le lien avec les onglets qu&apos;ils ouvrent. La ville s&apos;ouvre alors dans
                    le même onglet : le bouton Retour vous ramène à la page.
                  </dd>
                </div>
                <div>
                  <dt>Très grandes pages</dt>
                  <dd>
                    Le relevé s&apos;arrête à {LIMITS.maxNodes.toLocaleString("fr-FR")} éléments : au-delà, la ville
                    garde le début de la page.
                  </dd>
                </div>
                <div>
                  <dt>Sites refusés</dt>
                  <dd>
                    Sites pour adultes ou violents, banques, messageries, impôts, santé, jeux d&apos;argent, sites
                    dangereux : DOMCity n&apos;en fait pas de ville. Votre navigateur vérifie lui-même, avec la liste
                    qu&apos;il télécharge : rien de la page ne part.
                  </dd>
                </div>
                <div>
                  <dt>Villes publiées</dt>
                  <dd>
                    Elles portent la mention « relevé par un visiteur » : DOMCity ne peut pas vérifier qu&apos;une ville
                    envoyée par le favori est fidèle à sa page.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
