import { TIME_ZONE, zonedInputToUTC } from "@/lib/format-date";
import { addDays, addMonths, daysBetween, dayNumber, toDateKey, weekdayMon0 } from "@/lib/calendar/date-utils";

/**
 * Planes que se repiten. En la base de datos cada plan es UNA fila (la
 * primera vez, con su hora) y aquí se calculan las demás veces: así un
 * "cada sábado" no llena la tabla de copias. La hora se respeta en hora de
 * Madrid aunque cambie el horario de verano (las 20:00 siguen siendo las
 * 20:00 en invierno).
 */

export const RECURRENCES = ["none", "weekly", "biweekly", "monthly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export type Series = {
  start_at: string;
  end_at: string;
  all_day: boolean;
  recurrence: Recurrence;
  /** Último día (incluido) en que se repite; null = para siempre. */
  recurrence_until: string | null;
  /** Veces sueltas que se han saltado ("este sábado no"). */
  skipped_days?: string[] | null;
};

/** Para no quedarse nunca en un bucle eterno por un dato raro. */
const MAX_STEPS = 1000;

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

const wallClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isRecurring(series: Pick<Series, "recurrence">): boolean {
  return series.recurrence !== "none";
}

/** Día (hora de Madrid) de la primera vez. */
export function seriesStartDay(series: Pick<Series, "start_at">): string {
  return toDateKey(new Date(series.start_at));
}

/**
 * El día de la vez nº k de un plan mensual o anual, o null si ese mes no
 * tiene ese día (un "cada día 31" se salta los meses de 30 días; un "cada
 * 29 de febrero", los años que no son bisiestos).
 */
function nthByMonths(startDay: string, monthsPerStep: number, k: number): string | null {
  const candidate = addMonths(startDay, monthsPerStep * k);
  return dayNumber(candidate) === dayNumber(startDay) ? candidate : null;
}

const isSkipped = (series: Series, day: string) => (series.skipped_days ?? []).includes(day);

/** ¿Hay que hacer este plan el día `day`? */
export function occursOn(series: Series, day: string): boolean {
  if (isSkipped(series, day)) return false;
  return followsRule(series, day);
}

/** ¿Encaja el día con la regla de repetición? (sin mirar las veces saltadas) */
export function followsRule(series: Series, day: string): boolean {
  const start = seriesStartDay(series);
  if (day < start) return false;
  if (series.recurrence === "none") return day === start;
  if (series.recurrence_until && day > series.recurrence_until) return false;
  switch (series.recurrence) {
    case "weekly":
      return daysBetween(start, day) % 7 === 0;
    case "biweekly":
      return daysBetween(start, day) % 14 === 0;
    case "monthly":
      return dayNumber(day) === dayNumber(start);
    case "yearly":
      return day.slice(5) === start.slice(5);
  }
}

/** Todos los días (de `from` a `to`, ambos incluidos) en que toca el plan. */
export function occurrenceDays(series: Series, from: string, to: string): string[] {
  return ruleDays(series, from, to).filter((day) => !isSkipped(series, day));
}

function ruleDays(series: Series, from: string, to: string): string[] {
  const start = seriesStartDay(series);
  const last = series.recurrence !== "none" && series.recurrence_until && series.recurrence_until < to
    ? series.recurrence_until
    : to;
  if (start > last) return [];

  if (series.recurrence === "none") return start >= from ? [start] : [];

  const days: string[] = [];
  if (series.recurrence === "weekly" || series.recurrence === "biweekly") {
    const step = series.recurrence === "weekly" ? 7 : 14;
    const skip = from > start ? Math.ceil(daysBetween(start, from) / step) : 0;
    for (let day = addDays(start, skip * step), i = 0; day <= last && i < MAX_STEPS; day = addDays(day, step), i++) {
      days.push(day);
    }
    return days;
  }

  const monthsPerStep = series.recurrence === "monthly" ? 1 : 12;
  const monthsToFrom = from > start ? monthDiff(start, from) : 0;
  for (let k = Math.max(0, Math.floor(monthsToFrom / monthsPerStep) - 1), i = 0; i < MAX_STEPS; k++, i++) {
    const anchor = addMonths(`${start.slice(0, 8)}01`, monthsPerStep * k);
    if (anchor > last) break;
    const day = nthByMonths(start, monthsPerStep, k);
    if (day && day >= from && day <= last) days.push(day);
  }
  return days;
}

function monthDiff(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
}

/** Hora de inicio y de fin de la vez del día `day`. */
export function occurrenceTimes(series: Series, day: string): { start_at: string; end_at: string } {
  if (series.recurrence === "none") return { start_at: series.start_at, end_at: series.end_at };
  if (series.all_day) {
    return {
      start_at: zonedInputToUTC(`${day}T00:00`).toISOString(),
      end_at: zonedInputToUTC(`${day}T23:59`).toISOString(),
    };
  }
  const duration = new Date(series.end_at).getTime() - new Date(series.start_at).getTime();
  const start = zonedInputToUTC(`${day}T${wallClock.format(new Date(series.start_at))}`);
  return { start_at: start.toISOString(), end_at: new Date(start.getTime() + duration).toISOString() };
}

/**
 * La próxima vez que toca el plan que aún no ha terminado (la de hoy
 * cuenta hasta que acaba), o null si ya no quedan.
 */
export function nextOccurrence(series: Series, now: Date = new Date()): string | null {
  const today = toDateKey(now);
  // Mirando un poco más de un año por delante siempre sale la siguiente
  // (también en un "cada 29 de febrero" bastan 8 años; aquí basta con 1).
  const horizon = series.recurrence === "yearly" ? addMonths(today, 12 * 8 + 1) : addMonths(today, 13);
  for (const day of occurrenceDays(series, today, horizon)) {
    if (new Date(occurrenceTimes(series, day).end_at) >= now) return day;
  }
  return null;
}

/** "Cada semana (sábados)", "Cada mes (día 6)", "Cada año (6 mar)"… o null. */
export function recurrenceLabel(series: Pick<Series, "recurrence" | "start_at" | "recurrence_until">): string | null {
  if (series.recurrence === "none") return null;
  const start = seriesStartDay(series);
  const base = {
    weekly: `Cada semana (${WEEKDAYS[weekdayMon0(start)]})`,
    biweekly: `Cada 2 semanas (${WEEKDAYS[weekdayMon0(start)]})`,
    monthly: `Cada mes (día ${dayNumber(start)})`,
    yearly: `Cada año (${dayNumber(start)} ${MONTHS_SHORT[Number(start.slice(5, 7)) - 1]})`,
  }[series.recurrence];
  if (!series.recurrence_until) return base;
  const until = series.recurrence_until;
  return `${base} hasta el ${dayNumber(until)} ${MONTHS_SHORT[Number(until.slice(5, 7)) - 1]} ${until.slice(0, 4)}`;
}
