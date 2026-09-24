import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * El espacio (Ratta Space) al que pertenece el usuario autenticado.
 * De momento cada persona pertenece a un único espacio; si en el futuro
 * hay más de uno, esto tendrá que dejar de coger "el primero".
 */
// cache(): dentro de una misma carga de página se pregunta una sola vez a
// la base de datos, aunque lo pidan el layout y varias tarjetas a la vez.
export const getCurrentSpaceId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("space_members")
    .select("space_id")
    .limit(1)
    .maybeSingle();

  return data?.space_id ?? null;
});
