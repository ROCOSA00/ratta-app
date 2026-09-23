import { CalendarDays } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format-date";

export type EventRow = {
  id: string;
  title: string;
  start_at: string;
  all_day: boolean;
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
          className="rounded-2xl border p-4"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            {event.title}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-muted)" }}>
            {event.all_day ? formatDate(event.start_at) : formatDateTime(event.start_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
