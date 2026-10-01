import { z } from "zod";
import { sendPush } from "@/lib/push/notify";
import { checkCronSecret, pushTargetsSchema } from "@/lib/push/cron-auth";

// La llama capsule_tick() en Supabase (dentro del despertador de cada hora)
// el día en que se abre una cápsula del tiempo. Igual que /api/momento: sin
// sesión, con la clave compartida, y solo avisa a los móviles que le pasan.
// Nunca recibe el contenido de la carta.

const bodySchema = z.object({
  targets: pushTargetsSchema,
  author: z.string().trim().min(1).max(60),
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

  const { targets, author } = parsed.data;
  const gone = await sendPush(targets, {
    title: "💌 ¡Hoy se abre una carta!",
    body: `${author} te escribió una carta que se abre hoy. Ábrela en Ratta.`,
    url: "/capsulas",
    tag: "capsula",
  });
  return Response.json({ sent: targets.length - gone.length, gone: gone.length });
}
