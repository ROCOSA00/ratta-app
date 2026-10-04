import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { PET_BUCKET, PET_URL_SECONDS, type PetEventKind } from "./config";

export type Pet = {
  id: string;
  name: string;
  emoji: string;
  born_on: string;
  adopted_on: string | null;
  photoUrl: string | null;
};

export type PetWeight = { id: string; day: string; grams: number };
export type PetEvent = { id: string; day: string; kind: PetEventKind; title: string; note: string | null };
export type PetPhoto = { id: string; taken_on: string; caption: string | null; url: string | null };

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function signed(supabase: Supabase, paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data } = await supabase.storage.from(PET_BUCKET).createSignedUrls(paths, PET_URL_SECONDS);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** Las mascotas del espacio (solo la ficha, con su foto), la primera antes. */
export async function getPets(): Promise<Pet[]> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("pets")
    .select("id, name, emoji, born_on, adopted_on, photo_path")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as (Omit<Pet, "photoUrl"> & { photo_path: string | null })[];
  const urls = await signed(supabase, rows.flatMap((r) => (r.photo_path ? [r.photo_path] : [])));
  return rows.map(({ photo_path, ...pet }) => ({ ...pet, photoUrl: photo_path ? (urls.get(photo_path) ?? null) : null }));
}

/** Todo de una mascota: ficha, pesos, diario y álbum. */
export async function getPetDetail(petId: string): Promise<{
  spaceId: string;
  pet: Pet;
  weights: PetWeight[];
  events: PetEvent[];
  photos: PetPhoto[];
} | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;
  const supabase = await createClient();
  const [{ data: pet }, { data: weights }, { data: events }, { data: photos }] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name, emoji, born_on, adopted_on, photo_path")
      .eq("id", petId)
      .eq("space_id", spaceId)
      .maybeSingle(),
    supabase.from("pet_weights").select("id, day, grams").eq("pet_id", petId).order("day", { ascending: true }),
    supabase
      .from("pet_events")
      .select("id, day, kind, title, note")
      .eq("pet_id", petId)
      .order("day", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("pet_photos")
      .select("id, taken_on, caption, storage_path")
      .eq("pet_id", petId)
      .order("taken_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!pet) return null;

  const row = pet as Omit<Pet, "photoUrl"> & { photo_path: string | null };
  const photoRows = (photos ?? []) as (Omit<PetPhoto, "url"> & { storage_path: string })[];
  const urls = await signed(supabase, [
    ...(row.photo_path ? [row.photo_path] : []),
    ...photoRows.map((p) => p.storage_path),
  ]);
  const { photo_path, ...rest } = row;

  return {
    spaceId,
    pet: { ...rest, photoUrl: photo_path ? (urls.get(photo_path) ?? null) : null },
    weights: (weights ?? []) as PetWeight[],
    events: (events ?? []) as PetEvent[],
    photos: photoRows.map(({ storage_path, ...p }) => ({ ...p, url: urls.get(storage_path) ?? null })),
  };
}
