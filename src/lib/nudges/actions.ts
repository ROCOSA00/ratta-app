"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";

const NUDGE_KEYS = ["te_quiero", "te_echo_de_menos", "pienso_en_ti", "buenas_noches"] as const;

const nudgeSchema = z.object({
  key: z.enum(NUDGE_KEYS),
  emoji: z.string().trim().min(1).max(8),
  label: z.string().trim().min(1).max(40),
});

export type NudgeState = { error: string | null; sent: boolean };

export async function sendNudge(
  _prevState: NudgeState,
  formData: FormData,
): Promise<NudgeState> {
  const parsed = nudgeSchema.safeParse({
    key: formData.get("key"),
    emoji: formData.get("emoji"),
    label: formData.get("label"),
  });

  if (!parsed.success) {
    return { error: "No se pudo enviar.", sent: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar.", sent: false };
  }

  // El space_id nunca viene del cliente: se calcula aquí, en el servidor.
  const spaceId = await getCurrentSpaceId();
  if (!spaceId) {
    return { error: "No perteneces a ningún espacio todavía.", sent: false };
  }

  const { error } = await supabase.from("activity_log").insert({
    space_id: spaceId,
    user_id: user.id,
    action: "nudge",
    entity_type: "nudge",
    metadata: { key: parsed.data.key, emoji: parsed.data.emoji, label: parsed.data.label },
  });

  if (error) {
    return { error: "No se pudo enviar. Inténtalo de nuevo.", sent: false };
  }

  const { emoji, label } = parsed.data;
  await notifyPartner((me) => ({ title: `${emoji} ${me}`, body: label, url: "/inicio", tag: "nudge" }));

  revalidatePath("/inicio");
  return { error: null, sent: true };
}
