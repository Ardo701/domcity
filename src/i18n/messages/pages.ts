/** Explore, the account, deleting a city: the site's secondary pages. */

import { longDate, plural } from "../format";
import { defineMessages } from "../locale";

export const EXPLORE = defineMessages({
  en: {
    title: "Explore the cities",
    description: "Web pages built as 3D cities and shared on DOMCity, filed by site: search for one, or browse the latest updated.",
    lead: "Each shared page has become a city, filed with the other pages of its site. Search for a site or a page, or browse the latest updated sites.",
    latest: "The latest updated sites",
    more: (n: number) => `The ${n} latest updated sites. For the others, search for them by name.`,
  },
  fr: {
    title: "Découvrir les villes",
    description: "Les pages web construites en villes 3D et partagées sur DOMCity, rangées par site : cherchez-en un, ou parcourez les derniers mis à jour.",
    lead: "Chaque page partagée est devenue une ville, rangée avec les autres pages de son site. Cherchez un site ou une page, ou parcourez les derniers sites mis à jour.",
    latest: "Les derniers sites mis à jour",
    more: (n: number) => `Les ${n} derniers sites mis à jour. Pour les autres, cherchez-les par leur nom.`,
  },
});

export const ACCOUNT = defineMessages({
  en: {
    title: "Your account",
    description: "The cities you published from this browser, with their secret deletion link.",
    lead: "No sign-up, no password: your account is this browser. DOMCity remembers in it the cities you publish, with the secret link that lets you delete them.",
    copy: { idle: "Copy the link", copied: "Link copied", failed: "Copy impossible" },
    published: (iso: string) => `Published ${longDate(iso, "en")}`,
    remove: "Delete",
    emptyTitle: "No city published from this browser.",
    emptyText:
      "Capture a page with the bookmarklet, then click “Publish”: the city will appear here, with the link that lets you delete it.",
    create: "Create a city",
    heading: "Your published cities",
    count: (n: number) => plural("en", n, "city", "cities"),
    note:
      "These cities are only kept in this browser. Another browser, a private window or clearing the site's data do not know them, and their secret link would be lost. For a city you may want to delete one day, open “Delete” and keep the address of that page: it is its secret link.",
  },
  fr: {
    title: "Votre compte",
    description: "Les villes que vous avez publiées depuis ce navigateur, avec leur lien secret de suppression.",
    lead: "Ni inscription ni mot de passe : votre compte, c'est ce navigateur. DOMCity s'y souvient des villes que vous publiez, avec le lien secret qui permet de les supprimer.",
    copy: { idle: "Copier le lien", copied: "Lien copié", failed: "Copie impossible" },
    published: (iso: string) => `Publiée le ${longDate(iso, "fr")}`,
    remove: "Supprimer",
    emptyTitle: "Aucune ville publiée depuis ce navigateur.",
    emptyText:
      "Relevez une page avec le favori, puis cliquez sur « Publier » : la ville apparaîtra ici, avec le lien qui permet de la supprimer.",
    create: "Créer une ville",
    heading: "Vos villes publiées",
    count: (n: number) => plural("fr", n, "ville", "villes"),
    note:
      "Ces villes ne sont gardées que dans ce navigateur. Un autre navigateur, une navigation privée ou l'effacement des données du site ne les connaissent pas, et leur lien secret serait perdu. Pour une ville que vous voudrez peut-être supprimer un jour, ouvrez « Supprimer » et gardez l'adresse de cette page : c'est son lien secret.",
  },
});

export const DELETE = defineMessages({
  en: {
    title: "Delete a city",
    kicker: "Secret link",
    failed: "Deletion failed.",
    offline: "Cannot connect. Try again in a moment.",
    done: "The city has been deleted, with its files. Its public link no longer leads anywhere.",
    home: "Back to the home page",
    incomplete:
      "This link is incomplete: the secret token is missing, the part after the “#”. Use the full deletion link you received when you shared.",
    confirmNamed: "You are about to delete the city",
    confirm: "You are about to delete this city.",
    quoted: (title: string) => `“${title}”`,
    final: "Its public link will stop working. This is final.",
    deleting: "Deleting…",
    submit: "Delete for good",
    cancel: "Cancel",
  },
  fr: {
    title: "Supprimer une ville",
    kicker: "Lien secret",
    failed: "La suppression a échoué.",
    offline: "Connexion impossible. Réessayez dans un instant.",
    done: "La ville a été supprimée, avec ses fichiers. Son lien public ne mène plus nulle part.",
    home: "Retour à l'accueil",
    incomplete:
      "Ce lien est incomplet : il manque le jeton secret, la partie après le « # ». Utilisez le lien de suppression complet reçu au moment du partage.",
    confirmNamed: "Vous allez supprimer la ville",
    confirm: "Vous allez supprimer cette ville.",
    quoted: (title: string) => `« ${title} »`,
    final: "Son lien public cessera de fonctionner. C'est définitif.",
    deleting: "Suppression…",
    submit: "Supprimer définitivement",
    cancel: "Annuler",
  },
});
