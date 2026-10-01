"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { addMonths, todayKey } from "@/lib/calendar/date-utils";
import { CAPSULE_BUCKET, CAPSULE_LIMITS, shortDate } from "./config";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Ponle un título a la carta.")
    .max(CAPSULE_LIMITS.title, `Máximo ${CAPSULE_LIMITS.title} caracteres en el título.`),
  body: z
    .string()
    .trim()
    .min(1, "Escribe algo en la carta.")
    .max(CAPSULE_LIMITS.body, `Máximo ${CAPSULE_LIMITS.body} caracteres.`),
  openOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige cuándo se abre."),
  hint: z
    .string()
    .trim()
    .max(CAPSULE_LIMITS.hint, `Máximo ${CAPSULE_LIMITS.hint} caracteres en la pista.`)
    .optional(),
  photoPath: z.string().regex(PHOTO_PATH_RE, "Foto no válida.").optional(),
});

export type CreateCapsuleResult = { error: string | null; id?: string };

/**
 * Guarda una carta para el futuro. Si lleva foto, el navegador ya la subió
 * al almacén privado "capsules". La pareja solo recibe un aviso de que
 * existe y de cuándo se abre: nunca el contenido.
 */
export async function createCapsule(input: {
  title: string;
  body: string;
  openOn: string;
  hint?: string;
  photoPath?: string;
}): Promise<CreateCapsuleResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const today = todayKey();
  const { openOn } = parsed.data;
  if (openOn <= today) return { error: "Tiene que abrirse de mañana en adelante." };
  if (openOn > addMonths(today, 12 * CAPSULE_LIMITS.maxYears)) {
    return { error: `Como mucho, dentro de ${CAPSULE_LIMITS.maxYears} años.` };
  }

  // El espacio sale de la sesión; la foto tiene que estar en su carpeta.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  if (parsed.data.photoPath && !parsed.data.photoPath.startsWith(`${spaceId}/`)) {
    return { error: "Foto no válida." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_capsule", {
    p_space_id: spaceId,
    p_open_on: openOn,
    p_hint: parsed.data.hint || null,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_photo_path: parsed.data.photoPath ?? null,
  });
  if (error || typeof data !== "string") return { error: "No se pudo guardar la carta. Inténtalo de nuevo." };

  const when = shortDate(openOn);
  await notifyPartner((me) => ({
    title: "💌 Cápsula del tiempo",
    body: `${me} te ha escrito una carta. Se abrirá el ${when}.`,
    url: "/capsulas",
  }));

  revalidatePath("/capsulas");
  revalidatePath("/inicio");
  return { error: null, id: data };
}

const idSchema = z.string().uuid();

/** Borra una carta tuya (y su foto). */
export async function deleteCapsule(formData: FormData): Promise<void> {
  const parsed = idSchema.safeParse(formData.get("capsuleId"));
  if (!parsed.success) return;

  const supabase = await createClient();
  // Quien la escribió siempre puede ver su contenido: así sabemos la foto.
  const { data: content } = await supabase
    .from("capsule_contents")
    .select("photo_path")
    .eq("capsule_id", parsed.data)
    .maybeSingle();
  // La RLS solo deja borrar las tuyas.
  const { data: deleted } = await supabase
    .from("capsules")
    .delete()
    .eq("id", parsed.data)
    .select("id")
    .maybeSingle();

  const photo = (content as { photo_path: string | null } | null)?.photo_path;
  if (deleted && photo) await supabase.storage.from(CAPSULE_BUCKET).remove([photo]);

  revalidatePath("/capsulas");
  revalidatePath("/inicio");
  redirect("/capsulas");
}

/**
 * Quien la recibe la abre (ya ha llegado el día). Solo la primera vez se
 * avisa a quien la escribió.
 */
export async function markCapsuleOpened(capsuleId: string): Promise<void> {
  const parsed = idSchema.safeParse(capsuleId);
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data } = await supabase.rpc("open_capsule", { p_capsule_id: parsed.data });
  if (data !== true) return;

  await notifyPartner((me) => ({
    title: "💌 Carta abierta",
    body: `${me} acaba de abrir tu carta`,
    url: `/capsulas/${parsed.data}`,
    tag: `capsula-${parsed.data}`,
  }));
  revalidatePath("/capsulas");
  revalidatePath("/inicio");
}
