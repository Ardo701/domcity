import { notFound } from "next/navigation";
import { LegendMaker } from "./LegendMaker";

/**
 * Développement seulement : rend les vignettes de la légende avec le vrai moteur 3D et les
 * enregistre (une seule image pour toutes). `?only=house,tower` : un essai, sans enregistrer.
 */
export default function LegendPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LegendMaker />;
}
