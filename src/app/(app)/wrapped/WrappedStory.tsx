"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import type { Slide } from "@/lib/wrapped/slides";

const SLIDE_MS = 6500;
const fmt = new Intl.NumberFormat("es-ES");

function reducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** El número grande sube de 0 a su valor (salvo con animaciones quitadas). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{fmt.format(shown)}</>;
}

/**
 * Ratta Wrapped, como las historias de Instagram: cada pantalla dura unos
 * segundos; tocando a la derecha se pasa, a la izquierda se vuelve, y
 * manteniendo pulsado se para.
 */
export function WrappedStory({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pressedAt = useRef(0);
  const router = useRouter();
  const slide = slides[index] ?? slides[0]!;
  const last = index === slides.length - 1;

  // Avance automático (se para en la última y mientras mantienes pulsado).
  useEffect(() => {
    setElapsed(0);
  }, [index]);
  useEffect(() => {
    if (paused || last) return;
    const step = 100;
    const timer = window.setInterval(() => {
      setElapsed((e) => {
        if (e + step >= SLIDE_MS) {
          setIndex((i) => Math.min(i + 1, slides.length - 1));
          return 0;
        }
        return e + step;
      });
    }, step);
    return () => window.clearInterval(timer);
  }, [paused, last, slides.length, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") router.push("/perfil");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, slides.length]);

  function onPointerDown() {
    pressedAt.current = Date.now();
    setPaused(true);
  }

  function onPointerUp(e: React.PointerEvent) {
    setPaused(false);
    // Un toque corto navega; mantener pulsado solo pausaba.
    if (Date.now() - pressedAt.current > 300) return;
    const half = e.currentTarget.getBoundingClientRect().width / 3;
    if (e.clientX - e.currentTarget.getBoundingClientRect().left < half) setIndex((i) => Math.max(i - 1, 0));
    else setIndex((i) => Math.min(i + 1, slides.length - 1));
  }

  const maxBar = Math.max(1, ...(slide.bars ?? []).map((b) => b.value));

  return (
    <div
      role="dialog"
      aria-label="Ratta Wrapped"
      className="fixed inset-0 z-[80] flex select-none flex-col text-white transition-[background] duration-700"
      style={{ background: `linear-gradient(160deg, ${slide.colors[0]}, ${slide.colors[1]})` }}
    >
      <div
        className="flex gap-1 px-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        aria-hidden
      >
        {slides.map((s, i) => (
          <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="block h-full rounded-full bg-white"
              style={{ width: i < index ? "100%" : i === index ? (last ? "100%" : `${(elapsed / SLIDE_MS) * 100}%`) : "0%" }}
            />
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">Ratta Wrapped</p>
        <button
          type="button"
          onClick={() => router.push("/perfil")}
          aria-label="Cerrar"
          className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="relative flex flex-1 touch-none flex-col items-center justify-center px-7 text-center"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setPaused(false)}
      >
        <div key={slide.id} className="wrapped-in flex w-full max-w-sm flex-col items-center gap-3">
          <span className="wrapped-emoji text-6xl">{slide.emoji}</span>
          <p className="text-sm font-semibold uppercase tracking-wide opacity-90">{slide.kicker}</p>
          <p
            className={`font-black leading-tight drop-shadow-sm ${typeof slide.big === "number" ? "font-mono-nums text-6xl" : "text-4xl"}`}
          >
            {typeof slide.big === "number" ? <CountUp value={slide.big} /> : slide.big}
          </p>
          <p className="text-lg font-semibold opacity-95">{slide.unit}</p>

          {slide.bars ? (
            <div className="mt-3 flex w-full flex-col gap-2">
              {slide.bars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-2 text-left text-sm font-semibold">
                  <span className="w-20 truncate">{bar.label}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-white/25">
                    <span
                      className="wrapped-bar block h-full rounded-full bg-white"
                      style={{ width: `${Math.max(4, (bar.value / maxBar) * 100)}%` }}
                    />
                  </span>
                  <span className="w-14 text-right font-mono-nums">{fmt.format(bar.value)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {slide.photo ? (
            <figure className="mt-3 w-full max-w-[260px] rotate-[-2deg] rounded-xl bg-white p-2 pb-3 text-[#1b1216] shadow-xl">
              <Image
                src={slide.photo.url}
                alt=""
                width={520}
                height={520}
                unoptimized
                className="aspect-square w-full rounded-lg object-cover"
              />
              {slide.photo.caption ? (
                <figcaption className="member-signature mt-2 text-lg leading-tight">{slide.photo.caption}</figcaption>
              ) : null}
            </figure>
          ) : null}

          {slide.lines.map((line) => (
            <p key={line} className="text-sm font-medium opacity-95">
              {line}
            </p>
          ))}

          {last ? (
            <div className="relative z-10 mt-6 flex gap-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIndex(0)}
                className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2.5 text-sm font-semibold"
              >
                <RotateCcw size={15} />
                Ver otra vez
              </button>
              <button
                type="button"
                onClick={() => router.push("/perfil")}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold"
                style={{ color: slide.colors[0] }}
              >
                Cerrar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
