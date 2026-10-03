import { z } from "zod";
import { LIMITS } from "./limits";
import { FORMAT_VERSION, type CityDoc, type CityNode } from "./types";

const httpUrl = z
  .string()
  .max(LIMITS.maxUrl)
  .refine((value) => /^https?:\/\//i.test(value), "URL http(s) attendue");

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/);
const domain = z.string().regex(/^[a-z0-9.-]{1,253}$/);
const count = z.number().int().min(0).max(1_000_000_000);

const cityNodeSchema: z.ZodType<CityNode> = z.lazy(() =>
  z.strictObject({
    tag: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/),
    text: z.number().int().min(0).max(LIMITS.maxText).optional(),
    heading: z.string().max(LIMITS.maxHeading).optional(),
    label: z.string().max(LIMITS.maxLabel).optional(),
    img: z
      .strictObject({
        src: z.union([httpUrl, z.literal("")]),
        alt: z.string().max(300).optional(),
        w: z.number().min(0).max(100_000).optional(),
        h: z.number().min(0).max(100_000).optional(),
        broken: z.literal(true).optional(),
        refused: z.literal(true).optional(),
      })
      .optional(),
    links: z
      .strictObject({
        internal: z.number().int().min(0).max(1_000_000),
        external: z.number().int().min(0).max(1_000_000),
      })
      .optional(),
    rect: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    bg: hexColor.optional(),
    children: z.array(cityNodeSchema).optional(),
  }),
);

export const cityDocSchema = z.strictObject({
  format: z.literal(FORMAT_VERSION),
  source: z.enum(["wikipedia", "bookmarklet"]),
  url: httpUrl,
  title: z.string().max(300),
  capturedAt: z.iso.datetime(),
  lang: z.string().max(16).optional(),
  page: z
    .strictObject({
      domSize: count.optional(),
      scripts: count.optional(),
      comments: count.optional(),
      resources: count.optional(),
      bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
      thirdParty: z
        .array(domain)
        .max(LIMITS.maxThirdParty)
        .optional(),
      colors: z
        .strictObject({ background: hexColor.optional(), text: hexColor.optional(), link: hexColor.optional() })
        .optional(),
      adult: z.literal(true).optional(),
    })
    .optional(),
  linksTo: z
    .strictObject({
      pages: z
        .array(z.string().regex(/^[0-9a-f]{8}$/))
        .max(LIMITS.maxLinkedPages)
        .optional(),
      sites: z
        .array(z.tuple([domain, z.number().int().min(1).max(1_000_000)]))
        .max(LIMITS.maxLinkedSites)
        .optional(),
    })
    .optional(),
  root: cityNodeSchema,
});

export type ValidationResult =
  | { ok: true; doc: CityDoc }
  | { ok: false; error: string };

/**
 * First checks the size (number of elements, depth) without recursion,
 * so that a very deep booby-trapped file does not bring the validation down,
 * then the exact shape of the file.
 */
export function validateCityDoc(data: unknown): ValidationResult {
  const root = (data as { root?: unknown } | null)?.root;
  let count = 0;
  const stack: Array<[unknown, number]> = [[root, 0]];
  while (stack.length > 0) {
    const [node, depth] = stack.pop()!;
    count += 1;
    if (count > LIMITS.maxNodes) return { ok: false, error: `plus de ${LIMITS.maxNodes} éléments` };
    if (depth > LIMITS.maxDepth) return { ok: false, error: `profondeur supérieure à ${LIMITS.maxDepth}` };
    const children = (node as { children?: unknown } | null)?.children;
    if (Array.isArray(children)) {
      for (const child of children) stack.push([child, depth + 1]);
    }
  }

  const parsed = cityDocSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join(".") || "racine"} : ${issue.message}` };
  }
  return { ok: true, doc: parsed.data as CityDoc };
}
