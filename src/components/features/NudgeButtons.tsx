"use client";

import { useActionState } from "react";
import { sendNudge, type NudgeState } from "@/lib/nudges/actions";

const NUDGE_OPTIONS = [
  { key: "te_quiero", emoji: "🥰", label: "Te quiero" },
  { key: "te_echo_de_menos", emoji: "🥺", label: "Te echo de menos" },
  { key: "pienso_en_ti", emoji: "💭", label: "Pienso en ti" },
  { key: "buenas_noches", emoji: "🌙", label: "Buenas noches" },
] as const;

const initialState: NudgeState = { error: null, sent: false };

export function NudgeButtons() {
  const [state, formAction, isPending] = useActionState(sendNudge, initialState);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {NUDGE_OPTIONS.map((option) => (
          <form key={option.key} action={formAction}>
            <input type="hidden" name="key" value={option.key} />
            <input type="hidden" name="emoji" value={option.emoji} />
            <input type="hidden" name="label" value={option.label} />
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
            >
              <span>{option.emoji}</span> {option.label}
            </button>
          </form>
        ))}
      </div>

      {state.sent ? (
        <p className="text-center text-xs font-medium" style={{ color: "var(--color-accent)" }}>
          Enviado 💌
        </p>
      ) : null}
      {state.error ? (
        <p className="text-center text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
