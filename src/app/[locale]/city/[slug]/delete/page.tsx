import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DELETE } from "@/i18n/messages/pages";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { SLUG_PATTERN } from "@/server/security";
import { getCapture } from "@/server/store";
import { DeleteCity } from "@/ui/DeleteCity";
import { Sheet } from "@/ui/Sheet";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(DELETE)).title, robots: { index: false, follow: false } };
}

export default async function DeleteCityPage(props: PageProps<"/[locale]/city/[slug]/delete">) {
  const { slug } = await props.params;
  if (!sharingEnabled() || !SLUG_PATTERN.test(slug)) notFound();
  // A city hidden by reports can no longer be read, but its author can still delete it.
  const city = await getCapture(slug);
  const m = await getMessages(DELETE);
  return (
    <Sheet kicker={m.kicker} title={m.title}>
      <DeleteCity slug={slug} title={city?.title ?? null} />
    </Sheet>
  );
}
