"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MessageCircleHeart, NotebookPen, Sparkles, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const TABS: Tab[] = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircleHeart },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/notas", label: "Notas", icon: NotebookPen },
  { href: "/juegos", label: "Juegos", icon: Sparkles },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

const isOn = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Globo de mensajes sin leer: se actualiza al instante con Supabase Realtime. */
function useUnreadChat(spaceId: string | null, initialUnread: number, onChat: boolean): number {
  const [unread, setUnread] = useState(initialUnread);
  const onChatRef = useRef(onChat);
  onChatRef.current = onChat;

  // Cuando el servidor trae la cuenta actualizada (al volver a la app), manda ella.
  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  // En el chat, todo está leído.
  useEffect(() => {
    if (onChat) setUnread(0);
  }, [onChat]);

  useEffect(() => {
    if (!spaceId) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const myId = data.session?.user.id;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled || !myId) return;
      channel = supabase
        .channel(`nav-unread:${spaceId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `space_id=eq.${spaceId}` },
          (payload) => {
            const sender = (payload.new as { sender_id?: unknown }).sender_id;
            if (sender !== myId && !onChatRef.current) setUnread((n) => n + 1);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  return onChat ? 0 : unread;
}

// Barra flotante tipo "globo": una píldora translúcida separada de los
// bordes. Su altura total debe coincidir con --nav-height (globals.css):
// 52px de botón + 2×6px de relleno + 2×1px de borde = 66px.
export function BottomNav({ spaceId, initialUnread }: { spaceId: string | null; initialUnread: number }) {
  const pathname = usePathname();
  const activeIndex = TABS.findIndex((t) => isOn(pathname, t.href));
  const unread = useUnreadChat(spaceId, initialUnread, isOn(pathname, "/chat"));

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-md px-3"
      style={{ bottom: "var(--nav-gap)" }}
    >
      <ul
        className="pointer-events-auto relative flex items-center justify-between rounded-[26px] border p-1.5 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--color-surface) 96%, transparent)",
          borderColor: "var(--color-line)",
          boxShadow:
            "0 14px 34px -14px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 4px 14px -6px rgba(0, 0, 0, 0.18)",
        }}
      >
        {/* La pastilla de la pestaña activa: se desliza de una a otra. */}
        <li
          aria-hidden
          className="nav-pill pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[20px]"
          style={{
            width: `calc((100% - 12px) / ${TABS.length})`,
            transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
            opacity: activeIndex < 0 ? 0 : 1,
            background: "color-mix(in srgb, var(--color-accent) 13%, transparent)",
          }}
        />
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = isOn(pathname, href);
          const badge = href === "/chat" && unread > 0 ? (unread > 9 ? "9+" : String(unread)) : null;
          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                data-tour={`nav-${href.slice(1)}`}
                className="flex h-[52px] flex-col items-center justify-center gap-0.5 text-[10.5px] transition-colors duration-200"
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-muted)",
                  fontWeight: isActive ? 700 : 500,
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={badge ? `${label} (${unread} sin leer)` : undefined}
              >
                {/* key: al activarse se vuelve a montar y el icono da un saltito. */}
                <span key={isActive ? `on-${pathname}` : "off"} className={`relative ${isActive ? "nav-pop" : ""}`}>
                  <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  {badge ? (
                    <span
                      className="nav-badge absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
                      style={{ background: "var(--color-danger)", boxShadow: "0 0 0 2px var(--color-surface)" }}
                    >
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
