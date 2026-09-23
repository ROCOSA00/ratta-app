"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { addNoteItem } from "../actions";

export function AddItemForm({ noteId }: { noteId: string }) {
  const [, formAction, isPending] = useActionState(async (_prev: null, formData: FormData) => {
    await addNoteItem(formData);
    return null;
  }, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending) {
      formRef.current?.reset();
    }
  }, [isPending]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="noteId" value={noteId} />
      <input
        name="content"
        placeholder="Añadir elemento…"
        required
        maxLength={300}
        className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex shrink-0 items-center justify-center rounded-xl p-2.5 text-white disabled:opacity-60"
        style={{ backgroundImage: "var(--color-gradient)" }}
        aria-label="Añadir elemento"
      >
        <Plus size={16} />
      </button>
    </form>
  );
}
