/**
 * Limites d'une ville. Elles protègent le rendu 3D et, plus tard, l'API de partage.
 * Fichier séparé de schema.ts pour que la capture (et donc le bookmarklet) n'embarque pas zod.
 */
export const LIMITS = {
  maxNodes: 30_000,
  maxDepth: 64,
  maxText: 10_000_000,
  maxHeading: 160,
  maxLabel: 60,
  maxUrl: 2_048,
  maxThirdParty: 60,
} as const;
