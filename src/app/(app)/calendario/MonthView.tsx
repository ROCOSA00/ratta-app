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
  toDateKey,
  WEEKDAY_LABELS,
} from "@/lib/calendar/date-utils";
import type { EventRow } from "./EventList";

export function MonthView({
  refKey,
  events,
  momentDays,
}: {
  refKey: string;
  events: EventRow[];
  /** Días con fotos del Momento Ratta. */
  momentDays: Set<string>;
}) {
  const grid = monthGridKeys(refKey);
  const today = todayKey();
  const eventDays = new Set(events.map((e) => toDateKey(new Date(e.start_at))));
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
                    : "transparent",
                color: isSelected ? "#ffffff" : "var(--color-ink)",
                fontWeight: isToday || isSelected ? 700 : 400,
              }}
            >
              {dayNumber(key)}
              <span className="flex h-2.5 items-center gap-0.5">
                <span
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: hasEvents ? (isSelected ? "#ffffff" : "var(--color-accent)") : "transparent",
                  }}
                />
                {hasMoment ? (
                  <span className="text-[8px] leading-none" aria-label="Momento Ratta">
                    📸
                  </span>
                ) : null}
              </span>
              <LinkPending />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
