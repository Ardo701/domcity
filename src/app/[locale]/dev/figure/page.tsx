import { notFound } from "next/navigation";
import { FigureMaker } from "./FigureMaker";

/** Development only: renders the home page figure with the real 3D engine and saves it. */
export default function FigurePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FigureMaker />;
}
