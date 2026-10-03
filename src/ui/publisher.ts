/**
 * The site's publisher, for the legal notice and the privacy page.
 * To fill in before launch: an empty field shows "à compléter" on these pages.
 * Private individual, non-professional: the law (LCEN, art. 6) allows publishing only the host,
 * provided they were given your identity; then leave `address` empty and say so in `status`.
 */
export const PUBLISHER = {
  /** Last and first name, or company name. */
  name: "",
  /** Private individual, sole trader (with SIRET), company (legal form, capital, RCS)... */
  status: "",
  /** Postal address. */
  address: "",
  /** Contact address (questions, takedowns, personal data). */
  email: "",
  /** Publication director (often the publisher themselves). */
  director: "",
};

/** Date of the last update of the legal pages. */
export const LEGAL_UPDATED = "3 octobre 2026";
