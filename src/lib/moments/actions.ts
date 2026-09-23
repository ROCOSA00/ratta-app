"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { todayKey } from "@/lib/calendar/date-utils";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const postSchema = z.object({
  path: z.string().regex(PATH_RE, "Ruta de foto no válida."),
  caption: z.string().trim().max(140, "Máximo 140 caracteres."),
});

export type PostMomentResult = { error: string | null; lateSeconds?: number };

/**
 * Registra la foto del Momento de hoy, que el navegador ya subió al almacén
 * privado "moments". La base de datos comprueba que hoy ya ha sonado y
 * calcula el retraso con su propio reloj.
 */
export async function postMoment(input: { path: string; caption: string }): Promise<PostMomentResult> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  if (!parsed.data.path.startsWith(`${spaceId}/`)) return { error: "Ruta de foto no válida." };

  const { data, error } = await supabase
    .from("moment_photos")
    .insert({
      space_id: spaceId,
      day: todayKey(),
      user_id: user.id,
      storage_path: parsed.data.path,
      caption: parsed.data.caption || null,
    })
    .select("late_seconds")
    .single();

  if (error || !data) {
    const message = error?.message ?? "";
    if (message.includes("aun no ha sonado")) return { error: "El Momento de hoy aún no ha sonado." };
    if (message.includes("duplicate") || message.includes("unique")) {
      return { error: "Ya has subido tu Momento de hoy." };
    }
    return { error: "No se pudo subir tu Momento. Inténtalo de nuevo." };
  }

  const lateSeconds = (data as { late_seconds: number }).late_seconds;
  const lateMin = Math.max(1, Math.round(lateSeconds / 60));
  await notifyPartner((me) => ({
    title: "📸 Momento Ratta",
    body:
      lateSeconds > 0 ? `${me} ha subido su Momento (${lateMin} min tarde)` : `${me} ha subido su Momento ¡a tiempo!`,
    url: "/momento",
    tag: "momento",
  }));

  revalidatePath("/momento");
  revalidatePath("/inicio");
  revalidatePath("/calendario");
  return { error: null, lateSeconds };
}
