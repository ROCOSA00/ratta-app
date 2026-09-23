"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { logEntry, type LogEntryState } from "./actions";

const initialState: LogEntryState = { error: null };

export function LogButton() {
  const [state, formAction, isPending] = useActionState(logEntry, initialState);

  return (
    <form action={formAction} className="mx-5 flex flex-col items-center gap-2">
      <button
        type="submit"
        disabled={isPending}
        className="flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
        aria-label="Registrar visita a El Trono"
      >
        <Plus size={40} strokeWidth={2.5} />
      </button>
      <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
        {isPending ? "Registrando…" : "Toca para registrar"}
      </p>
      {state.error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
