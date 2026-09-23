import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

export type PinnedNote = { id: string; title: string; content: string; note_type: "text" | "checklist" };

export async function getPinnedNote(): Promise<PinnedNote | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, title, content, note_type")
    .eq("space_id", spaceId)
    .eq("is_pinned", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
