"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { todayKey } from "@/lib/calendar/date-utils";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
type Result = { error: string | null };

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // El espacio sale de la sesión, nunca del cliente.
  const spaceId = await getCurrentSpaceId();
  return { supabase, userId: user?.id ?? null, spaceId };
}

const startSchema = z.string().regex(DATE_KEY, "Fecha no válida.");

/** Empieza tu reto (o cambia el día en que empezó). Por defecto, hoy. */
export async function startNailChallenge(startedOn: string = todayKey()): Promise<Result> {
  const parsed = startSchema.safeParse(startedOn);
  if (!parsed.success) return { error: "Fecha no válida." };
  if (parsed.data > todayKey()) return { error: "El reto no puede empezar en el futuro." };

  const { supabase, userId, spaceId } = await session();
  if (!userId) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };

  const { error } = await supabase
    .from("nail_challenges")
    .upsert({ space_id: spaceId, user_id: userId, started_on: parsed.data }, { onConflict: "space_id,user_id" });
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  revalidatePath("/juegos/unas");
  revalidatePath("/juegos");
  return { error: null };
}

const bitesSchema = z.object({
  day: z.string().regex(DATE_KEY, "Fecha no válida."),
  count: z.number().int().min(0, "Número no válido.").max(50, "¿Más de 50? ¡Eso no son uñas! 😅"),
  note: z.string().trim().max(140, "Máximo 140 caracteres.").optional(),
});

/**
 * Apunta cuántas veces te mordiste las uñas un día (0 = ese día fue
 * limpio, se borra). Solo en tu reto, desde que empezó y hasta hoy.
 */
export async function setNailBites(input: { day: string; count: number; note?: string }): Promise<Result> {
  const parsed = bitesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const { day, count, note } = parsed.data;
  if (day > todayKey()) return { error: "No se puede apuntar el futuro 🔮" };

  const { supabase, userId, spaceId } = await session();
  if (!userId) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };

  const { data: challenge } = await supabase
    .from("nail_challenges")
    .select("started_on")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const startedOn = (challenge as { started_on: string } | null)?.started_on;
  if (!startedOn) return { error: "Primero empieza el reto." };
  if (day < startedOn) return { error: "Ese día aún no habías empezado el reto." };

  const { error } =
    count === 0
      ? await supabase.from("nail_bites").delete().eq("space_id", spaceId).eq("user_id", userId).eq("day", day)
      : await supabase.from("nail_bites").upsert(
          {
            space_id: spaceId,
            user_id: userId,
            day,
            count,
            note: note || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "space_id,user_id,day" },
        );
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  revalidatePath("/juegos/unas");
  revalidatePath("/juegos");
  return { error: null };
}

/** Mandar ánimos a tu pareja con su reto. */
export async function sendNailCheer(): Promise<Result> {
  await notifyPartner((me) => ({
    title: "💪 ¡Ánimo con las uñas!",
    body: `${me} te manda ánimos con el reto. ¡Tú puedes! 💅`,
    url: "/juegos/unas",
    tag: "nails-cheer",
  }));
  return { error: null };
}
