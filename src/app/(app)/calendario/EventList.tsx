import { CalendarDays } from "lucide-react";

export type EventRow = {
  id: string;
  title: string;
  start_at: string;
  all_day: boolean;
};

function formatEventDate(startAt: string, allDay: boolean) {
  const date = new Date(startAt);
  const datePart = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);

  if (allDay) return datePart;

  const timePart = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${datePart} · ${timePart}`;
}

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
            {formatEventDate(event.start_at, event.all_day)}
          </p>
        </li>
      ))}
    </ul>
  );
}
