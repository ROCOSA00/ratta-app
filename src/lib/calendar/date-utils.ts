import { TIME_ZONE } from "@/lib/format-date";

// Crear un Intl.DateTimeFormat es caro; se reutiliza uno solo para no
// pagarlo por cada entrada al agrupar cientos de registros.
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

/** "YYYY-MM-DD" del instante dado, en la zona horaria de Madrid. */
export function toDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

/** Hora (0-23) del instante dado, en la zona horaria de Madrid. */
export function madridHour(date: Date): number {
  return Number(hourFormatter.format(date));
}

export function todayKey(): string {
  return toDateKey(new Date());
}

// Toda key de este módulo tiene siempre el formato "YYYY-MM-DD" (la
// generamos nosotros mismos o la validamos con regex antes de usarla),
// así que el resultado del split nunca es realmente undefined.
function parseKey(key: string): [number, number, number] {
  const parts = key.split("-");
  return [Number(parts[0]!), Number(parts[1]!), Number(parts[2]!)];
}

function keyToUTC(key: string): Date {
  const [y, m, d] = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const d = keyToUTC(key);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToKey(d);
}

export function addMonths(key: string, months: number): string {
  const d = keyToUTC(key);
  d.setUTCMonth(d.getUTCMonth() + months);
  return utcToKey(d);
}

/** 0 = lunes .. 6 = domingo (la semana empieza en lunes). */
export function weekdayMon0(key: string): number {
  const jsDay = keyToUTC(key).getUTCDay(); // 0 = domingo .. 6 = sábado
  return (jsDay + 6) % 7;
}

export function startOfWeek(key: string): string {
  return addDays(key, -weekdayMon0(key));
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** Rejilla de 42 días (6 semanas x 7) que cubre el mes de refKey, empezando en lunes. */
export function monthGridKeys(refKey: string): string[] {
  const gridStart = startOfWeek(startOfMonth(refKey));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function weekKeys(refKey: string): string[] {
  const start = startOfWeek(refKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthLabel(key: string): string {
  const [y, m] = parseKey(key);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function dayNumber(key: string): number {
  const [, , d] = parseKey(key);
  return d;
}

export function isSameMonth(key: string, refKey: string): boolean {
  return key.slice(0, 7) === refKey.slice(0, 7);
}

/** "lun 21 sep" para una key YYYY-MM-DD, sin reconvertir zona horaria
 * (la key ya es el día de calendario correcto, solo hay que imprimirlo). */
export function dayLabel(key: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(keyToUTC(key));
}

/** Días de calendario entre dos keys (b - a); negativo si b es anterior. */
export function daysBetween(a: string, b: string): number {
  return Math.round((keyToUTC(b).getTime() - keyToUTC(a).getTime()) / 86_400_000);
}
