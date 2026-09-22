"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium"
          style={{ color: "var(--color-muted)" }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-xl border px-4 py-3 text-sm outline-none"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-medium"
          style={{ color: "var(--color-muted)" }}
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-xl border px-4 py-3 text-sm outline-none"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-line)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      {state.error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
