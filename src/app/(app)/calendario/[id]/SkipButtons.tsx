"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Undo2 } from "lucide-react";
import { setOccurrenceSkipped } from "../actions";
import { dayLabel } from "@/lib/calendar/date-utils";

/** «Esta vez no» para un día de un plan que se repite. */
export function SkipOccurrenceButton({ eventId, day, title }: { eventId: string; day: string; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function skip() {
    if (!window.confirm(`¿Quitar «${title}» solo el ${dayLabel(day)}? Las demás veces siguen igual.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await setOccurrenceSkipped(eventId, day, true);
      if (result.error) setError(result.error);
      else router.push(`/calendario?view=month&ref=${day}`);
    });
  }

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={skip}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold disabled:opacity-60"
        style={{ borderColor: "var(--color-line)", color: "var(--color-ink)", background: "var(--color-surface)" }}
      >
        <CalendarOff size={15} />
        {isPending ? "Quitando…" : "Esta vez no"}
      </button>
      {error ? (
        <p className="mt-1.5 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Las veces saltadas que aún no han pasado, con «Recuperar». */
export function SkippedDays({ eventId, days }: { eventId: string; days: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (days.length === 0) return null;

  function restore(day: string) {
    setError(null);
    setPendingDay(day);
    startTransition(async () => {
      const result = await setOccurrenceSkipped(eventId, day, false);
      setPendingDay(null);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        Días que no toca
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {days.map((day) => (
          <li key={day} className="flex items-center justify-between gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
            <span className="inline-block line-through decoration-1 opacity-70 first-letter:uppercase">{dayLabel(day)}</span>
            <button
              type="button"
              onClick={() => restore(day)}
              disabled={pendingDay !== null}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
              style={{ color: "var(--color-accent-2)", background: "color-mix(in srgb, var(--color-accent-2) 12%, transparent)" }}
            >
              <Undo2 size={12} />
              {pendingDay === day ? "Recuperando…" : "Recuperar"}
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-1.5 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
