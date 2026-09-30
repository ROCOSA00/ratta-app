"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { setEventReminder } from "../actions";

/** Activar o quitar el aviso del día antes de un plan. */
export function ReminderToggle({ eventId, on, recurring }: { eventId: string; on: boolean; recurring: boolean }) {
  const [optimisticOn, setOptimisticOn] = useOptimistic(on);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !optimisticOn;
    setError(null);
    startTransition(async () => {
      setOptimisticOn(next);
      const result = await setEventReminder(eventId, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mx-5">
      <button
        type="button"
        role="switch"
        aria-checked={optimisticOn}
        onClick={toggle}
        disabled={isPending}
        className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: optimisticOn
              ? "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-surface))"
              : "var(--color-line)",
            color: optimisticOn ? "var(--color-accent-2)" : "var(--color-muted)",
          }}
        >
          {optimisticOn ? <Bell size={16} /> : <BellOff size={16} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            Avisarnos el día antes
          </span>
          <span className="block text-xs" style={{ color: "var(--color-muted)" }}>
            {optimisticOn
              ? `Os llegará una notificación la noche antes (a las 20:00)${recurring ? ", cada vez" : ""}.`
              : "Sin aviso."}
          </span>
        </span>
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
          style={{ background: optimisticOn ? "var(--color-accent)" : "var(--color-line)" }}
        >
          <span
            className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left]"
            style={{ left: optimisticOn ? "calc(100% - 1.5rem)" : "0.25rem" }}
          />
        </span>
      </button>
      {error ? (
        <p className="mt-1.5 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
