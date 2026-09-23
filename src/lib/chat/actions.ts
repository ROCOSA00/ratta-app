"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };
export type SendMessageResult = { error: string | null; message?: ChatMessage };

const bodySchema = z.string().trim().min(1, "Escribe algo.").max(2000, "Máximo 2000 caracteres.");

export async function sendMessage(body: string): Promise<SendMessageResult> {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensaje no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión, nunca del cliente.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };

  const { data, error } = await supabase
    .from("messages")
    .insert({ space_id: spaceId, sender_id: user.id, body: parsed.data })
    .select("id, sender_id, body, created_at")
    .single();
  if (error || !data) return { error: "No se pudo enviar. Inténtalo de nuevo." };

  const text = parsed.data;
  await notifyPartner((me) => ({ title: `💬 ${me}`, body: text, url: "/chat", tag: "chat" }));

  return { error: null, message: data as ChatMessage };
}
