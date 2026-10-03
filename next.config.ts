import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres database for local mode (development): loaded as is, not bundled...
  serverExternalPackages: ["@electric-sql/pglite"],
  // ... and never copied into the deployed functions, which use Supabase.
  outputFileTracingExcludes: {
    "*": ["node_modules/@electric-sql/pglite/**"],
  },
  // Old addresses: the bookmarklet page (/installer), the bookmarklet's reception (/nouveau, still opened by
  // the bookmarklets installed before), a site page (/s/...), a shared city (/c/...) and its secret link.
  // What follows the # (the token, plan B's city) follows the redirect: the browser keeps it.
  async redirects() {
    return [
      { source: "/installer", destination: "/create", permanent: true },
      { source: "/nouveau", destination: "/new", permanent: true },
      { source: "/s/:domain", destination: "/site/:domain", permanent: true },
      { source: "/c/:slug", destination: "/city/:slug", permanent: true },
      { source: "/c/:slug/supprimer", destination: "/city/:slug/delete", permanent: true },
    ];
  },
};

export default nextConfig;
