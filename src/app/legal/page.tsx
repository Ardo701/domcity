import type { Metadata } from "next";
import Link from "next/link";
import { REPO_URL } from "@/ui/GithubLink";
import { Fill, LegalPage } from "@/ui/LegalPage";
import { PUBLISHER } from "@/ui/publisher";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Qui édite DOMCity, qui l'héberge, et à qui appartient quoi.",
};

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales">
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
        <dd>
          {PUBLISHER.email ? (
            <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>
          ) : (
            <Fill value="" missing="adresse e-mail de contact" />
          )}
        </dd>
        <dt>Publication</dt>
        <dd>
          Directeur ou directrice de la publication :{" "}
          <Fill value={PUBLISHER.director} missing="nom" />
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
    </LegalPage>
  );
}
