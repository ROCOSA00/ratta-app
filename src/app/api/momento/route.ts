import { z } from "zod";
import { sendPush } from "@/lib/push/notify";
import { checkCronSecret, pushTargetsSchema } from "@/lib/push/cron-auth";

// La llama el "despertador" de Supabase (moment_tick, con pg_cron + pg_net)
// cuando llega la hora del Momento Ratta de hoy. No hay sesión: se protege
// con una clave compartida (MOMENT_CRON_SECRET en Vercel, la misma que está
// en Vault en Supabase). Solo manda la notificación a los móviles que le
// pasan; no lee ni escribe nada más.

const bodySchema = z.object({ targets: pushTargetsSchema });

export async function POST(request: Request): Promise<Response> {
  const denied = checkCronSecret(request);
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });

  const gone = await sendPush(parsed.data.targets, {
    title: "📸 ¡Es la hora del Momento Ratta!",
    body: "Tienes 10 minutos para subir una foto de lo que estás haciendo ahora mismo.",
    url: "/momento",
    tag: "momento",
  });

  return Response.json({ sent: parsed.data.targets.length - gone.length, gone: gone.length });
}
