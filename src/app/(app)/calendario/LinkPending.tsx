"use client";

import { useLinkStatus } from "next/link";

/**
 * Dentro de un <Link>: mientras llega la pantalla nueva, lo tocado late un
 * poco. Así se nota al instante que el toque ha funcionado.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="link-pending pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{ background: "color-mix(in srgb, var(--color-accent-2) 22%, transparent)" }}
    />
  );
}
