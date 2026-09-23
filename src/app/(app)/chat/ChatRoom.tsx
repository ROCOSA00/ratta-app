"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, type ChatMessage } from "@/lib/chat/actions";
import { TIME_ZONE } from "@/lib/format-date";
import { addDays, dayLabel, todayKey, toDateKey } from "@/lib/calendar/date-utils";

const timeFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function isChatMessage(value: unknown): value is ChatMessage {
  const v = value as Partial<ChatMessage> | null;
  return (
    typeof v?.id === "string" &&
    typeof v.sender_id === "string" &&
    typeof v.body === "string" &&
    typeof v.created_at === "string"
  );
}

function daySeparator(key: string): string {
  const today = todayKey();
  if (key === today) return "Hoy";
  if (key === addDays(today, -1)) return "Ayer";
  return dayLabel(key);
}

export function ChatRoom({
  spaceId,
  myId,
  partnerName,
  partnerAvatar,
  initialMessages,
}: {
  spaceId: string;
  myId: string;
  partnerName: string;
  partnerAvatar: string | null;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Si el servidor trae mensajes nuevos (al volver a la app), se mezclan.
  useEffect(() => {
    setMessages((current) => mergeMessages(current, initialMessages));
  }, [initialMessages]);

  // Mensajes en tiempo real: Supabase solo nos envía los de nuestro espacio,
  // y además la RLS de "messages" filtra lo que puede recibir cada uno.
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`chat:${spaceId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `space_id=eq.${spaceId}` },
          (payload) => {
            if (isChatMessage(payload.new)) {
              const incoming = payload.new;
              setMessages((current) => mergeMessages(current, [incoming]));
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [spaceId]);

  // Al volver a la app tras un rato, se recarga por si se perdió algo.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || isSending) return;
    setText("");
    setError(null);
    startSending(async () => {
      const result = await sendMessage(body);
      if (result.message) {
        const sent = result.message;
        setMessages((current) => mergeMessages(current, [sent]));
      } else {
        setText(body);
        setError(result.error);
      }
    });
  }

  let lastDay = "";

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b px-5 pb-3 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 82%, transparent)",
          borderColor: "var(--color-line)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        }}
      >
        <span
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          {partnerAvatar ? (
            <Image src={partnerAvatar} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span>💞</span>
          )}
        </span>
        <div>
          <h1 className="text-lg leading-tight" style={{ color: "var(--color-ink)" }}>
            {partnerName}
          </h1>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Solo vosotros dos 🔒
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-1 px-4 pb-36 pt-3">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm" style={{ color: "var(--color-muted)" }}>
            Aún no hay mensajes. ¡Escribe el primero! 💌
          </p>
        ) : null}

        {messages.map((m) => {
          const mine = m.sender_id === myId;
          const day = toDateKey(new Date(m.created_at));
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id} className="flex flex-col">
              {showDay ? (
                <p
                  className="mx-auto my-2 rounded-full px-3 py-0.5 text-[11px] font-medium capitalize"
                  style={{ background: "var(--color-line)", color: "var(--color-muted)" }}
                >
                  {daySeparator(day)}
                </p>
              ) : null}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${mine ? "rounded-br-md text-white" : "rounded-bl-md border"}`}
                  style={
                    mine
                      ? { backgroundImage: "var(--color-gradient)" }
                      : { background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className="mt-0.5 text-right text-[10px]"
                    style={{ color: mine ? "rgba(255,255,255,0.75)" : "var(--color-muted)" }}
                  >
                    {timeFormatter.format(new Date(m.created_at))}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md items-end gap-2 px-3 pt-2 backdrop-blur-xl"
        style={{
          // El fondo llega hasta abajo del todo y la barra flotante (z-40)
          // queda por encima; así no se ven mensajes alrededor de la barra.
          paddingBottom: "calc(var(--nav-gap) + var(--nav-height) + 8px)",
          background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
        }}
      >
        <div className="flex flex-1 flex-col">
          {error ? (
            <p className="px-2 pb-1 text-xs" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          ) : null}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            enterKeyHint="send"
            placeholder={`Escribe a ${partnerName}…`}
            className="w-full rounded-full border px-4 py-2.5 text-[15px] outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <SendHorizontal size={18} />
        </button>
      </form>
    </>
  );
}
