"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

export type LogEntryState = { error: string | null; entryId?: string };

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

  const { data, error } = await supabase
    .from("poop_entries")
    .insert({ space_id: spaceId, user_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No se pudo registrar. Inténtalo de nuevo." };
  }

  // Se usa desde /juegos y desde el dashboard de /inicio.
  revalidatePath("/juegos");
  revalidatePath("/inicio");
  return { error: null, entryId: data.id as string };
}

const undoSchema = z.object({ entryId: z.string().uuid() });

export async function undoEntry(entryId: string): Promise<void> {
  const parsed = undoSchema.safeParse({ entryId });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // La RLS de poop_entries permite borrar cualquier entrada del espacio;
  // aquí se limita además a las propias para que "deshacer" nunca pueda
  // tocar un registro de la pareja.
  await supabase.from("poop_entries").delete().eq("id", parsed.data.entryId).eq("user_id", user.id);

  revalidatePath("/juegos");
  revalidatePath("/inicio");
}
