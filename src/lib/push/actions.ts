"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "./notify";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export type PushResult = { error: string | null };

export async function saveSubscription(subscription: unknown): Promise<PushResult> {
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { error: "Suscripción no válida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
  });
  return { error: error ? "No se pudieron activar las notificaciones." : null };
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const parsed = z.string().url().max(1000).safeParse(endpoint);
  if (!parsed.success) return;
  const supabase = await createClient();
  // La RLS solo deja borrar las tuyas.
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
}

/** Te manda una notificación a ti mismo/a, para comprobar que llegan. */
export async function sendTestNotification(): Promise<PushResult> {
  if (!process.env.VAPID_PRIVATE_KEY) {
    return { error: "Falta configurar la clave de notificaciones en Vercel." };
  }
  const supabase = await createClient();
  const { data } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (!data || data.length === 0) return { error: "Este móvil no tiene las notificaciones activadas." };

  await sendPush(data as { endpoint: string; p256dh: string; auth: string }[], {
    title: "Ratta 💞",
    body: "¡Las notificaciones funcionan!",
    url: "/perfil",
    tag: "test",
  });
  return { error: null };
}
