"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const answerSchema = z.object({
  roundId: z.string().uuid("Ronda no válida."),
  answer: z.string().trim().min(1, "Escribe una respuesta."),
});

export type AnswerState = { error: string | null };

export async function submitAnswer(
  _prevState: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const parsed = answerSchema.safeParse({
    roundId: formData.get("roundId"),
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // roundId lo manda el cliente, pero no es un dato sensible: la RLS de
  // question_answers exige que exista una ronda con ese id cuyo espacio
  // sea uno del que el usuario es miembro, así que no hace falta
  // recalcular el espacio aquí (igual que note_id en note_items).
  const { error } = await supabase.from("question_answers").insert({
    round_id: parsed.data.roundId,
    user_id: user.id,
    answer: parsed.data.answer,
  });

  if (error) {
    return { error: "No se pudo guardar tu respuesta. Inténtalo de nuevo." };
  }

  revalidatePath("/mas");
  return { error: null };
}
