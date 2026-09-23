import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import type { ChatMessage } from "@/lib/chat/actions";
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
      .select("id, sender_id, body, created_at")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.from("profiles").select("id, display_name, avatar_url"),
  ]);

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
      initialMessages={((messages ?? []) as ChatMessage[]).reverse()}
    />
  );
}
