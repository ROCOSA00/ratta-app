import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Los móviles a los que avisar, tal como los manda Supabase. */
export const pushTargetsSchema = z
  .array(
    z.object({
      endpoint: z.string().url().startsWith("https://").max(1000),
      p256dh: z.string().min(1).max(200),
      auth: z.string().min(1).max(100),
    }),
  )
  .max(20);

/**
 * Comprueba la clave con la que llaman los "despertadores" de Supabase
 * (pg_cron + pg_net) a /api/momento, /api/recordatorios y /api/capsulas. No hay sesión:
 * la clave es MOMENT_CRON_SECRET en Vercel, la misma que está en Vault.
 * Devuelve null si vale, o la respuesta de error que hay que dar.
 */
export function checkCronSecret(request: Request): Response | null {
  // trim(): al pegar la clave en Vercel es fácil que se cuele un espacio o
  // un salto de línea al principio o al final.
  const secret = process.env.MOMENT_CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });

  const header = request.headers.get("authorization") ?? "";
  if (!sameSecret(header, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

function sameSecret(given: string, expected: string): boolean {
  // Comparar resúmenes de igual longitud, en tiempo constante.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
