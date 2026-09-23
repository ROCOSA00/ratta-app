"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createEvent, type NewEventState } from "./actions";

const initialState: NewEventState = { error: null };

export function NewEventForm() {
  const [state, formAction, isPending] = useActionState(createEvent, initialState);
  const [allDay, setAllDay] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && !state.error) {
      formRef.current?.reset();
      setAllDay(false);
    }
  }, [isPending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mx-5 flex flex-col gap-3 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Cena en casa"
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="date" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
        {allDay ? null : (
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="time" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
              Hora
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required={!allDay}
              className="rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
        <input
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          className="h-4 w-4 rounded"
          style={{ accentColor: "var(--color-accent-2)" }}
        />
        Todo el día
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Ubicación (opcional)
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="En casa, restaurante..."
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Notas (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Algo que recordar sobre el plan..."
          className="resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>

      {state.error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <Plus size={16} />
        {isPending ? "Guardando…" : "Añadir evento"}
      </button>
    </form>
  );
}
