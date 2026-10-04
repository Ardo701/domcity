import { describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const { GALLERY_PATHS, refreshGalleries } = await import("./galleries");

describe("galleries", () => {
  it("drops the home page and Explore in every language", () => {
    refreshGalleries();
    expect(revalidatePath.mock.calls.map(([path]) => path).sort()).toEqual(["/en", "/en/explore", "/fr", "/fr/explore"]);
  });

  it("names the paths the proxy rewrites to, the ones the cache knows", () => {
    const served = ["/", "/explore"].flatMap((path) =>
      (["en", "fr"] as const).map((locale) => {
        const request = new NextRequest(`https://domcity.app${path}`, { headers: { cookie: `locale=${locale}` } });
        return new URL(proxy(request).headers.get("x-middleware-rewrite")!).pathname;
      }),
    );
    expect(served.sort()).toEqual([...GALLERY_PATHS].sort());
  });
});
