import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Development only: saves an image of the 3D view in .data/shots (rendering experiments). */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const name = (new URL(request.url).searchParams.get("name") ?? "vue").replace(/[^a-z0-9-]/gi, "");
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return new Response(null, { status: 400 });
  const dir = join(process.cwd(), ".data", "shots");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${name || "vue"}.jpg`), bytes);
  return new Response(null, { status: 204 });
}
