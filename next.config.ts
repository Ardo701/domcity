import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base Postgres embarquée du mode local (développement) : chargée telle quelle, pas empaquetée…
  serverExternalPackages: ["@electric-sql/pglite"],
  // … et jamais copiée dans les fonctions déployées, qui utilisent Supabase.
  outputFileTracingExcludes: {
    "*": ["node_modules/@electric-sql/pglite/**"],
  },
  // La page du favori s'appelait /installer : les anciens liens y mènent encore.
  async redirects() {
    return [{ source: "/installer", destination: "/create", permanent: true }];
  },
};

export default nextConfig;
