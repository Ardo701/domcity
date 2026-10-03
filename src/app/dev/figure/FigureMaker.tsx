"use client";

import { useEffect, useRef, useState } from "react";
import { layoutCity } from "@/city/layout";
import { figureKey } from "@/ui/figureMeta";
import { HERO_SAMPLE } from "@/ui/samples";

/** Image width in pixels (displayed around 700 px: sharp on a high-density screen). */
const WIDTH = 1800;

export function FigureMaker() {
  const stage = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Building the city...");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let dispose = () => {};
    void (async () => {
      const { CityView } = await import("@/city/view");
      if (disposed || !stage.current) return;
      const layout = layoutCity(HERO_SAMPLE);
      // Each hung image reports when it has loaded: we wait for the last one.
      const expected = layout.lots.filter((lot) => lot.panel).length;
      const loaded = new Set<number>();
      let ready = () => {};
      const decorated = new Promise<void>((resolve) => (ready = resolve));
      const view = new CityView(stage.current, layout, {
        onImageStatus: (id) => {
          loaded.add(id);
          if (loaded.size >= expected) ready();
        },
      });
      dispose = () => view.dispose();
      if (expected === 0) ready();
      await Promise.race([decorated, new Promise((resolve) => setTimeout(resolve, 10_000))]);
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (disposed) return;

      setStatus("Rendering...");
      const figure = await view.figure(WIDTH, { from: "south-west" });
      if (!figure || disposed) return setStatus("Rendering failed");
      // To tune the sample and its markers from the console.
      (window as unknown as { __figure?: unknown }).__figure = { layout, figure, view };
      setPreview(URL.createObjectURL(figure.blob));
      const form = new FormData();
      form.set("image", figure.blob, "accueil.webp");
      form.set("meta", JSON.stringify({ width: figure.width, height: figure.height, matrix: figure.matrix, layout: figureKey(layout) }));
      const response = await fetch("/api/dev-figure", { method: "POST", body: form });
      setStatus(
        response.ok
          ? `Saved: public/figures/accueil.webp (${figure.width} × ${figure.height}, ${Math.round(figure.blob.size / 1024)} KB)`
          : `Saving failed (${response.status})`,
      );
    })();
    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <p className="mono-caps" data-status>
        {status}
      </p>
      <div ref={stage} style={{ width: 900, height: 640, position: "relative" }} />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Rendered figure" className="graph-paper" style={{ width: 900, height: "auto" }} />
      )}
    </main>
  );
}
