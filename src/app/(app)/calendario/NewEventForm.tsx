"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { createEvent, updateEvent, type NewEventState } from "./actions";
import { dayLabel, dayNumber, weekdayMon0 } from "@/lib/calendar/date-utils";
import type { Recurrence } from "@/lib/events/recurrence";
import { PickerField } from "@/components/shared/PickerField";

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

/**
 * «Crear un plan»: un botón que abre el formulario con una explicación de
 * cada cosa. Se abre solo si llega un título (desde la lista de deseos).
 * `defaultDate`: el día que estás mirando en el mes.
 */
export function NewEventForm({ prefillTitle, defaultDate }: { prefillTitle?: string; defaultDate?: string }) {
  const [open, setOpen] = useState(!!prefillTitle);
  const [created, setCreated] = useState(false);

  if (!open) {
    return (
      <div className="mx-5 flex flex-col gap-2">
        {created ? (
          <p className="text-center text-sm font-semibold" style={{ color: "var(--color-accent-2)" }}>
            ✅ ¡Plan creado! Ya está en el calendario.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setCreated(false);
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow-lg"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <Plus size={18} />
          Crear un plan
          {defaultDate ? <span className="font-medium opacity-90">· {dayLabel(defaultDate)}</span> : null}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="mx-5 rounded-2xl border p-4 text-sm"
        style={{
          background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
          borderColor: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-line))",
          color: "var(--color-ink)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold">📅 Nuevo plan</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-full p-1"
            style={{ color: "var(--color-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
          <li>📝 <b>Título y día</b>, y la hora (o marca «Todo el día»).</li>
          <li>🔁 <b>Se repite</b>: cada semana, cada 2 semanas, cada mes o cada año, hasta el día que quieras.</li>
          <li>🔔 <b>Avisarnos el día antes</b>: os llega una notificación la noche anterior, a las 20:00.</li>
          <li>📍 <b>Ubicación y notas</b>, si queréis. A tu pareja le llega un aviso del plan nuevo.</li>
          <li>👆 Luego, tocando el plan, podéis editarlo, añadirle fotos o, si se repite, quitar un solo día.</li>
        </ul>
      </div>
      <EventForm
        prefillTitle={prefillTitle}
        defaultDate={defaultDate}
        onCreated={() => {
          setCreated(true);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Formulario de un plan: vacío para crear uno, o relleno para editarlo. */
export function EventForm({
  initial,
  prefillTitle,
  defaultDate,
  onCreated,
}: {
  initial?: EventFormValues;
  prefillTitle?: string;
  /** Día con el que empieza el formulario al crear. */
  defaultDate?: string;
  /** Al crear un plan con éxito. */
  onCreated?: () => void;
}) {
  const editing = !!initial;
  const [state, formAction, isPending] = useActionState(editing ? updateEvent : createEvent, initialState);
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? "");
  const [repeat, setRepeat] = useState<Recurrence>(initial?.repeat ?? "none");
  const [time, setTime] = useState(initial?.time ?? "");
  const [until, setUntil] = useState(initial?.until ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  // Se ha enviado el formulario (para no confundir el primer render con
  // un plan recién creado).
  const submitted = useRef(false);

  useEffect(() => {
    // Al crear, tras guardar bien, el formulario se vacía para el siguiente
    // plan. Al editar, al guardar se vuelve al plan (no hay nada que vaciar).
    if (editing || isPending || state.error || !submitted.current) return;
    submitted.current = false;
    formRef.current?.reset();
    setAllDay(false);
    setDate(defaultDate ?? "");
    setTime("");
    setUntil("");
    setRepeat("none");
    onCreated?.();
  }, [editing, isPending, state.error, defaultDate, onCreated]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => {
        submitted.current = true;
      }}
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
          <PickerField
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={setDate}
            placeholder="Elige el día"
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
        {allDay ? null : (
          <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
            <label htmlFor="time" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
              Hora
            </label>
            <PickerField
              id="time"
              name="time"
              type="time"
              required={!allDay}
              value={time}
              onChange={setTime}
              placeholder="--:--"
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

      {/* Repetición y aviso, juntos: el tutorial de novedades los resalta. */}
      <div data-tour="cal-repeat" className="flex flex-col gap-3">
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
              <PickerField
                id="until"
                name="until"
                type="date"
                min={date || undefined}
                value={until}
                onChange={setUntil}
                placeholder="Para siempre"
                className="rounded-xl border px-3 py-2.5 text-sm outline-none"
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
      </div>

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
        {isPending ? "Guardando…" : editing ? "Guardar cambios" : "Crear plan"}
      </button>
    </form>
  );
}
