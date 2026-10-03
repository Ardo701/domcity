import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/ui/LegalPage";
import { PUBLISHER } from "@/ui/publisher";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Ce que DOMCity lit, ce qu'il garde, ce qu'il ne garde jamais, et vos droits.",
};

export default function PrivacyPage() {
  const contact = PUBLISHER.email ? (
    <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
  ) : (
    <Fill value="" missing="adresse e-mail de contact" />
  );
  return (
    <LegalPage
      title="Confidentialité"
      lead="DOMCity garde le moins possible : pas de compte, pas de cookie de suivi, pas de publicité, pas de mesure d'audience."
    >
      <h2>Responsable</h2>
      <p>
        Le responsable du traitement est l&apos;éditeur du site : <Fill value={PUBLISHER.name} missing="nom" />,
        joignable à {contact}. Voir aussi les <Link href="/legal">mentions légales</Link>.
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
        ni les paramètres de l&apos;adresse. Le détail est sur la page <Link href="/create#releve">Créer une ville</Link>.
      </p>

      <h2>Ce qui reste dans votre navigateur</h2>
      <p>Tant que vous ne publiez pas, rien ne quitte votre navigateur. Il garde :</p>
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
        DOMCity ne dépose aucun cookie. Il n&apos;utilise que le stockage de votre navigateur, pour son fonctionnement
        (votre compte, vos réglages) ; vous pouvez l&apos;effacer à tout moment dans les réglages du navigateur. En cas
        d&apos;attaque contre le site, le pare-feu de l&apos;hébergeur peut déposer un cookie technique pour vérifier
        que vous n&apos;êtes pas un robot.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l&apos;accès, la rectification ou l&apos;effacement de vos données, ou vous opposer à leur
        traitement, en écrivant à {contact}. Une ville se supprime directement avec son lien secret. Comme il n&apos;y a
        pas de compte, DOMCity ne peut pas savoir sans ce lien qu&apos;une ville est à vous : joignez à votre demande
        tout ce qui le montre.
      </p>
      <p>
        Vous pouvez aussi adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
          cnil.fr
        </a>
        ).
      </p>
    </LegalPage>
  );
}
