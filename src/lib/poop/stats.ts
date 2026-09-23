export type PoopEntry = { user_id: string; logged_at: string };

export type UserStats = {
  userId: string;
  today: number;
  week: number;
  month: number;
  year: number;
  total: number;
  streak: number;
  badges: string[];
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

const COUNT_BADGES: { min: number; label: string }[] = [
  { min: 100, label: "👑 Realeza del Trono" },
  { min: 50, label: "🚽 Asiduo/a" },
  { min: 10, label: "💩 Debutante" },
  { min: 1, label: "🎉 Primera vez" },
];

const STREAK_BADGES: { min: number; label: string }[] = [
  { min: 7, label: "🔥🔥 Una semana entera" },
  { min: 3, label: "🔥 En racha" },
];

function computeBadges(total: number, streak: number): string[] {
  const badges: string[] = [];
  const countBadge = COUNT_BADGES.find((b) => total >= b.min);
  if (countBadge) badges.push(countBadge.label);
  const streakBadge = STREAK_BADGES.find((b) => streak >= b.min);
  if (streakBadge) badges.push(streakBadge.label);
  return badges;
}

/** Días consecutivos con al menos una entrada, contando desde hoy (o desde
 * ayer si hoy todavía no hay ninguna, para no romper la racha a mitad del día). */
function computeStreak(dates: Set<string>, now: Date): number {
  if (dates.size === 0) return 0;

  const cursor = new Date(now);
  if (!dates.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dates.has(dateKey(cursor))) return 0;
  }

  let streak = 0;
  while (dates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeStats(
  entries: PoopEntry[],
  userIds: string[],
  now: Date = new Date(),
): Record<string, UserStats> {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const totals: Record<string, { today: number; week: number; month: number; year: number; total: number }> = {};
  const datesByUser: Record<string, Set<string>> = {};

  for (const id of userIds) {
    totals[id] = { today: 0, week: 0, month: 0, year: 0, total: 0 };
    datesByUser[id] = new Set();
  }

  for (const entry of entries) {
    const bucket = totals[entry.user_id];
    const dates = datesByUser[entry.user_id];
    if (!bucket || !dates) continue; // entrada de alguien que ya no es miembro del espacio

    const d = new Date(entry.logged_at);
    bucket.total += 1;
    if (isSameDay(d, now)) bucket.today += 1;
    if (d >= startOfWeek) bucket.week += 1;
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) bucket.month += 1;
    if (d.getFullYear() === now.getFullYear()) bucket.year += 1;
    dates.add(dateKey(d));
  }

  const stats: Record<string, UserStats> = {};
  for (const id of userIds) {
    const bucket = totals[id]!;
    const streak = computeStreak(datesByUser[id]!, now);
    stats[id] = { userId: id, ...bucket, streak, badges: computeBadges(bucket.total, streak) };
  }
  return stats;
}
