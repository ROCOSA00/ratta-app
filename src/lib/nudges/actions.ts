"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { notifyPartner } from "@/lib/push/notify";
import { findNudge } from "./options";

// Del cliente solo aceptamos la key; el emoji y el texto salen de la lista
// del servidor (options.ts), nunca del formulario.
const nudgeSchema = z.object({
  key: z.string().max(40),
});

export type NudgeState = { error: string | null; sent: boolean };

export async function sendNudge(
  _prevState: NudgeState,
  formData: FormData,
): Promise<NudgeState> {
  const parsed = nudgeSchema.safeParse({ key: formData.get("key") });
  const nudge = parsed.success ? findNudge(parsed.data.key) : null;

  if (!nudge) {
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
    metadata: { key: nudge.key, emoji: nudge.emoji, label: nudge.label },
  });

  if (error) {
    return { error: "No se pudo enviar. Inténtalo de nuevo.", sent: false };
  }

  const { emoji, label } = nudge;
  await notifyPartner((me) => ({ title: `${emoji} ${me}`, body: label, url: "/inicio", tag: "nudge" }));

  revalidatePath("/inicio");
  return { error: null, sent: true };
}
