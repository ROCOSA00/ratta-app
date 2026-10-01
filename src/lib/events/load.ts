import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/calendar/date-utils";
import { nextOccurrence, occurrenceDays, occurrenceTimes, seriesStartDay, type Recurrence } from "./recurrence";

/** El plan especial de cada día 6 ("Día con el amor de mi vida"). */
export const LOVE_COLOR = "love";

/** Una vez concreta de un plan (si se repite, cada vez es una fila distinta aquí). */
export type EventRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  description: string | null;
  recurrence: Recurrence;
  recurrence_until: string | null;
  remind_day_before: boolean;
  color: string | null;
  /** Veces saltadas de un plan que se repite. */
  skipped_days: string[];
  /** Día de esta vez, en hora de Madrid ("YYYY-MM-DD"). */
  day: string;
  /** Día de la primera vez (si se repite; si no, el mismo que `day`). */
  first_day: string;
  /** Fotos de esta vez (0 si ninguna). */
  photo_count: number;
};

export const SERIES_COLUMNS =
  "id, title, start_at, end_at, all_day, location, description, recurrence, recurrence_until, remind_day_before, color, skipped_days";

// event_photos(occurrence): de qué día es cada foto, en la misma consulta,
// para contar las de cada vez de un plan que se repite.
const LIST_COLUMNS = `${SERIES_COLUMNS}, event_photos(occurrence)`;

type SeriesRow = Omit<EventRow, "day" | "first_day" | "photo_count"> & { event_photos: { occurrence: string }[] | null };

function toOccurrence(row: SeriesRow, day: string): EventRow {
  const { event_photos, ...series } = row;
  return {
    ...series,
    ...occurrenceTimes(series, day),
    day,
    first_day: seriesStartDay(series),
    photo_count: photosOfOccurrence(series, event_photos ?? [], day).length,
  };
}

/**
 * Las fotos de una vez del plan. En un plan suelto son todas (aunque se
 * haya cambiado de día al editarlo); en uno que se repite, las de ese día.
 */
export function photosOfOccurrence<T extends { occurrence: string }>(
  series: Pick<EventRow, "recurrence">,
  photos: T[],
  day: string,
): T[] {
  return series.recurrence === "none" ? photos : photos.filter((p) => p.occurrence === day);
}

const byStart = (a: EventRow, b: EventRow) => a.start_at.localeCompare(b.start_at);

/** Enlace al detalle de esa vez del plan. */
export function eventHref(event: Pick<EventRow, "id" | "day" | "recurrence">): string {
  return event.recurrence === "none" ? `/calendario/${event.id}` : `/calendario/${event.id}?day=${event.day}`;
}

/** Todas las veces que toca algún plan entre `from` y `to` (días incluidos). */
export async function getEventsInRange(spaceId: string, from: string, to: string): Promise<EventRow[]> {
  const supabase = await createClient();
  // Con un día de margen a cada lado por el huso horario; luego se filtra
  // con precisión por día ya en hora de Madrid.
  const rangeStart = `${addDays(from, -1)}T00:00:00.000Z`;
  const rangeEnd = `${addDays(to, 2)}T00:00:00.000Z`;
  const [{ data: singles }, { data: series }] = await Promise.all([
    supabase
      .from("events")
      .select(LIST_COLUMNS)
      .eq("space_id", spaceId)
      .eq("recurrence", "none")
      .gte("end_at", rangeStart)
      .lt("start_at", rangeEnd),
    // Los que se repiten: todos los que ya habían empezado (son pocos).
    supabase.from("events").select(LIST_COLUMNS).eq("space_id", spaceId).neq("recurrence", "none").lt("start_at", rangeEnd),
  ]);

  const rows = [...((singles ?? []) as SeriesRow[]), ...((series ?? []) as SeriesRow[])];
  return rows.flatMap((row) => occurrenceDays(row, from, to).map((day) => toOccurrence(row, day))).sort(byStart);
}

/**
 * Lo próximo: los planes sueltos que aún no han terminado y, de cada plan
 * que se repite, solo su siguiente vez.
 */
export async function getUpcomingEvents(spaceId: string, limit?: number): Promise<EventRow[]> {
  const supabase = await createClient();
  const now = new Date();
  let singlesQuery = supabase
    .from("events")
    .select(LIST_COLUMNS)
    .eq("space_id", spaceId)
    .eq("recurrence", "none")
    .gte("end_at", now.toISOString())
    .order("start_at", { ascending: true });
  if (limit) singlesQuery = singlesQuery.limit(limit);

  const [{ data: singles }, { data: series }] = await Promise.all([
    singlesQuery,
    supabase.from("events").select(LIST_COLUMNS).eq("space_id", spaceId).neq("recurrence", "none"),
  ]);

  const upcoming = [
    ...((singles ?? []) as SeriesRow[]).map((row) => toOccurrence(row, seriesStartDay(row))),
    ...((series ?? []) as SeriesRow[]).flatMap((row) => {
      const day = nextOccurrence(row, now);
      return day ? [toOccurrence(row, day)] : [];
    }),
  ].sort(byStart);
  return limit ? upcoming.slice(0, limit) : upcoming;
}
