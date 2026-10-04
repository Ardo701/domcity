/** The "Create a city" page: installing the bookmarklet. */

import type { ReactNode } from "react";
import { formatCount } from "../format";
import { defineMessages } from "../locale";

interface CreateMessages {
  title: string;
  description: string;
  heroTitle: [string, string];
  heroLead: string;
  dropArrow: string;
  dropHint: ReactNode;
  buttonTitle: string;
  copy: { idle: string; done: string; refused: string };
  howTo: string;
  gesturesTitle: string;
  gestures: Array<{ title: string; text: string }>;
  transparency: string;
  readTitle: string;
  readLead: string;
  readColumn: string;
  read: string[];
  neverColumn: string;
  never: string[];
  refusedSites: string;
  adultPages: string;
  manualKicker: string;
  manualTitle: string;
  manualLead: string;
  manual: ReactNode[];
  limitsKicker: string;
  limitsTitle: string;
  limits: Array<{ title: string; text: (maxNodes: number) => ReactNode }>;
}

export const CREATE = defineMessages<CreateMessages>({
  en: {
    title: "Create a city",
    description:
      "The DOMCity bookmarklet captures any page you are looking at and builds it as a 3D city. Nothing to install: just a bookmark.",
    heroTitle: ["The whole web is", "buildable."],
    heroLead:
      "The bookmarklet captures the page you are looking at, as it is displayed for you, and sends it to DOMCity to build it. It fits in a simple bookmark: nothing to install, no permission to give.",
    dropArrow: "Drag this button into your bookmarks bar",
    dropHint: (
      <>
        Bar hidden? <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>B</kbd>, or <kbd>⌘</kbd> <kbd>Shift</kbd> <kbd>B</kbd> on Mac. A
        simple click tries the bookmarklet on this very page.
      </>
    ),
    buttonTitle: "Drag me into your bookmarks bar",
    copy: { idle: "Copy the bookmarklet code", done: "Code copied", refused: "Copy refused by the browser" },
    howTo: "How to",
    gesturesTitle: "Three gestures",
    gestures: [
      { title: "Drag", text: "Drag the DOMCity button into your browser's bookmarks bar. It stays there, ready to use." },
      { title: "Click", text: "On any website, click the DOMCity bookmark. It captures the page as it is displayed for you." },
      { title: "Visit", text: "The city opens in a new tab. Walk around, inspect, and publish it if you like." },
    ],
    transparency: "Transparency",
    readTitle: "What the bookmarklet captures",
    readLead:
      "The bookmarklet only reads the page, in your browser. Nothing from the page leaves your computer until you click “Publish”: DOMCity first shows you everything that will be sent. Opening “Share” only sends the name of the site, to tell you whether the page already has a recent city.",
    readColumn: "Captured",
    read: [
      "The structure of the page: the tags and how they nest",
      "How much text each element holds",
      "The text of the h1 to h3 headings, to engrave them on the monuments",
      "The addresses of the images",
      "The position and background color of the displayed elements",
      "The number of scripts and the third-party sites the page contacts",
      "The number of comments left in the HTML (never their text) and the broken images",
    ],
    neverColumn: "Never captured",
    never: [
      "The text of paragraphs, lists or tables",
      "What you type in forms",
      "Your cookies, passwords and sessions",
      "The address parameters (after ? or #)",
      "The hidden elements of the page",
    ],
    refusedSites: "Refused sites: DOMCity keeps nothing from them and makes no city of them",
    adultPages: "Any page that declares itself adults only",
    manualKicker: "Manual install",
    manualTitle: "On a phone",
    manualLead: "Or if your browser refuses dragging. The bookmarklet is a small program: its address is its code.",
    manual: [
      "Add any page to your bookmarks.",
      <>
        Edit that bookmark: name it <b>DOMCity</b> and replace its address with the copied code.
      </>,
      "On the page to capture, open your bookmarks and tap DOMCity. On Chrome for Android, type “DOMCity” in the address bar instead and pick the bookmark.",
    ],
    limitsKicker: "Good to know",
    limitsTitle: "The limits",
    limits: [
      {
        title: "Private pages",
        text: () =>
          "Behind a login, the bookmarklet sees what you see. It sends nothing on its own, but do not publish a mailbox or a customer account.",
      },
      {
        title: "Sites that isolate their windows",
        text: () =>
          "A few sites cut the link with the tabs they open. The city then opens in the same tab: the Back button takes you back to the page.",
      },
      {
        title: "Very large pages",
        text: (maxNodes) =>
          `The capture stops at ${formatCount(maxNodes, "en")} elements: beyond that, the city keeps the beginning of the page.`,
      },
      {
        title: "Refused sites",
        text: () =>
          "Adult or violent sites, banks, messaging, taxes, health, gambling, dangerous sites: DOMCity makes no city of them. Your browser checks on its own, with the list it downloads: nothing from the page is sent.",
      },
      {
        title: "Published cities",
        text: () =>
          "They carry the mention “captured by a visitor”: DOMCity cannot check that a city sent by the bookmarklet is faithful to its page.",
      },
    ],
  },
  fr: {
    title: "Créer une ville",
    description:
      "Le favori DOMCity relève n'importe quelle page que vous regardez et la construit en ville 3D. Rien à installer : un simple favori.",
    heroTitle: ["Tout le web est", "constructible."],
    heroLead:
      "Le favori relève la page que vous regardez, telle qu'elle s'affiche chez vous, et l'envoie à DOMCity pour la construire. Il tient dans un simple favori : rien à installer, aucune autorisation à donner.",
    dropArrow: "Glissez ce bouton dans votre barre de favoris",
    dropHint: (
      <>
        Barre masquée ? <kbd>Ctrl</kbd> <kbd>Maj</kbd> <kbd>B</kbd>, ou <kbd>⌘</kbd> <kbd>Maj</kbd> <kbd>B</kbd> sur Mac. Un
        simple clic essaie le favori sur cette page même.
      </>
    ),
    buttonTitle: "Glissez-moi dans votre barre de favoris",
    copy: { idle: "Copier le code du favori", done: "Code copié", refused: "Copie refusée par le navigateur" },
    howTo: "Mode d'emploi",
    gesturesTitle: "Trois gestes",
    gestures: [
      { title: "Glisser", text: "Glissez le bouton DOMCity dans la barre de favoris de votre navigateur. Il y reste, prêt à servir." },
      { title: "Cliquer", text: "Sur n'importe quel site, cliquez sur le favori DOMCity. Il relève la page telle qu'elle s'affiche chez vous." },
      { title: "Visiter", text: "La ville s'ouvre dans un nouvel onglet. Promenez-vous, inspectez, et publiez-la si vous le souhaitez." },
    ],
    transparency: "Transparence",
    readTitle: "Ce que le favori relève",
    readLead:
      "Le favori ne fait que lire la page, dans votre navigateur. Rien de la page ne quitte votre ordinateur tant que vous ne cliquez pas sur « Publier » : DOMCity vous montre d'abord tout ce qui partira. Ouvrir « Partager » n'envoie que le nom du site, pour vous dire si la page a déjà une ville récente.",
    readColumn: "Relevé",
    read: [
      "La structure de la page : les balises et leur imbrication",
      "La quantité de texte de chaque élément",
      "Le texte des titres h1 à h3, pour les graver sur les monuments",
      "Les adresses des images",
      "La position et la couleur de fond des éléments affichés",
      "Le nombre de scripts et les sites tiers contactés par la page",
      "Le nombre de commentaires laissés dans le HTML (jamais leur texte) et les images cassées",
    ],
    neverColumn: "Jamais relevé",
    never: [
      "Le texte des paragraphes, des listes ou des tableaux",
      "Ce que vous tapez dans les formulaires",
      "Vos cookies, vos mots de passe, vos sessions",
      "Les paramètres de l'adresse (après ? ou #)",
      "Les éléments masqués de la page",
    ],
    refusedSites: "Les sites refusés : DOMCity n'en garde rien et n'en fait pas de ville",
    adultPages: "Toute page qui se déclare réservée aux adultes",
    manualKicker: "Installation à la main",
    manualTitle: "Sur téléphone",
    manualLead: "Ou si votre navigateur refuse le glisser. Le favori est un petit programme : son adresse est son code.",
    manual: [
      "Ajoutez n'importe quelle page à vos favoris.",
      <>
        Modifiez ce favori : appelez-le <b>DOMCity</b> et remplacez son adresse par le code copié.
      </>,
      "Sur la page à relever, ouvrez vos favoris et touchez DOMCity. Sur Chrome pour Android, tapez plutôt « DOMCity » dans la barre d'adresse et choisissez le favori.",
    ],
    limitsKicker: "Bon à savoir",
    limitsTitle: "Les limites",
    limits: [
      {
        title: "Pages privées",
        text: () =>
          "Derrière une connexion, le favori voit ce que vous voyez. Il n'envoie rien seul, mais ne publiez pas une messagerie ou un compte client.",
      },
      {
        title: "Sites qui isolent leurs fenêtres",
        text: () =>
          "Quelques sites coupent le lien avec les onglets qu'ils ouvrent. La ville s'ouvre alors dans le même onglet : le bouton Retour vous ramène à la page.",
      },
      {
        title: "Très grandes pages",
        text: (maxNodes) =>
          `Le relevé s'arrête à ${formatCount(maxNodes, "fr")} éléments : au-delà, la ville garde le début de la page.`,
      },
      {
        title: "Sites refusés",
        text: () =>
          "Sites pour adultes ou violents, banques, messageries, impôts, santé, jeux d'argent, sites dangereux : DOMCity n'en fait pas de ville. Votre navigateur vérifie lui-même, avec la liste qu'il télécharge : rien de la page ne part.",
      },
      {
        title: "Villes publiées",
        text: () =>
          "Elles portent la mention « relevé par un visiteur » : DOMCity ne peut pas vérifier qu'une ville envoyée par le favori est fidèle à sa page.",
      },
    ],
  },
});
