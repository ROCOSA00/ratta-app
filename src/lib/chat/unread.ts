import { createClient } from "@/lib/supabase/server";

/** Mensajes de tu pareja que aún no has visto (0 si algo falla). */
export async function getUnreadChatCount(spaceId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_chat_count", { p_space_id: spaceId });
  if (error || typeof data !== "number") return 0;
  return data;
}
