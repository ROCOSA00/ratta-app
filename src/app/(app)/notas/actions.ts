"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

const togglePinSchema = z.object({
  noteId: z.string().uuid(),
  nextPinned: z.enum(["true", "false"]),
});

const newNoteSchema = z.object({
  title: z.string().trim().min(1, "Ponle un título a la nota."),
  content: z.string().trim().min(1, "Escribe algo en la nota."),
});

export type NewNoteState = { error: string | null };

export async function createNote(
  _prevState: NewNoteState,
  formData: FormData,
): Promise<NewNoteState> {
  const parsed = newNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // El space_id nunca viene del formulario: se calcula aquí, en el
  // servidor, a partir de la sesión.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return { error: "No perteneces a ningún espacio todavía." };
  }

  const { error } = await supabase.from("notes").insert({
    space_id: spaceId,
    created_by: user.id,
    title: parsed.data.title,
    content: parsed.data.content,
    note_type: "text",
  });

  if (error) {
    return { error: "No se pudo guardar la nota. Inténtalo de nuevo." };
  }

  revalidatePath("/notas");
  return { error: null };
}

export async function togglePin(formData: FormData): Promise<void> {
  const parsed = togglePinSchema.safeParse({
    noteId: formData.get("noteId"),
    nextPinned: formData.get("nextPinned"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // No se recalcula el espacio aquí: la RLS de notes ya exige que la
  // nota pertenezca a un espacio del que el usuario es miembro, igual
  // que en cualquier UPDATE/DELETE por id de esta app.
  await supabase
    .from("notes")
    .update({ is_pinned: parsed.data.nextPinned === "true" })
    .eq("id", parsed.data.noteId);

  revalidatePath("/notas");
  revalidatePath("/inicio");
}
