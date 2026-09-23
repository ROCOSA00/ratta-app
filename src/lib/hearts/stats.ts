import { startOfMonth, startOfWeek } from "@/lib/calendar/date-utils";

export type HeartRow = { user_id: string; day: string; count: number };

export type HeartPeriod = "today" | "week" | "month" | "total";

export type HeartTotals = Record<HeartPeriod, number>;

export type HeartStats = {
  totals: Record<string, HeartTotals>;
  /** Mejor día de cualquiera de los dos (null si aún no hay corazones). */
  record: { userId: string; day: string; count: number } | null;
};

export const EMPTY_TOTALS: HeartTotals = { today: 0, week: 0, month: 0, total: 0 };

/**
 * Suma los corazones de cada persona por periodo. `today` es la clave del
 * día en hora de Madrid (YYYY-MM-DD); las filas ya vienen agrupadas por día
 * en hora de Madrid desde la base de datos. La semana empieza el lunes.
 */
export function computeHeartStats(rows: HeartRow[], userIds: string[], today: string): HeartStats {
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);

  const totals: Record<string, HeartTotals> = {};
  for (const id of userIds) totals[id] = { ...EMPTY_TOTALS };

  let record: HeartStats["record"] = null;
  for (const row of rows) {
    const t = totals[row.user_id];
    if (!t || row.count <= 0) continue;
    t.total += row.count;
    // Las claves YYYY-MM-DD se pueden comparar como texto.
    if (row.day >= monthStart && row.day <= today) t.month += row.count;
    if (row.day >= weekStart && row.day <= today) t.week += row.count;
    if (row.day === today) t.today += row.count;
    if (!record || row.count > record.count) record = { userId: row.user_id, day: row.day, count: row.count };
  }

  return { totals, record };
}
