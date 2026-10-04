import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Instrument_Sans, Martian_Mono } from "next/font/google";
import { LocaleProvider } from "@/i18n/client";
import { LOCALES } from "@/i18n/locale";
import { COMMON } from "@/i18n/messages/common";
import { getLocale, getMessages } from "@/i18n/server";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  // No known fallback metrics for this font: the fallback stack is in globals.css.
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

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(COMMON);
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: m.siteTitle, template: "%s · DOMCity" },
    description: m.siteDescription,
  };
}

export const viewport: Viewport = {
  themeColor: "#eeeae1",
};

/** Every page exists in each language: the proxy picks one (src/proxy.ts). */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
