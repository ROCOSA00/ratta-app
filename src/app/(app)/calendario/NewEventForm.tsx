"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save } from "lucide-react";
import { createEvent, updateEvent, type NewEventState } from "./actions";
import { dayNumber, weekdayMon0 } from "@/lib/calendar/date-utils";
import type { Recurrence } from "@/lib/events/recurrence";

const initialState: NewEventState = { error: null };

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

/** Las opciones de "Se repite", con el día concreto si ya hay fecha. */
function repeatOptions(date: string): { value: Recurrence; label: string }[] {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const weekday = valid ? ` (${WEEKDAYS[weekdayMon0(date)]})` : "";
  return [
    { value: "none", label: "No se repite" },
    { value: "weekly", label: `Cada semana${weekday}` },
    { value: "biweekly", label: `Cada 2 semanas${weekday}` },
    { value: "monthly", label: `Cada mes${valid ? ` (día ${dayNumber(date)})` : ""}` },
    { value: "yearly", label: "Cada año" },
  ];
}

/** Lo que ya tiene un plan, para editarlo. */
export type EventFormValues = {
  eventId: string;
  title: string;
  date: string;
  /** "20:00" ("" si es de todo el día). */
  time: string;
  allDay: boolean;
  repeat: Recurrence;
  until: string;
  remind: boolean;
  location: string;
  description: string;
};

export function NewEventForm({ prefillTitle }: { prefillTitle?: string }) {
  return <EventForm prefillTitle={prefillTitle} />;
}

/** Formulario de un plan: vacío para crear uno, o relleno para editarlo. */
export function EventForm({ initial, prefillTitle }: { initial?: EventFormValues; prefillTitle?: string }) {
  const editing = !!initial;
  const [state, formAction, isPending] = useActionState(editing ? updateEvent : createEvent, initialState);
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [date, setDate] = useState(initial?.date ?? "");
  const [repeat, setRepeat] = useState<Recurrence>(initial?.repeat ?? "none");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Al crear, el formulario se vacía para el siguiente plan. Al editar,
    // al guardar se vuelve al plan (no hay nada que vaciar).
    if (!editing && !isPending && !state.error) {
      formRef.current?.reset();
      setAllDay(false);
      setDate("");
      setRepeat("none");
    }
  }, [editing, isPending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mx-5 flex flex-col gap-3 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      {initial ? <input type="hidden" name="eventId" value={initial.eventId} /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? prefillTitle}
          placeholder="Cena en casa"
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-[3] flex-col gap-1.5">
          <label htmlFor="date" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            {editing && repeat !== "none" ? "Primer día" : "Fecha"}
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
        {allDay ? null : (
          <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
            <label htmlFor="time" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
              Hora
            </label>
            <input
              id="time"
              name="time"
              type="time"
              required={!allDay}
              defaultValue={initial?.time || undefined}
              className="w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
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

      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="repeat" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            Se repite
          </label>
          <select
            id="repeat"
            name="repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as Recurrence)}
            className="w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          >
            {repeatOptions(date).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {repeat === "none" ? null : (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="until" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
              Hasta (opcional)
            </label>
            <input
              id="until"
              name="until"
              type="date"
              min={date || undefined}
              defaultValue={initial?.until || undefined}
              className="w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
        <input
          type="checkbox"
          name="remind"
          defaultChecked={initial?.remind}
          className="h-4 w-4 rounded"
          style={{ accentColor: "var(--color-accent-2)" }}
        />
        🔔 Avisarnos el día antes
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="location" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Ubicación (opcional)
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={initial?.location}
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
          defaultValue={initial?.description}
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
        {editing ? <Save size={16} /> : <Plus size={16} />}
        {isPending ? "Guardando…" : editing ? "Guardar cambios" : "Añadir evento"}
      </button>
    </form>
  );
}
