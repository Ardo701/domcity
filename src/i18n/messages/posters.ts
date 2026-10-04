/** The placeholder posters painted in the 3D city, when an image cannot be shown. */

import { defineMessages } from "../locale";

export const POSTERS = defineMessages({
  en: {
    /** In place of the alt text of an image from a refused site (it can be as crude as the image). */
    hidden: "Hidden image",
    untitled: "Untitled image",
    missing: "IMAGE NOT FOUND",
    refused: "SITE REFUSED BY DOMCITY",
    blocked: "IMAGE NOT SHOWN · CLICK TO SEE IT",
  },
  fr: {
    hidden: "Image masquée",
    untitled: "Image sans légende",
    missing: "IMAGE INTROUVABLE",
    refused: "SITE REFUSÉ PAR DOMCITY",
    blocked: "IMAGE NON AFFICHÉE · CLIC POUR LA VOIR",
  },
});

export type PosterLabels = (typeof POSTERS)["en"];
