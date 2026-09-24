"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { sendHearts } from "@/lib/hearts/actions";
import { vibrate } from "@/lib/prefs-client";
import type { HeartsSummary } from "@/lib/hearts/get-hearts-summary";
import type { HeartPeriod } from "@/lib/hearts/stats";
import { dayLabel, todayKey } from "@/lib/calendar/date-utils";

const FLOAT_EMOJIS = ["❤️", "💖", "💕", "💗", "💘", "💞"];
// Los toques se agrupan: se envían tras un momento sin tocar, o al llegar
// a un paquete grande. Así puedes aporrear el botón sin mandar una
// petición por toque.
const FLUSH_AFTER_MS = 900;
const FLUSH_AT = 100;
const MAX_PER_REQUEST = 300;

const PERIODS: { id: HeartPeriod; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "total", label: "Total" },
];

type Float = { id: number; emoji: string; left: number; dx: number };

export function HeartsGame({ summary }: { summary: HeartsSummary }) {
  // Corazones que has mandado en esta visita: se suman al instante a todos
  // tus contadores, sin esperar al servidor.
  const [extra, setExtra] = useState(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const [beat, setBeat] = useState(0);
  const [period, setPeriod] = useState<HeartPeriod>("today");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(0);
  const timer = useRef<number | null>(null);
  const nextId = useRef(0);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    while (pending.current > 0) {
      const n = Math.min(pending.current, MAX_PER_REQUEST);
      pending.current -= n;
      void sendHearts(n).then((res) => {
        if (res.error) {
          // Si no se guardaron, que no cuenten en pantalla.
          setExtra((v) => v - n);
          setError(res.error);
        }
      });
    }
  }, []);

  // Al salir de la pantalla o cerrar la app, se envía lo que quede.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  function tap() {
    setError(null);
    setExtra((v) => v + 1);
    setBeat((v) => v + 1);
    pending.current += 1;

    const id = nextId.current++;
    const float: Float = {
      id,
      emoji: FLOAT_EMOJIS[id % FLOAT_EMOJIS.length]!,
      left: 25 + Math.random() * 50,
      dx: Math.random() * 80 - 40,
    };
    // Como mucho unos cuantos a la vez, para que vaya fluido aunque pulses muy rápido.
    setFloats((current) => [...current.slice(-14), float]);
    window.setTimeout(() => setFloats((current) => current.filter((f) => f.id !== id)), 950);
    vibrate(8);

    if (pending.current >= FLUSH_AT) {
      flush();
    } else {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, FLUSH_AFTER_MS);
    }
  }

  const mine = summary.me.totals[period] + extra;
  const theirs = summary.partner?.totals[period] ?? 0;
  const max = Math.max(mine, theirs, 1);
  const rows = [
    { key: "me", name: summary.me.name, value: mine, color: "var(--color-accent)" },
    ...(summary.partner
      ? [{ key: "partner", name: summary.partner.name, value: theirs, color: "var(--color-accent-2)" }]
      : []),
  ];
  const leader = !summary.partner || mine === theirs ? null : mine > theirs ? "me" : "partner";

  const myToday = summary.me.totals.today + extra;
  const record =
    summary.record && summary.record.count >= myToday
      ? summary.record
      : myToday > 0
        ? { name: "Tú", day: todayKey(), count: myToday }
        : null;

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="mx-5 flex flex-col items-center gap-3">
        <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
          Hoy has mandado
        </p>
        {/* Por encima de los corazones que suben, para que siempre se lea. */}
        <p
          className="font-mono-nums relative z-10 text-5xl font-bold leading-none"
          style={{ color: "var(--color-accent)" }}
        >
          {myToday}
        </p>

        <div className="relative mt-4 flex h-52 w-full items-end justify-center">
          {floats.map((f) => (
            <span
              key={f.id}
              aria-hidden
              className="pointer-events-none absolute bottom-24 text-3xl"
              style={
                {
                  left: `${f.left}%`,
                  "--dx": `${f.dx}px`,
                  animation: "heart-float 0.9s ease-out forwards",
                } as React.CSSProperties
              }
            >
              {f.emoji}
            </span>
          ))}
          <button
            type="button"
            aria-label="Mandar un corazón"
            onPointerDown={(e) => {
              // Al tocar (no al soltar): responde al instante y deja pulsar muy rápido.
              e.preventDefault();
              tap();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                tap();
              }
            }}
            className="flex h-44 w-44 select-none items-center justify-center rounded-full text-white shadow-2xl"
            style={{
              backgroundImage: "var(--color-gradient)",
              touchAction: "manipulation",
              WebkitUserSelect: "none",
              boxShadow: "0 18px 40px -12px color-mix(in srgb, var(--color-accent) 70%, transparent)",
            }}
          >
            <span key={beat} className="flex" style={{ animation: beat ? "heart-pop 0.18s ease-out" : undefined }}>
              <Heart size={84} fill="currentColor" strokeWidth={1.5} />
            </span>
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
          ¡Pulsa, pulsa, pulsa! Cada toque es un corazón
          {summary.partner ? ` para ${summary.partner.name}` : ""} 💘
        </p>
        {error ? (
          <p className="text-center text-sm" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="mx-5 rounded-2xl border p-4"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent) 20%, var(--color-line))",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>
          🏆 Ranking
        </p>
        <div className="mt-3 flex gap-1 rounded-full p-1" role="tablist" style={{ background: "var(--color-line)" }}>
            {PERIODS.map((p) => {
              const active = p.id === period;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(p.id)}
                  className="flex-1 rounded-full py-1.5 text-xs font-semibold"
                  style={{
                    background: active ? "var(--color-accent)" : "transparent",
                    color: active ? "var(--color-accent-ink)" : "var(--color-muted)",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
                  {leader === r.key ? "👑 " : ""}
                  {r.name}
                </span>
                <span className="font-mono-nums font-bold" style={{ color: r.color }}>
                  {r.value} ❤️
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--color-line)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-sm font-medium" style={{ color: "var(--color-muted)" }}>
          {!summary.partner
            ? "Cuando tu pareja entre, aparecerá aquí."
            : leader === null
              ? mine === 0
                ? "Nadie ha mandado corazones todavía 🥺"
                : "Empate técnico ⚖️"
              : leader === "me"
                ? "¡Vas ganando! 😎"
                : `Va ganando ${summary.partner.name} 😤 ¡Pulsa más!`}
        </p>

        {record ? (
          <p className="mt-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
            Récord en un día: <b style={{ color: "var(--color-ink)" }}>{record.count} ❤️</b> · {record.name} (
            {dayLabel(record.day)})
          </p>
        ) : null}
      </div>
    </div>
  );
}
