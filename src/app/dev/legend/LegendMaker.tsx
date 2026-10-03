"use client";

import { useEffect, useRef, useState } from "react";
import { layoutCity } from "@/city/layout";
import { excerpt } from "./excerpt";
import { LEGEND_SPECS } from "./specs";

/** Side of a thumbnail in the sheet (displayed up to 64 px: sharp on a high-density screen). */
const CELL = 128;
const COLUMNS = 8;
/** Margin around the model in its cell, and thickness of the ink line around it. */
const PAD = 7;
const LINE = 2.5;
const INK = [21, 21, 26];

/**
 * The thumbnail in its cell: the model centered, outlined with an ink line (its silhouette
 * thickened, underneath it), like the figures of the sheet.
 */
function inked(source: HTMLCanvasElement): HTMLCanvasElement {
  const room = CELL - PAD * 2;
  const scale = Math.min(room / source.width, room / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  const x = (CELL - w) / 2;
  const y = (CELL - h) / 2;

  const art = document.createElement("canvas");
  art.width = art.height = CELL;
  const artCtx = art.getContext("2d")!;
  artCtx.imageSmoothingQuality = "high";
  artCtx.drawImage(source, x, y, w, h);

  // The silhouette, without the very light veils (smoke, rain) that would make a blurry line.
  const shape = artCtx.getImageData(0, 0, CELL, CELL);
  for (let i = 0; i < shape.data.length; i += 4) {
    shape.data[i] = INK[0];
    shape.data[i + 1] = INK[1];
    shape.data[i + 2] = INK[2];
    shape.data[i + 3] = shape.data[i + 3] > 110 ? 255 : 0;
  }
  const silhouette = document.createElement("canvas");
  silhouette.width = silhouette.height = CELL;
  silhouette.getContext("2d")!.putImageData(shape, 0, 0);

  const out = document.createElement("canvas");
  out.width = out.height = CELL;
  const ctx = out.getContext("2d")!;
  for (let a = 0; a < 24; a += 1) {
    const turn = (a / 24) * Math.PI * 2;
    ctx.drawImage(silhouette, Math.cos(turn) * LINE, Math.sin(turn) * LINE);
  }
  ctx.drawImage(art, 0, 0);
  return out;
}

export function LegendMaker() {
  const stage = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Building the thumbnails...");
  const [cells, setCells] = useState<Array<{ key: string; url: string }>>([]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const { CityView } = await import("@/city/view");
      // To tune the samples from the console.
      (window as unknown as { __legend?: unknown }).__legend = { specs: LEGEND_SPECS, layoutCity, excerpt };
      const only = new URLSearchParams(window.location.search).get("only")?.split(",");
      const specs = LEGEND_SPECS.filter((spec) => !only || only.includes(spec.key));
      const done: Array<{ key: string; canvas: HTMLCanvasElement }> = [];
      await document.fonts.ready;
      for (const spec of specs) {
        if (disposed || !stage.current) return;
        setStatus(`Rendering: ${spec.key} (${done.length + 1} / ${specs.length})`);
        const city = layoutCity(spec.doc);
        spec.prepare?.(city);
        const part = excerpt(city, spec.region(city));
        // Each hung image reports when it has loaded: we wait for the last one.
        const expected = part.lots.filter((lot) => lot.panel && !lot.container).length;
        const loaded = new Set<number>();
        let ready = () => {};
        const decorated = new Promise<void>((resolve) => (ready = resolve));
        const view = new CityView(stage.current, part, {
          onImageStatus: (id) => {
            loaded.add(id);
            if (loaded.size >= expected) ready();
          },
        });
        if (expected === 0) ready();
        await Promise.race([decorated, new Promise((resolve) => setTimeout(resolve, 6000))]);
        await new Promise((resolve) => setTimeout(resolve, 200));
        const figure = await view.figure(CELL * 3, { from: spec.from ?? "south-west", elevation: spec.elevation, shadows: false });
        view.dispose();
        if (!figure) return setStatus(`Rendering failed: ${spec.key}`);
        const canvas = inked(figure.canvas);
        done.push({ key: spec.key, canvas });
        setCells((list) => [...list, { key: spec.key, url: canvas.toDataURL() }]);
      }
      if (disposed || only) return setStatus(only ? "Trial done (nothing saved)" : "");

      const rows = Math.ceil(done.length / COLUMNS);
      const sheet = document.createElement("canvas");
      sheet.width = CELL * COLUMNS;
      sheet.height = CELL * rows;
      const ctx = sheet.getContext("2d")!;
      done.forEach(({ canvas }, i) => ctx.drawImage(canvas, (i % COLUMNS) * CELL, Math.floor(i / COLUMNS) * CELL));
      const blob = await new Promise<Blob | null>((resolve) => sheet.toBlob(resolve, "image/webp", 0.88));
      if (!blob) return setStatus("Image failed");
      const form = new FormData();
      form.set("image", blob, "legende.webp");
      form.set("meta", JSON.stringify({ cell: CELL, columns: COLUMNS, order: done.map((d) => d.key) }));
      const response = await fetch("/api/dev-legend", { method: "POST", body: form });
      setStatus(
        response.ok
          ? `Saved: public/figures/legende.webp (${sheet.width} × ${sheet.height}, ${Math.round(blob.size / 1024)} KB)`
          : `Saving failed (${response.status})`,
      );
    })();
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <p className="mono-caps" data-status>
        {status}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {cells.map((cell) => (
          <figure key={cell.key} style={{ margin: 0, display: "grid", gap: 4, justifyItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cell.url} alt={cell.key} width={CELL} height={CELL} className="graph-paper" />
            <figcaption className="mono-caps">{cell.key}</figcaption>
          </figure>
        ))}
      </div>
      <div ref={stage} style={{ width: 600, height: 420, position: "relative" }} />
    </main>
  );
}
