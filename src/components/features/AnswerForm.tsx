"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { submitAnswer, type AnswerState } from "@/lib/questions/actions";

const initialState: AnswerState = { error: null };

export function AnswerForm({ roundId }: { roundId: string }) {
  const [state, formAction, isPending] = useActionState(submitAnswer, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="roundId" value={roundId} />
      <textarea
        name="answer"
        required
        rows={3}
        placeholder="Escribe tu respuesta…"
        className="resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
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
        className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <Send size={16} />
        {isPending ? "Enviando…" : "Responder"}
      </button>
    </form>
  );
}
