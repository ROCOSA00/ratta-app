import { addDays, daysBetween, toDateKey } from "@/lib/calendar/date-utils";
import { seriesStartDay, type Series } from "./recurrence";

/**
 * Planes de varios días (un viaje, una escapada): un plan de todo el día
 * que no se repite y acaba otro día. En la base de datos es una sola fila
 * (empieza a las 00:00 del primer día y acaba a las 23:59 del último); en
 * el calendario sale en cada uno de sus días.
 */

/** Como mucho, dos meses seguidos. */
export const MAX_SPAN_DAYS = 60;

type SpanFields = Pick<Series, "start_at" | "end_at" | "all_day" | "recurrence">;

/** Último día (hora de Madrid) del plan: el mismo que el primero salvo en uno de varios días. */
export function seriesLastDay(series: SpanFields): string {
  const start = seriesStartDay(series);
  if (!series.all_day || series.recurrence !== "none") return start;
  const end = toDateKey(new Date(series.end_at));
  return end > start ? end : start;
}

/** Cuántos días dura (1 si es de un solo día). */
export function spanLength(firstDay: string, lastDay: string): number {
  return daysBetween(firstDay, lastDay) + 1;
}

/** Los días del plan que caen entre `from` y `to` (incluidos). */
export function spanDaysInRange(firstDay: string, lastDay: string, from: string, to: string): string[] {
  const days: string[] = [];
  const end = lastDay < to ? lastDay : to;
  for (let day = firstDay > from ? firstDay : from; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

const keyDate = (key: string) => new Date(`${key}T12:00:00Z`);
const weekday = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "short" });
const month = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "short" });

/** "vie 10 – lun 13 oct", o "jue 30 oct – dom 2 nov" si cambia de mes. */
export function spanLabel(firstDay: string, lastDay: string): string {
  const part = (key: string) => `${weekday.format(keyDate(key))} ${Number(key.slice(8, 10))}`;
  const firstMonth = month.format(keyDate(firstDay));
  const lastMonth = month.format(keyDate(lastDay));
  return firstDay.slice(0, 7) === lastDay.slice(0, 7)
    ? `${part(firstDay)} – ${part(lastDay)} ${lastMonth}`
    : `${part(firstDay)} ${firstMonth} – ${part(lastDay)} ${lastMonth}`;
}

/** "Día 2 de 4". */
export function spanDayLabel(day: string, firstDay: string, lastDay: string): string {
  return `Día ${daysBetween(firstDay, day) + 1} de ${spanLength(firstDay, lastDay)}`;
}
