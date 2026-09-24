import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getAuthUser } from "@/lib/auth/get-user";

export type LatestNudge = {
  emoji: string;
  label: string;
  senderName: string;
  createdAt: string;
};

const NUDGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getLatestNudge(): Promise<LatestNudge | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await getAuthUser();
  if (!user) return null;

  const since = new Date(Date.now() - NUDGE_WINDOW_MS).toISOString();

  const { data } = await supabase
    .from("activity_log")
    .select("user_id, metadata, created_at")
    .eq("space_id", spaceId)
    .eq("action", "nudge")
    .neq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", data.user_id as string)
    .maybeSingle();

  const metadata = data.metadata as { emoji?: string; label?: string } | null;

  return {
    emoji: metadata?.emoji ?? "💌",
    label: metadata?.label ?? "te ha enviado cariño",
    senderName: profile?.display_name ?? "Tu pareja",
    createdAt: data.created_at as string,
  };
}
