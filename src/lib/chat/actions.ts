"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { CHAT_BUCKET, CHAT_COLUMNS, REACTION_EMOJIS, SIGNED_URL_SECONDS, type ChatMessage } from "./types";

export type SendMessageResult = { error: string | null; message?: ChatMessage };

const bodySchema = z.string().trim().min(1, "Escribe algo.").max(2000, "Máximo 2000 caracteres.");

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const replySchema = z.string().uuid("Mensaje no válido.").nullable().default(null);

const photoSchema = z.object({
  path: z.string().regex(PATH_RE, "Ruta de foto no válida."),
  caption: z.string().trim().max(2000, "Máximo 2000 caracteres."),
  replyTo: replySchema,
});

type Insert = { body: string; image_path: string | null; reply_to: string | null };

async function insertMessage(row: Insert): Promise<SendMessageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión, nunca del cliente.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };
  // La foto tiene que estar en la carpeta de este espacio (la base de datos
  // también lo exige con un CHECK).
  if (row.image_path && !row.image_path.startsWith(`${spaceId}/`)) return { error: "Ruta de foto no válida." };

  const { data, error } = await supabase
    .from("messages")
    .insert({ space_id: spaceId, sender_id: user.id, ...row })
    .select(CHAT_COLUMNS)
    .single();
  if (error || !data) return { error: "No se pudo enviar. Inténtalo de nuevo." };

  const message = { ...(data as Omit<ChatMessage, "image_url">), image_url: null } as ChatMessage;
  if (message.image_path) {
    const { data: signed } = await supabase.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(message.image_path, SIGNED_URL_SECONDS);
    message.image_url = signed?.signedUrl ?? null;
  }

  const text = row.body;
  const isPhoto = !!row.image_path;
  await notifyPartner((me) => ({
    title: `💬 ${me}`,
    body: isPhoto ? (text ? `📷 ${text}` : "📷 Te ha enviado una foto") : text,
    url: "/chat",
    tag: "chat",
  }));

  return { error: null, message };
}

/** Envía un mensaje de texto; replyTo = el mensaje al que respondes. */
export async function sendMessage(body: string, replyTo: string | null = null): Promise<SendMessageResult> {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensaje no válido." };
  const reply = replySchema.safeParse(replyTo);
  if (!reply.success) return { error: "Mensaje no válido." };
  // La base de datos exige además que el original sea de vuestro espacio.
  return insertMessage({ body: parsed.data, image_path: null, reply_to: reply.data });
}

/**
 * Envía una foto que el navegador ya subió al almacén privado "chat",
 * con un texto opcional. Se llama justo después de la subida.
 */
export async function sendPhotoMessage(input: {
  path: string;
  caption: string;
  replyTo?: string | null;
}): Promise<SendMessageResult> {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Foto no válida." };
  return insertMessage({ body: parsed.data.caption, image_path: parsed.data.path, reply_to: parsed.data.replyTo });
}

const reactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.enum(REACTION_EMOJIS).nullable(),
});

/**
 * Pone, cambia o quita (null) tu reacción a un mensaje. Si reaccionas a un
 * mensaje de tu pareja, le llega un aviso.
 */
export async function reactToMessage(messageId: string, emoji: string | null): Promise<{ error: string | null }> {
  const parsed = reactionSchema.safeParse({ messageId, emoji });
  if (!parsed.success) return { error: "Reacción no válida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // La RLS solo deja reaccionar a mensajes de tu espacio y a tu nombre.
  const { error } = await supabase.rpc("react_to_message", {
    p_message_id: parsed.data.messageId,
    p_emoji: parsed.data.emoji,
  });
  if (error) return { error: "No se pudo reaccionar. Inténtalo de nuevo." };

  const chosen = parsed.data.emoji;
  if (chosen) {
    const { data: message } = await supabase
      .from("messages")
      .select("sender_id, body, image_path")
      .eq("id", parsed.data.messageId)
      .maybeSingle();
    const original = message as { sender_id: string; body: string; image_path: string | null } | null;
    if (original && original.sender_id !== user.id) {
      const quoted = original.body ? `«${original.body.length > 60 ? `${original.body.slice(0, 59)}…` : original.body}»` : "tu foto";
      await notifyPartner((me) => ({
        title: `${chosen} ${me}`,
        body: `Ha reaccionado a ${quoted}`,
        url: "/chat",
        tag: "chat-reaction",
      }));
    }
  }
  return { error: null };
}

/** Marca el chat como leído hasta ahora (quita el globo rojo del Chat). */
export async function markChatRead(): Promise<void> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return;
  const supabase = await createClient();
  await supabase.rpc("mark_chat_read", { p_space_id: spaceId });
}
