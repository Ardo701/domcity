import type { Metadata } from "next";
import { PRIVACY } from "@/i18n/messages/legal";
import { getMessages } from "@/i18n/server";
import { LegalPage } from "@/ui/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(PRIVACY);
  return { title: m.title, description: m.description };
}

export default async function PrivacyPage() {
  const m = await getMessages(PRIVACY);
  return (
    <LegalPage title={m.title} lead={m.lead}>
      {m.body}
    </LegalPage>
  );
}
