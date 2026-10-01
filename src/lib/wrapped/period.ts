import { addDays, addMonths, daysBetween } from "@/lib/calendar/date-utils";
import { TOGETHER_SINCE } from "@/lib/couple";

export type WrappedPeriod = {
  /** Primer día del año de pareja ("YYYY-MM-DD"). */
  from: string;
  /** Último día que entra (incluido): hoy, o la víspera del aniversario. */
  to: string;
  /** 1 = el primer año juntos. */
  year: number;
  /** El año ya terminó (es la semana del aniversario). */
  complete: boolean;
};

/** Días que se enseña el Wrapped del año terminado tras el aniversario. */
export const WRAPPED_SHOWCASE_DAYS = 7;

/**
 * Qué año se resume. Los años de pareja van de 6 de marzo a 6 de marzo.
 * La semana siguiente a cada aniversario se enseña el año que acaba de
 * terminar; el resto del tiempo, el año en curso hasta hoy.
 */
export function wrappedPeriod(today: string, since: string = TOGETHER_SINCE): WrappedPeriod {
  let k = 0;
  while (addMonths(since, 12 * (k + 1)) <= today) k++;
  const start = addMonths(since, 12 * k);

  if (k >= 1 && daysBetween(start, today) < WRAPPED_SHOWCASE_DAYS) {
    return { from: addMonths(since, 12 * (k - 1)), to: addDays(start, -1), year: k, complete: true };
  }
  return { from: start, to: today, year: k + 1, complete: false };
}

const ORDINALS = ["primer", "segundo", "tercer", "cuarto", "quinto", "sexto", "séptimo", "octavo", "noveno", "décimo"];

/** "vuestro primer año", "vuestro tercer año"… */
export function yearLabel(year: number): string {
  return `vuestro ${ORDINALS[year - 1] ?? `año nº ${year}`}${ORDINALS[year - 1] ? " año" : ""}`;
}
