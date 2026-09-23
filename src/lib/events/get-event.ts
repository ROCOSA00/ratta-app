import { createClient } from "@/lib/supabase/server";
import { EVENT_PHOTOS_BUCKET, EVENT_PHOTO_URL_SECONDS } from "./photos-config";

export type EventPhoto = {
  id: string;
  uploaded_by: string;
  created_at: string;
  /** Enlace firmado y temporal: el almacén es privado. */
  url: string | null;
};

export type EventDetail = {
  id: string;
  title: string;
  start_at: string;
  all_day: boolean;
  location: string | null;
  description: string | null;
  created_by: string;
  photos: EventPhoto[];
};

export async function getEvent(id: string): Promise<EventDetail | null> {
  const supabase = await createClient();
  // La RLS de events y event_photos ya exige que sean de vuestro espacio.
  const [{ data: event }, { data: photos }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, start_at, all_day, location, description, created_by")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("event_photos")
      .select("id, uploaded_by, created_at, storage_path")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!event) return null;

  const rows = (photos ?? []) as (Omit<EventPhoto, "url"> & { storage_path: string })[];
  let urlByPath = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(EVENT_PHOTOS_BUCKET)
      .createSignedUrls(rows.map((r) => r.storage_path), EVENT_PHOTO_URL_SECONDS);
    urlByPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
  }

  return {
    ...(event as Omit<EventDetail, "photos">),
    photos: rows.map(({ storage_path, ...rest }) => ({ ...rest, url: urlByPath.get(storage_path) ?? null })),
  };
}
