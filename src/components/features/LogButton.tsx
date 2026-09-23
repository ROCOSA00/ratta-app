"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { logEntry, type LogEntryState } from "@/lib/poop/actions";

const initialState: LogEntryState = { error: null };
const BURST_EMOJIS = ["💩", "✨", "🎉", "🧻", "🥳"];

type Particle = { id: number; emoji: string; left: number; delayMs: number };

function makeBurst(): Particle[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: Date.now() + i,
    emoji: BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)]!,
    left: 50 + (Math.random() * 70 - 35),
    delayMs: Math.random() * 150,
  }));
}

export function LogButton() {
  const [state, formAction, isPending] = useActionState(logEntry, initialState);
  const [particles, setParticles] = useState<Particle[]>([]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        setParticles(makeBurst());
        window.setTimeout(() => setParticles([]), 900);
      }}
      className="mx-5 flex flex-col items-center gap-2"
    >
      <div className="relative">
        {particles.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute top-1/2 text-2xl"
            style={{
              left: `${p.left}%`,
              animation: `emoji-burst 0.8s ease-out ${p.delayMs}ms forwards`,
            }}
          >
            {p.emoji}
          </span>
        ))}
        <button
          type="submit"
          disabled={isPending}
          className="flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
          aria-label="Registrar visita a El Trono"
        >
          <Plus size={40} strokeWidth={2.5} />
        </button>
      </div>
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
