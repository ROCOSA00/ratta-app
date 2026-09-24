import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { todayKey } from "@/lib/calendar/date-utils";
import { MOMENT_BUCKET, MOMENT_URL_SECONDS } from "./config";
import { getAuthUser } from "@/lib/auth/get-user";

export type MomentPhoto = {
  id: string;
  user_id: string;
  day: string;
  caption: string | null;
  late_seconds: number;
  created_at: string;
  /** Enlace firmado y temporal: el almacén es privado. */
  url: string | null;
};

type Row = Omit<MomentPhoto, "url"> & { storage_path: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const COLUMNS = "id, user_id, day, caption, late_seconds, created_at, storage_path";

async function withUrls(supabase: Supabase, rows: Row[]): Promise<MomentPhoto[]> {
  if (rows.length === 0) return [];
  const { data } = await supabase.storage
    .from(MOMENT_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), MOMENT_URL_SECONDS);
  const urlByPath = new Map<string, string | null>((data ?? []).map((d) => [d.path ?? "", d.signedUrl]));
  return rows.map(({ storage_path, ...rest }) => ({ ...rest, url: urlByPath.get(storage_path) ?? null }));
}

async function names(supabase: Supabase, myId: string): Promise<{ partnerId: string | null; byId: Record<string, string> }> {
  const { data } = await supabase.from("profiles").select("id, display_name");
  const byId: Record<string, string> = {};
  let partnerId: string | null = null;
  for (const p of (data ?? []) as { id: string; display_name: string | null }[]) {
    byId[p.id] = p.id === myId ? "Tú" : (p.display_name ?? "Tu pareja");
    if (p.id !== myId) partnerId = p.id;
  }
  return { partnerId, byId };
}

export type TodayMoment = {
  spaceId: string;
  myId: string;
  day: string;
  /** Cuándo sonó hoy (null = aún no ha sonado). */
  notifiedAt: string | null;
  mine: MomentPhoto | null;
  /** Solo si la puedes ver (ya subiste la tuya). */
  partner: MomentPhoto | null;
  /** Tu pareja ya subió la suya (aunque aún no la puedas ver). */
  partnerPosted: boolean;
  partnerName: string;
  names: Record<string, string>;
};

export async function getTodayMoment(): Promise<TodayMoment | null> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await getAuthUser();
  if (!user) return null;

  const day = todayKey();
  // La RLS solo deja ver el día cuando ya ha sonado, y la foto de tu pareja
  // cuando ya subiste la tuya; moment_posters() dice quién subió sin enseñarla.
  const [{ data: momentDay }, { data: rows }, { data: posters }, people] = await Promise.all([
    supabase.from("moment_days").select("notified_at").eq("space_id", spaceId).eq("day", day).maybeSingle(),
    supabase.from("moment_photos").select(COLUMNS).eq("space_id", spaceId).eq("day", day),
    supabase.rpc("moment_posters", { p_space_id: spaceId, p_day: day }),
    names(supabase, user.id),
  ]);

  const photos = await withUrls(supabase, (rows ?? []) as Row[]);
  const posterIds = ((posters ?? []) as unknown[]).map(String);

  return {
    spaceId,
    myId: user.id,
    day,
    notifiedAt: (momentDay as { notified_at: string | null } | null)?.notified_at ?? null,
    mine: photos.find((p) => p.user_id === user.id) ?? null,
    partner: photos.find((p) => p.user_id !== user.id) ?? null,
    partnerPosted: posterIds.some((id) => id !== user.id),
    partnerName: people.partnerId ? (people.byId[people.partnerId] ?? "Tu pareja") : "Tu pareja",
    names: people.byId,
  };
}

/** Días (YYYY-MM-DD) de un rango con alguna foto del Momento que puedas ver. */
export async function getMomentDaysInRange(spaceId: string, fromKey: string, toKey: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("moment_photos")
    .select("day")
    .eq("space_id", spaceId)
    .gte("day", fromKey)
    .lte("day", toKey);
  return new Set(((data ?? []) as { day: string }[]).map((r) => r.day));
}

/** Las fotos del Momento de un día (las que puedas ver), con nombres. */
export async function getMomentForDay(
  spaceId: string,
  day: string,
): Promise<{ photos: MomentPhoto[]; names: Record<string, string> } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getAuthUser();
  if (!user) return null;
  const [{ data: rows }, people] = await Promise.all([
    supabase.from("moment_photos").select(COLUMNS).eq("space_id", spaceId).eq("day", day),
    names(supabase, user.id),
  ]);
  const photos = await withUrls(supabase, (rows ?? []) as Row[]);
  // La tuya primero.
  photos.sort((a, b) => (a.user_id === user.id ? -1 : b.user_id === user.id ? 1 : 0));
  return { photos, names: people.byId };
}
