import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base Postgres embarquée du mode local (développement) : chargée telle quelle, pas empaquetée…
  serverExternalPackages: ["@electric-sql/pglite"],
  // … et jamais copiée dans les fonctions déployées, qui utilisent Supabase.
  outputFileTracingExcludes: {
    "*": ["node_modules/@electric-sql/pglite/**"],
  },
  // Anciennes adresses : la page du favori (/installer) et celle d'un site (/s/…).
  async redirects() {
    return [
      { source: "/installer", destination: "/create", permanent: true },
      { source: "/s/:domain", destination: "/site/:domain", permanent: true },
    ];
  },
};

export default nextConfig;
