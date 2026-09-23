import { addDays, madridHour, toDateKey } from "@/lib/calendar/date-utils";

export type PoopEntry = { user_id: string; logged_at: string };

export type UserStats = {
  userId: string;
  today: number;
  week: number;
  month: number;
  year: number;
  total: number;
  streak: number;
  bestDay: number;
  /** Registros de los últimos 7 días, del más antiguo a hoy. */
  last7: number[];
  badges: string[];
};

const COUNT_BADGES: { min: number; label: string }[] = [
  { min: 100, label: "👑 Realeza del Trono" },
  { min: 50, label: "🚽 Asiduo/a" },
  { min: 10, label: "💩 Debutante" },
  { min: 1, label: "🎉 Primera vez" },
];

const STREAK_BADGES: { min: number; label: string }[] = [
  { min: 30, label: "🏅 Un mes sin fallar" },
  { min: 7, label: "🔥🔥 Una semana entera" },
  { min: 3, label: "🔥 En racha" },
];

const BEST_DAY_BADGES: { min: number; label: string }[] = [
  { min: 3, label: "⚡ Triplete" },
  { min: 2, label: "✌️ Doblete" },
];

/** Días consecutivos con al menos una entrada, contando desde hoy (o desde
 * ayer si hoy todavía no hay ninguna, para no romper la racha a mitad del día). */
function computeStreak(days: Set<string>, todayKey: string): number {
  let cursor = days.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeStats(
  entries: PoopEntry[],
  userIds: string[],
  now: Date = new Date(),
): Record<string, UserStats> {
  // Todo se agrupa por día de calendario en hora de Madrid: el servidor
  // corre en UTC y, si no, "hoy" cambiaría a las 01:00-02:00.
  const todayKey = toDateKey(now);
  const last7Keys = Array.from({ length: 7 }, (_, i) => addDays(todayKey, i - 6));

  const perUser = new Map<
    string,
    { total: number; month: number; year: number; byDay: Map<string, number>; early: boolean; night: boolean }
  >();
  for (const id of userIds) {
    perUser.set(id, { total: 0, month: 0, year: 0, byDay: new Map(), early: false, night: false });
  }

  for (const entry of entries) {
    const bucket = perUser.get(entry.user_id);
    if (!bucket) continue; // entrada de alguien que ya no es miembro del espacio

    const date = new Date(entry.logged_at);
    const key = toDateKey(date);
    const hour = madridHour(date);

    bucket.total += 1;
    if (key.slice(0, 7) === todayKey.slice(0, 7)) bucket.month += 1;
    if (key.slice(0, 4) === todayKey.slice(0, 4)) bucket.year += 1;
    bucket.byDay.set(key, (bucket.byDay.get(key) ?? 0) + 1);
    if (hour >= 5 && hour < 7) bucket.early = true;
    if (hour < 5) bucket.night = true;
  }

  const stats: Record<string, UserStats> = {};
  for (const id of userIds) {
    const b = perUser.get(id)!;
    const last7 = last7Keys.map((k) => b.byDay.get(k) ?? 0);
    const week = last7.reduce((sum, n) => sum + n, 0);
    const bestDay = Math.max(0, ...b.byDay.values());
    const streak = computeStreak(new Set(b.byDay.keys()), todayKey);

    const badges: string[] = [];
    const countBadge = COUNT_BADGES.find((x) => b.total >= x.min);
    if (countBadge) badges.push(countBadge.label);
    const streakBadge = STREAK_BADGES.find((x) => streak >= x.min);
    if (streakBadge) badges.push(streakBadge.label);
    const bestDayBadge = BEST_DAY_BADGES.find((x) => bestDay >= x.min);
    if (bestDayBadge) badges.push(bestDayBadge.label);
    if (b.early) badges.push("🌅 Madrugador/a");
    if (b.night) badges.push("🦉 Noctámbulo/a");

    stats[id] = {
      userId: id,
      today: b.byDay.get(todayKey) ?? 0,
      week,
      month: b.month,
      year: b.year,
      total: b.total,
      streak,
      bestDay,
      last7,
      badges,
    };
  }
  return stats;
}
