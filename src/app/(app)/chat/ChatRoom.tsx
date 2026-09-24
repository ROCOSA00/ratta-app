"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markChatRead, sendMessage, sendPhotoMessage } from "@/lib/chat/actions";
import { CHAT_BUCKET, SIGNED_URL_SECONDS, type ChatMessage } from "@/lib/chat/types";
import { resizeImage } from "@/lib/images/resize";
import { TIME_ZONE } from "@/lib/format-date";
import { MemberCard, type MemberCardPerson } from "@/components/features/MemberCard";
import { findStatus } from "@/lib/status/options";
import { addDays, dayLabel, todayKey, toDateKey } from "@/lib/calendar/date-utils";

const timeFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

type ChatRow = Omit<ChatMessage, "image_url">;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) {
    // Si ya teníamos el enlace de la foto y lo nuevo no lo trae, se conserva.
    const prev = byId.get(m.id);
    byId.set(m.id, prev && !m.image_url ? { ...m, image_url: prev.image_url } : m);
  }
  return [...byId.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function isChatRow(value: unknown): value is ChatRow {
  const v = value as Partial<ChatRow> | null;
  return (
    typeof v?.id === "string" &&
    typeof v.sender_id === "string" &&
    typeof v.body === "string" &&
    (v.image_path === null || v.image_path === undefined || typeof v.image_path === "string") &&
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
  card,
}: {
  spaceId: string;
  myId: string;
  partnerName: string;
  partnerAvatar: string | null;
  initialMessages: ChatMessage[];
  /** Datos del carnet de tu pareja (se abre tocando su cara o su nombre). */
  card: { person: MemberCardPerson; partnerName: string; sinceLabel: string; daysTogether: number } | null;
}) {
  const [showCard, setShowCard] = useState(false);
  const partnerStatus = findStatus(card?.person.statusKey);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
            if (!isChatRow(payload.new)) return;
            const row = payload.new;
            const imagePath = row.image_path ?? null;
            // La foto llega solo como ruta: pedimos un enlace temporal (la
            // RLS del almacén "chat" solo lo permite a miembros del espacio).
            void (async () => {
              let imageUrl: string | null = null;
              if (imagePath) {
                const { data: signed } = await supabase.storage
                  .from(CHAT_BUCKET)
                  .createSignedUrl(imagePath, SIGNED_URL_SECONDS);
                imageUrl = signed?.signedUrl ?? null;
              }
              const incoming: ChatMessage = { ...row, image_path: imagePath, image_url: imageUrl };
              setMessages((current) => mergeMessages(current, [incoming]));
              // Lo estás viendo: ya está leído (que no salga el globo rojo luego).
              if (incoming.sender_id !== myId && !document.hidden) void markChatRead();
            })();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [spaceId, myId]);

  // Abrir el chat (o volver a la app con el chat abierto) = leído hasta ahora.
  useEffect(() => {
    void markChatRead();
    const onVisible = () => {
      if (!document.hidden) void markChatRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Al volver a la app, <AutoRefresh /> (en el layout) recarga los mensajes
  // por si se perdió alguno y renueva los enlaces temporales de las fotos.

  // Al final de la página (no al último mensaje): el relleno inferior ya
  // deja el hueco de la barra de escribir y la barra flotante, que si no
  // taparían los últimos mensajes.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages.length, photo]);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (isSending || (!body && !photo)) return;
    setError(null);

    if (photo) {
      const file = photo;
      startSending(async () => {
        let blob: Blob;
        try {
          blob = await resizeImage(file, 1600);
        } catch {
          setError("No se pudo leer esa imagen. Prueba con otra.");
          return;
        }
        const supabase = createClient();
        const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(CHAT_BUCKET)
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) {
          setError("No se pudo subir la foto. Inténtalo de nuevo.");
          return;
        }
        const result = await sendPhotoMessage({ path, caption: body });
        if (result.message) {
          const sent = result.message;
          setMessages((current) => mergeMessages(current, [sent]));
          setText("");
          clearPhoto();
        } else {
          // Que no quede una foto huérfana en el almacén si no se pudo enviar.
          await supabase.storage.from(CHAT_BUCKET).remove([path]);
          setError(result.error);
        }
      });
      return;
    }

    setText("");
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
        <button
          type="button"
          onClick={() => card && setShowCard(true)}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label={card ? `Ver el carnet de ${partnerName}` : undefined}
          data-tour="chat-card"
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
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight" style={{ color: "var(--color-ink)" }}>
              {partnerName}
            </span>
            <span className="block truncate text-xs" style={{ color: "var(--color-muted)" }}>
              {partnerStatus
                ? `${partnerStatus.emoji} ${partnerStatus.label}${card?.person.statusNote ? ` · ${card.person.statusNote}` : ""}`
                : "Toca para ver su carnet 🪪"}
            </span>
          </span>
        </button>
      </header>

      {showCard && card ? (
        <MemberCard
          person={card.person}
          partnerName={card.partnerName}
          sinceLabel={card.sinceLabel}
          daysTogether={card.daysTogether}
          onClose={() => setShowCard(false)}
        />
      ) : null}

      <div className={`flex flex-col gap-1 px-4 pt-3 ${photo ? "pb-56" : "pb-36"}`}>
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
          const hasPhoto = !!m.image_path;
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
                  className={`max-w-[78%] rounded-2xl text-[15px] leading-snug ${hasPhoto ? "p-1" : "px-3.5 py-2"} ${mine ? "rounded-br-md text-white" : "rounded-bl-md border"}`}
                  style={
                    mine
                      ? { backgroundImage: "var(--color-gradient)" }
                      : { background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }
                  }
                >
                  {hasPhoto ? (
                    m.image_url ? (
                      // Recuadro de tamaño fijo: el hueco existe antes de que
                      // cargue la foto, así el chat no "salta" y se queda abajo.
                      // Tocándola se ve entera.
                      <button
                        type="button"
                        onClick={() => setViewing(m.image_url)}
                        className="relative block aspect-square w-60 max-w-full overflow-hidden rounded-xl"
                        aria-label="Ver foto en grande"
                      >
                        <Image src={m.image_url} alt="Foto" fill sizes="240px" unoptimized className="object-cover" />
                      </button>
                    ) : (
                      <p className="w-60 max-w-full px-2.5 py-2 text-sm opacity-80">📷 Foto no disponible</p>
                    )
                  ) : null}
                  <div className={hasPhoto ? "px-2.5 pb-1 pt-1" : undefined}>
                    {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                    <p
                      className="mt-0.5 text-right text-[10px]"
                      style={{ color: mine ? "rgba(255,255,255,0.75)" : "var(--color-muted)" }}
                    >
                      {timeFormatter.format(new Date(m.created_at))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md flex-col gap-2 px-3 pt-2 backdrop-blur-xl"
        style={{
          // El fondo llega hasta abajo del todo y la barra flotante (z-40)
          // queda por encima; así no se ven mensajes alrededor de la barra.
          paddingBottom: "calc(var(--nav-gap) + var(--nav-height) + 8px)",
          background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (picked) {
              setError(null);
              setPhoto(picked);
            }
          }}
        />

        {photoPreview ? (
          <div
            className="flex items-center gap-3 rounded-2xl border p-2"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              <Image src={photoPreview} alt="Foto elegida" fill unoptimized className="object-cover" />
            </div>
            <p className="flex-1 text-sm" style={{ color: "var(--color-muted)" }}>
              {isSending ? "Enviando foto…" : "Añade un texto si quieres y pulsa enviar"}
            </p>
            <button
              type="button"
              onClick={clearPhoto}
              disabled={isSending}
              aria-label="Quitar foto"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="px-2 text-xs" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isSending}
            aria-label="Adjuntar foto"
            data-tour="chat-photo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-50"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-accent)" }}
          >
            <ImagePlus size={19} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            enterKeyHint="send"
            placeholder={photo ? "Añade un texto (opcional)…" : `Escribe a ${partnerName}…`}
            className="min-w-0 flex-1 rounded-full border px-4 py-2.5 text-[15px] outline-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
          <button
            type="submit"
            disabled={isSending || (!text.trim() && !photo)}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </form>

      {viewing ? (
        <div
          role="dialog"
          aria-label="Foto"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setViewing(null)}
        >
          <Image src={viewing} alt="Foto" fill unoptimized className="object-contain" />
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Cerrar"
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
          >
            <X size={20} />
          </button>
        </div>
      ) : null}
    </>
  );
}
