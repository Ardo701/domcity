import type { Metadata } from "next";
import { TERMS } from "@/i18n/messages/legal";
import { getMessages } from "@/i18n/server";
import { LegalPage } from "@/ui/LegalPage";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMessages(TERMS);
  return { title: m.title, description: m.description };
}

export default async function TermsPage() {
  const m = await getMessages(TERMS);
  return (
    <LegalPage title={m.title} lead={m.lead}>
      {m.body}
    </LegalPage>
  );
}
