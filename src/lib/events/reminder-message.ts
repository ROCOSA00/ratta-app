import { loveDayLabel } from "@/lib/couple";

export type ReminderEvent = {
  title: string;
  /** "20:00", o null si es de todo el día. */
  time: string | null;
  /** El "Día con el amor de mi vida". */
  love: boolean;
  /** Primer día del plan ("YYYY-MM-DD"). */
  since: string;
};

/** La notificación del día antes con los planes de mañana (`day`). */
export function reminderMessage(day: string, events: ReminderEvent[]) {
  const url = `/calendario?view=month&ref=${day}`;
  const tag = `recordatorio-${day}`;
  const [only] = events;

  if (only && events.length === 1) {
    if (only.love) {
      return { title: "💞 Mañana es vuestro día", body: `${only.title} · ${loveDayLabel(day, only.since)}`, url, tag };
    }
    return {
      title: `⏰ Mañana: ${only.title}`,
      body: `${only.time ? `A las ${only.time}` : "Todo el día"}. ¡Que no se os olvide!`,
      url,
      tag,
    };
  }

  return {
    title: `⏰ Mañana tenéis ${events.length} planes`,
    body: events.map((e) => (e.love ? `💞 ${e.title}` : e.time ? `${e.title} (${e.time})` : e.title)).join(" · "),
    url,
    tag,
  };
}
