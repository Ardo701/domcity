import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Instrument_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  // Pas de métriques de repli connues pour cette police : la pile de repli est dans globals.css.
  adjustFontFallback: false,
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
});

const mono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "DOMCity · Chaque page web est une ville",
    template: "%s · DOMCity",
  },
  description:
    "DOMCity relève le plan d'une page web et la construit en 3D : les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments.",
};

export const viewport: Viewport = {
  themeColor: "#eeeae1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
