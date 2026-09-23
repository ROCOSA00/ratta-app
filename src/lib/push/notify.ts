import webpush from "web-push";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "./config";

export type PushPayload = {
  title: string;
  body: string;
  /** Página que se abre al tocar la notificación. */
  url: string;
  /** Mismo tag = la notificación nueva sustituye a la anterior. */
  tag?: string;
};

type Target = { endpoint: string; p256dh: string; auth: string };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const MAX_BODY = 180;

/**
 * Envía un push a cada suscripción. Devuelve los endpoints que el
 * servicio de push da por muertos (404/410) para poder limpiarlos.
 * Si no hay clave privada configurada, no hace nada.
 */
export async function sendPush(targets: Target[], payload: PushPayload): Promise<string[]> {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey || targets.length === 0) return [];

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
  const body = payload.body.length > MAX_BODY ? `${payload.body.slice(0, MAX_BODY - 1)}…` : payload.body;
  const data = JSON.stringify({ ...payload, body });

  const gone: string[] = [];
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, data, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(t.endpoint);
        else console.error("[push] envío fallido", status ?? err);
      }
    }),
  );
  return gone;
}

async function myDisplayName(supabase: Supabase): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Tu pareja";
  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return (data?.display_name as string | undefined) || "Tu pareja";
}

/**
 * Avisa a tu pareja en todos sus dispositivos. Se envía DESPUÉS de
 * responder a la acción (after), así que nunca la hace más lenta ni la
 * puede hacer fallar.
 */
export async function notifyPartner(build: (myName: string) => PushPayload): Promise<void> {
  const supabase = await createClient();
  after(async () => {
    try {
      const [name, { data }] = await Promise.all([myDisplayName(supabase), supabase.rpc("partner_push_subscriptions")]);
      const gone = await sendPush((data ?? []) as Target[], build(name));
      await Promise.all(gone.map((endpoint) => supabase.rpc("forget_partner_push_subscription", { p_endpoint: endpoint })));
    } catch (err) {
      console.error("[push] notifyPartner", err);
    }
  });
}
