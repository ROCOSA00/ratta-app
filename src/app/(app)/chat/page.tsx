import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { CHAT_BUCKET, CHAT_COLUMNS, SIGNED_URL_SECONDS, type ChatMessage } from "@/lib/chat/types";
import { ChatRoom } from "./ChatRoom";
import { getAuthUser } from "@/lib/auth/get-user";
import { getTogetherInfo, TOGETHER_SINCE } from "@/lib/couple";

const PAGE_SIZE = 150;

export default async function ChatPage() {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return (
      <p className="mx-5 mt-10 text-sm" style={{ color: "var(--color-muted)" }}>
        No perteneces a ningún espacio todavía.
      </p>
    );
  }

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: messages },
    { data: profiles },
  ] = await Promise.all([
    getAuthUser(),
    supabase
      .from("messages")
      .select(CHAT_COLUMNS)
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.from("profiles").select("id, display_name, avatar_url, cover_url, status_key, status_note"),
  ]);

  // Enlaces temporales para las fotos, todos de una vez (el almacén es privado).
  const rows = ((messages ?? []) as Omit<ChatMessage, "image_url">[]).reverse();
  const paths = rows.flatMap((m) => (m.image_path ? [m.image_path] : []));
  const { data: signed } =
    paths.length > 0
      ? await supabase.storage.from(CHAT_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
      : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const initialMessages: ChatMessage[] = rows.map((m) => ({
    ...m,
    image_url: m.image_path ? (urlByPath.get(m.image_path) ?? null) : null,
  }));

  const me = user?.id ?? "";
  type ProfileRow = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    status_key: string | null;
    status_note: string | null;
  };
  const all = (profiles ?? []) as ProfileRow[];
  const partner = all.find((p) => p.id !== me);
  const mine = all.find((p) => p.id === me);
  const together = getTogetherInfo();
  const [y, m, d] = TOGETHER_SINCE.split("-");

  return (
    <ChatRoom
      spaceId={spaceId}
      myId={me}
      partnerName={partner?.display_name ?? "Tu pareja"}
      partnerAvatar={partner?.avatar_url ?? null}
      initialMessages={initialMessages}
      card={
        partner
          ? {
              person: {
                id: partner.id,
                name: partner.display_name ?? "Tu pareja",
                avatarUrl: partner.avatar_url,
                coverUrl: partner.cover_url,
                statusKey: partner.status_key,
                statusNote: partner.status_note,
              },
              partnerName: mine?.display_name ?? "Tú",
              sinceLabel: `${d}·${m}·${y}`,
              daysTogether: together.days,
            }
          : null
      }
    />
  );
}
