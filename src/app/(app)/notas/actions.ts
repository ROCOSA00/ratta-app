"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

const togglePinSchema = z.object({
  noteId: z.string().uuid(),
  nextPinned: z.enum(["true", "false"]),
});

const deleteNoteSchema = z.object({
  noteId: z.string().uuid(),
});

const newNoteSchema = z
  .object({
    title: z.string().trim().min(1, "Ponle un título a la nota."),
    content: z.string().trim().max(5000, "Máximo 5000 caracteres.").optional(),
    noteType: z.enum(["text", "checklist"]).default("text"),
  })
  .refine((data) => data.noteType === "checklist" || !!data.content, {
    message: "Escribe algo en la nota.",
    path: ["content"],
  });

const updateNoteSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(1, "Ponle un título a la nota."),
  content: z.string().trim().min(1, "Escribe algo en la nota.").max(5000, "Máximo 5000 caracteres."),
});

const updateNoteTitleSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(1, "Ponle un título a la nota.").max(200, "Máximo 200 caracteres."),
});

const addNoteItemSchema = z.object({
  noteId: z.string().uuid(),
  content: z.string().trim().min(1, "Escribe algo.").max(300, "Máximo 300 caracteres."),
});

const toggleNoteItemSchema = z.object({
  itemId: z.string().uuid(),
  noteId: z.string().uuid(),
  nextChecked: z.enum(["true", "false"]),
});

const deleteNoteItemSchema = z.object({
  itemId: z.string().uuid(),
  noteId: z.string().uuid(),
});

export type NewNoteState = { error: string | null };
export type UpdateNoteState = { error: string | null; saved?: boolean };

export async function createNote(
  _prevState: NewNoteState,
  formData: FormData,
): Promise<NewNoteState> {
  const parsed = newNoteSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    noteType: formData.get("noteType") || "text",
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

  const { data: inserted, error } = await supabase
    .from("notes")
    .insert({
      space_id: spaceId,
      created_by: user.id,
      title: parsed.data.title,
      content: parsed.data.noteType === "checklist" ? "" : (parsed.data.content ?? ""),
      note_type: parsed.data.noteType,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "No se pudo guardar la nota. Inténtalo de nuevo." };
  }

  revalidatePath("/notas");

  if (parsed.data.noteType === "checklist") {
    redirect(`/notas/${inserted.id}`);
  }

  return { error: null };
}

export async function updateNote(
  _prevState: UpdateNoteState,
  formData: FormData,
): Promise<UpdateNoteState> {
  const parsed = updateNoteSchema.safeParse({
    noteId: formData.get("noteId"),
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ title: parsed.data.title, content: parsed.data.content })
    .eq("id", parsed.data.noteId);

  if (error) {
    return { error: "No se pudo guardar. Inténtalo de nuevo." };
  }

  revalidatePath("/notas");
  revalidatePath(`/notas/${parsed.data.noteId}`);
  revalidatePath("/inicio");
  return { error: null, saved: true };
}

export async function updateNoteTitle(formData: FormData): Promise<void> {
  const parsed = updateNoteTitleSchema.safeParse({
    noteId: formData.get("noteId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("notes").update({ title: parsed.data.title }).eq("id", parsed.data.noteId);

  revalidatePath("/notas");
  revalidatePath(`/notas/${parsed.data.noteId}`);
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

export async function deleteNote(formData: FormData): Promise<void> {
  const parsed = deleteNoteSchema.safeParse({ noteId: formData.get("noteId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  // La RLS de notes ya exige que la nota pertenezca a un espacio del que
  // el usuario es miembro (igual que en togglePin), así que no hace
  // falta volver a comprobar el espacio aquí.
  await supabase.from("notes").delete().eq("id", parsed.data.noteId);

  revalidatePath("/notas");
  revalidatePath("/inicio");
  redirect("/notas");
}

export async function addNoteItem(formData: FormData): Promise<void> {
  const parsed = addNoteItemSchema.safeParse({
    noteId: formData.get("noteId"),
    content: formData.get("content"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  // La RLS de note_items ya exige pertenencia al espacio a través de la
  // nota (note_items_insert_member), así que no hace falta comprobarlo
  // aquí también.
  await supabase.from("note_items").insert({
    note_id: parsed.data.noteId,
    content: parsed.data.content,
  });

  revalidatePath(`/notas/${parsed.data.noteId}`);
}

export async function toggleNoteItem(formData: FormData): Promise<void> {
  const parsed = toggleNoteItemSchema.safeParse({
    itemId: formData.get("itemId"),
    noteId: formData.get("noteId"),
    nextChecked: formData.get("nextChecked"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("note_items")
    .update({ is_checked: parsed.data.nextChecked === "true" })
    .eq("id", parsed.data.itemId);

  revalidatePath(`/notas/${parsed.data.noteId}`);
}

export async function deleteNoteItem(formData: FormData): Promise<void> {
  const parsed = deleteNoteItemSchema.safeParse({
    itemId: formData.get("itemId"),
    noteId: formData.get("noteId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("note_items").delete().eq("id", parsed.data.itemId);

  revalidatePath(`/notas/${parsed.data.noteId}`);
}
