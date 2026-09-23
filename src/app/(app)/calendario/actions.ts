"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { zonedInputToUTC } from "@/lib/format-date";

const newEventSchema = z
  .object({
    title: z.string().trim().min(1, "Ponle un título al evento."),
    date: z.string().min(1, "Elige una fecha."),
    time: z.string().optional(),
    allDay: z.enum(["true", "false"]).default("false"),
    location: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
    description: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  })
  .refine((data) => data.allDay === "true" || !!data.time, {
    message: "Elige una hora.",
    path: ["time"],
  });

const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
});

export type NewEventState = { error: string | null };

export async function createEvent(
  _prevState: NewEventState,
  formData: FormData,
): Promise<NewEventState> {
  const parsed = newEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    // Con "Todo el día" el campo de hora no existe en el formulario y llega
    // como null; para Zod, opcional significa undefined, no null.
    time: formData.get("time") ?? undefined,
    allDay: formData.get("allDay") === "on" ? "true" : "false",
    location: formData.get("location") ?? undefined,
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const isAllDay = parsed.data.allDay === "true";
  let startAt: Date;
  let endAt: Date;

  if (isAllDay) {
    startAt = zonedInputToUTC(`${parsed.data.date}T00:00`);
    endAt = zonedInputToUTC(`${parsed.data.date}T23:59`);
  } else {
    startAt = zonedInputToUTC(`${parsed.data.date}T${parsed.data.time}`);
    endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
  }

  if (Number.isNaN(startAt.getTime())) {
    return { error: "Fecha u hora no válidas." };
  }

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
    all_day: isAllDay,
    location: parsed.data.location || null,
    description: parsed.data.description || null,
  });

  if (error) {
    return { error: "No se pudo guardar el evento. Inténtalo de nuevo." };
  }

  revalidatePath("/calendario");
  revalidatePath("/inicio");
  return { error: null };
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  // La RLS de events ya exige que el evento pertenezca a un espacio del
  // que el usuario es miembro, igual que en el resto de acciones por id.
  await supabase.from("events").delete().eq("id", parsed.data.eventId);

  revalidatePath("/calendario");
  revalidatePath("/inicio");
}
