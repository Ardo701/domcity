import type { Metadata } from "next";
import { sharingEnabled } from "@/server/config";
import { NewCity } from "@/ui/NewCity";

export const metadata: Metadata = {
  title: "Nouvelle ville",
  description: "La ville d'une page relevée avec le favori DOMCity.",
  robots: { index: false, follow: false },
};

/** Reçoit la ville envoyée par le favori. Rien n'est publié sans un clic sur « Publier ». */
export default function NewCityPage() {
  return <NewCity canShare={sharingEnabled()} />;
}
