"use client";

import { useEffect, useState } from "react";
import { MOMENT_WINDOW_SECONDS } from "@/lib/moments/config";

/** Cuenta atrás de los 10 minutos desde que sonó el Momento de hoy. */
export function MomentCountdown({ notifiedAt, className }: { notifiedAt: string; className?: string }) {
  // Se calcula solo en el navegador (con su reloj), para no descuadrar con
  // la hora a la que el servidor generó la página.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (now === null) return <span className={className}>…</span>;

  const deadline = new Date(notifiedAt).getTime() + MOMENT_WINDOW_SECONDS * 1000;
  const left = Math.round((deadline - now) / 1000);

  if (left <= 0) {
    const late = Math.max(1, Math.round(-left / 60));
    return <span className={className}>Llegas {late} min tarde, ¡pero aún puedes subirla!</span>;
  }
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <span className={className}>
      Te quedan <b className="font-mono-nums">{mm}:{ss}</b>
    </span>
  );
}
