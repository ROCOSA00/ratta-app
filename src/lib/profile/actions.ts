"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { notifyPartner } from "@/lib/push/notify";
import { findStatus } from "@/lib/status/options";

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

  revalidatePath("/perfil");
  revalidatePath("/inicio");
  revalidatePath("/juegos");
  revalidatePath("/juegos/trono");
  revalidatePath("/juegos/corazones");
  return { error: null };
}

const statusSchema = z.object({
  key: z.string().max(30).nullable(),
  note: z.string().trim().max(60, "Máximo 60 caracteres."),
});

export type StatusResult = { error: string | null };

/** Cambia tu estado de ánimo (o lo quita, con key = null) y avisa a tu pareja. */
export async function updateStatus(input: { key: string | null; note: string }): Promise<StatusResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Estado no válido." };

  const option = parsed.data.key === null ? null : findStatus(parsed.data.key);
  if (parsed.data.key !== null && !option) return { error: "Estado no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // Siempre tu propio perfil (id de la sesión); la RLS también lo exige.
  const { error } = await supabase
    .from("profiles")
    .update({
      status_key: option?.key ?? null,
      status_note: option && parsed.data.note ? parsed.data.note : null,
      status_updated_at: option ? new Date().toISOString() : null,
    })
    .eq("id", user.id);
  if (error) return { error: "No se pudo guardar tu estado." };

  if (option) {
    const note = parsed.data.note;
    await notifyPartner((me) => ({
      title: `${option.emoji} ${me}`,
      body: note ? `Está ${option.label.toLowerCase()}: ${note}` : `Está ${option.label.toLowerCase()}`,
      url: "/chat",
      tag: "status",
    }));
  }

  revalidatePath("/perfil");
  revalidatePath("/chat");
  revalidatePath("/inicio");
  return { error: null };
}
