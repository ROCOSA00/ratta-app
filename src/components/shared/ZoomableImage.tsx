"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  clampZoomView,
  DOUBLE_TAP_ZOOM,
  NO_ZOOM,
  zoomAt,
  type Box,
  type ZoomView,
} from "@/lib/images/zoom";

type Point = { x: number; y: number };

/** Un toque: poco movimiento y corto. */
const TAP_MOVE = 10;
const TAP_MS = 300;
/** Tiempo para el segundo toque del doble toque. */
const DOUBLE_TAP_MS = 280;

/**
 * Foto a pantalla completa que se amplía como en la galería del móvil:
 * pellizcando con dos dedos o con doble toque, y se mueve con un dedo
 * cuando está ampliada. Un toque normal llama a `onTap` (cerrar el visor).
 * La página entera no se amplía nunca (ver NoZoom).
 */
export function ZoomableImage({ src, alt, onTap }: { src: string; alt: string; onTap?: () => void }) {
  const [view, setView] = useState<ZoomView>(NO_ZOOM);
  const [gesturing, setGesturing] = useState(false);
  const [photo, setPhoto] = useState<Box | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const touchStart = useRef<{ at: number; p: Point; multi: boolean } | null>(null);
  const lastTap = useRef<{ at: number; p: Point } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  function frame(): Box {
    const r = rootRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1 };
  }

  function local(e: { clientX: number; clientY: number }): Point {
    const r = rootRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) touchStart.current = { at: Date.now(), p, multi: false };
    else if (touchStart.current) touchStart.current.multi = true;
    setGesturing(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!photo || !pointers.current.has(e.pointerId)) return;
    const prev = new Map(pointers.current);
    pointers.current.set(e.pointerId, local(e));
    const pts = [...pointers.current.values()];
    const old = [...prev.values()];
    const box = frame();

    if (pts.length === 1 && old.length === 1) {
      // Un dedo: mover, solo si está ampliada.
      const dx = pts[0]!.x - old[0]!.x;
      const dy = pts[0]!.y - old[0]!.y;
      setView((v) => (v.z > 1 ? clampZoomView(photo, box, { ...v, x: v.x + dx, y: v.y + dy }) : v));
    } else if (pts.length >= 2 && old.length >= 2) {
      // Dos dedos: ampliar hacia donde están, y mover a la vez.
      const [a, b] = pts as [Point, Point];
      const [a0, b0] = old as [Point, Point];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const dist0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || dist;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const mid0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      setView((v) => {
        const zoomed = zoomAt(photo, box, v, v.z * (dist / dist0), mid.x, mid.y);
        return clampZoomView(photo, box, { ...zoomed, x: zoomed.x + mid.x - mid0.x, y: zoomed.y + mid.y - mid0.y });
      });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = local(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) return;
    setGesturing(false);
    // Casi sin zoom: vuelve a su sitio.
    setView((v) => (v.z < 1.05 ? NO_ZOOM : v));

    const start = touchStart.current;
    touchStart.current = null;
    const isTap =
      e.type === "pointerup" &&
      start &&
      !start.multi &&
      Date.now() - start.at < TAP_MS &&
      Math.hypot(p.x - start.p.x, p.y - start.p.y) < TAP_MOVE;
    if (!isTap) return;

    const now = Date.now();
    const prevTap = lastTap.current;
    if (prevTap && now - prevTap.at < DOUBLE_TAP_MS && Math.hypot(p.x - prevTap.p.x, p.y - prevTap.p.y) < 40) {
      // Doble toque: ampliar ahí, o volver a verla entera.
      lastTap.current = null;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      if (photo) setView((v) => (v.z > 1 ? NO_ZOOM : zoomAt(photo, frame(), v, DOUBLE_TAP_ZOOM, p.x, p.y)));
      return;
    }
    // Un toque: se espera un momento por si llega el segundo.
    lastTap.current = { at: now, p };
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      lastTap.current = null;
      onTap?.();
    }, DOUBLE_TAP_MS);
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 touch-none overflow-hidden"
      // Los toques los gestiona esto (para distinguir el doble toque); que
      // no lleguen al fondo del visor, que se cerraría.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
          transformOrigin: "0 0",
          transition: gesturing ? "none" : "transform 200ms ease-out",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          draggable={false}
          className="object-contain"
          onLoad={(e) => setPhoto({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      </div>
    </div>
  );
}
