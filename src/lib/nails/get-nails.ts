import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getAuthUser } from "@/lib/auth/get-user";
import type { NailBite } from "./stats";

export type NailPerson = {
  id: string;
  name: string;
  /** null = aún no ha empezado el reto. */
  startedOn: string | null;
  bites: NailBite[];
};

/**
 * Tu reto y el de tu pareja. Los dos se ven, y los mordiscos de cualquiera
 * de los dos retos los puede apuntar cualquiera (empezarlo, solo cada uno).
 */
export async function getNails(): Promise<{ me: NailPerson; partner: NailPerson | null } | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const [{ data: auth }, { data: members }, { data: profiles }, { data: challenges }, { data: bites }] =
    await Promise.all([
      getAuthUser(),
      supabase.from("space_members").select("user_id").eq("space_id", spaceId),
      supabase.from("profiles").select("id, display_name"),
      supabase.from("nail_challenges").select("user_id, started_on").eq("space_id", spaceId),
      supabase.from("nail_bites").select("user_id, day, count, note, reported_by").eq("space_id", spaceId).order("day"),
    ]);
  const myId = auth.user?.id;
  if (!myId) return null;

  const nameOf = new Map(
    ((profiles ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? "Tu pareja"]),
  );
  const startOf = new Map(
    ((challenges ?? []) as { user_id: string; started_on: string }[]).map((c) => [c.user_id, c.started_on]),
  );
  type BiteRow = { user_id: string; day: string; count: number; note: string | null; reported_by: string | null };
  const bitesOf = (id: string): NailBite[] =>
    ((bites ?? []) as BiteRow[])
      .filter((b) => b.user_id === id)
      .map(({ day, count, note, reported_by }) => ({ day, count, note, reportedBy: reported_by }));
  const person = (id: string): NailPerson => ({
    id,
    name: nameOf.get(id) ?? "Tu pareja",
    startedOn: startOf.get(id) ?? null,
    bites: bitesOf(id),
  });

  const partnerId = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id).find((id) => id !== myId);
  return { me: person(myId), partner: partnerId ? person(partnerId) : null };
}
