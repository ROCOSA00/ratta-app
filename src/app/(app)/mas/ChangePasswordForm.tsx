"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { changePassword, type ChangePasswordState } from "@/lib/auth/actions";

const initialState: ChangePasswordState = { error: null };

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) {
      formRef.current?.reset();
    }
  }, [state.error]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 self-start text-xs font-medium"
        style={{ color: "var(--color-accent-2)" }}
      >
        <KeyRound size={14} />
        {open ? "Cancelar" : "Cambiar contraseña"}
      </button>

      {open ? (
        <form ref={formRef} action={formAction} className="flex flex-col gap-2 pt-1">
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña actual"
            required
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Contraseña nueva (mínimo 8 caracteres)"
            minLength={8}
            required
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contraseña nueva"
            minLength={8}
            required
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />

          {state.error ? (
            <p className="text-xs" style={{ color: "var(--color-danger)" }}>
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            {isPending ? "Cambiando…" : "Guardar contraseña nueva"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
