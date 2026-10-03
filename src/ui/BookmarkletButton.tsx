"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/bookmarklet/href";
import { LogoMark } from "@/ui/Logo";

/**
 * The button to drag into the bookmarks bar. It points to the site that served it
 * (domcity.app, a preview, or localhost in development).
 * React refuses javascript: links in its attributes: we set the address ourselves.
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

/** To install the bookmarklet by hand (phone, or a browser that refuses dragging). */
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
