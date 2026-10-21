/**
 * Cuentas del visor de fotos a pantalla completa (sin nada de pantalla,
 * para poder probarlas). La foto se ve entera dentro del marco (como
 * object-fit: contain) y se amplía con `scale(z)` desde la esquina de
 * arriba a la izquierda, movida (x, y) píxeles.
 */

export type Box = { w: number; h: number };
export type ZoomView = { z: number; x: number; y: number };

export const MAX_PHOTO_ZOOM = 4;
/** Zoom del doble toque. */
export const DOUBLE_TAP_ZOOM = 2.5;
export const NO_ZOOM: ZoomView = { z: 1, x: 0, y: 0 };

/** Dónde se ve la foto dentro del marco sin zoom (centrada, entera). */
export function containRect(photo: Box, frame: Box): { left: number; top: number; w: number; h: number } {
  const s = Math.min(frame.w / photo.w, frame.h / photo.h);
  const w = photo.w * s;
  const h = photo.h * s;
  return { left: (frame.w - w) / 2, top: (frame.h - h) / 2, w, h };
}

/** Un eje: si la foto cabe, centrada; si no, sin dejar hueco a los lados. */
function clampAxis(offset: number, start: number, size: number, frameSize: number, z: number): number {
  const scaled = size * z;
  if (scaled <= frameSize) return (frameSize - scaled) / 2 - start * z;
  // "0 -" en vez de "-": así sale 0 y no -0 cuando la foto toca el borde.
  return Math.min(0 - start * z, Math.max(frameSize - (start + size) * z, offset));
}

/** Zoom entre 1 y el máximo, y la foto siempre dentro (sin irse por los bordes). */
export function clampZoomView(photo: Box, frame: Box, view: ZoomView): ZoomView {
  const z = Math.min(MAX_PHOTO_ZOOM, Math.max(1, view.z));
  const r = containRect(photo, frame);
  return {
    z,
    x: clampAxis(view.x, r.left, r.w, frame.w, z),
    y: clampAxis(view.y, r.top, r.h, frame.h, z),
  };
}

/** Cambia el zoom dejando quieto el punto (px, py) del marco (donde están los dedos). */
export function zoomAt(photo: Box, frame: Box, view: ZoomView, z: number, px: number, py: number): ZoomView {
  const next = Math.min(MAX_PHOTO_ZOOM, Math.max(1, z));
  const cx = (px - view.x) / view.z;
  const cy = (py - view.y) / view.z;
  return clampZoomView(photo, frame, { z: next, x: px - cx * next, y: py - cy * next });
}
