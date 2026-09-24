"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { CHAT_BUCKET, CHAT_COLUMNS, SIGNED_URL_SECONDS, type ChatMessage } from "./types";

export type SendMessageResult = { error: string | null; message?: ChatMessage };

const bodySchema = z.string().trim().min(1, "Escribe algo.").max(2000, "Máximo 2000 caracteres.");

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

const photoSchema = z.object({
  path: z.string().regex(PATH_RE, "Ruta de foto no válida."),
  caption: z.string().trim().max(2000, "Máximo 2000 caracteres."),
});

type Insert = { body: string; image_path: string | null };

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

export async function sendMessage(body: string): Promise<SendMessageResult> {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensaje no válido." };
  return insertMessage({ body: parsed.data, image_path: null });
}

/**
 * Envía una foto que el navegador ya subió al almacén privado "chat",
 * con un texto opcional. Se llama justo después de la subida.
 */
export async function sendPhotoMessage(input: { path: string; caption: string }): Promise<SendMessageResult> {
  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Foto no válida." };
  return insertMessage({ body: parsed.data.caption, image_path: parsed.data.path });
}

/** Marca el chat como leído hasta ahora (quita el globo rojo del Chat). */
export async function markChatRead(): Promise<void> {
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return;
  const supabase = await createClient();
  await supabase.rpc("mark_chat_read", { p_space_id: spaceId });
}
