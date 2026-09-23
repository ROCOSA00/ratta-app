import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { daysBetween, todayKey } from "@/lib/calendar/date-utils";

export type Memory = {
  id: string;
  caption: string | null;
  taken_on: string | null;
  created_at: string;
  uploaded_by: string;
  /** Enlace firmado y temporal: el bucket es privado. */
  url: string | null;
};

type MemoryRow = Omit<Memory, "url"> & { storage_path: string };

const COLUMNS = "id, storage_path, caption, taken_on, created_at, uploaded_by";
// Una hora: de sobra para ver la página; el enlace deja de valer después.
const SIGNED_URL_SECONDS = 60 * 60;

async function withSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: MemoryRow[],
): Promise<Memory[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage
    .from("memories")
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_SECONDS);
  const urlByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map(({ storage_path, ...rest }) => ({ ...rest, url: urlByPath.get(storage_path) ?? null }));
}

export async function getMemories(): Promise<{ spaceId: string | null; memories: Memory[] }> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { spaceId: null, memories: [] };

  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("space_id", spaceId)
    .order("taken_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return { spaceId, memories: await withSignedUrls(supabase, (data ?? []) as MemoryRow[]) };
}

export async function getMemory(id: string): Promise<Memory | null> {
  const supabase = await createClient();
  // La RLS de memories ya exige ser del mismo espacio.
  const { data } = await supabase.from("memories").select(COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const [memory] = await withSignedUrls(supabase, [data as MemoryRow]);
  return memory ?? null;
}

/** Un recuerdo distinto cada día (el mismo durante todo el día, no uno al azar en cada recarga). */
export async function getMemoryOfTheDay(): Promise<{ memory: Memory | null; total: number }> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { memory: null, total: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("memories")
    .select(COLUMNS)
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as MemoryRow[];
  if (rows.length === 0) return { memory: null, total: 0 };

  const dayIndex = daysBetween("2000-01-01", todayKey());
  const picked = rows[dayIndex % rows.length]!;
  const [memory] = await withSignedUrls(supabase, [picked]);
  return { memory: memory ?? null, total: rows.length };
}
