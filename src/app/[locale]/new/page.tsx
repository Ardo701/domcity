import type { Metadata } from "next";
import { RECEPTION } from "@/i18n/messages/reception";
import { getMessages } from "@/i18n/server";
import { sharingEnabled } from "@/server/config";
import { NewCity } from "@/ui/NewCity";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(RECEPTION);
  return { title: m.title, description: m.description, robots: { index: false, follow: false } };
}

/** Receives the city sent by the bookmarklet. Nothing is published without a click on "Publish". */
export default function NewCityPage() {
  return <NewCity canShare={sharingEnabled()} />;
}
