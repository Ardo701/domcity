import { notFound } from "next/navigation";
import { FigureMaker } from "./FigureMaker";

/** Développement seulement : rend la figure de l'accueil avec le vrai moteur 3D et l'enregistre. */
export default function FigurePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FigureMaker />;
}
