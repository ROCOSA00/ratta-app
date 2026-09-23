"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

export type LogEntryState = { error: string | null };

export async function logEntry(): Promise<LogEntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // El space_id nunca viene del cliente: se calcula aquí, en el
  // servidor, a partir de la sesión.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return { error: "No perteneces a ningún espacio todavía." };
  }

  const { error } = await supabase.from("poop_entries").insert({
    space_id: spaceId,
    user_id: user.id,
  });

  if (error) {
    return { error: "No se pudo registrar. Inténtalo de nuevo." };
  }

  // Se usa desde /juegos y desde el dashboard de /inicio.
  revalidatePath("/juegos");
  revalidatePath("/inicio");
  return { error: null };
}
