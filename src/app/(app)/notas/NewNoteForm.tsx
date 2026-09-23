"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createNote, type NewNoteState } from "./actions";

const initialState: NewNoteState = { error: null };

export function NewNoteForm() {
  const [state, formAction, isPending] = useActionState(createNote, initialState);
  const [noteType, setNoteType] = useState<"text" | "checklist">("text");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && !state.error) {
      formRef.current?.reset();
      setNoteType("text");
    }
  }, [isPending, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mx-5 flex flex-col gap-3 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--color-bg)" }}>
        {(
          [
            { value: "text", label: "Texto" },
            { value: "checklist", label: "Lista" },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setNoteType(value)}
            className="flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-colors"
            style={{
              background: noteType === value ? "var(--color-surface)" : "transparent",
              color: noteType === value ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="noteType" value={noteType} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Lista de la compra"
          className="rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
        />
      </div>

      {noteType === "text" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            Contenido
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={4}
            placeholder="Escribe aquí…"
            className="resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Añadirás los elementos de la lista después de crearla.
        </p>
      )}

      {state.error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
      >
        <Plus size={16} />
        {isPending ? "Guardando…" : noteType === "checklist" ? "Crear lista" : "Añadir nota"}
      </button>
    </form>
  );
}
