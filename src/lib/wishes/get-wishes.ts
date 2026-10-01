import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getAuthUser } from "@/lib/auth/get-user";
import type { Wish } from "./options";

/** Los deseos de vuestro espacio (los más nuevos primero) y vuestros nombres. */
export async function getWishes(): Promise<{
  wishes: Wish[];
  names: Record<string, string>;
  myId: string | null;
}> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { wishes: [], names: {}, myId: null };

  const supabase = await createClient();
  const [{ data }, { data: profiles }, { data: auth }] = await Promise.all([
    supabase
      .from("wishes")
      .select("id, title, category, note, created_by, created_at, done_at, done_by")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name"),
    getAuthUser(),
  ]);

  const myId = auth.user?.id ?? null;
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    names[p.id] = p.id === myId ? "Tú" : (p.display_name ?? "Tu pareja");
  }
  return { wishes: (data ?? []) as Wish[], names, myId };
}
