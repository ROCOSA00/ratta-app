"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const addMemorySchema = z.object({
  path: z.string().regex(PATH_RE, "Ruta de foto no válida."),
  caption: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  takenOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.")
    .optional()
    .or(z.literal("")),
});

export type AddMemoryResult = { error: string | null };

/**
 * Registra un recuerdo cuya foto ya se subió desde el navegador al bucket
 * privado "memories". Se llama desde el cliente justo tras la subida.
 */
export async function addMemory(input: { path: string; caption?: string; takenOn?: string }): Promise<AddMemoryResult> {
  const parsed = addMemorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión, nunca del cliente; y la foto tiene que
  // estar en la carpeta de ese espacio (la base de datos lo exige también).
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  if (!parsed.data.path.startsWith(`${spaceId}/`)) return { error: "Ruta de foto no válida." };

  const { error } = await supabase.from("memories").insert({
    space_id: spaceId,
    uploaded_by: user.id,
    storage_path: parsed.data.path,
    caption: parsed.data.caption || null,
    taken_on: parsed.data.takenOn || null,
  });
  if (error) return { error: "No se pudo guardar el recuerdo. Inténtalo de nuevo." };

  const caption = parsed.data.caption;
  await notifyPartner((me) => ({
    title: "📸 Nuevo recuerdo",
    body: caption ? `${me} ha subido una foto: ${caption}` : `${me} ha subido una foto`,
    url: "/recuerdos",
  }));

  revalidatePath("/recuerdos");
  revalidatePath("/inicio");
  return { error: null };
}

const deleteMemorySchema = z.object({ memoryId: z.string().uuid() });

export async function deleteMemory(formData: FormData): Promise<void> {
  const parsed = deleteMemorySchema.safeParse({ memoryId: formData.get("memoryId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Solo tus propios recuerdos (también lo exige la RLS). Primero la fila,
  // para saber qué foto borrar; si no era tuya no se borra nada.
  const { data } = await supabase
    .from("memories")
    .delete()
    .eq("id", parsed.data.memoryId)
    .eq("uploaded_by", user.id)
    .select("storage_path")
    .maybeSingle();

  const path = (data as { storage_path?: string } | null)?.storage_path;
  if (path) {
    await supabase.storage.from("memories").remove([path]);
  }

  revalidatePath("/recuerdos");
  revalidatePath("/inicio");
  redirect("/recuerdos");
}
