/** Refused sites: the names of the categories, and what DOMCity says when it refuses a page. */

import type { BlockCategory, Refusal } from "@/format/blocklist";
import { defineMessages } from "../locale";

export const REFUSAL = defineMessages<{ labels: Record<BlockCategory, string>; reasons: Record<Refusal, string> }>({
  en: {
    labels: {
      adult: "Adult sites",
      violence: "Violence and shocking images",
      bank: "Banks and financial services",
      private: "Personal data: messaging, accounts, taxes, health",
      gambling: "Gambling",
      danger: "Dangerous sites: tracking, spyware, pirated downloads",
    },
    reasons: {
      "adult-page": "This page declares itself adults only: DOMCity does not build a city for it.",
      adult: "This site is on the list of sites refused by DOMCity: adult sites.",
      violence: "This site is on the list of sites refused by DOMCity: violent or shocking images.",
      bank: "This site is on the list of sites refused by DOMCity: banks and financial services, whose pages show accounts and names.",
      private:
        "This site is on the list of sites refused by DOMCity: messaging, accounts, administration, health… pages that show a person's life.",
      gambling: "This site is on the list of sites refused by DOMCity: gambling.",
      danger: "This site is on the list of sites refused by DOMCity: tracking, spyware or pirated downloads.",
    },
  },
  fr: {
    labels: {
      adult: "Sites pour adultes",
      violence: "Violence et images choquantes",
      bank: "Banques et services financiers",
      private: "Données personnelles : messageries, comptes, impôts, santé",
      gambling: "Jeux d'argent",
      danger: "Sites dangereux : pistage, logiciels espions, téléchargements piratés",
    },
    reasons: {
      "adult-page": "Cette page se déclare réservée aux adultes : DOMCity n'en construit pas de ville.",
      adult: "Ce site est sur la liste des sites refusés par DOMCity : sites pour adultes.",
      violence: "Ce site est sur la liste des sites refusés par DOMCity : images violentes ou choquantes.",
      bank: "Ce site est sur la liste des sites refusés par DOMCity : banques et services financiers, dont les pages montrent des comptes et des noms.",
      private:
        "Ce site est sur la liste des sites refusés par DOMCity : messageries, comptes, administration, santé… des pages qui montrent la vie d'une personne.",
      gambling: "Ce site est sur la liste des sites refusés par DOMCity : jeux d'argent.",
      danger: "Ce site est sur la liste des sites refusés par DOMCity : pistage, logiciels espions ou téléchargements piratés.",
    },
  },
});
