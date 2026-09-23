import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayLabel, todayKey, toDateKey, weekKeys } from "@/lib/calendar/date-utils";
import { EventCard, type EventRow } from "./EventList";

export function WeekView({ refKey, events }: { refKey: string; events: EventRow[] }) {
  const days = weekKeys(refKey);
  const today = todayKey();

  const byDay = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = toDateKey(new Date(event.start_at));
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const prevRef = addDays(refKey, -7);
  const nextRef = addDays(refKey, 7);

  return (
    <div className="mx-5 flex flex-col gap-3">
      <div
        className="flex items-center justify-between rounded-2xl border p-3"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <Link
          href={`/calendario?view=week&ref=${prevRef}`}
          aria-label="Semana anterior"
          className="rounded-full p-1.5"
          style={{ color: "var(--color-muted)" }}
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="text-sm font-semibold capitalize" style={{ color: "var(--color-ink)" }}>
          {/* weekKeys() siempre devuelve exactamente 7 keys */}
          {dayLabel(days[0]!)} – {dayLabel(days[6]!)}
        </p>
        <Link
          href={`/calendario?view=week&ref=${nextRef}`}
          aria-label="Semana siguiente"
          className="rounded-full p-1.5"
          style={{ color: "var(--color-muted)" }}
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      {days.map((day) => {
        const dayEvents = byDay.get(day) ?? [];
        const isToday = day === today;

        return (
          <div key={day}>
            <p
              className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide"
              style={{ color: isToday ? "var(--color-accent-2)" : "var(--color-muted)" }}
            >
              {dayLabel(day)}
              {isToday ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: "var(--color-accent-2)", color: "#ffffff" }}
                >
                  Hoy
                </span>
              ) : null}
            </p>
            {dayEvents.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </ul>
            ) : (
              <p
                className="rounded-xl px-3 py-2.5 text-xs"
                style={{
                  color: "var(--color-muted)",
                  background: "color-mix(in srgb, var(--color-line) 50%, transparent)",
                }}
              >
                Sin planes
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
