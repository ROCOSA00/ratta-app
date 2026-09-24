/**
 * Cuentas del editor de recorte (sin nada de pantalla, para poder probarlas).
 *
 * La foto se ve dentro de un marco de fw × fh píxeles. Con zoom 1 la foto
 * "cubre" el marco justo (como object-fit: cover); el zoom la amplía a
 * partir de ahí. (x, y) es dónde queda la esquina superior izquierda de la
 * foto dentro del marco: siempre ≤ 0, para que nunca quede hueco vacío.
 */

export type Size = { w: number; h: number };
export type View = { zoom: number; x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** Escala de la foto (píxeles de pantalla por píxel de la foto). */
export function scaleFor(image: Size, frame: Size, zoom: number): number {
  return Math.max(frame.w / image.w, frame.h / image.h) * zoom;
}

/** Ajusta zoom y posición para que la foto siempre cubra el marco entero. */
export function clampView(image: Size, frame: Size, view: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom));
  const s = scaleFor(image, frame, zoom);
  const minX = frame.w - image.w * s;
  const minY = frame.h - image.h * s;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, view.x)),
    y: Math.min(0, Math.max(minY, view.y)),
  };
}

/** Vista inicial: sin zoom y centrada. */
export function initialView(image: Size, frame: Size): View {
  const s = scaleFor(image, frame, 1);
  return clampView(image, frame, { zoom: 1, x: (frame.w - image.w * s) / 2, y: (frame.h - image.h * s) / 2 });
}

/**
 * Cambia el zoom manteniendo quieto el punto (px, py) del marco (donde están
 * los dedos al pellizcar, o el centro con la barra).
 */
export function zoomAround(image: Size, frame: Size, view: View, zoom: number, px: number, py: number): View {
  const s0 = scaleFor(image, frame, view.zoom);
  const s1 = scaleFor(image, frame, Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)));
  // Punto de la foto que está bajo (px, py): debe seguir ahí tras el zoom.
  const ix = (px - view.x) / s0;
  const iy = (py - view.y) / s0;
  return clampView(image, frame, { zoom, x: px - ix * s1, y: py - iy * s1 });
}

/** El trozo de la foto original (en sus píxeles) que se ve dentro del marco. */
export function cropRect(image: Size, frame: Size, view: View): { sx: number; sy: number; sw: number; sh: number } {
  const s = scaleFor(image, frame, view.zoom);
  // "0 -" en vez de "-": así sale 0 y no -0 cuando la foto está en el borde.
  return { sx: 0 - view.x / s, sy: 0 - view.y / s, sw: frame.w / s, sh: frame.h / s };
}
