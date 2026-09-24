"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";

const scoreSchema = z.number().int().min(0).max(10000);

export type SubmitScoreResult = {
  error: string | null;
  /** Has batido tu propio récord. */
  personalBest?: boolean;
  /** Le has quitado el récord a tu pareja (y le ha llegado un aviso). */
  stoleRecord?: boolean;
};

export async function submitFlappyScore(score: number): Promise<SubmitScoreResult> {
  const parsed = scoreSchema.safeParse(score);
  if (!parsed.success) return { error: "Puntuación no válida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // El espacio sale de la sesión; record_game_score() comprueba además que
  // seas miembro y guarda siempre a nombre de quien tiene la sesión.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) return { error: "No perteneces a ningún espacio todavía." };

  const { data, error } = await supabase.rpc("record_game_score", {
    p_space_id: spaceId,
    p_game: "flappy",
    p_score: parsed.data,
  });
  if (error || !data) return { error: "No se pudo guardar la partida." };

  const { my_prev_best: myPrev, partner_best: partnerBest } = data as { my_prev_best: number; partner_best: number };
  const personalBest = parsed.data > 0 && parsed.data > myPrev;
  // Solo cuando le QUITAS el récord (antes no lo tenías tú), no en cada
  // partida en la que sigas por encima.
  const stoleRecord = partnerBest > 0 && parsed.data > partnerBest && myPrev <= partnerBest;

  if (stoleRecord) {
    const points = parsed.data;
    await notifyPartner((me) => ({
      title: "🐀 Flappy Rata",
      body: `${me} te ha quitado el récord con ${points} puntos 😈`,
      url: "/juegos/flappy",
      tag: "flappy",
    }));
  }

  return { error: null, personalBest, stoleRecord };
}
