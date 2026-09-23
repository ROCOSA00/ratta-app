"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";

// La app agrupa los toques y los manda en paquetes; la base de datos
// tampoco acepta más de 300 por llamada.
const countSchema = z.number().int().min(1).max(300);

export type SendHeartsResult = { error: string | null };

export async function sendHearts(count: number): Promise<SendHeartsResult> {
  const parsed = countSchema.safeParse(count);
  if (!parsed.success) return { error: "Número de corazones no válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión, nunca del cliente; add_hearts() comprueba
  // además que seas miembro y suma siempre a quien tiene la sesión.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };

  const { data: shouldNotify, error } = await supabase.rpc("add_hearts", {
    p_space_id: spaceId,
    p_count: parsed.data,
  });
  if (error) return { error: "No se pudieron mandar los corazones." };

  // Solo al empezar una racha (la base de datos decide), no en cada paquete.
  if (shouldNotify === true) {
    await notifyPartner((me) => ({
      title: "💖 Corazones",
      body: `${me} te está mandando corazones`,
      url: "/juegos/corazones",
      tag: "hearts",
    }));
  }

  return { error: null };
}
