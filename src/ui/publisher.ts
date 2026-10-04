/**
 * The site's publisher, for the legal notice and the privacy page.
 * To fill in before launch: an empty field shows "To be completed" ("À compléter") on these pages.
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

/** Date of the last update of the legal pages (noon UTC: the same day in every time zone). */
export const LEGAL_UPDATED = new Date(Date.UTC(2026, 9, 4, 12));
