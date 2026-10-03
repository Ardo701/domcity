import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base Postgres embarquée du mode local (développement) : chargée telle quelle, pas empaquetée…
  serverExternalPackages: ["@electric-sql/pglite"],
  // … et jamais copiée dans les fonctions déployées, qui utilisent Supabase.
  outputFileTracingExcludes: {
    "*": ["node_modules/@electric-sql/pglite/**"],
  },
  // Anciennes adresses : la page du favori (/installer), celle d'un site (/s/…), une ville partagée (/c/…)
  // et son lien secret (le jeton, après le #, suit la redirection : le navigateur le garde).
  async redirects() {
    return [
      { source: "/installer", destination: "/create", permanent: true },
      { source: "/s/:domain", destination: "/site/:domain", permanent: true },
      { source: "/c/:slug", destination: "/city/:slug", permanent: true },
      { source: "/c/:slug/supprimer", destination: "/city/:slug/delete", permanent: true },
    ];
  },
};

export default nextConfig;
