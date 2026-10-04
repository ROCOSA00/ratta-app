import { addMonths, daysBetween } from "@/lib/calendar/date-utils";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Meses enteros cumplidos entre dos días ("YYYY-MM-DD"). */
export function wholeMonths(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  return Math.max(0, (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0));
}

/**
 * Su edad, como se dice de un bebé: en semanas hasta las 8, luego en meses
 * (y días) hasta el año, y luego en años (y meses).
 */
export function ageLabel(born: string, today: string): string {
  const days = daysBetween(born, today);
  if (days < 0) return "Aún no ha nacido";
  if (days === 0) return "¡Nace hoy!";
  if (days < 56) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    if (weeks === 0) return plural(rest, "día", "días");
    return rest > 0 ? `${plural(weeks, "semana", "semanas")} y ${plural(rest, "día", "días")}` : plural(weeks, "semana", "semanas");
  }
  const months = wholeMonths(born, today);
  if (months < 12) {
    const rest = daysBetween(addMonths(born, months), today);
    return rest > 0 ? `${plural(months, "mes", "meses")} y ${plural(rest, "día", "días")}` : plural(months, "mes", "meses");
  }
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  return restMonths > 0 ? `${plural(years, "año", "años")} y ${plural(restMonths, "mes", "meses")}` : plural(years, "año", "años");
}

/**
 * Edad aproximada en años humanos (la tabla habitual para gatos: 1 mes ≈ 1
 * año, 6 meses ≈ 10, 1 año ≈ 15, 2 años ≈ 24 y luego 4 por año), con un
 * decimal mientras es pequeño.
 */
export function humanYears(born: string, today: string): number {
  const days = Math.max(0, daysBetween(born, today));
  const months = days / 30.44;
  const points: [number, number][] = [
    [0, 0],
    [1, 1],
    [3, 4],
    [6, 10],
    [12, 15],
    [18, 21],
    [24, 24],
  ];
  let value: number;
  if (months >= 24) value = 24 + ((months - 24) / 12) * 4;
  else {
    const i = points.findIndex(([m]) => m > months);
    const [m0, h0] = points[i - 1]!;
    const [m1, h1] = points[i]!;
    value = h0 + ((months - m0) / (m1 - m0)) * (h1 - h0);
  }
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
}

/** Etapa de la vida de un gato. */
export function lifeStage(born: string, today: string): string {
  const months = wholeMonths(born, today);
  if (months < 6) return "Gatito 🍼";
  if (months < 24) return "Junior 🐾";
  if (months < 84) return "Adulto 😺";
  if (months < 132) return "Maduro 🧐";
  return "Senior 👑";
}

export type NextCelebration = {
  /** Día de la celebración ("YYYY-MM-DD"). */
  day: string;
  /** "2 meses", "1 año"… */
  label: string;
  /** Es su cumpleaños (y no un mes más). */
  birthday: boolean;
  /** Días que faltan (0 = hoy). */
  daysLeft: number;
};

/**
 * La próxima celebración: el primer año, cada mes que cumple (el día de su
 * nacimiento de cada mes); luego, solo los cumpleaños. Hoy cuenta (0 días).
 */
export function nextCelebration(born: string, today: string): NextCelebration {
  const months = wholeMonths(born, today);
  const firstYear = months < 12;
  const step = firstYear ? 1 : 12;
  // El mes (o año) que toca; si ya pasó, o es el día en que nació, el siguiente.
  let n = firstYear ? months : months - (months % 12);
  if (addMonths(born, n) < today || n === 0) n += step;
  const day = addMonths(born, n);
  const birthday = n % 12 === 0;
  const label = birthday ? plural(n / 12, "año", "años") : plural(n, "mes", "meses");
  return { day, label, birthday, daysLeft: daysBetween(today, day) };
}
