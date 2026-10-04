"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hasSeenNews, markNewsSeen, useTour } from "./Tour";
import { NEWS_ITEMS } from "./steps";



// Emojis que flotan alrededor del regalo.
const FLOATERS = ["🐱", "✨", "🐾", "🎉", "🐀", "💅"];

// Esperar a que termine la pantalla de carga antes de enseñarlo.
const DELAY_MS = 1600;

/**
 * Al entrar en la app tras una actualización: «¡Hay sorpresitas por
 * aquí!». Sale una sola vez por versión de novedades (en este
 * dispositivo) y ofrece el tutorial de novedades.
 */
export function WhatsNewPopup() {
  const [open, setOpen] = useState(false);
  const { start, active } = useTour();
  const pathname = usePathname();

  useEffect(() => {
    if (hasSeenNews()) return;
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // No molestar en mitad de un tutorial ni dentro del Wrapped.
  if (!open || active || pathname.startsWith("/wrapped")) return null;

  function later() {
    markNewsSeen();
    setOpen(false);
  }

  function show() {
    markNewsSeen();
    setOpen(false);
    start("news");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      className="fixed inset-0 z-[75] flex items-center justify-center p-5"
      style={{ background: "rgba(10, 4, 8, 0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
    >
      <div
        className="news-pop w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="relative flex h-40 items-center justify-center overflow-hidden" style={{ backgroundImage: "var(--color-gradient)" }}>
          <span aria-hidden className="love-day-hearts" />
          {FLOATERS.map((emoji, i) => (
            <span
              key={emoji}
              aria-hidden
              className="news-floater absolute text-2xl"
              style={{
                left: `${10 + ((i * 17) % 80)}%`,
                top: `${15 + ((i * 29) % 60)}%`,
                animationDelay: `${i * -0.7}s`,
              }}
            >
              {emoji}
            </span>
          ))}
          <span className="news-gift relative text-7xl drop-shadow-lg">🎁</span>
        </div>

        <div className="p-5">
          <h2 id="whats-new-title" className="text-center text-lg font-bold leading-snug" style={{ color: "var(--color-ink)" }}>
            ¡Hay sorpresitas por aquí que no te puedes perder!
          </h2>
          <p className="mt-1 text-center text-sm" style={{ color: "var(--color-muted)" }}>
            Hemos preparado cosas nuevas para vosotros (y para Kofi) 🐀💞
          </p>

          <ul className="mt-4 grid grid-cols-2 gap-1.5">
            {NEWS_ITEMS.map((item, i) => (
              <li
                key={item.label}
                className="news-chip flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-bg))",
                  color: "var(--color-ink)",
                  animationDelay: `${150 + i * 60}ms`,
                }}
              >
                <span className="text-base">{item.emoji}</span>
                {item.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={show}
            className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            ¡Enséñamelo! ✨
          </button>
          <button
            type="button"
            onClick={later}
            className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm font-medium"
            style={{ color: "var(--color-muted)" }}
          >
            Luego (está en Perfil → Cómo funciona Ratta)
          </button>
        </div>
      </div>
    </div>
  );
}
