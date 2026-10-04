import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fromWikiSlug, isWikiLang } from "@/capture/wikipedia";
import { CITY_META } from "@/i18n/messages/site";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { CityExplorer } from "@/ui/explorer/CityExplorer";

function readTitle(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // already decoded, or a lone "%" in the title
  }
  return fromWikiSlug(value).trim();
}

export async function generateMetadata(props: PageProps<"/[locale]/w/[lang]/[title]">): Promise<Metadata> {
  const { title } = await props.params;
  const m = await getMessages(CITY_META);
  return { title: readTitle(title), description: m.wikipedia(readTitle(title)) };
}

export default async function WikiCityPage(props: PageProps<"/[locale]/w/[lang]/[title]">) {
  const { lang, title } = await props.params;
  if (!isWikiLang(lang)) notFound();
  const name = readTitle(title);
  if (!name) notFound();
  return (
    <CityExplorer key={`${lang}/${name}`} source={{ kind: "wikipedia", lang, title: name }} canShare={sharingEnabled()} />
  );
}
