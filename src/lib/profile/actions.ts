"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const renameSchema = z.object({
  displayName: z.string().trim().min(1, "Escribe un nombre.").max(30, "Máximo 30 caracteres."),
});

export type RenameState = { error: string | null };

export async function updateDisplayName(
  _prevState: RenameState,
  formData: FormData,
): Promise<RenameState> {
  const parsed = renameSchema.safeParse({ displayName: formData.get("displayName") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nombre no válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // Siempre el propio perfil: id viene de la sesión, nunca del cliente.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) {
    return { error: "No se pudo guardar. Inténtalo de nuevo." };
  }

  revalidatePath("/mas");
  revalidatePath("/inicio");
  revalidatePath("/juegos");
  return { error: null };
}
