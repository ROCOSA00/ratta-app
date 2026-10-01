import { addMonths, dayNumber, daysBetween } from "@/lib/calendar/date-utils";
import { TOGETHER_SINCE } from "@/lib/couple";

export const CAPSULE_BUCKET = "capsules";
// Una hora, como el resto de fotos.
export const CAPSULE_URL_SECONDS = 60 * 60;
export const CAPSULE_LIMITS = { title: 80, body: 5000, hint: 80, maxYears: 10 } as const;

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** "6 mar 2027" para una key YYYY-MM-DD. */
export function shortDate(key: string): string {
  return `${dayNumber(key)} ${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

/** Atajos para elegir cuándo se abre una carta (sin repetir fechas). */
export function capsuleDateOptions(today: string, since: string = TOGETHER_SINCE): { label: string; date: string }[] {
  // El próximo día 6 (no hoy: una carta se abre como pronto mañana).
  let nextSix = `${today.slice(0, 8)}06`;
  if (nextSix <= today) nextSix = addMonths(nextSix, 1);
  // El próximo aniversario.
  let anniversary = since;
  while (anniversary <= today) anniversary = addMonths(anniversary, 12);

  const options = [
    { label: `Próximo día 6 (${shortDate(nextSix)})`, date: nextSix },
    { label: `Aniversario (${shortDate(anniversary)})`, date: anniversary },
    { label: "Dentro de un mes", date: addMonths(today, 1) },
    { label: "Dentro de un año", date: addMonths(today, 12) },
  ];
  return options.filter((o, i) => options.findIndex((p) => p.date === o.date) === i);
}

/** "Se abre mañana", "Se abre en 156 días", "Ya se puede abrir". */
export function countdownLabel(openOn: string, today: string): string {
  const days = daysBetween(today, openOn);
  if (days <= 0) return "Ya se puede abrir";
  if (days === 1) return "Se abre mañana";
  return `Se abre en ${days} días`;
}
