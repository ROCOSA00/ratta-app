import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { todayKey } from "@/lib/calendar/date-utils";
import { computeHeartStats, EMPTY_TOTALS, type HeartRow, type HeartTotals } from "./stats";
import { getAuthUser } from "@/lib/auth/get-user";

export type HeartsSummary = {
  me: { name: string; totals: HeartTotals };
  partner: { name: string; totals: HeartTotals } | null;
  record: { name: string; day: string; count: number } | null;
};

export async function getHeartsSummary(): Promise<HeartsSummary | null> {
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
    getAuthUser(),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase.from("heart_taps").select("user_id, day, count").eq("space_id", spaceId),
  ]);
  if (!user) return null;

  const userIds = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map<string, string>((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));

  const { totals, record } = computeHeartStats((rows ?? []) as HeartRow[], userIds, todayKey());
  const partnerId = userIds.find((id) => id !== user.id);

  return {
    me: { name: "Tú", totals: totals[user.id] ?? { ...EMPTY_TOTALS } },
    partner: partnerId
      ? { name: nameById.get(partnerId) ?? "Tu pareja", totals: totals[partnerId] ?? { ...EMPTY_TOTALS } }
      : null,
    record: record
      ? {
          name: record.userId === user.id ? "Tú" : (nameById.get(record.userId) ?? "Tu pareja"),
          day: record.day,
          count: record.count,
        }
      : null,
  };
}
