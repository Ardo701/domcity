/**
 * Limits of a city. They protect the 3D rendering and the sharing API.
 * Separate file from schema.ts so that the capture (and therefore the bookmarklet) does not embed zod.
 */
export const LIMITS = {
  maxNodes: 30_000,
  maxDepth: 64,
  maxText: 10_000_000,
  maxHeading: 160,
  maxLabel: 60,
  maxUrl: 2_048,
  maxThirdParty: 60,
  /** Pages of the same site targeted by the links (fingerprints), and targeted sites. */
  maxLinkedPages: 1_000,
  maxLinkedSites: 60,
} as const;
