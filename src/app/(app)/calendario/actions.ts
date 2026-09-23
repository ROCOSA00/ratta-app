"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { formatDate, formatDateTime, zonedInputToUTC } from "@/lib/format-date";
import { notifyPartner } from "@/lib/push/notify";
import { todayKey, toDateKey } from "@/lib/calendar/date-utils";
import { EVENT_PHOTOS_BUCKET } from "@/lib/events/photos-config";

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

  const eventTitle = parsed.data.title;
  const when = isAllDay ? formatDate(startAt.toISOString()) : formatDateTime(startAt.toISOString());
  await notifyPartner((me) => ({
    title: "📅 Nuevo plan",
    body: `${me} ha añadido: ${eventTitle} (${when})`,
    url: "/calendario",
  }));

  revalidatePath("/calendario");
  revalidatePath("/inicio");
  return { error: null };
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  // Primero apuntamos sus fotos: al borrar el plan, sus filas se borran en
  // cascada, pero los ficheros del almacén hay que quitarlos aparte.
  const { data: photos } = await supabase
    .from("event_photos")
    .select("storage_path")
    .eq("event_id", parsed.data.eventId);

  // La RLS de events ya exige que el evento pertenezca a un espacio del
  // que el usuario es miembro, igual que en el resto de acciones por id.
  const { error } = await supabase.from("events").delete().eq("id", parsed.data.eventId);

  const paths = ((photos ?? []) as { storage_path: string }[]).map((p) => p.storage_path);
  if (!error && paths.length > 0) {
    await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove(paths);
  }

  revalidatePath("/calendario");
  revalidatePath("/inicio");
  // Desde la página de detalle del plan, se vuelve al calendario.
  if (formData.get("redirect") === "1") redirect("/calendario");
}

// ------------------------------------------------------------ Fotos de planes

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PHOTO_PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const addEventPhotoSchema = z.object({
  eventId: z.string().uuid(),
  path: z.string().regex(PHOTO_PATH_RE, "Ruta de foto no válida."),
});

export type AddEventPhotoResult = { error: string | null };

/**
 * Registra una foto de un plan que el navegador ya subió al almacén
 * privado "event-photos". Solo se puede a partir del día del plan.
 */
export async function addEventPhoto(input: { eventId: string; path: string }): Promise<AddEventPhotoResult> {
  const parsed = addEventPhotoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión; la foto tiene que estar en su carpeta.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  if (!parsed.data.path.startsWith(`${spaceId}/`)) return { error: "Ruta de foto no válida." };

  // La RLS solo deja ver planes de tu espacio: si no aparece, no es vuestro.
  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_at")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!event) return { error: "Ese plan ya no existe." };

  const row = event as { id: string; title: string; start_at: string };
  if (toDateKey(new Date(row.start_at)) > todayKey()) {
    return { error: "Podréis añadir fotos a partir del día del plan." };
  }

  const { error } = await supabase.from("event_photos").insert({
    space_id: spaceId,
    event_id: row.id,
    uploaded_by: user.id,
    storage_path: parsed.data.path,
  });
  if (error) return { error: "No se pudo guardar la foto. Inténtalo de nuevo." };

  const title = row.title;
  await notifyPartner((me) => ({
    title: "📸 Fotos del plan",
    body: `${me} ha añadido una foto a «${title}»`,
    url: `/calendario/${row.id}`,
    tag: `event-photos-${row.id}`,
  }));

  revalidatePath(`/calendario/${row.id}`);
  revalidatePath("/calendario");
  return { error: null };
}

const deleteEventPhotoSchema = z.object({ photoId: z.string().uuid() });

export async function deleteEventPhoto(photoId: string): Promise<{ error: string | null }> {
  const parsed = deleteEventPhotoSchema.safeParse({ photoId });
  if (!parsed.success) return { error: "Foto no válida." };

  const supabase = await createClient();
  // La RLS exige que la foto sea de vuestro espacio. Borramos la fila y,
  // si se borró, también el fichero del almacén.
  const { data } = await supabase
    .from("event_photos")
    .delete()
    .eq("id", parsed.data.photoId)
    .select("storage_path, event_id")
    .maybeSingle();

  const deleted = data as { storage_path: string; event_id: string } | null;
  if (!deleted) return { error: "No se pudo borrar la foto." };

  await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([deleted.storage_path]);
  revalidatePath(`/calendario/${deleted.event_id}`);
  revalidatePath("/calendario");
  return { error: null };
}
