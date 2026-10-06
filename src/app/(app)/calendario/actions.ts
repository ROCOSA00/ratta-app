"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { formatDate, formatDateTime, zonedInputToUTC } from "@/lib/format-date";
import { notifyPartner } from "@/lib/push/notify";
import { todayKey } from "@/lib/calendar/date-utils";
import { EVENT_PHOTOS_BUCKET } from "@/lib/events/photos-config";
import {
  followsRule,
  isRecurring,
  occursOn,
  RECURRENCES,
  recurrenceLabel,
  seriesStartDay,
  type Series,
} from "@/lib/events/recurrence";
import { LOVE_COLOR } from "@/lib/events/load";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const newEventSchema = z
  .object({
    title: z.string().trim().min(1, "Ponle un título al evento."),
    date: z.string().min(1, "Elige una fecha."),
    time: z.string().optional(),
    allDay: z.enum(["true", "false"]).default("false"),
    location: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
    description: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
    repeat: z.enum(RECURRENCES, "Repetición no válida.").default("none"),
    until: z.union([z.literal(""), z.string().regex(DATE_KEY, "Fecha de fin no válida.")]).optional(),
    remind: z.boolean().default(false),
  })
  .refine((data) => data.allDay === "true" || !!data.time, {
    message: "Elige una hora.",
    path: ["time"],
  })
  .refine((data) => data.repeat === "none" || !data.until || data.until >= data.date, {
    message: "La fecha de fin no puede ser antes del primer día.",
    path: ["until"],
  });

const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
});

export type NewEventState = { error: string | null };

type EventFields = {
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  description: string | null;
  recurrence: (typeof RECURRENCES)[number];
  recurrence_until: string | null;
  remind_day_before: boolean;
};

/** Lee y valida el formulario de un plan (el mismo para crear y editar). */
function parseEventForm(formData: FormData): { fields: EventFields } | { error: string } {
  const parsed = newEventSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    // Con "Todo el día" el campo de hora no existe en el formulario y llega
    // como null; para Zod, opcional significa undefined, no null.
    time: formData.get("time") ?? undefined,
    allDay: formData.get("allDay") === "on" ? "true" : "false",
    location: formData.get("location") ?? undefined,
    description: formData.get("description") ?? undefined,
    repeat: formData.get("repeat") ?? undefined,
    until: formData.get("until") ?? undefined,
    remind: formData.get("remind") === "on",
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

  const recurrence = parsed.data.repeat;
  return {
    fields: {
      title: parsed.data.title,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: isAllDay,
      location: parsed.data.location || null,
      description: parsed.data.description || null,
      recurrence,
      recurrence_until: recurrence !== "none" && parsed.data.until ? parsed.data.until : null,
      remind_day_before: parsed.data.remind,
    },
  };
}

/** "vie, 25 sept, 20:00 · cada semana (viernes)" para las notificaciones. */
function whenLabel(fields: EventFields): string {
  const when = fields.all_day ? formatDate(fields.start_at) : formatDateTime(fields.start_at);
  const repeats = recurrenceLabel({ ...fields, recurrence_until: null });
  return repeats ? `(${when}) · ${repeats.toLowerCase()}` : `(${when})`;
}

export async function createEvent(
  _prevState: NewEventState,
  formData: FormData,
): Promise<NewEventState> {
  const form = parseEventForm(formData);
  if ("error" in form) return { error: form.error };
  const { fields } = form;

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
    ...fields,
  });

  if (error) {
    return { error: "No se pudo guardar el evento. Inténtalo de nuevo." };
  }

  await notifyPartner((me) => ({
    title: "📅 Nuevo plan",
    body: `${me} ha añadido: ${fields.title} ${whenLabel(fields)}`,
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
  /** Qué vez del plan (si se repite). */
  day: z.string().regex(DATE_KEY).optional(),
});

export type AddEventPhotoResult = { error: string | null };

/**
 * Registra una foto de un plan que el navegador ya subió al almacén
 * privado "event-photos". Solo se puede a partir del día del plan.
 */
export async function addEventPhoto(input: {
  eventId: string;
  path: string;
  day?: string;
}): Promise<AddEventPhotoResult> {
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
    .select("id, title, start_at, end_at, all_day, recurrence, recurrence_until, skipped_days")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!event) return { error: "Ese plan ya no existe." };

  const row = event as Series & { id: string; title: string };
  // Cada foto va a una vez concreta del plan (en uno que se repite, la del
  // día que se esté mirando), y tiene que ser una vez que de verdad toca.
  const occurrence = isRecurring(row) ? (parsed.data.day ?? "") : seriesStartDay(row);
  if (!occursOn(row, occurrence)) return { error: "Ese día no toca este plan." };
  if (occurrence > todayKey()) {
    return { error: "Podréis añadir fotos a partir del día del plan." };
  }

  const { error } = await supabase.from("event_photos").insert({
    space_id: spaceId,
    event_id: row.id,
    uploaded_by: user.id,
    storage_path: parsed.data.path,
    occurrence,
  });
  if (error) return { error: "No se pudo guardar la foto. Inténtalo de nuevo." };

  const title = row.title;
  await notifyPartner((me) => ({
    title: "📸 Fotos del plan",
    body: `${me} ha añadido una foto a «${title}»`,
    url: isRecurring(row) ? `/calendario/${row.id}?day=${occurrence}` : `/calendario/${row.id}`,
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

// ------------------------------------------------------------ Recordatorio

const reminderSchema = z.object({ eventId: z.string().uuid(), on: z.boolean() });

/** Activa o quita el aviso del día antes de un plan (de todas sus veces). */
export async function setEventReminder(eventId: string, on: boolean): Promise<{ error: string | null }> {
  const parsed = reminderSchema.safeParse({ eventId, on });
  if (!parsed.success) return { error: "Plan no válido." };

  const supabase = await createClient();
  // La RLS de events solo deja cambiar planes de vuestro espacio.
  const { data } = await supabase
    .from("events")
    .update({ remind_day_before: parsed.data.on })
    .eq("id", parsed.data.eventId)
    .select("id")
    .maybeSingle();
  if (!data) return { error: "No se pudo cambiar el aviso." };

  revalidatePath(`/calendario/${parsed.data.eventId}`);
  revalidatePath("/calendario");
  return { error: null };
}

// ------------------------------------------------------------ Editar

const eventIdSchema = z.string().uuid();

type StoredEvent = Series & { id: string; title: string; color: string | null; skipped_days: string[] | null };

/**
 * Guarda los cambios de un plan (para todas sus veces). Las fotos no se
 * pierden: en un plan suelto se mueven con él al nuevo día; en uno que se
 * repite, si el cambio dejara fotos en días que ya no tocan, no se guarda.
 */
export async function updateEvent(_prevState: NewEventState, formData: FormData): Promise<NewEventState> {
  const eventId = eventIdSchema.safeParse(formData.get("eventId"));
  if (!eventId.success) return { error: "Plan no válido." };
  const form = parseEventForm(formData);
  if ("error" in form) return { error: form.error };
  const { fields } = form;

  const supabase = await createClient();
  // La RLS solo deja ver y cambiar planes de vuestro espacio.
  const [{ data: current }, { data: photos }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, start_at, end_at, all_day, recurrence, recurrence_until, color, skipped_days")
      .eq("id", eventId.data)
      .maybeSingle(),
    supabase.from("event_photos").select("occurrence").eq("event_id", eventId.data),
  ]);
  if (!current) return { error: "Ese plan ya no existe." };
  const old = current as StoredEvent;
  if (old.color === LOVE_COLOR) return { error: "Vuestro día 6 no se puede cambiar 💞" };

  const photoDays = [...new Set(((photos ?? []) as { occurrence: string }[]).map((p) => p.occurrence))];
  if (isRecurring(old) && isRecurring(fields)) {
    const lost = photoDays.filter((day) => !followsRule(fields, day)).sort();
    if (lost[0]) {
      return {
        error: `Hay fotos del ${formatDate(`${lost[0]}T12:00:00Z`)} que ya no encajarían con el cambio. Quita esas fotos o crea un plan nuevo.`,
      };
    }
  }

  const { data: saved, error } = await supabase
    .from("events")
    .update(fields)
    .eq("id", old.id)
    .select("id")
    .maybeSingle();
  if (error || !saved) return { error: "No se pudo guardar el plan. Inténtalo de nuevo." };

  // Un plan suelto lleva sus fotos a su nuevo día.
  const newDay = seriesStartDay(fields);
  if (!isRecurring(old) && photoDays.some((day) => day !== newDay)) {
    await supabase.from("event_photos").update({ occurrence: newDay }).eq("event_id", old.id);
  }

  await notifyPartner((me) => ({
    title: "✏️ Plan cambiado",
    body: `${me} ha cambiado: ${fields.title} ${whenLabel(fields)}`,
    url: `/calendario/${old.id}`,
    tag: `event-${old.id}`,
  }));

  revalidatePath("/calendario");
  revalidatePath(`/calendario/${old.id}`);
  revalidatePath("/inicio");
  redirect(`/calendario/${old.id}`);
}

// ------------------------------------------------------------ Saltar una vez

const skipSchema = z.object({ eventId: z.string().uuid(), day: z.string().regex(DATE_KEY) });

/**
 * Salta (o recupera) una sola vez de un plan que se repite: "este sábado
 * no hay yoga". El resto de veces sigue igual.
 */
export async function setOccurrenceSkipped(
  eventId: string,
  day: string,
  skipped: boolean,
): Promise<{ error: string | null }> {
  const parsed = skipSchema.safeParse({ eventId, day });
  if (!parsed.success) return { error: "Datos no válidos." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, start_at, end_at, all_day, recurrence, recurrence_until, color, skipped_days")
    .eq("id", parsed.data.eventId)
    .maybeSingle();
  if (!data) return { error: "Ese plan ya no existe." };
  const event = data as StoredEvent;
  if (!isRecurring(event)) return { error: "Este plan no se repite." };
  if (event.color === LOVE_COLOR) return { error: "Vuestro día 6 no se salta 💞" };
  if (!followsRule(event, parsed.data.day)) return { error: "Ese día no toca este plan." };

  const current = new Set(event.skipped_days ?? []);
  if (skipped) current.add(parsed.data.day);
  else current.delete(parsed.data.day);

  const { error } = await supabase
    .from("events")
    .update({ skipped_days: [...current].sort() })
    .eq("id", event.id);
  if (error) return { error: "No se pudo guardar. Inténtalo de nuevo." };

  if (skipped) {
    const title = event.title;
    const when = formatDate(`${parsed.data.day}T12:00:00Z`);
    await notifyPartner((me) => ({
      title: "🚫 Esta vez no",
      body: `${me}: el ${when} no hay «${title}»`,
      url: `/calendario?view=month&ref=${parsed.data.day}`,
      tag: `event-${event.id}`,
    }));
  }

  revalidatePath("/calendario");
  revalidatePath(`/calendario/${event.id}`);
  revalidatePath("/inicio");
  return { error: null };
}

// ------------------------------------------------------------ Fotos del día

const dayPhotoSchema = z.object({
  day: z.string().regex(DATE_KEY, "Fecha no válida."),
  path: z.string().regex(PHOTO_PATH_RE, "Ruta de foto no válida."),
  caption: z.string().trim().max(140, "Máximo 140 caracteres.").optional(),
});

/**
 * Una foto de un día, sin plan («porque sí»), que el navegador ya subió a
 * "event-photos". De hoy o de días pasados; avisa a tu pareja.
 */
export async function addDayPhoto(input: { day: string; path: string; caption?: string }): Promise<{ error: string | null }> {
  const parsed = dayPhotoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  if (parsed.data.day > todayKey()) return { error: "Podréis poner fotos cuando llegue ese día 📅" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  if (!parsed.data.path.startsWith(`${spaceId}/`)) return { error: "Ruta de foto no válida." };

  const { error } = await supabase.from("day_photos").insert({
    space_id: spaceId,
    day: parsed.data.day,
    storage_path: parsed.data.path,
    caption: parsed.data.caption || null,
    uploaded_by: user.id,
  });
  if (error) return { error: "No se pudo guardar la foto. Inténtalo de nuevo." };

  const day = parsed.data.day;
  const when = day === todayKey() ? "de hoy" : `del ${formatDate(`${day}T12:00:00Z`)}`;
  await notifyPartner((me) => ({
    title: "📷 Foto nueva en el calendario",
    body: `${me} ha añadido una foto ${when}`,
    url: `/calendario?view=month&ref=${day}`,
    tag: `day-photos-${day}`,
  }));

  revalidatePath("/calendario");
  return { error: null };
}

export async function deleteDayPhoto(photoId: string): Promise<{ error: string | null }> {
  if (!z.string().uuid().safeParse(photoId).success) return { error: "Foto no válida." };
  const supabase = await createClient();
  // La RLS exige que la foto sea de vuestro espacio.
  const { data } = await supabase
    .from("day_photos")
    .delete()
    .eq("id", photoId)
    .select("storage_path")
    .maybeSingle();
  const deleted = data as { storage_path: string } | null;
  if (!deleted) return { error: "No se pudo quitar la foto." };
  await supabase.storage.from(EVENT_PHOTOS_BUCKET).remove([deleted.storage_path]);
  revalidatePath("/calendario");
  return { error: null };
}
