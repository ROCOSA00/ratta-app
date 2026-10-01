import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getAuthUser } from "@/lib/auth/get-user";
import { todayKey } from "@/lib/calendar/date-utils";
import { CAPSULE_BUCKET, CAPSULE_URL_SECONDS } from "./config";

export type CapsuleSummary = {
  id: string;
  created_by: string;
  open_on: string;
  hint: string | null;
  created_at: string;
  opened_at: string | null;
  /** La escribiste tú. */
  mine: boolean;
  /** Ya ha llegado el día. */
  ready: boolean;
  authorName: string;
};

export type CapsuleContent = { title: string; body: string; photoUrl: string | null };

const COLUMNS = "id, created_by, open_on, hint, created_at, opened_at";

type Row = Omit<CapsuleSummary, "mine" | "ready" | "authorName">;

async function names(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Map<string, string>> {
  const { data } = await supabase.from("profiles").select("id, display_name");
  return new Map(
    ((data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? "Tu pareja"]),
  );
}

function summarize(row: Row, myId: string | undefined, nameById: Map<string, string>, today: string): CapsuleSummary {
  return {
    ...row,
    mine: row.created_by === myId,
    ready: row.open_on <= today,
    authorName: nameById.get(row.created_by) ?? "Tu pareja",
  };
}

/** Todas las cápsulas de vuestro espacio (sin su contenido). */
export async function getCapsules(): Promise<{ spaceId: string | null; capsules: CapsuleSummary[] }> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { spaceId: null, capsules: [] };

  const supabase = await createClient();
  const [{ data }, nameById, { data: auth }] = await Promise.all([
    supabase.from("capsules").select(COLUMNS).eq("space_id", spaceId).order("open_on", { ascending: true }),
    names(supabase),
    getAuthUser(),
  ]);
  const today = todayKey();
  return {
    spaceId,
    capsules: ((data ?? []) as Row[]).map((row) => summarize(row, auth.user?.id, nameById, today)),
  };
}

/**
 * Una cápsula y, si ya se puede leer (la escribiste tú o ha llegado el
 * día), su contenido. Si no, content es null: la base de datos no lo da.
 */
export async function getCapsule(
  id: string,
): Promise<{ capsule: CapsuleSummary; content: CapsuleContent | null } | null> {
  const supabase = await createClient();
  const [{ data: row }, { data: contentRow }, nameById, { data: auth }] = await Promise.all([
    supabase.from("capsules").select(COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("capsule_contents").select("title, body, photo_path").eq("capsule_id", id).maybeSingle(),
    names(supabase),
    getAuthUser(),
  ]);
  if (!row) return null;

  const capsule = summarize(row as Row, auth.user?.id, nameById, todayKey());
  const raw = contentRow as { title: string; body: string; photo_path: string | null } | null;
  if (!raw) return { capsule, content: null };

  let photoUrl: string | null = null;
  if (raw.photo_path) {
    const { data: signed } = await supabase.storage
      .from(CAPSULE_BUCKET)
      .createSignedUrl(raw.photo_path, CAPSULE_URL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }
  return { capsule, content: { title: raw.title, body: raw.body, photoUrl } };
}
