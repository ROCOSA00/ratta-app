"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email("Introduce un email válido."),
  password: z.string().min(1, "Introduce tu contraseña."),
});

export type SignInState = { error: string | null };

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Mensaje genérico a propósito: no revelamos si el email existe o no.
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/inicio");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
    newPassword: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Repite la contraseña nueva."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error: string | null };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  }

  // Reverificamos la contraseña actual antes de cambiarla: sin esto, cualquiera
  // que encuentre el móvil desbloqueado con la sesión abierta podría cambiarla
  // sin saber la contraseña real y dejar fuera al dueño de la cuenta.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { error: "No se pudo cambiar la contraseña. Inténtalo de nuevo." };
  }

  await supabase.auth.signOut();
  redirect("/login?passwordChanged=1");
}
