/** The errors the API sends back to the visitor (sharing, deletion, reports). */

import type { ShareErrorCode } from "@/server/share";
import { longDate } from "../format";
import { defineMessages } from "../locale";

export const API = defineMessages<{
  notConfigured: string;
  forbidden: string;
  unreadable: string;
  cityNotFound: string;
  /** A refused site ("refused") takes its reason from REFUSAL. */
  share: Record<Exclude<ShareErrorCode, "refused">, (detail?: string) => string> & {
    tooMany: string;
    badArticle: string;
    missingCity: string;
    badSource: string;
    unknownSource: string;
    failed: string;
    /** The page has a version less than 30 days old (the panel shows its own text, this goes with the answer). */
    recentVersion: (date: string) => string;
  };
  remove: { badLink: string; tooMany: string; alreadyGone: string; failed: string };
  report: { badReason: string; tooMany: string; failed: string };
}>({
  en: {
    notConfigured: "Sharing is not configured yet.",
    forbidden: "Request refused.",
    unreadable: "Unreadable request.",
    cityNotFound: "City not found.",
    share: {
      tooMany: "Too many shares at once. Try again in an hour.",
      badArticle: "Invalid article.",
      missingCity: "Missing city.",
      badSource: "Inconsistent source.",
      unknownSource: "Unknown source.",
      failed: "Sharing failed. Try again in a moment.",
      notConfigured: () => "Sharing is not configured.",
      cityTooHeavy: () => "The city is too heavy.",
      cityUnreadable: () => "Unreadable city file.",
      cityInvalid: (detail) => `Invalid city (${detail}).`,
      thumbTooHeavy: () => "The thumbnail is too heavy.",
      thumbNotJpeg: () => "The thumbnail must be a JPEG.",
      thumbSize: (detail) => `The thumbnail must be ${detail} pixels.`,
      badAddress: () => "Invalid page address.",
      localPage: () => "Local or intranet pages cannot be shared.",
      addressTooLong: () => "The page address is too long.",
      blockedDomain: () => "This site is on the list of sites refused by DOMCity.",
      recentVersion: (date) =>
        `This page already has a city, published on ${longDate(date, "en")}. Confirm to publish a new version.`,
    },
    remove: {
      badLink: "Invalid deletion link.",
      tooMany: "Too many attempts. Try again later.",
      alreadyGone: "Invalid deletion link, or the city was already deleted.",
      failed: "Deletion failed. Try again in a moment.",
    },
    report: {
      badReason: "Unknown reason.",
      tooMany: "Too many reports. Try again later.",
      failed: "The report failed.",
    },
  },
  fr: {
    notConfigured: "Le partage n'est pas encore configuré.",
    forbidden: "Requête refusée.",
    unreadable: "Requête illisible.",
    cityNotFound: "Ville introuvable.",
    share: {
      tooMany: "Trop de partages d'un coup. Réessayez dans une heure.",
      badArticle: "Article invalide.",
      missingCity: "Ville manquante.",
      badSource: "Source incohérente.",
      unknownSource: "Source inconnue.",
      failed: "Le partage a échoué. Réessayez dans un instant.",
      notConfigured: () => "Le partage n'est pas configuré.",
      cityTooHeavy: () => "Ville trop lourde.",
      cityUnreadable: () => "Fichier de ville illisible.",
      cityInvalid: (detail) => `Ville invalide (${detail}).`,
      thumbTooHeavy: () => "Miniature trop lourde.",
      thumbNotJpeg: () => "La miniature doit être un JPEG.",
      thumbSize: (detail) => `La miniature doit faire ${detail} pixels.`,
      badAddress: () => "Adresse de page invalide.",
      localPage: () => "Les pages locales ou d'intranet ne se partagent pas.",
      addressTooLong: () => "Adresse de page trop longue.",
      blockedDomain: () => "Ce site est sur la liste des sites refusés par DOMCity.",
      recentVersion: (date) =>
        `Cette page a déjà une ville, publiée le ${longDate(date, "fr")}. Confirmez pour publier une nouvelle version.`,
    },
    remove: {
      badLink: "Lien de suppression invalide.",
      tooMany: "Trop de tentatives. Réessayez plus tard.",
      alreadyGone: "Lien de suppression invalide, ou ville déjà supprimée.",
      failed: "La suppression a échoué. Réessayez dans un instant.",
    },
    report: {
      badReason: "Motif inconnu.",
      tooMany: "Trop de signalements. Réessayez plus tard.",
      failed: "Le signalement a échoué.",
    },
  },
});
