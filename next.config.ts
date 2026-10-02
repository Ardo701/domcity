import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base Postgres embarquée du mode local (développement) : chargée telle quelle, pas empaquetée…
  serverExternalPackages: ["@electric-sql/pglite"],
  // … et jamais copiée dans les fonctions déployées, qui utilisent Supabase.
  outputFileTracingExcludes: {
    "*": ["node_modules/@electric-sql/pglite/**"],
  },
};

export default nextConfig;
