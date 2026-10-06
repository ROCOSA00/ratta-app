import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { EVENT_PHOTOS_BUCKET, EVENT_PHOTO_URL_SECONDS } from "@/lib/events/photos-config";

export type DayPhoto = {
  id: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
  url: string | null;
};

export type DayQuestion = {
  text: string;
  /** Una fila por persona: su respuesta, o null si no la puedes ver (o no hay). */
  answers: { userId: string; name: string; answer: string | null; mine: boolean }[];
  /** Ya respondiste tú ese día (si no, la de tu pareja no se ve). */
  iAnswered: boolean;
};

/**
 * Lo de un día del calendario que no son planes: sus fotos «porque sí» y
 * la pregunta del día con vuestras respuestas (la RLS solo deja ver la de
 * tu pareja si respondiste tú).
 */
export async function getDayExtras(
  spaceId: string,
  day: string,
): Promise<{ photos: DayPhoto[]; question: DayQuestion | null; names: Record<string, string> }> {
  const supabase = await createClient();
  const [{ data: photoRows }, { data: round }, { data: members }, { data: profiles }, { data: auth }] =
    await Promise.all([
      supabase
        .from("day_photos")
        .select("id, caption, uploaded_by, created_at, storage_path")
        .eq("space_id", spaceId)
        .eq("day", day)
        .order("created_at", { ascending: true }),
      supabase
        .from("question_rounds")
        .select("id, questions(text)")
        .eq("space_id", spaceId)
        .eq("round_date", day)
        .maybeSingle(),
      supabase.from("space_members").select("user_id").eq("space_id", spaceId),
      supabase.from("profiles").select("id, display_name"),
      getAuthUser(),
    ]);
  const myId = auth.user?.id ?? "";
  const names: Record<string, string> = {};
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    names[p.id] = p.id === myId ? "Tú" : (p.display_name ?? "Tu pareja");
  }

  const rows = (photoRows ?? []) as (Omit<DayPhoto, "url"> & { storage_path: string })[];
  let urls = new Map<string, string>();
  if (rows.length > 0) {
    const { data: signed } = await supabase.storage
      .from(EVENT_PHOTOS_BUCKET)
      .createSignedUrls(rows.map((r) => r.storage_path), EVENT_PHOTO_URL_SECONDS);
    urls = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  }
  const photos = rows.map(({ storage_path, ...p }) => ({ ...p, url: urls.get(storage_path) ?? null }));

  let question: DayQuestion | null = null;
  const r = round as { id: string; questions: { text: string } | { text: string }[] | null } | null;
  const text = r ? (Array.isArray(r.questions) ? r.questions[0]?.text : r.questions?.text) : undefined;
  if (r && text) {
    const { data: answerRows } = await supabase
      .from("question_answers")
      .select("user_id, answer")
      .eq("round_id", r.id);
    const answerOf = new Map(((answerRows ?? []) as { user_id: string; answer: string }[]).map((a) => [a.user_id, a.answer]));
    // Tú primero.
    const ids = ((members ?? []) as { user_id: string }[])
      .map((m) => m.user_id)
      .sort((a, b) => (a === myId ? -1 : b === myId ? 1 : 0));
    question = {
      text,
      iAnswered: answerOf.has(myId),
      answers: ids.map((id) => ({
        userId: id,
        name: names[id] ?? "Tu pareja",
        answer: answerOf.get(id) ?? null,
        mine: id === myId,
      })),
    };
  }

  return { photos, question, names };
}

/** Días (de `from` a `to`) que tienen fotos «porque sí». */
export async function getPhotoDays(spaceId: string, from: string, to: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("day_photos")
    .select("day")
    .eq("space_id", spaceId)
    .gte("day", from)
    .lte("day", to);
  return new Set(((data ?? []) as { day: string }[]).map((d) => d.day));
}
