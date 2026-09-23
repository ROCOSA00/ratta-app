"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { updateDisplayName, type RenameState } from "@/lib/profile/actions";

const initialState: RenameState = { error: null };

export function RenameForm({ currentName }: { currentName: string }) {
  const [state, formAction, isPending] = useActionState(updateDisplayName, initialState);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="displayName" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
        Es el nombre que ve tu pareja en toda la app
      </label>
      <form action={formAction} className="flex items-center gap-2">
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={currentName}
          maxLength={30}
          required
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex shrink-0 items-center justify-center rounded-xl p-2.5 text-white disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
          aria-label="Guardar nombre"
        >
          <Check size={16} />
        </button>
      </form>
      {state.error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
