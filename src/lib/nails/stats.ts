import { addDays, daysBetween } from "@/lib/calendar/date-utils";

export type NailBite = { day: string; count: number; note: string | null };

export type NailStats = {
  /** Días seguidos sin morderse, contando hoy si hoy va limpio. */
  streak: number;
  /** La racha más larga desde que empezó el reto. */
  best: number;
  /** Días desde el principio del reto hasta hoy (incluidos). */
  totalDays: number;
  cleanDays: number;
  biteDays: number;
  totalBites: number;
  /** Mordiscos por día ("YYYY-MM-DD" → veces). */
  byDay: Record<string, number>;
};

/**
 * Cuenta el reto. Un día cuenta como limpio si no hay mordiscos apuntados.
 * La racha es lo que va desde el último día con mordiscos (o desde el
 * principio) hasta hoy: si empezaste hoy y vas limpio, es 1.
 */
export function nailStats(startedOn: string, today: string, bites: NailBite[]): NailStats {
  const byDay: Record<string, number> = {};
  for (const b of bites) {
    if (b.day >= startedOn && b.day <= today && b.count > 0) byDay[b.day] = (byDay[b.day] ?? 0) + b.count;
  }
  const badDays = Object.keys(byDay).sort();
  const totalDays = Math.max(0, daysBetween(startedOn, today) + 1);

  // Las rachas son los huecos entre días con mordiscos.
  let best = 0;
  let previous = addDays(startedOn, -1);
  for (const day of badDays) {
    best = Math.max(best, daysBetween(previous, day) - 1);
    previous = day;
  }
  const streak = Math.max(0, daysBetween(previous, today));
  best = Math.max(best, streak);

  return {
    streak,
    best,
    totalDays,
    cleanDays: totalDays - badDays.length,
    biteDays: badDays.length,
    totalBites: Object.values(byDay).reduce((a, b) => a + b, 0),
    byDay,
  };
}

/** Medallas por días seguidos. */
export const NAIL_MILESTONES = [
  { days: 1, emoji: "🌱", label: "1 día" },
  { days: 3, emoji: "✋", label: "3 días" },
  { days: 7, emoji: "🥉", label: "1 semana" },
  { days: 14, emoji: "🥈", label: "2 semanas" },
  { days: 30, emoji: "🥇", label: "1 mes" },
  { days: 60, emoji: "💎", label: "2 meses" },
  { days: 100, emoji: "👑", label: "100 días" },
  { days: 365, emoji: "🏆", label: "1 año" },
] as const;

/** La siguiente medalla por conseguir con la racha actual (o null si ya están todas). */
export function nextMilestone(streak: number) {
  return NAIL_MILESTONES.find((m) => m.days > streak) ?? null;
}

/** Una frase para animar según la racha. */
export function cheer(streak: number, bitToday: boolean): string {
  if (bitToday) return "Un tropiezo no borra lo conseguido. ¡Mañana, a por todas! 💪";
  if (streak <= 1) return "¡Primer día! El más importante 🌱";
  if (streak < 7) return "¡Vas genial! Sigue así ✨";
  if (streak < 30) return "¡Imparable! Tus uñas te lo agradecen 💅";
  return "¡Leyenda! Esto ya es un hábito 👑";
}
