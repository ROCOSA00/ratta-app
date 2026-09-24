import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { todayKey } from "@/lib/calendar/date-utils";

export type FlappyPlayer = { name: string; best: number; todayBest: number; plays: number };

export type FlappySummary = { me: FlappyPlayer; partner: FlappyPlayer | null };

type Row = { user_id: string; day: string; best: number; plays: number };

/** Suma las filas diarias de una persona: récord, mejor de hoy y partidas. */
export function summarizePlayer(rows: Row[], userId: string, today: string, name: string): FlappyPlayer {
  const mine = rows.filter((r) => r.user_id === userId);
  return {
    name,
    best: Math.max(0, ...mine.map((r) => r.best)),
    todayBest: Math.max(0, ...mine.filter((r) => r.day === today).map((r) => r.best)),
    plays: mine.reduce((sum, r) => sum + r.plays, 0),
  };
}

export async function getFlappySummary(): Promise<FlappySummary | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: members },
    { data: rows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase.from("game_days").select("user_id, day, best, plays").eq("space_id", spaceId).eq("game", "flappy"),
  ]);
  if (!user) return null;

  const partnerId = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id).find((id) => id !== user.id);
  let partnerName = "Tu pareja";
  if (partnerId) {
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", partnerId).maybeSingle();
    partnerName = (profile as { display_name: string | null } | null)?.display_name ?? partnerName;
  }

  const all = (rows ?? []) as Row[];
  const today = todayKey();
  return {
    me: summarizePlayer(all, user.id, today, "Tú"),
    partner: partnerId ? summarizePlayer(all, partnerId, today, partnerName) : null,
  };
}
