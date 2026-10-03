import type { CityDoc } from "@/format/types";

/**
 * Page de démonstration montrée sur l'accueil et la page Installer. Construite à la main, rendue par le vrai
 * moteur 3D (/dev/figure). Ses images sont dans public/figures.
 */
export const HERO_SAMPLE: CityDoc = {
  format: 1,
  source: "wikipedia",
  url: "https://exemple.org/",
  title: "Exemple",
  capturedAt: "2026-10-02T00:00:00.000Z",
  root: {
    tag: "body",
    children: [
      {
        tag: "header",
        children: [
          { tag: "img", img: { src: "/figures/exemple-logo.svg", alt: "Exemple", w: 220, h: 80 } },
          { tag: "nav", children: [{ tag: "li", text: 8 }, { tag: "li", text: 12 }, { tag: "li", text: 9 }] },
        ],
      },
      {
        tag: "main",
        children: [
          { tag: "h1", text: 7, heading: "Exemple" },
          {
            tag: "section",
            children: [
              { tag: "h2", text: 8, heading: "Histoire" },
              { tag: "p", text: 1900 },
              { tag: "img", img: { src: "/figures/exemple-affiche.svg", alt: "Paysage", w: 420, h: 280 } },
              { tag: "p", text: 420 },
              { tag: "div", text: 5200 },
            ],
          },
          { tag: "hr" },
          {
            tag: "section",
            children: [
              { tag: "h2", text: 5, heading: "Lieux" },
              {
                tag: "ul",
                children: [
                  { tag: "li", text: 40 }, { tag: "li", text: 70 }, { tag: "li", text: 30 },
                  { tag: "li", text: 90 }, { tag: "li", text: 25 }, { tag: "li", text: 55 },
                ],
              },
              {
                tag: "div",
                children: [
                  { tag: "div", children: [{ tag: "div", text: 1400 }, { tag: "div", text: 260 }] },
                  { tag: "div" },
                ],
              },
            ],
          },
        ],
      },
      {
        tag: "aside",
        children: [{ tag: "p", text: 300 }, { tag: "iframe" }],
      },
      { tag: "footer", children: [{ tag: "p", text: 160 }, { tag: "div", text: 60 }] },
    ],
  },
};

export const EXAMPLES: Array<{ lang: "fr" | "en"; title: string }> = [
  { lang: "fr", title: "Paris" },
  { lang: "fr", title: "Croissant (viennoiserie)" },
  { lang: "fr", title: "Tour Eiffel" },
  { lang: "fr", title: "Jazz" },
  { lang: "fr", title: "Lune" },
  { lang: "en", title: "Cat" },
];
