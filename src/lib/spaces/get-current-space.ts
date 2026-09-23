import { createClient } from "@/lib/supabase/server";

/**
 * El espacio (Ratta Space) al que pertenece el usuario autenticado.
 * De momento cada persona pertenece a un único espacio; si en el futuro
 * hay más de uno, esto tendrá que dejar de coger "el primero".
 */
export async function getCurrentSpaceId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("space_members")
    .select("space_id")
    .limit(1)
    .maybeSingle();

  return data?.space_id ?? null;
}
