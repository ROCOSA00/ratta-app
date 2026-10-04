"use client";

import { useState } from "react";
import { dayLabel, daysBetween } from "@/lib/calendar/date-utils";
import { formatWeight } from "@/lib/pets/config";
import type { PetWeight } from "@/lib/pets/get-pet";

const W = 320;
const H = 160;
const PAD = { top: 16, right: 14, bottom: 26, left: 44 };

/**
 * Cómo va creciendo: una línea con un punto por pesada. Tocando (o pasando
 * por encima de) un punto se ve el peso de ese día. La lista de debajo es
 * la tabla con todos los valores.
 */
export function WeightChart({ weights }: { weights: PetWeight[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (weights.length === 0) return null;

  const first = weights[0]!.day;
  const last = weights[weights.length - 1]!.day;
  const span = Math.max(1, daysBetween(first, last));
  const max = Math.max(...weights.map((w) => w.grams));
  const min = Math.min(...weights.map((w) => w.grams));
  // Eje desde 0 si es poca diferencia relativa; si no, con margen.
  const lo = Math.max(0, Math.floor((min * 0.8) / 100) * 100);
  const hi = Math.ceil((max * 1.1) / 100) * 100 || 100;
  const x = (day: string) => PAD.left + (daysBetween(first, day) / span) * (W - PAD.left - PAD.right);
  const y = (g: number) => PAD.top + (1 - (g - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const points = weights.map((w) => ({ ...w, px: weights.length === 1 ? W / 2 : x(w.day), py: y(w.grams) }));
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  const shown = active !== null ? points[active] : points[points.length - 1];

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Peso: de ${formatWeight(weights[0]!.grams)} a ${formatWeight(weights[weights.length - 1]!.grams)}`}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--color-muted)">
              {formatWeight(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 8} fontSize={9} fill="var(--color-muted)">
          {dayLabel(first)}
        </text>
        {weights.length > 1 ? (
          <text x={W - PAD.right} y={H - 8} fontSize={9} textAnchor="end" fill="var(--color-muted)">
            {dayLabel(last)}
          </text>
        ) : null}

        {points.length > 1 ? (
          <polyline
            points={points.map((p) => `${p.px},${p.py}`).join(" ")}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {active !== null && shown ? (
          <line
            x1={shown.px}
            x2={shown.px}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--color-muted)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        ) : null}

        {points.map((p, i) => (
          <g key={p.id}>
            {/* Punto visible (con un aro del color del fondo) y zona de toque más grande. */}
            <circle
              cx={p.px}
              cy={p.py}
              r={i === active ? 5.5 : 4}
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
            <circle
              cx={p.px}
              cy={p.py}
              r={14}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              <title>{`${dayLabel(p.day)}: ${formatWeight(p.grams)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      {shown ? (
        <figcaption className="mt-1 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
            {formatWeight(shown.grams)}
          </span>{" "}
          el {dayLabel(shown.day)}
          {active === null && points.length > 1 ? " · toca un punto para ver otro día" : ""}
        </figcaption>
      ) : null}
    </figure>
  );
}
