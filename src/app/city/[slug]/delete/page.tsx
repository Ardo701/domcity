import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sharingEnabled } from "@/server/config";
import { SLUG_PATTERN } from "@/server/security";
import { getCapture } from "@/server/store";
import { DeleteCity } from "@/ui/DeleteCity";
import { Sheet } from "@/ui/Sheet";

export const metadata: Metadata = {
  title: "Supprimer une ville",
  robots: { index: false, follow: false },
};

export default async function DeleteCityPage(props: PageProps<"/city/[slug]/delete">) {
  const { slug } = await props.params;
  if (!sharingEnabled() || !SLUG_PATTERN.test(slug)) notFound();
  // Une ville masquée par les signalements n'est plus lisible, mais son auteur peut toujours la supprimer.
  const city = await getCapture(slug);
  return (
    <Sheet kicker="Lien secret" title="Supprimer une ville">
      <DeleteCity slug={slug} title={city?.title ?? null} />
    </Sheet>
  );
}
