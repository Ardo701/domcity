import type { Metadata } from "next";
import { NOTICE } from "@/i18n/messages/legal";
import { getMessages } from "@/i18n/server";
import { LegalPage } from "@/ui/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(NOTICE);
  return { title: m.title, description: m.description };
}

export default async function LegalNoticePage() {
  const m = await getMessages(NOTICE);
  return (
    <LegalPage title={m.title} lead={m.lead}>
      {m.body}
    </LegalPage>
  );
}
