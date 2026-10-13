import Link from "next/link";
import { LinkPending } from "./LinkPending";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  dayNumber,
  isSameMonth,
  monthGridKeys,
  monthLabel,
  todayKey,
  WEEKDAY_LABELS,
  weekdayMon0,
} from "@/lib/calendar/date-utils";
import { LOVE_COLOR, type EventRow } from "@/lib/events/load";

export function MonthView({
  refKey,
  events,
  momentDays,
  photoDays = new Set(),
}: {
  refKey: string;
  events: EventRow[];
  /** Días con fotos del Momento Ratta. */
  momentDays: Set<string>;
  /** Días con fotos «porque sí». */
  photoDays?: Set<string>;
}) {
  const grid = monthGridKeys(refKey);
  const today = todayKey();
  const trips = events.filter((e) => e.last_day !== e.first_day);
  const eventDays = new Set(
    events.filter((e) => e.color !== LOVE_COLOR && e.last_day === e.first_day).map((e) => e.day),
  );
  // Días de viaje: una barra que los une. Empieza en el primer día y acaba
  // en el último (si se juntan dos viajes, sigue mientras alguno siga).
  const tripDays = new Map<string, { first: boolean; last: boolean }>();
  for (const trip of trips) {
    const prev = tripDays.get(trip.day);
    tripDays.set(trip.day, {
      first: (prev?.first ?? true) && trip.day === trip.first_day,
      last: (prev?.last ?? true) && trip.day === trip.last_day,
    });
  }
  const loveDays = new Set(events.filter((e) => e.color === LOVE_COLOR).map((e) => e.day));
  const prevRef = addMonths(refKey, -1);
  const nextRef = addMonths(refKey, 1);

  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <div className="flex items-center justify-between">
        <Link
          href={`/calendario?view=month&ref=${prevRef}`}
          prefetch
          aria-label="Mes anterior"
          className="relative rounded-full p-1.5"
          style={{ color: "var(--color-muted)" }}
        >
          <ChevronLeft size={18} />
          <LinkPending />
        </Link>
        <p className="text-sm font-semibold capitalize" style={{ color: "var(--color-ink)" }}>
          {monthLabel(refKey)}
        </p>
        <Link
          href={`/calendario?view=month&ref=${nextRef}`}
          prefetch
          aria-label="Mes siguiente"
          className="relative rounded-full p-1.5"
          style={{ color: "var(--color-muted)" }}
        >
          <ChevronRight size={18} />
          <LinkPending />
        </Link>
      </div>

      <div
        className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-medium"
        style={{ color: "var(--color-muted)" }}
      >
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((key) => {
          const inMonth = isSameMonth(key, refKey);
          const isToday = key === today;
          const isSelected = key === refKey;
          const hasEvents = eventDays.has(key);
          const hasMoment = momentDays.has(key);
          const hasPhotos = photoDays.has(key);
          const isLove = loveDays.has(key);
          const trip = tripDays.get(key);
          // La barra se corta al cambiar de semana (lunes y domingo).
          const barStarts = trip ? trip.first || weekdayMon0(key) === 0 : false;
          const barEnds = trip ? trip.last || weekdayMon0(key) === 6 : false;

          return (
            <Link
              key={key}
              href={`/calendario?view=month&ref=${key}`}
              className="relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs"
              style={{
                opacity: inMonth ? 1 : 0.35,
                background: isSelected
                  ? "var(--color-accent-2)"
                  : isToday
                    ? "color-mix(in srgb, var(--color-accent-2) 15%, transparent)"
                    : isLove
                      ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                      : "transparent",
                boxShadow: isLove && !isSelected ? "inset 0 0 0 1.5px color-mix(in srgb, var(--color-accent) 55%, transparent)" : undefined,
                color: isSelected ? "#ffffff" : "var(--color-ink)",
                fontWeight: isToday || isSelected ? 700 : 400,
              }}
            >
              {dayNumber(key)}
              <span className="flex h-2.5 items-center gap-0.5">
                {isLove ? (
                  <span className="text-[8px] leading-none" aria-label="Día con el amor de mi vida">
                    💞
                  </span>
                ) : null}
                {hasEvents || !isLove ? (
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      background: hasEvents ? (isSelected ? "#ffffff" : "var(--color-accent)") : "transparent",
                    }}
                  />
                ) : null}
                {hasMoment ? (
                  <span className="text-[8px] leading-none" aria-label="Momento Ratta">
                    📸
                  </span>
                ) : null}
                {hasPhotos ? (
                  <span className="text-[8px] leading-none" aria-label="Fotos del día">
                    🖼️
                  </span>
                ) : null}
              </span>
              {trip ? (
                <span
                  aria-label="De viaje"
                  className="absolute bottom-[3px] h-[4px]"
                  style={{
                    // Ocupa también el hueco entre días para que la barra se vea seguida.
                    left: trip.first ? "22%" : barStarts ? "3px" : "-2px",
                    right: trip.last ? "22%" : barEnds ? "3px" : "-2px",
                    borderTopLeftRadius: barStarts ? 9999 : 0,
                    borderBottomLeftRadius: barStarts ? 9999 : 0,
                    borderTopRightRadius: barEnds ? 9999 : 0,
                    borderBottomRightRadius: barEnds ? 9999 : 0,
                    background: isSelected ? "rgba(255,255,255,0.85)" : "var(--color-accent-2)",
                  }}
                />
              ) : null}
              <LinkPending />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
