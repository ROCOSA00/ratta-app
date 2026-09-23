"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Undo2 } from "lucide-react";
import { logEntry, undoEntry, type LogEntryState } from "@/lib/poop/actions";

const initialState: LogEntryState = { error: null };
const BURST_EMOJIS = ["💩", "✨", "🎉", "🧻", "🥳"];
const UNDO_WINDOW_MS = 8000;

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
  const [undoableId, setUndoableId] = useState<string | null>(null);
  const [isUndoing, startUndo] = useTransition();

  useEffect(() => {
    if (!state.entryId) return;
    setUndoableId(state.entryId);
    const timer = window.setTimeout(() => setUndoableId(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [state.entryId]);

  function handleUndo() {
    if (!undoableId) return;
    const id = undoableId;
    setUndoableId(null);
    startUndo(() => undoEntry(id));
  }

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

      {undoableId ? (
        <button
          type="button"
          onClick={handleUndo}
          className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            color: "var(--color-accent-2)",
            background: "color-mix(in srgb, var(--color-accent-2) 12%, var(--color-surface))",
          }}
        >
          <Undo2 size={13} />
          Registrado · Deshacer
        </button>
      ) : (
        <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          {isPending ? "Registrando…" : isUndoing ? "Deshaciendo…" : "Toca para registrar"}
        </p>
      )}

      {state.error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
