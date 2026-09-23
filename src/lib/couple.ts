import { addMonths, daysBetween, todayKey } from "@/lib/calendar/date-utils";

/** El día que empezasteis a salir (hora de Madrid). */
export const TOGETHER_SINCE = "2026-03-06";

export type TogetherInfo = {
  days: number;
  /** "6 meses y 17 días", "1 año, 2 meses y 3 días"... */
  breakdown: string;
  /** Mensaje especial si hoy es un día señalado, si no null. */
  milestone: string | null;
  /** "Faltan 13 días para los 7 meses", "Falta 1 día para el año"... */
  nextLabel: string;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function wholeMonthsBetween(since: string, today: string): number {
  const [sy, sm, sd] = since.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  return (ty - sy) * 12 + (tm - sm) - (td < sd ? 1 : 0);
}

export function getTogetherInfo(today: string = todayKey(), since: string = TOGETHER_SINCE): TogetherInfo {
  const days = Math.max(0, daysBetween(since, today));
  const months = Math.max(0, wholeMonthsBetween(since, today));
  const extraDays = Math.max(0, daysBetween(addMonths(since, months), today));

  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(plural(years, "año", "años"));
  if (restMonths > 0) parts.push(plural(restMonths, "mes", "meses"));
  if (extraDays > 0 || parts.length === 0) parts.push(plural(extraDays, "día", "días"));

  let milestone: string | null = null;
  if (days === 0) {
    milestone = "¡Hoy empieza todo! 💞";
  } else if (extraDays === 0 && months > 0) {
    milestone =
      months % 12 === 0
        ? `¡Feliz ${plural(years, "año", "años")} juntos! 🎉`
        : `¡Hoy hacéis ${plural(months, "mes", "meses")}! 🎉`;
  } else if (days % 100 === 0) {
    milestone = `¡Hoy cumplís ${days} días juntos! 🎉`;
  }

  const nextMonths = months + 1;
  const daysLeft = daysBetween(today, addMonths(since, nextMonths));
  const target =
    nextMonths % 12 === 0
      ? nextMonths === 12
        ? "el año"
        : `los ${nextMonths / 12} años`
      : nextMonths === 1
        ? "el primer mes"
        : `los ${nextMonths} meses`;
  const nextLabel = `${daysLeft === 1 ? "Falta 1 día" : `Faltan ${daysLeft} días`} para ${target}`;

  return { days, breakdown: joinParts(parts), milestone, nextLabel };
}
