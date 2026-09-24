"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { TOUR_STEPS, type TourStep } from "./steps";

// Recordar que ya se hizo el tutorial (solo en este dispositivo).
const SEEN_KEY = "ratta:tour-seen";
const PAD = 8;
// Si lo que hay que resaltar no aparece (p. ej. una tarjeta oculta en
// Ajustes), la tarjeta sale centrada para no quedarse atascado.
const FIND_TIMEOUT_MS = 2500;

type TourContextValue = { start: () => void; active: boolean };
const TourContext = createContext<TourContextValue>({ start: () => {}, active: false });

export const useTour = () => useContext(TourContext);

export function markTourSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

export function hasSeenTour(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

type Rect = { top: number; left: number; width: number; height: number };

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const router = useRouter();

  const start = useCallback(() => {
    setIndex(0);
    router.push("/inicio");
  }, [router]);

  const value = useMemo(() => ({ start, active: index !== null }), [start, index]);

  const finish = useCallback(() => {
    markTourSeen();
    setIndex(null);
  }, []);

  return (
    <TourContext.Provider value={value}>
      {children}
      {index !== null && TOUR_STEPS[index] ? (
        <TourOverlay
          key={TOUR_STEPS[index].id}
          step={TOUR_STEPS[index]}
          number={index + 1}
          total={TOUR_STEPS.length}
          onNext={() => (index + 1 < TOUR_STEPS.length ? setIndex(index + 1) : finish())}
          onClose={finish}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step,
  number,
  total,
  onNext,
  onClose,
}: {
  step: TourStep;
  number: number;
  total: number;
  onNext: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [rect, setRect] = useState<Rect | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const onPage = !step.path || pathname === step.path || pathname.startsWith(step.path + "/");

  // Buscar lo que hay que resaltar y seguirlo (por si se mueve o haces scroll).
  useEffect(() => {
    if (!step.target || !onPage) return;
    let raf = 0;
    let scrolled = false;
    const startedAt = Date.now();
    const selector = `[data-tour="${step.target}"]`;

    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        const r = el.getBoundingClientRect();
        setRect((prev) =>
          prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
      } else if (Date.now() - startedAt > FIND_TIMEOUT_MS) {
        setGaveUp(true);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target, onPage]);

  // Pasos de "toca aquí": seguir en cuanto lo tocas.
  useEffect(() => {
    if (step.action !== "tap" || !step.target || !onPage) return;
    const selector = `[data-tour="${step.target}"]`;
    const onClick = (e: MouseEvent) => {
      const el = document.querySelector(selector);
      if (el && e.target instanceof Node && el.contains(e.target)) onNext();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step.action, step.target, onPage, onNext]);

  const hole = step.target && onPage && rect && !gaveUp
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;
  const canTap = step.action === "tap" && hole !== null;

  // La tarjeta va debajo de lo resaltado si cabe; si no, encima.
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const below = hole ? vh - (hole.top + hole.height) > 230 : false;
  const cardStyle: React.CSSProperties = hole
    ? below
      ? { top: hole.top + hole.height + 14 }
      : { bottom: vh - hole.top + 14 }
    : { top: "50%", transform: "translateY(-50%)" };

  return (
    // El contenedor deja pasar los toques (pointer-events-none): así el hueco
    // que brilla se puede tocar de verdad. Lo que bloquea son las cuatro
    // piezas oscuras de alrededor y la tarjeta (pointer-events-auto).
    <div className="pointer-events-none fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={step.title}>
      {hole ? (
        <>
          {/* El foco: un hueco con sombra enorme alrededor que oscurece el resto. */}
          <div
            className={`tour-hole pointer-events-none fixed rounded-2xl ${canTap ? "tour-hole-tap" : ""}`}
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
          {/* Bloquear toques fuera del hueco (y dentro, si no hay que tocar). */}
          <div className="pointer-events-auto fixed inset-x-0 top-0" style={{ height: Math.max(0, hole.top) }} />
          <div className="pointer-events-auto fixed inset-x-0 bottom-0" style={{ top: hole.top + hole.height }} />
          <div
            className="pointer-events-auto fixed left-0"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
          />
          <div
            className="pointer-events-auto fixed right-0"
            style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }}
          />
          {!canTap ? (
            <div
              className="pointer-events-auto fixed"
              style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            />
          ) : null}
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0" style={{ background: "rgba(10, 4, 8, 0.62)" }} />
      )}

      <div
        className="tour-card pointer-events-auto fixed inset-x-4 mx-auto max-w-sm rounded-2xl border p-4 shadow-2xl"
        style={{ ...cardStyle, background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>
            Tutorial · {number} de {total}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Salir del tutorial"
            className="-mr-1 -mt-1 rounded-full p-1"
            style={{ color: "var(--color-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-base font-bold" style={{ color: "var(--color-ink)" }}>
          {step.title}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          {step.body}
        </p>

        <div className="mt-3 h-1 overflow-hidden rounded-full" style={{ background: "var(--color-line)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(number / total) * 100}%`, backgroundImage: "var(--color-gradient)" }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-sm font-medium"
            style={{ color: "var(--color-muted)" }}
          >
            Saltar
          </button>
          {!onPage && step.path ? (
            <button
              type="button"
              onClick={() => router.push(step.path!)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundImage: "var(--color-gradient)" }}
            >
              Llévame
            </button>
          ) : canTap ? (
            <p className="text-sm font-semibold" style={{ color: "var(--color-accent)" }}>
              👆 Toca donde brilla
            </p>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundImage: "var(--color-gradient)" }}
            >
              {number === total ? "¡A disfrutar!" : "Siguiente"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
