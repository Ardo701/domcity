import { notFound } from "next/navigation";
import { LegendMaker } from "./LegendMaker";

/**
 * Development only: renders the legend thumbnails with the real 3D engine and
 * saves them (a single image for all of them). `?only=house,tower`: a trial, without saving.
 */
export default function LegendPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LegendMaker />;
}
