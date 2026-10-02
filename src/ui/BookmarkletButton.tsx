"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/bookmarklet/href";
import { LogoMark } from "@/ui/Logo";

/**
 * Le bouton à glisser dans la barre de favoris. Il pointe vers le site qui l'a servi
 * (domcity.app, un aperçu, ou localhost en développement).
 * React refuse les liens javascript: dans ses attributs : on pose l'adresse nous-mêmes.
 */
export function BookmarkletButton({ className }: { className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, []);

  return (
    <a ref={ref} className={className} title="Glissez-moi dans votre barre de favoris">
      <LogoMark size={30} />
      DOMCity
    </a>
  );
}

/** Pour installer le favori à la main (téléphone, ou navigateur qui refuse le glisser). */
export function CopyBookmarklet({ className }: { className?: string }) {
  const [copied, setCopied] = useState<"oui" | "non" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletHref(window.location.origin));
      setCopied("oui");
    } catch {
      setCopied("non");
    }
    setTimeout(() => setCopied(null), 2400);
  };

  return (
    <button type="button" className={className} onClick={copy}>
      {copied === "oui" ? "Code copié" : copied === "non" ? "Copie refusée par le navigateur" : "Copier le code du favori"}
    </button>
  );
}
