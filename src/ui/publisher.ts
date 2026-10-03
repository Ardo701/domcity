/**
 * L'éditeur du site, pour les mentions légales et la page de confidentialité.
 * À compléter avant la mise en ligne : un champ vide s'affiche « à compléter » sur ces pages.
 * Particulier non professionnel : la loi (LCEN, art. 6) permet de ne publier que l'hébergeur,
 * à condition de lui avoir donné son identité ; laisser alors `address` vide et le dire dans `status`.
 */
export const PUBLISHER = {
  /** Nom et prénom, ou raison sociale. */
  name: "",
  /** Particulier, auto-entrepreneur (avec SIRET), société (forme, capital, RCS)… */
  status: "",
  /** Adresse postale. */
  address: "",
  /** Adresse de contact (questions, retraits, données personnelles). */
  email: "",
  /** Directeur ou directrice de la publication (souvent l'éditeur lui-même). */
  director: "",
};

/** Date de la dernière mise à jour des pages légales. */
export const LEGAL_UPDATED = "3 octobre 2026";
