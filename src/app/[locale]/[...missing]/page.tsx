import { notFound } from "next/navigation";

/** Any address that matches no page: the 404 page, in the page's language. */
export default function Missing() {
  notFound();
}
