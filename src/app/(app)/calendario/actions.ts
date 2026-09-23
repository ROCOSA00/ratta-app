"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";

const newEventSchema = z.object({
  title: z.string().trim().min(1, "Ponle un título al evento."),
  date: z.string().min(1, "Elige una fecha."),
  time: z.string().min(1, "Elige una hora."),
});

export type NewEventState = { error: string | null };

export async function createEvent(
  _prevState: NewEventState,
  formData: FormData,
): Promise<NewEventState> {
  const parsed = newEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    time: formData.get("time"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const startAt = new Date(`${parsed.data.date}T${parsed.data.time}`);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Fecha u hora no válidas." };
  }
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // El space_id nunca viene del formulario: se calcula aquí, en el
  // servidor, a partir de la sesión. Así nadie puede colar un evento
  // en un espacio ajeno manipulando el formulario.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return { error: "No perteneces a ningún espacio todavía." };
  }

  const { error } = await supabase.from("events").insert({
    space_id: spaceId,
    created_by: user.id,
    title: parsed.data.title,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });

  if (error) {
    return { error: "No se pudo guardar el evento. Inténtalo de nuevo." };
  }

  revalidatePath("/calendario");
  return { error: null };
}
