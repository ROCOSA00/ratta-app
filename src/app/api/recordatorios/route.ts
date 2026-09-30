import { z } from "zod";
import { sendPush } from "@/lib/push/notify";
import { checkCronSecret, pushTargetsSchema } from "@/lib/push/cron-auth";
import { reminderMessage } from "@/lib/events/reminder-message";

// La llama el "despertador" de Supabase (event_reminders_tick, con pg_cron +
// pg_net) la noche antes de los planes que tienen el aviso activado. Igual
// que /api/momento: sin sesión, protegida con la clave compartida, y solo
// manda la notificación a los móviles que le pasan.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  targets: pushTargetsSchema,
  day: z.string().regex(DATE_KEY),
  events: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        time: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable(),
        love: z.boolean(),
        since: z.string().regex(DATE_KEY),
      }),
    )
    .min(1)
    .max(20),
});

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

  const { targets, day, events } = parsed.data;
  const gone = await sendPush(targets, reminderMessage(day, events));
  return Response.json({ sent: targets.length - gone.length, gone: gone.length });
}
