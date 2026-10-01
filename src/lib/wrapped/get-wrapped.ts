import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getAuthUser } from "@/lib/auth/get-user";
import { addDays, daysBetween, todayKey } from "@/lib/calendar/date-utils";
import { TOGETHER_SINCE } from "@/lib/couple";
import { zonedInputToUTC } from "@/lib/format-date";
import { REACTION_EMOJIS } from "@/lib/chat/types";
import { LOVE_COLOR } from "@/lib/events/load";
import { occurrenceDays, type Series } from "@/lib/events/recurrence";
import { wrappedPeriod, type WrappedPeriod } from "./period";
import { buildSlides, type Slide, type WrappedStats } from "./slides";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Cuántas filas cumplen la consulta (lo cuenta la base de datos, sin traerlas). */
async function count(query: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count: c } = await query;
  return c ?? 0;
}

async function perPerson(ids: string[], counter: (id: string) => Promise<number>): Promise<Record<string, number>> {
  const values = await Promise.all(ids.map(counter));
  return Object.fromEntries(ids.map((id, i) => [id, values[i] ?? 0]));
}

async function collect(supabase: Supabase, spaceId: string, ids: string[], period: WrappedPeriod): Promise<WrappedStats> {
  // El periodo en instantes: desde las 00:00 del primer día hasta las 00:00
  // del día siguiente al último (hora de Madrid).
  const fromIso = zonedInputToUTC(`${period.from}T00:00`).toISOString();
  const toIso = zonedInputToUTC(`${addDays(period.to, 1)}T00:00`).toISOString();
  const head = { count: "exact" as const, head: true };

  const messagesOf = (id: string) =>
    count(
      supabase.from("messages").select("id", head).eq("space_id", spaceId).eq("sender_id", id)
        .gte("created_at", fromIso).lt("created_at", toIso),
    );
  const momentsOf = (id: string, onTime: boolean) => {
    let q = supabase.from("moment_photos").select("id", head).eq("space_id", spaceId).eq("user_id", id)
      .gte("day", period.from).lte("day", period.to);
    if (onTime) q = q.eq("late_seconds", 0);
    return count(q);
  };
  const tronoOf = (id: string) =>
    count(
      supabase.from("poop_entries").select("id", head).eq("space_id", spaceId).eq("user_id", id)
        .gte("logged_at", fromIso).lt("logged_at", toIso),
    );

  const [
    messages,
    chatPhotos,
    reactionCounts,
    moments,
    momentsOnTime,
    trono,
    { data: series },
    { data: memoryRows },
    { data: heartRows },
    { data: flappyRows },
    wishesDone,
    capsulesOpened,
  ] = await Promise.all([
    perPerson(ids, messagesOf),
    count(
      supabase.from("messages").select("id", head).eq("space_id", spaceId).not("image_path", "is", null)
        .gte("created_at", fromIso).lt("created_at", toIso),
    ),
    Promise.all(
      REACTION_EMOJIS.map((emoji) =>
        count(
          supabase.from("message_reactions").select("message_id", head).eq("space_id", spaceId).eq("emoji", emoji)
            .gte("updated_at", fromIso).lt("updated_at", toIso),
        ),
      ),
    ),
    perPerson(ids, (id) => momentsOf(id, false)),
    perPerson(ids, (id) => momentsOf(id, true)),
    perPerson(ids, tronoOf),
    supabase.from("events").select("start_at, end_at, all_day, recurrence, recurrence_until, skipped_days, color")
      .eq("space_id", spaceId).lt("start_at", toIso),
    supabase.from("memories").select("storage_path, caption").eq("space_id", spaceId)
      .gte("created_at", fromIso).lt("created_at", toIso),
    supabase.from("heart_taps").select("user_id, count").eq("space_id", spaceId)
      .gte("day", period.from).lte("day", period.to),
    supabase.from("game_days").select("user_id, best").eq("space_id", spaceId).eq("game", "flappy")
      .gte("day", period.from).lte("day", period.to),
    count(
      supabase.from("wishes").select("id", head).eq("space_id", spaceId)
        .gte("done_at", fromIso).lt("done_at", toIso),
    ),
    count(
      supabase.from("capsules").select("id", head).eq("space_id", spaceId)
        .gte("opened_at", fromIso).lt("opened_at", toIso),
    ),
  ]);

  // Planes: cada vez que tocaba alguno en el periodo (hasta hoy).
  let plans = 0;
  let loveDays = 0;
  for (const row of (series ?? []) as (Series & { color: string | null })[]) {
    const times = occurrenceDays(row, period.from, period.to).length;
    if (row.color === LOVE_COLOR) loveDays += times;
    else plans += times;
  }

  const hearts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const r of (heartRows ?? []) as { user_id: string; count: number }[]) {
    hearts[r.user_id] = (hearts[r.user_id] ?? 0) + r.count;
  }
  const flappyBest: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const r of (flappyRows ?? []) as { user_id: string; best: number }[]) {
    flappyBest[r.user_id] = Math.max(flappyBest[r.user_id] ?? 0, r.best);
  }

  // Un recuerdo al azar del periodo para la última foto.
  const memories = (memoryRows ?? []) as { storage_path: string; caption: string | null }[];
  let memoryPhoto: WrappedStats["memoryPhoto"] = null;
  const picked = memories[Math.floor(Math.random() * memories.length)];
  if (picked) {
    const { data: signed } = await supabase.storage.from("memories").createSignedUrl(picked.storage_path, 60 * 60);
    if (signed?.signedUrl) memoryPhoto = { url: signed.signedUrl, caption: picked.caption };
  }

  return {
    period,
    daysTogether: daysBetween(TOGETHER_SINCE, period.to) + 1,
    messages,
    chatPhotos,
    reactions: Object.fromEntries(REACTION_EMOJIS.map((emoji, i) => [emoji, reactionCounts[i] ?? 0])),
    moments,
    momentsOnTime,
    plans,
    loveDays,
    memories: memories.length,
    hearts,
    flappyBest,
    trono,
    wishesDone,
    capsulesOpened,
    memoryPhoto,
  };
}

/** Las pantallas del Wrapped de vuestro espacio (o null si no hay espacio). */
export async function getWrapped(): Promise<{ period: WrappedPeriod; slides: Slide[] } | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const [{ data: auth }, { data: members }, { data: profiles }] = await Promise.all([
    getAuthUser(),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase.from("profiles").select("id, display_name"),
  ]);
  const myId = auth.user?.id;
  // Tú primero.
  const ids = ((members ?? []) as { user_id: string }[])
    .map((m) => m.user_id)
    .sort((a, b) => (a === myId ? -1 : b === myId ? 1 : 0));
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    names[p.id] = p.display_name ?? "Tu pareja";
  }

  const period = wrappedPeriod(todayKey());
  const stats = await collect(supabase, spaceId, ids, period);
  return { period, slides: buildSlides(stats, ids, names) };
}
