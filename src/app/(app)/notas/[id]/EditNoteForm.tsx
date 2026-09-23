"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { updateNote, deleteNote, type UpdateNoteState } from "../actions";

const initialState: UpdateNoteState = { error: null };

export function EditNoteForm({ note }: { note: { id: string; title: string; content: string } }) {
  const [state, formAction, isPending] = useActionState(updateNote, initialState);

  return (
    <div className="mx-5 flex flex-col gap-4">
      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-2xl border p-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <input type="hidden" name="noteId" value={note.id} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={note.title}
            className="rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="content" className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
            Contenido
          </label>
          <textarea
            id="content"
            name="content"
            required
            rows={8}
            defaultValue={note.content}
            className="resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
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
          className="mt-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <Check size={16} />
          {isPending ? "Guardando…" : state.saved ? "Guardado ✓" : "Guardar cambios"}
        </button>
      </form>

      <form action={deleteNote}>
        <input type="hidden" name="noteId" value={note.id} />
        <ConfirmDeleteBar label="Borrar nota" confirmMessage={`¿Borrar la nota "${note.title}"? No se puede deshacer.`} />
      </form>
    </div>
  );
}
