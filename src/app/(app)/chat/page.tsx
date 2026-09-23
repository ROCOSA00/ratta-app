import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { CHAT_BUCKET, CHAT_COLUMNS, SIGNED_URL_SECONDS, type ChatMessage } from "@/lib/chat/types";
import { ChatRoom } from "./ChatRoom";

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
    supabase.auth.getUser(),
    supabase
      .from("messages")
      .select(CHAT_COLUMNS)
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.from("profiles").select("id, display_name, avatar_url"),
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
  const partner = (profiles ?? []).find((p) => p.id !== me) as
    | { id: string; display_name: string | null; avatar_url: string | null }
    | undefined;

  return (
    <ChatRoom
      spaceId={spaceId}
      myId={me}
      partnerName={partner?.display_name ?? "Tu pareja"}
      partnerAvatar={partner?.avatar_url ?? null}
      initialMessages={initialMessages}
    />
  );
}
