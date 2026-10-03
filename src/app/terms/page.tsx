import type { Metadata } from "next";
import Link from "next/link";
import { Fill, LegalPage } from "@/ui/LegalPage";
import { PUBLISHER } from "@/ui/publisher";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les règles pour relever, publier et supprimer une ville sur DOMCity.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      lead="DOMCity est gratuit et sans inscription. En l'utilisant, vous acceptez ces règles, écrites pour être lues."
    >
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
          Les sites pour adultes ne deviennent pas des villes : DOMCity en refuse une liste, ainsi que toute page qui se
          déclare réservée aux adultes, et n&apos;affiche jamais les images de ces sites.
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
      <p>
        Contact :{" "}
        {PUBLISHER.email ? (
          <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
        ) : (
          <Fill value="" missing="adresse e-mail de contact" />
        )}
        .
      </p>
    </LegalPage>
  );
}
