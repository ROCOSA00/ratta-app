"use client";

import { useEffect, useState } from "react";
import { RattaLogo } from "./RattaLogo";

// Cuánto se ve la pantalla de carga: la barra llega al final y luego se
// desvanece. Corto a propósito, para que no estorbe.
const FILL_MS = 900;
const FADE_MS = 350;

/**
 * Pantalla de bienvenida al abrir la app: logo en el centro y una barra de
 * progreso. Está en el layout de la app, que solo se pinta entero al
 * cargar la app (no al cambiar de pestaña ni al volver del segundo plano).
 *
 * Viene ya pintada desde el servidor, así que se ve desde el primer
 * instante. Si por lo que sea el JavaScript no llegara a quitarla, el CSS
 * la quita solo a los 3 segundos (.splash): nunca te deja bloqueado.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"loading" | "leaving" | "gone">("loading");

  useEffect(() => {
    const leave = window.setTimeout(() => setPhase("leaving"), FILL_MS);
    const gone = window.setTimeout(() => setPhase("gone"), FILL_MS + FADE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="splash fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5"
      style={{
        background:
          "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--color-accent) 12%, var(--color-bg)) 0%, var(--color-bg) 60%)",
        opacity: phase === "leaving" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <span
        className="splash-logo flex h-24 w-24 items-center justify-center rounded-[26%] p-5 shadow-xl"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <RattaLogo className="h-full w-full text-white" />
      </span>
      <p className="text-2xl font-bold" style={{ color: "var(--color-ink)", fontFamily: "Quicksand, sans-serif" }}>
        Ratta
      </p>
      <div className="h-1.5 w-40 overflow-hidden rounded-full" style={{ background: "var(--color-line)" }}>
        <div className="splash-bar h-full rounded-full" style={{ backgroundImage: "var(--color-gradient)" }} />
      </div>
    </div>
  );
}
