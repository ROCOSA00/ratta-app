"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import {
  clampView,
  cropRect,
  initialView,
  MAX_ZOOM,
  MIN_ZOOM,
  scaleFor,
  zoomAround,
  type Size,
  type View,
} from "@/lib/images/crop";

type Props = {
  file: File;
  /** Ancho / alto del recorte (1 = cuadrado, 2 = el doble de ancho que de alto). */
  aspect: number;
  /** "circle": se ve redondo (la foto de perfil); la imagen guardada es cuadrada igual. */
  shape: "circle" | "rect";
  /** Ancho de la imagen que se guarda (el alto sale del aspecto). */
  outputWidth: number;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

/**
 * Editor para encuadrar una foto antes de subirla: se arrastra para moverla
 * y se amplía pellizcando con dos dedos (o con la barra). Se guarda justo
 * lo que se ve dentro del marco.
 */
export function ImageCropper({ file, aspect, shape, outputWidth, title, onCancel, onConfirm }: Props) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frameW, setFrameW] = useState(300);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const frameRef = useRef<HTMLDivElement>(null);

  const frame: Size = useMemo(() => ({ w: frameW, h: Math.round(frameW / aspect) }), [frameW, aspect]);
  const image: Size | null = bitmap ? { w: bitmap.width, h: bitmap.height } : null;

  // Cargar la foto (girada según la cámara) y una URL para enseñarla.
  useEffect(() => {
    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((bmp) => {
        if (cancelled) bmp.close();
        else setBitmap(bmp);
      })
      .catch(() => setError("No se pudo leer esa imagen. Prueba con otra."));
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // El marco ocupa casi todo el ancho de la pantalla (hasta 360 px).
  useEffect(() => {
    const fit = () => setFrameW(Math.min(360, window.innerWidth - 40));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Al cargar la foto (o cambiar el tamaño del marco): centrada y sin zoom.
  useEffect(() => {
    if (bitmap) setView(initialView({ w: bitmap.width, h: bitmap.height }, frame));
  }, [bitmap, frame]);

  function local(e: { clientX: number; clientY: number }) {
    const r = frameRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!image || !pointers.current.has(e.pointerId)) return;
    const prev = new Map(pointers.current);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const old = [...prev.values()];

    if (pts.length === 1 && old.length === 1) {
      // Un dedo: mover.
      const dx = pts[0]!.x - old[0]!.x;
      const dy = pts[0]!.y - old[0]!.y;
      setView((v) => clampView(image, frame, { ...v, x: v.x + dx, y: v.y + dy }));
    } else if (pts.length >= 2 && old.length >= 2) {
      // Dos dedos: ampliar hacia donde están, y mover a la vez.
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      const [a0, b0] = old as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const dist0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || dist;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      setView((v) => {
        const zoomed = zoomAround(image, frame, v, v.zoom * (dist / dist0), mid.x, mid.y);
        return clampView(image, frame, { ...zoomed, x: zoomed.x + mid.x - mid0.x, y: zoomed.y + mid.y - mid0.y });
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
  }

  function setZoom(zoom: number) {
    if (image) setView((v) => zoomAround(image, frame, v, zoom, frame.w / 2, frame.h / 2));
  }

  async function save() {
    if (!bitmap || !image) return;
    setSaving(true);
    const { sx, sy, sw, sh } = cropRect(image, frame, view);
    // No agrandar fotos pequeñas: como mucho, el tamaño real del trozo.
    const outW = Math.round(Math.min(outputWidth, sw));
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      setError("Tu móvil no ha podido recortar la foto.");
      return;
    }
    ctx.imageSmoothingQuality = "high";
    // Redibujar en un canvas quita también los datos EXIF (ubicación GPS…).
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
        else setError("No se pudo preparar la foto.");
      },
      "image/jpeg",
      0.88,
    );
  }

  const s = image ? scaleFor(image, frame, view.zoom) : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 p-5"
      style={{ background: "rgba(8, 3, 10, 0.88)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <p className="text-center text-base font-bold text-white">{title}</p>

      <div
        ref={frameRef}
        className="relative touch-none select-none overflow-hidden"
        style={{
          width: frame.w,
          height: frame.h,
          borderRadius: shape === "circle" ? 16 : 14,
          background: "#000",
          cursor: "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setZoom(view.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
      >
        {url && image ? (
          <Image
            src={url}
            alt=""
            unoptimized
            width={Math.round(image.w * s)}
            height={Math.round(image.h * s)}
            draggable={false}
            className="pointer-events-none absolute left-0 top-0 max-w-none"
            style={{ width: image.w * s, height: image.h * s, transform: `translate(${view.x}px, ${view.y}px)` }}
          />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-white/70">{error ?? "Cargando…"}</p>
        )}
        {/* Guía: en la de perfil, el círculo que se verá; en ambas, una cuadrícula suave. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: `${frame.w / 3}px ${frame.h / 3}px`,
            backgroundPosition: "-1px -1px",
          }}
        />
        {shape === "circle" ? (
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)", border: "2px solid rgba(255,255,255,0.85)" }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-white/85" />
        )}
      </div>

      <div className="flex w-full max-w-[360px] items-center gap-3 text-white">
        <button type="button" onClick={() => setZoom(view.zoom / 1.25)} aria-label="Alejar" className="rounded-full bg-white/15 p-2">
          <Minus size={16} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="flex-1 accent-pink-500"
        />
        <button type="button" onClick={() => setZoom(view.zoom * 1.25)} aria-label="Acercar" className="rounded-full bg-white/15 p-2">
          <Plus size={16} />
        </button>
      </div>

      <p className="-mt-2 text-center text-xs text-white/70">Arrastra para moverla · pellizca con dos dedos para ampliar</p>

      {error && image ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex w-full max-w-[360px] gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!image || saving}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          {saving ? "Preparando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
