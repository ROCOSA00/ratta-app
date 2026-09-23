"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { sendNudge, type NudgeState } from "@/lib/nudges/actions";
import { NUDGE_GROUPS, type NudgeOption } from "@/lib/nudges/options";

const initialState: NudgeState = { error: null, sent: false };

// Selector plegado: un solo botón en Inicio que despliega los mensajitos
// agrupados por categorías. Al tocar uno se envía y el panel se cierra,
// así la pantalla no se llena de frases.
export function NudgeButtons() {
  const [state, formAction, isPending] = useActionState(sendNudge, initialState);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(NUDGE_GROUPS[0]!.id);
  const [lastSent, setLastSent] = useState<NudgeOption | null>(null);

  const group = NUDGE_GROUPS.find((g) => g.id === groupId) ?? NUDGE_GROUPS[0]!;

  function send(option: NudgeOption) {
    const formData = new FormData();
    formData.set("key", option.key);
    setLastSent(option);
    setOpen(false);
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={isPending}
        className="flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      >
        <span>💌 {isPending ? "Enviando…" : "Mandar un mensajito"}</span>
        <ChevronDown
          size={18}
          className="transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined, color: "var(--color-muted)" }}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="rounded-xl border p-2" style={{ background: "var(--color-bg)", borderColor: "var(--color-line)" }}>
          <div className="flex gap-1" role="tablist">
            {NUDGE_GROUPS.map((g) => {
              const active = g.id === group.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupId(g.id)}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold"
                  style={{
                    background: active ? "var(--color-accent)" : "transparent",
                    color: active ? "var(--color-accent-ink)" : "var(--color-muted)",
                  }}
                >
                  {g.emoji} {g.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => send(option)}
                className="rounded-full border px-3 py-1.5 text-sm font-medium"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {state.sent && !isPending && lastSent ? (
        <p className="text-center text-xs font-medium" style={{ color: "var(--color-accent)" }}>
          Enviado: {lastSent.emoji} {lastSent.label}
        </p>
      ) : null}
      {state.error && !isPending ? (
        <p className="text-center text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
