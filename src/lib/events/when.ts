import { formatDate, formatDateTime } from "@/lib/format-date";
import { spanLabel, spanLength } from "./span";
import type { EventRow } from "./load";

type WhenFields = Pick<EventRow, "start_at" | "all_day" | "first_day" | "last_day">;

export function isMultiDay(event: Pick<EventRow, "first_day" | "last_day">): boolean {
  return event.last_day !== event.first_day;
}

/** "vie, 10 oct, 20:00", "vie, 10 oct" (todo el día) o "vie 10 – lun 13 oct · 4 días" (un viaje). */
export function eventWhenLabel(event: WhenFields): string {
  if (isMultiDay(event)) {
    return `${spanLabel(event.first_day, event.last_day)} · ${spanLength(event.first_day, event.last_day)} días`;
  }
  return event.all_day ? formatDate(event.start_at) : formatDateTime(event.start_at);
}
