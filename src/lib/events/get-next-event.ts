import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

export type NextEvent = { id: string; title: string; start_at: string; all_day: boolean };

export async function getNextEvent(): Promise<NextEvent | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, start_at, all_day")
    .eq("space_id", spaceId)
    .gte("end_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}
