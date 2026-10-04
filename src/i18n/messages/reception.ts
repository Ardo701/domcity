/** /new: receiving the city sent by the bookmarklet. */

import type { ReceiveErrorCode } from "@/ui/receiveCity";
import { defineMessages } from "../locale";

export const RECEPTION = defineMessages<{
  title: string;
  description: string;
  waiting: string;
  waitingText: string;
  /** A refused site takes its reason from REFUSAL. */
  errors: Record<ReceiveErrorCode, { title: string; message: string }>;
  home: string;
  install: string;
}>({
  en: {
    title: "New city",
    description: "The city of a page captured with the DOMCity bookmarklet.",
    waiting: "Receiving the capture",
    waitingText: "The original page is sending its structure to DOMCity.",
    errors: {
      refused: { title: "Refused site", message: "" },
      unreadableHash: {
        title: "Unreadable capture",
        message: "The address of this page is incomplete or damaged. Run the bookmarklet again from the page to capture.",
      },
      nothing: {
        title: "No capture received",
        message: "This page receives the cities sent by the DOMCity bookmarklet. Open the page to capture, then click the bookmark.",
      },
      foreign: { title: "Capture refused", message: "This city does not come from the page it claims to describe." },
      timeout: {
        title: "The capture did not arrive",
        message: "The original page no longer answers: it may have been closed or reloaded. Run the bookmarklet again from that page.",
      },
      invalid: {
        title: "Unreadable capture",
        message: "The city received does not follow the DOMCity format. Reinstall the bookmarklet, then try again.",
      },
      unknown: { title: "Unreadable capture", message: "The city received could not be read. Run the bookmarklet again." },
    },
    home: "Back to the home page",
    install: "Install the bookmarklet",
  },
  fr: {
    title: "Nouvelle ville",
    description: "La ville d'une page relevée avec le favori DOMCity.",
    waiting: "Réception du relevé",
    waitingText: "La page d'origine envoie sa structure à DOMCity.",
    errors: {
      refused: { title: "Site refusé", message: "" },
      unreadableHash: {
        title: "Relevé illisible",
        message: "L'adresse de cette page est incomplète ou abîmée. Relancez le favori depuis la page à relever.",
      },
      nothing: {
        title: "Aucun relevé reçu",
        message: "Cette page reçoit les villes envoyées par le favori DOMCity. Ouvrez la page à relever, puis cliquez sur le favori.",
      },
      foreign: { title: "Relevé refusé", message: "Cette ville ne vient pas de la page qu'elle prétend décrire." },
      timeout: {
        title: "Le relevé n'est pas arrivé",
        message: "La page d'origine ne répond plus : elle a peut-être été fermée ou rechargée. Relancez le favori depuis cette page.",
      },
      invalid: {
        title: "Relevé illisible",
        message: "La ville reçue ne suit pas le format de DOMCity. Réinstallez le favori, puis réessayez.",
      },
      unknown: { title: "Relevé illisible", message: "La ville reçue n'a pas pu être lue. Relancez le favori." },
    },
    home: "Retour à l'accueil",
    install: "Installer le favori",
  },
});
