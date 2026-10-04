import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, requestLocale } from "@/i18n/locale";

/**
 * The language of the pages, without changing their address: /create is served from /en/create or
 * /fr/create (the [locale] segment), after the switcher's cookie, otherwise the browser's languages.
 * A shared link therefore opens in the language of whoever opens it.
 *
 * An address that names its language (/fr/create) keeps that choice in the cookie and loses its prefix.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    // The router's own requests are served as they are; a visit is redirected to the address without prefix.
    if (request.headers.has("rsc")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(first.length + 1) || "/";
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
    return response;
  }

  const locale = requestLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything but the API, Next's files and the public files (public/figures, the icon).
  matcher: ["/((?!api/|_next/|_vercel/|__nextjs|figures/|icon\\.svg|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
