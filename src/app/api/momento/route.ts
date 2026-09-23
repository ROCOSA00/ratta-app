import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sendPush } from "@/lib/push/notify";

// La llama el "despertador" de Supabase (moment_tick, con pg_cron + pg_net)
// cuando llega la hora del Momento Ratta de hoy. No hay sesión: se protege
// con una clave compartida (MOMENT_CRON_SECRET en Vercel, la misma que está
// en Vault en Supabase). Solo manda la notificación a los móviles que le
// pasan; no lee ni escribe nada más.

const bodySchema = z.object({
  targets: z
    .array(
      z.object({
        endpoint: z.string().url().startsWith("https://").max(1000),
        p256dh: z.string().min(1).max(200),
        auth: z.string().min(1).max(100),
      }),
    )
    .max(20),
});

function sameSecret(given: string, expected: string): boolean {
  // Comparar resúmenes de igual longitud, en tiempo constante.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.MOMENT_CRON_SECRET;
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  if (!sameSecret(header, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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
