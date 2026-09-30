import { createClient } from "@/lib/supabase/server";
import { EVENT_PHOTOS_BUCKET, EVENT_PHOTO_URL_SECONDS } from "./photos-config";
import { SERIES_COLUMNS, type EventRow } from "./load";
import { nextOccurrence, occurrenceTimes, occursOn, seriesStartDay } from "./recurrence";

export type EventPhoto = {
  id: string;
  uploaded_by: string;
  created_at: string;
  /** Enlace firmado y temporal: el almacén es privado. */
  url: string | null;
};

export type EventDetail = Omit<EventRow, "photo_count"> & {
  created_by: string;
  /** Fotos de ESTA vez del plan. */
  photos: EventPhoto[];
};

/**
 * Un plan y las fotos de una de sus veces: la del día pedido si de verdad
 * toca ese día; si no, la próxima (o la primera, si ya no quedan).
 */
export async function getEvent(id: string, requestedDay: string | null = null): Promise<EventDetail | null> {
  const supabase = await createClient();
  // La RLS de events y event_photos ya exige que sean de vuestro espacio.
  const [{ data: event }, { data: photos }] = await Promise.all([
    supabase.from("events").select(`${SERIES_COLUMNS}, created_by`).eq("id", id).maybeSingle(),
    supabase
      .from("event_photos")
      .select("id, uploaded_by, created_at, storage_path, occurrence")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!event) return null;

  const series = event as Omit<EventDetail, "photos" | "day" | "first_day">;
  const day =
    requestedDay && occursOn(series, requestedDay)
      ? requestedDay
      : (nextOccurrence(series) ?? seriesStartDay(series));

  const rows = ((photos ?? []) as (Omit<EventPhoto, "url"> & { storage_path: string; occurrence: string })[]).filter(
    (p) => p.occurrence === day,
  );
  let urlByPath = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(EVENT_PHOTOS_BUCKET)
      .createSignedUrls(rows.map((r) => r.storage_path), EVENT_PHOTO_URL_SECONDS);
    urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  }

  return {
    ...series,
    ...occurrenceTimes(series, day),
    day,
    first_day: seriesStartDay(series),
    photos: rows.map(({ id, uploaded_by, created_at, storage_path }) => ({
      id,
      uploaded_by,
      created_at,
      url: urlByPath.get(storage_path) ?? null,
    })),
  };
}
