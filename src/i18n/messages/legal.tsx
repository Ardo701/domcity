/** The legal notice: who publishes DOMCity, who hosts it, who owns what. */

import Link from "next/link";
import type { ReactNode } from "react";
import { REPO_URL } from "@/ui/GithubLink";
import { Fill } from "@/ui/LegalPage";
import { PUBLISHER } from "@/ui/publisher";
import { defineMessages } from "../locale";

export interface LegalText {
  title: string;
  description: string;
  lead?: string;
  body: ReactNode;
}

const email = (missing: string) =>
  PUBLISHER.email ? <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a> : <Fill value="" missing={missing} />;

export const NOTICE = defineMessages<LegalText>({
  en: {
    title: "Legal notice",
    description: "Who publishes DOMCity, who hosts it, and who owns what.",
    body: (
      <>
        <h2>Publisher</h2>
        <p>The website domcity.app (“DOMCity”) is published by:</p>
        <dl>
          <dt>Publisher</dt>
          <dd>
            <Fill value={PUBLISHER.name} missing="full name, or company name" />
          </dd>
          <dt>Status</dt>
          <dd>
            <Fill value={PUBLISHER.status} missing="private individual, sole trader (SIRET), company (RCS)…" />
          </dd>
          <dt>Address</dt>
          <dd>
            <Fill value={PUBLISHER.address} missing="postal address" />
          </dd>
          <dt>Contact</dt>
          <dd>{email("contact email address")}</dd>
          <dt>Publication</dt>
          <dd>
            Publication director: <Fill value={PUBLISHER.director} missing="name" />
          </dd>
        </dl>

        <h2>Hosting</h2>
        <p>
          <strong>The website</strong> is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States
          (vercel.com).
        </p>
        <p>
          <strong>The city files</strong> (plans and thumbnails) are stored by Cloudflare, Inc., 101 Townsend St, San
          Francisco, CA 94107, United States (R2 service, cloudflare.com).
        </p>
        <p>
          <strong>The database</strong> (list of cities, versions, reports) is hosted by Supabase, Inc. (supabase.com).
        </p>

        <h2>Who owns what</h2>
        <p>
          A city is a representation computed automatically from the structure of a web page. The captured pages, their
          headings and their images remain the property of their authors. The images shown in a city are loaded from
          their original site: DOMCity keeps no copy of them.
        </p>
        <p>
          The DOMCity code is published on{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          under the MIT license: anyone can reuse and modify it, including for commercial purposes, as long as the
          author&apos;s notice is kept. It does not give the right to use the DOMCity name, its logo or its visual identity
          to designate another site: they belong to its publisher.
        </p>

        <h2>Reporting content</h2>
        <p>
          Each published city has a “Report” button. You can also write to the contact address above, giving the
          address of the city. The publishing rules are in the <Link href="/terms">terms of use</Link>.
        </p>

        <h2>Credits</h2>
        <ul>
          <li>3D rendering: Three.js (MIT license).</li>
          <li>Typefaces: Big Shoulders, Instrument Sans and Martian Mono (SIL Open Font License), served by DOMCity.</li>
          <li>
            Cities built from Wikipedia articles: the titles of the articles and of their sections are reused under the
            CC BY-SA 4.0 license, and each city links back to its article.
          </li>
        </ul>
      </>
    ),
  },
  fr: {
    title: "Mentions légales",
    description: "Qui édite DOMCity, qui l'héberge, et à qui appartient quoi.",
    body: (
      <>
        <h2>Éditeur</h2>
        <p>Le site domcity.app (« DOMCity ») est édité par :</p>
        <dl>
          <dt>Éditeur</dt>
          <dd>
            <Fill value={PUBLISHER.name} missing="nom et prénom, ou raison sociale" />
          </dd>
          <dt>Statut</dt>
          <dd>
            <Fill value={PUBLISHER.status} missing="particulier, entreprise individuelle (SIRET), société (RCS)…" />
          </dd>
          <dt>Adresse</dt>
          <dd>
            <Fill value={PUBLISHER.address} missing="adresse postale" />
          </dd>
          <dt>Contact</dt>
          <dd>{email("adresse e-mail de contact")}</dd>
          <dt>Publication</dt>
          <dd>
            Directeur ou directrice de la publication : <Fill value={PUBLISHER.director} missing="nom" />
          </dd>
        </dl>

        <h2>Hébergement</h2>
        <p>
          <strong>Le site</strong> est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          (vercel.com).
        </p>
        <p>
          <strong>Les fichiers des villes</strong> (plans et miniatures) sont stockés par Cloudflare, Inc., 101 Townsend
          St, San Francisco, CA 94107, États-Unis (service R2, cloudflare.com).
        </p>
        <p>
          <strong>La base de données</strong> (liste des villes, versions, signalements) est hébergée par Supabase, Inc.
          (supabase.com).
        </p>

        <h2>Ce qui appartient à qui</h2>
        <p>
          Une ville est une représentation calculée automatiquement à partir de la structure d&apos;une page web. Les
          pages relevées, leurs titres et leurs images restent la propriété de leurs auteurs. Les images affichées dans
          une ville sont chargées depuis leur site d&apos;origine : DOMCity n&apos;en garde aucune copie.
        </p>
        <p>
          Le code de DOMCity est publié sur{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>{" "}
          sous licence MIT : chacun peut le reprendre et le modifier, y compris à des fins commerciales, en gardant la
          mention de son auteur. Elle ne donne pas le droit d&apos;utiliser le nom DOMCity, son logo ou son identité
          visuelle pour désigner un autre site : ils appartiennent à son éditeur.
        </p>

        <h2>Signaler un contenu</h2>
        <p>
          Chaque ville publiée a un bouton « Signaler ». Vous pouvez aussi écrire à l&apos;adresse de contact ci-dessus en
          indiquant l&apos;adresse de la ville. Les règles de publication sont dans les{" "}
          <Link href="/terms">conditions d&apos;utilisation</Link>.
        </p>

        <h2>Crédits</h2>
        <ul>
          <li>Rendu 3D : Three.js (licence MIT).</li>
          <li>Polices : Big Shoulders, Instrument Sans et Martian Mono (SIL Open Font License), servies par DOMCity.</li>
          <li>
            Villes construites à partir d&apos;articles de Wikipédia : les titres des articles et de leurs sections sont
            repris sous licence CC BY-SA 4.0, et chaque ville renvoie à son article.
          </li>
        </ul>
      </>
    ),
  },
});

export const TERMS = defineMessages<LegalText>({
  en: {
    title: "Terms of use",
    description: "The rules for capturing, publishing and deleting a city on DOMCity.",
    lead: "DOMCity is free and needs no sign-up. By using it, you accept these rules, written to be read.",
    body: (
      <>
        <h2>The service</h2>
        <p>
          DOMCity captures the structure of a web page (its tags, how much text, its headings, its images) and builds it
          as a 3D city. The capture happens in your browser, with the DOMCity bookmarklet. The city is only published if
          you click “Publish”.
        </p>

        <h2>Publishing a city</h2>
        <p>A published city is public: anyone can see it, find it through the search and share it.</p>
        <ul>
          <li>
            Only publish pages you have the right to make public. No private page: mailbox, personal account, intranet,
            confidential document.
          </li>
          <li>
            Published with the city: the address of the page (without its parameters), its title, the headings of its
            sections (h1 to h3), the addresses of its images and the list of sites it links to. Check them in the preview
            before publishing.
          </li>
          <li>Local pages, or pages of an internal network, cannot be published.</li>
          <li>
            Some sites do not become cities: adult or violent sites, banks and financial services, messaging and other
            pages of personal data (taxes, health, accounts), gambling, dangerous sites. DOMCity keeps a list of them,
            also refuses any page that declares itself adults only, and never shows the images of these sites.
          </li>
        </ul>

        <h2>What is forbidden</h2>
        <ul>
          <li>Publishing an unlawful, hateful, violent or pornographic page, or one that infringes the rights of others.</li>
          <li>Publishing another person&apos;s personal data, for example in the title of a city.</li>
          <li>
            Getting around the limits of the service (number of publications per hour, size of the cities), sending
            cities in bulk with a program, or trying to disrupt the site.
          </li>
        </ul>

        <h2>Deleting a city</h2>
        <p>
          When you publish, you receive a secret deletion link. Your browser keeps it in <Link href="/account">your
          account</Link>, and you can copy it to keep it elsewhere. As there is no sign-up, this link is the only proof
          that a city is yours: without it, write to the publisher (see the <Link href="/legal">legal notice</Link>)
          explaining your request.
        </p>

        <h2>Reports and removals</h2>
        <p>
          Each city can be reported. After three reports from different people, it is hidden automatically, pending
          review. The publisher may remove, without notice, any city contrary to these terms or to the law.
        </p>

        <h2>Availability and liability</h2>
        <p>
          DOMCity is provided as is, without warranty. The service may change, be interrupted or stop. The rendering of
          the cities changes with the engine: a city is recomputed on each visit from its capture.
        </p>
        <p>
          DOMCity is not responsible for the content of the captured pages, nor for the images loaded from their original
          site. Each person who publishes a city is responsible for what they publish.
        </p>

        <h2>Changes and governing law</h2>
        <p>
          These terms may change; the date of the last update is at the top of this page. They are governed by French
          law. In the event of a dispute, and failing an amicable agreement, the French courts have jurisdiction.
        </p>
        <p>Contact: {email("contact email address")}.</p>
      </>
    ),
  },
  fr: {
    title: "Conditions d'utilisation",
    description: "Les règles pour relever, publier et supprimer une ville sur DOMCity.",
    lead: "DOMCity est gratuit et sans inscription. En l'utilisant, vous acceptez ces règles, écrites pour être lues.",
    body: (
      <>
        <h2>Le service</h2>
        <p>
          DOMCity relève la structure d&apos;une page web (ses balises, la quantité de texte, ses titres, ses images) et
          la construit en ville 3D. Le relevé se fait dans votre navigateur, avec le favori DOMCity. La ville
          n&apos;est publiée que si vous cliquez sur « Publier ».
        </p>

        <h2>Publier une ville</h2>
        <p>Une ville publiée est publique : tout le monde peut la voir, la trouver par la recherche et la partager.</p>
        <ul>
          <li>
            Ne publiez que des pages que vous avez le droit de rendre publiques. Pas de page privée : messagerie, compte
            personnel, intranet, document confidentiel.
          </li>
          <li>
            Sont publiés avec la ville : l&apos;adresse de la page (sans ses paramètres), son titre, les titres de ses
            sections (h1 à h3), les adresses de ses images et la liste des sites vers lesquels elle pointe. Vérifiez-les
            dans l&apos;aperçu avant de publier.
          </li>
          <li>Les pages locales ou d&apos;un réseau interne ne peuvent pas être publiées.</li>
          <li>
            Certains sites ne deviennent pas des villes : sites pour adultes ou violents, banques et services financiers,
            messageries et autres pages de données personnelles (impôts, santé, comptes), jeux d&apos;argent, sites
            dangereux. DOMCity en tient une liste, refuse aussi toute page qui se déclare réservée aux adultes, et
            n&apos;affiche jamais les images de ces sites.
          </li>
        </ul>

        <h2>Ce qui est interdit</h2>
        <ul>
          <li>Publier une page illicite, haineuse, violente ou pornographique, ou qui porte atteinte aux droits d&apos;autrui.</li>
          <li>Publier les données personnelles d&apos;une autre personne, par exemple dans le titre d&apos;une ville.</li>
          <li>
            Contourner les limites du service (nombre de publications par heure, taille des villes), envoyer des villes
            en masse par un programme, ou chercher à perturber le site.
          </li>
        </ul>

        <h2>Supprimer une ville</h2>
        <p>
          Au moment de publier, vous recevez un lien secret de suppression. Votre navigateur le garde dans{" "}
          <Link href="/account">votre compte</Link>, et vous pouvez le copier pour le conserver ailleurs. Comme il
          n&apos;y a pas d&apos;inscription, ce lien est la seule preuve qu&apos;une ville est à vous : sans lui,
          écrivez à l&apos;éditeur (voir les <Link href="/legal">mentions légales</Link>) en expliquant votre demande.
        </p>

        <h2>Signalements et retraits</h2>
        <p>
          Chaque ville peut être signalée. Après trois signalements de personnes différentes, elle est masquée
          automatiquement, en attendant d&apos;être examinée. L&apos;éditeur peut retirer, sans préavis, toute ville
          contraire à ces conditions ou à la loi.
        </p>

        <h2>Disponibilité et responsabilité</h2>
        <p>
          DOMCity est fourni tel quel, sans garantie. Le service peut évoluer, s&apos;interrompre ou s&apos;arrêter. Le
          rendu des villes change avec le moteur : une ville est recalculée à chaque visite à partir de son relevé.
        </p>
        <p>
          DOMCity ne répond pas du contenu des pages relevées ni des images chargées depuis leur site d&apos;origine.
          Chaque personne qui publie une ville répond de ce qu&apos;elle publie.
        </p>

        <h2>Modifications et droit applicable</h2>
        <p>
          Ces conditions peuvent changer ; la date de mise à jour figure en haut de cette page. Elles sont régies par le
          droit français. En cas de litige, et à défaut d&apos;accord amiable, les tribunaux français sont compétents.
        </p>
        <p>Contact : {email("adresse e-mail de contact")}.</p>
      </>
    ),
  },
});

export const PRIVACY = defineMessages<LegalText>({
  en: {
    title: "Privacy",
    description: "What DOMCity reads, what it keeps, what it never keeps, and your rights.",
    lead: "DOMCity keeps as little as possible: no account, no tracking cookie, no advertising, no audience measurement.",
    body: (
      <>
        <h2>Controller</h2>
        <p>
          The data controller is the publisher of the site: <Fill value={PUBLISHER.name} missing="name" />, reachable at{" "}
          {email("contact email address")}. See also the <Link href="/legal">legal notice</Link>.
        </p>

        <h2>What the bookmarklet reads</h2>
        <p>
          When you click the bookmarklet, it reads in your browser the structure of the displayed page: the tags, how much
          text each element holds (never the text itself), the text of the h1 to h3 headings, the addresses of the images,
          the position and background color of the elements, the number of scripts and the third-party sites contacted,
          and whether the page declares itself adults only (DOMCity then makes no city of it).
        </p>
        <p>
          It never reads the text of paragraphs, what you type in forms, your cookies, your passwords or the address
          parameters. The details are on the <Link href="/create#captured">Create a city</Link> page.
        </p>
        <p>
          To know whether a site is refused (adult sites, banks, messaging…), your browser downloads the whole list of
          refused sites and checks on its own: DOMCity does not learn which page you capture.
        </p>
        <p>
          When you open “Share”, your browser asks DOMCity which pages of the site were published less than 30 days ago,
          to warn you before you publish a new version. It only sends the name of the site (example.org), never the
          address of the page: it looks for the page among the answers itself.
        </p>

        <h2>What stays in your browser</h2>
        <p>Apart from that, nothing leaves your browser as long as you do not publish. It keeps:</p>
        <ul>
          <li>the current capture, for the session (it disappears when you close the tab);</li>
          <li>
            the list of the cities you published and their secret links (<Link href="/account">your account</Link>), which
            are never sent to DOMCity;
          </li>
          <li>a few display settings, and a mark per visited city so that your visit is only counted once.</li>
        </ul>

        <h2>What DOMCity keeps when you publish</h2>
        <ul>
          <li>
            The city: the structure captured above, the address of the page without its parameters, its title, the date of
            the capture, and a thumbnail of the city (an image of the model, not of the page).
          </li>
          <li>
            The links of the page: the outside sites it links to, in clear, and the pages of the same site as a fingerprint
            only (a private path cannot be read).
          </li>
          <li>The fingerprint of your secret link (SHA-256), never the link itself.</li>
        </ul>
        <p>
          All of this is public, except the fingerprint of the secret link. A city is kept until you delete it with its
          secret link, or until it is removed.
        </p>

        <h2>Your IP address</h2>
        <p>
          DOMCity never keeps your IP address in clear. To limit the number of publications per hour and to accept only
          one report per person, it keeps a salted fingerprint of it (SHA-256), from which it cannot be recovered. The
          fingerprints used for the limits only count for an hour, then are erased by an automatic cleanup; that of a
          report is kept with it, as long as the city exists.
        </p>
        <p>
          The site&apos;s host, like any host, keeps technical logs (IP address, page requested, date) for security, for a
          limited period that it sets.
        </p>

        <h2>Reports and visits</h2>
        <p>
          A report keeps its reason, the details you choose to write, and the fingerprint of your IP address. The number
          of visits of a city is only a counter: nothing is kept about the visitor.
        </p>

        <h2>What other sites see</h2>
        <ul>
          <li>
            When you visit a city, your browser loads its images from their original site, which then sees your IP
            address, as during a visit of the page itself.
          </li>
          <li>When you build a city from a Wikipedia article, your browser reads the article directly from Wikipedia.</li>
          <li>The site&apos;s typefaces are served by DOMCity: no call to a font service.</li>
        </ul>

        <h2>Service providers</h2>
        <p>
          Vercel (hosting of the site), Supabase (database) and Cloudflare (storage of the city files). Some are located in
          the United States; these transfers are governed by the European Commission&apos;s standard contractual clauses or
          by the EU-US Data Privacy Framework.
        </p>

        <h2>Why</h2>
        <ul>
          <li>Publishing, displaying and deleting a city: it is the service you ask for.</li>
          <li>IP address fingerprints, reports, logs: the legitimate interest of protecting the site from abuse.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          DOMCity sets a single cookie, and only when you choose a language with the switcher (or open an address that
          names one, such as domcity.app/fr): it remembers that choice for a year, and nothing else. Otherwise, it only
          uses your browser&apos;s storage, for its own operation (your account, your settings); you can clear it at any
          time in the browser&apos;s settings. During an attack on the site, the host&apos;s firewall may set a technical
          cookie to check that you are not a robot.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask for access to, correction or erasure of your data, or object to its processing, by writing to{" "}
          {email("contact email address")}. A city is deleted directly with its secret link. As there is no account,
          DOMCity cannot know without this link that a city is yours: attach to your request anything that shows it.
        </p>
        <p>
          You can also lodge a complaint with the CNIL, the French data protection authority (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </>
    ),
  },
  fr: {
    title: "Confidentialité",
    description: "Ce que DOMCity lit, ce qu'il garde, ce qu'il ne garde jamais, et vos droits.",
    lead: "DOMCity garde le moins possible : pas de compte, pas de cookie de suivi, pas de publicité, pas de mesure d'audience.",
    body: (
      <>
        <h2>Responsable</h2>
        <p>
          Le responsable du traitement est l&apos;éditeur du site : <Fill value={PUBLISHER.name} missing="nom" />,
          joignable à {email("adresse e-mail de contact")}. Voir aussi les <Link href="/legal">mentions légales</Link>.
        </p>

        <h2>Ce que le favori lit</h2>
        <p>
          Quand vous cliquez sur le favori, il lit dans votre navigateur la structure de la page affichée : les balises,
          la quantité de texte de chaque élément (jamais le texte lui-même), le texte des titres h1 à h3, les adresses des
          images, la position et la couleur de fond des éléments, le nombre de scripts et les sites tiers contactés, et si
          la page se déclare réservée aux adultes (DOMCity n&apos;en fait alors pas de ville).
        </p>
        <p>
          Il ne lit jamais le texte des paragraphes, ce que vous tapez dans les formulaires, vos cookies, vos mots de passe
          ni les paramètres de l&apos;adresse. Le détail est sur la page <Link href="/create#captured">Créer une ville</Link>.
        </p>
        <p>
          Pour savoir si un site est refusé (sites pour adultes, banques, messageries…), votre navigateur télécharge la
          liste entière des sites refusés et vérifie lui-même : DOMCity n&apos;apprend pas quelle page vous relevez.
        </p>
        <p>
          Quand vous ouvrez « Partager », votre navigateur demande à DOMCity quelles pages du site ont été publiées il y a
          moins de 30 jours, pour vous prévenir avant de publier une nouvelle version. Il n&apos;envoie que le nom du site
          (exemple.org), jamais l&apos;adresse de la page : il cherche lui-même la page parmi les réponses.
        </p>

        <h2>Ce qui reste dans votre navigateur</h2>
        <p>À part cela, tant que vous ne publiez pas, rien ne quitte votre navigateur. Il garde :</p>
        <ul>
          <li>le relevé en cours, le temps de la session (il disparaît quand vous fermez l&apos;onglet) ;</li>
          <li>
            la liste des villes que vous avez publiées et leurs liens secrets (<Link href="/account">votre compte</Link>),
            qui ne sont jamais envoyés à DOMCity ;
          </li>
          <li>quelques réglages d&apos;affichage, et une marque par ville visitée pour ne compter votre visite qu&apos;une fois.</li>
        </ul>

        <h2>Ce que DOMCity garde quand vous publiez</h2>
        <ul>
          <li>
            La ville : la structure relevée ci-dessus, l&apos;adresse de la page sans ses paramètres, son titre, la date du
            relevé, et une miniature de la ville (une image de la maquette, pas de la page).
          </li>
          <li>
            Les liens de la page : les sites extérieurs vers lesquels elle pointe, en clair, et les pages du même site sous
            forme d&apos;empreinte seulement (un chemin privé ne se lit pas).
          </li>
          <li>L&apos;empreinte de votre lien secret (SHA-256), jamais le lien lui-même.</li>
        </ul>
        <p>
          Tout cela est public, sauf l&apos;empreinte du lien secret. Une ville est gardée jusqu&apos;à ce que vous la
          supprimiez avec son lien secret, ou qu&apos;elle soit retirée.
        </p>

        <h2>Votre adresse IP</h2>
        <p>
          DOMCity ne garde jamais votre adresse IP en clair. Pour limiter le nombre de publications par heure et
          n&apos;accepter qu&apos;un signalement par personne, il en garde une empreinte salée (SHA-256), qui ne permet
          pas de la retrouver. Les empreintes qui servent aux limites ne comptent qu&apos;une heure, puis sont effacées
          par un nettoyage automatique ; celle d&apos;un signalement est gardée avec lui, tant que la ville existe.
        </p>
        <p>
          L&apos;hébergeur du site tient, comme tout hébergeur, des journaux techniques (adresse IP, page demandée, date)
          pour la sécurité, pendant une durée limitée qu&apos;il fixe.
        </p>

        <h2>Signalements et visites</h2>
        <p>
          Un signalement garde son motif, les précisions que vous choisissez d&apos;écrire, et l&apos;empreinte de votre
          adresse IP. Le nombre de visites d&apos;une ville n&apos;est qu&apos;un compteur : rien n&apos;est gardé sur le
          visiteur.
        </p>

        <h2>Ce que voient d&apos;autres sites</h2>
        <ul>
          <li>
            En visitant une ville, votre navigateur charge ses images depuis leur site d&apos;origine, qui voit alors votre
            adresse IP, comme lors d&apos;une visite de la page elle-même.
          </li>
          <li>
            Quand vous construisez une ville à partir d&apos;un article de Wikipédia, votre navigateur lit l&apos;article
            directement chez Wikipédia.
          </li>
          <li>Les polices du site sont servies par DOMCity : aucun appel à un service de polices.</li>
        </ul>

        <h2>Prestataires</h2>
        <p>
          Vercel (hébergement du site), Supabase (base de données) et Cloudflare (stockage des fichiers des villes).
          Certains sont situés aux États-Unis ; ces transferts sont encadrés par les clauses contractuelles types de la
          Commission européenne ou par le cadre de protection des données entre l&apos;Union européenne et les États-Unis.
        </p>

        <h2>Pourquoi</h2>
        <ul>
          <li>Publier, afficher et supprimer une ville : c&apos;est le service que vous demandez.</li>
          <li>Empreintes d&apos;adresses IP, signalements, journaux : l&apos;intérêt légitime de protéger le site des abus.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          DOMCity ne dépose qu&apos;un cookie, et seulement si vous choisissez une langue avec le sélecteur (ou ouvrez une
          adresse qui en nomme une, comme domcity.app/fr) : il retient ce choix pendant un an, rien d&apos;autre. Pour le
          reste, il n&apos;utilise que le stockage de votre navigateur, pour son fonctionnement (votre compte, vos
          réglages) ; vous pouvez l&apos;effacer à tout moment dans les réglages du navigateur. En cas d&apos;attaque contre
          le site, le pare-feu de l&apos;hébergeur peut déposer un cookie technique pour vérifier que vous n&apos;êtes pas
          un robot.
        </p>

        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l&apos;accès, la rectification ou l&apos;effacement de vos données, ou vous opposer à leur
          traitement, en écrivant à {email("adresse e-mail de contact")}. Une ville se supprime directement avec son lien
          secret. Comme il n&apos;y a pas de compte, DOMCity ne peut pas savoir sans ce lien qu&apos;une ville est à vous :
          joignez à votre demande tout ce qui le montre.
        </p>
        <p>
          Vous pouvez aussi adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </>
    ),
  },
});
