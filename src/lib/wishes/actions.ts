"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { findCategory, WISH_CATEGORY_IDS } from "./options";

const addSchema = z.object({
  title: z.string().trim().min(1, "Escribe tu deseo.").max(120, "Máximo 120 caracteres."),
  category: z.enum(WISH_CATEGORY_IDS, "Categoría no válida.").default("otro"),
  note: z.string().trim().max(500, "Máximo 500 caracteres en la nota.").optional(),
});

export type AddWishState = { error: string | null; added: number };

export async function addWish(prev: AddWishState, formData: FormData): Promise<AddWishState> {
  const parsed = addSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", added: prev.added };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar.", added: prev.added };

  // El espacio sale de la sesión, nunca del formulario.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía.", added: prev.added };

  const { error } = await supabase.from("wishes").insert({
    space_id: spaceId,
    created_by: user.id,
    title: parsed.data.title,
    category: parsed.data.category,
    note: parsed.data.note || null,
  });
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo.", added: prev.added };

  const { emoji } = findCategory(parsed.data.category);
  const title = parsed.data.title;
  await notifyPartner((me) => ({
    title: "✨ Nuevo deseo",
    body: `${me} ha añadido: ${emoji} ${title}`,
    url: "/deseos",
    tag: "deseos",
  }));

  revalidatePath("/deseos");
  // `added` cambia en cada deseo guardado: así el formulario sabe vaciarse.
  return { error: null, added: prev.added + 1 };
}

const toggleSchema = z.object({ wishId: z.string().uuid(), done: z.boolean() });

/** Tacha (cumplido) o destacha un deseo. Al cumplirlo, avisa a tu pareja. */
export async function toggleWish(wishId: string, done: boolean): Promise<{ error: string | null }> {
  const parsed = toggleSchema.safeParse({ wishId, done });
  if (!parsed.success) return { error: "Deseo no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // La RLS solo deja cambiar deseos de vuestro espacio (y tacharlos a tu nombre).
  const { data } = await supabase
    .from("wishes")
    .update(parsed.data.done ? { done_at: new Date().toISOString(), done_by: user.id } : { done_at: null, done_by: null })
    .eq("id", parsed.data.wishId)
    .select("title, category")
    .maybeSingle();
  if (!data) return { error: "No se pudo cambiar." };

  if (parsed.data.done) {
    const wish = data as { title: string; category: string };
    const { emoji } = findCategory(wish.category);
    await notifyPartner((me) => ({
      title: "✅ ¡Deseo cumplido!",
      body: `${me} ha tachado: ${emoji} ${wish.title} 🎉`,
      url: "/deseos",
      tag: "deseos",
    }));
  }

  revalidatePath("/deseos");
  return { error: null };
}

const deleteSchema = z.string().uuid();

export async function deleteWish(formData: FormData): Promise<void> {
  const parsed = deleteSchema.safeParse(formData.get("wishId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("wishes").delete().eq("id", parsed.data);
  revalidatePath("/deseos");
}
