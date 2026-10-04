"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { todayKey } from "@/lib/calendar/date-utils";
import { findKind, PET_BUCKET, PET_EVENT_KIND_IDS } from "./config";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

type Result = { error: string | null };

function refresh() {
  revalidatePath("/mascota");
  revalidatePath("/inicio");
}

/**
 * La sesión, el espacio y la mascota (que tiene que ser de vuestro
 * espacio: la RLS solo deja verla si lo es).
 */
async function context(petId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const spaceId = await getCurrentSpaceId();
  if (!user || !spaceId || !z.string().uuid().safeParse(petId).success) return null;
  const { data: pet } = await supabase
    .from("pets")
    .select("id, name, born_on, photo_path")
    .eq("id", petId)
    .eq("space_id", spaceId)
    .maybeSingle();
  if (!pet) return null;
  return {
    supabase,
    userId: user.id,
    spaceId,
    pet: pet as { id: string; name: string; born_on: string; photo_path: string | null },
  };
}

const NOT_FOUND = { error: "No encuentro a vuestra mascota. Vuelve a entrar." };

// ------------------------------------------------------------ Ficha

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Ponle nombre.").max(40, "Máximo 40 caracteres."),
  adoptedOn: z.union([z.literal(""), z.string().regex(DATE_KEY, "Fecha no válida.")]),
});

/** Cambia el nombre y el día en que llegó a casa. */
export async function updatePet(petId: string, input: { name: string; adoptedOn: string }): Promise<Result> {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const ctx = await context(petId);
  if (!ctx) return NOT_FOUND;
  const adopted = parsed.data.adoptedOn || null;
  if (adopted && (adopted < ctx.pet.born_on || adopted > todayKey())) {
    return { error: "Tiene que ser entre el día que nació y hoy." };
  }
  const { error } = await ctx.supabase
    .from("pets")
    .update({ name: parsed.data.name, adopted_on: adopted })
    .eq("id", ctx.pet.id);
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  refresh();
  return { error: null };
}

/** Pone la foto de la ficha (ya subida al almacén) y borra la anterior. */
export async function setPetPhoto(petId: string, path: string): Promise<Result> {
  const ctx = await context(petId);
  if (!ctx) return NOT_FOUND;
  if (!PATH_RE.test(path) || !path.startsWith(`${ctx.spaceId}/`)) return { error: "Foto no válida." };
  const { error } = await ctx.supabase.from("pets").update({ photo_path: path }).eq("id", ctx.pet.id);
  if (error) return { error: "No se pudo guardar la foto." };
  if (ctx.pet.photo_path) await ctx.supabase.storage.from(PET_BUCKET).remove([ctx.pet.photo_path]);
  refresh();
  return { error: null };
}

// ------------------------------------------------------------ Peso

const weightSchema = z.object({
  day: z.string().regex(DATE_KEY, "Fecha no válida."),
  grams: z.number().int("En gramos, sin decimales.").min(1, "Peso no válido.").max(30000, "¿Seguro? Eso es mucho gato 😅"),
});

/** Apunta lo que pesa un día (si ya había un peso ese día, lo cambia). */
export async function setPetWeight(petId: string, input: { day: string; grams: number }): Promise<Result> {
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  if (parsed.data.day > todayKey()) return { error: "No se puede pesar en el futuro 🔮" };
  const ctx = await context(petId);
  if (!ctx) return NOT_FOUND;
  if (parsed.data.day < ctx.pet.born_on) return { error: "Ese día aún no había nacido." };
  const { error } = await ctx.supabase.from("pet_weights").upsert(
    {
      pet_id: ctx.pet.id,
      space_id: ctx.spaceId,
      day: parsed.data.day,
      grams: parsed.data.grams,
      created_by: ctx.userId,
    },
    { onConflict: "pet_id,day" },
  );
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };
  refresh();
  return { error: null };
}

export async function deletePetWeight(petId: string, weightId: string): Promise<Result> {
  const ctx = await context(petId);
  if (!ctx || !z.string().uuid().safeParse(weightId).success) return NOT_FOUND;
  await ctx.supabase.from("pet_weights").delete().eq("id", weightId).eq("pet_id", ctx.pet.id);
  refresh();
  return { error: null };
}

// ------------------------------------------------------------ Diario

const eventSchema = z.object({
  day: z.string().regex(DATE_KEY, "Fecha no válida."),
  kind: z.enum(PET_EVENT_KIND_IDS, "Tipo no válido."),
  title: z.string().trim().min(1, "Escribe qué pasó.").max(120, "Máximo 120 caracteres."),
  note: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
});

/** Añade algo al diario (vacuna, veterinario, primera vez…) y avisa a tu pareja. */
export async function addPetEvent(
  petId: string,
  input: { day: string; kind: string; title: string; note?: string },
): Promise<Result> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const ctx = await context(petId);
  if (!ctx) return NOT_FOUND;
  const { error } = await ctx.supabase.from("pet_events").insert({
    pet_id: ctx.pet.id,
    space_id: ctx.spaceId,
    day: parsed.data.day,
    kind: parsed.data.kind,
    title: parsed.data.title,
    note: parsed.data.note || null,
    created_by: ctx.userId,
  });
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  const { emoji } = findKind(parsed.data.kind);
  const name = ctx.pet.name;
  const title = parsed.data.title;
  await notifyPartner((me) => ({
    title: `${emoji} ${name}`,
    body: `${me} ha apuntado: ${title}`,
    url: "/mascota",
    tag: "pet",
  }));
  refresh();
  return { error: null };
}

export async function deletePetEvent(petId: string, eventId: string): Promise<Result> {
  const ctx = await context(petId);
  if (!ctx || !z.string().uuid().safeParse(eventId).success) return NOT_FOUND;
  await ctx.supabase.from("pet_events").delete().eq("id", eventId).eq("pet_id", ctx.pet.id);
  refresh();
  return { error: null };
}

// ------------------------------------------------------------ Álbum

const photoSchema = z.object({
  path: z.string().regex(PATH_RE, "Foto no válida."),
  caption: z.string().trim().max(140, "Máximo 140 caracteres.").optional(),
  takenOn: z.string().regex(DATE_KEY, "Fecha no válida."),
});

/** Registra una foto del álbum (ya subida al almacén) y avisa a tu pareja. */
export async function addPetPhoto(
  petId: string,
  input: { path: string; caption?: string; takenOn: string },
): Promise<Result> {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const ctx = await context(petId);
  if (!ctx) return NOT_FOUND;
  if (!parsed.data.path.startsWith(`${ctx.spaceId}/`)) return { error: "Foto no válida." };
  if (parsed.data.takenOn > todayKey() || parsed.data.takenOn < ctx.pet.born_on) {
    return { error: "La fecha tiene que ser entre el día que nació y hoy." };
  }
  const { error } = await ctx.supabase.from("pet_photos").insert({
    pet_id: ctx.pet.id,
    space_id: ctx.spaceId,
    storage_path: parsed.data.path,
    caption: parsed.data.caption || null,
    taken_on: parsed.data.takenOn,
    uploaded_by: ctx.userId,
  });
  if (error) return { error: "No se pudo guardar la foto. Inténtalo de nuevo." };

  const name = ctx.pet.name;
  await notifyPartner((me) => ({
    title: `📸 Nueva foto de ${name}`,
    body: `${me} ha subido una foto${parsed.data.caption ? `: ${parsed.data.caption}` : ""}`,
    url: "/mascota",
    tag: "pet-photo",
  }));
  refresh();
  return { error: null };
}

export async function deletePetPhoto(petId: string, photoId: string): Promise<Result> {
  const ctx = await context(petId);
  if (!ctx || !z.string().uuid().safeParse(photoId).success) return NOT_FOUND;
  const { data } = await ctx.supabase
    .from("pet_photos")
    .delete()
    .eq("id", photoId)
    .eq("pet_id", ctx.pet.id)
    .select("storage_path")
    .maybeSingle();
  const path = (data as { storage_path: string } | null)?.storage_path;
  if (path) await ctx.supabase.storage.from(PET_BUCKET).remove([path]);
  refresh();
  return { error: null };
}
