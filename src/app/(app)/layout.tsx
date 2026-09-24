import { BottomNav } from "@/components/navigation/BottomNav";
import { AutoRefresh } from "@/components/shared/AutoRefresh";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { getUnreadChatCount } from "@/lib/chat/unread";

// La comprobación de sesión ya la hace middleware.ts en cada petición
// (incluida esta). Aquí solo hace falta el espacio, para el globo de
// mensajes sin leer del Chat (unread_chat_count() usa la sesión por dentro).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const spaceId = await getCurrentSpaceId();
  const unread = spaceId ? await getUnreadChatCount(spaceId) : 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex-1" style={{ paddingBottom: "calc(var(--nav-gap) + var(--nav-height) + 20px)" }}>
        {children}
      </div>
      <BottomNav spaceId={spaceId} initialUnread={unread} />
      <AutoRefresh />
    </div>
  );
}
