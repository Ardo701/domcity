import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fromWikiSlug, isWikiLang } from "@/capture/wikipedia";
import { CityExplorer } from "@/ui/explorer/CityExplorer";

function readTitle(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // déjà décodé, ou un « % » isolé dans le titre
  }
  return fromWikiSlug(value).trim();
}

export async function generateMetadata(props: PageProps<"/w/[lang]/[title]">): Promise<Metadata> {
  const { title } = await props.params;
  return {
    title: readTitle(title),
    description: `L'article Wikipédia « ${readTitle(title)} », relevé et construit en ville 3D par DOMCity.`,
  };
}

export default async function WikiCityPage(props: PageProps<"/w/[lang]/[title]">) {
  const { lang, title } = await props.params;
  if (!isWikiLang(lang)) notFound();
  const name = readTitle(title);
  if (!name) notFound();
  return <CityExplorer key={`${lang}/${name}`} lang={lang} title={name} />;
}
