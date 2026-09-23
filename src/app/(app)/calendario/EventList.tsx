import { CalendarDays, MapPin } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { deleteEvent } from "./actions";

export type EventRow = {
  id: string;
  title: string;
  start_at: string;
  all_day: boolean;
  location: string | null;
  description: string | null;
};

export function EventList({ events }: { events: EventRow[] }) {
  if (events.length === 0) {
    return (
      <div
        className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <CalendarDays size={24} style={{ color: "var(--color-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No hay eventos próximos todavía.
        </p>
      </div>
    );
  }

  return (
    <ul className="mx-5 flex flex-col gap-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-start gap-3 rounded-2xl border p-4"
          style={{
            background: "color-mix(in srgb, var(--color-accent-2) 6%, var(--color-surface))",
            borderColor: "color-mix(in srgb, var(--color-accent-2) 18%, var(--color-line))",
          }}
        >
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
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              {event.title}
            </p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--color-accent-2)" }}>
              {event.all_day ? formatDate(event.start_at) : formatDateTime(event.start_at)}
            </p>
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
          </div>

          <form action={deleteEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <ConfirmDeleteButton
              label="Borrar evento"
              confirmMessage={`¿Borrar "${event.title}"? No se puede deshacer.`}
            />
          </form>
        </li>
      ))}
    </ul>
  );
}
