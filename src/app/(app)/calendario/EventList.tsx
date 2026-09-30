import Link from "next/link";
import { Bell, CalendarDays, MapPin, Repeat } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { eventHref, LOVE_COLOR, type EventRow } from "@/lib/events/load";
import { recurrenceLabel } from "@/lib/events/recurrence";
import { loveDayLabel } from "@/lib/couple";
import { deleteEvent } from "./actions";

export type { EventRow };

/** El plan de cada día 6: una tarjeta con degradado y corazones. */
function LoveDayCard({ event }: { event: EventRow }) {
  return (
    <li>
      <Link
        href={eventHref(event)}
        className="love-day relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 text-white"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <span aria-hidden className="love-day-hearts" />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">💞</span>
        <div className="relative min-w-0 flex-1">
          <p className="text-[13px] font-black tracking-wide">{event.title}</p>
          <p className="mt-0.5 text-xs font-semibold opacity-95">
            {formatDate(event.start_at)} · todo el día · {loveDayLabel(event.day, event.first_day)}
          </p>
          {event.photo_count > 0 ? (
            <p className="mt-1 text-xs font-semibold opacity-95">
              📸 {event.photo_count} {event.photo_count === 1 ? "foto" : "fotos"}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function EventCard({ event }: { event: EventRow }) {
  if (event.color === LOVE_COLOR) return <LoveDayCard event={event} />;
  const repeats = recurrenceLabel(event);

  return (
    <li
      className="flex items-start gap-3 rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
        borderColor: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-line))",
      }}
    >
      <Link href={eventHref(event)} className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-surface))",
            color: "var(--color-accent-2)",
          }}
        >
          <CalendarDays size={16} strokeWidth={2.3} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            {event.title}
            {event.remind_day_before ? (
              <Bell size={12} aria-label="Con aviso el día antes" style={{ color: "var(--color-muted)" }} />
            ) : null}
          </p>
          <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--color-accent-2)" }}>
            {event.all_day ? formatDate(event.start_at) : formatDateTime(event.start_at)}
          </p>
          {repeats ? (
            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--color-muted)" }}>
              <Repeat size={12} />
              {repeats}
            </p>
          ) : null}
          {event.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--color-muted)" }}>
              <MapPin size={12} />
              {event.location}
            </p>
          ) : null}
          {event.description ? (
            <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--color-muted)" }}>
              {event.description}
            </p>
          ) : null}
          {event.photo_count > 0 ? (
            <p className="mt-1 text-xs font-semibold" style={{ color: "var(--color-accent-2)" }}>
              📸 {event.photo_count} {event.photo_count === 1 ? "foto" : "fotos"}
            </p>
          ) : null}
        </div>
      </Link>

      <form action={deleteEvent}>
        <input type="hidden" name="eventId" value={event.id} />
        <ConfirmDeleteButton
          label="Borrar evento"
          confirmMessage={
            repeats
              ? `¿Borrar "${event.title}" y todas sus repeticiones? No se puede deshacer.`
              : `¿Borrar "${event.title}"? No se puede deshacer.`
          }
        />
      </form>
    </li>
  );
}

export function EventList({
  events,
  emptyMessage = "No hay eventos próximos todavía.",
}: {
  events: EventRow[];
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return (
      <div
        className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <CalendarDays size={24} style={{ color: "var(--color-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <ul className="mx-5 flex flex-col gap-2">
      {events.map((event) => (
        <EventCard key={`${event.id}-${event.day}`} event={event} />
      ))}
    </ul>
  );
}
