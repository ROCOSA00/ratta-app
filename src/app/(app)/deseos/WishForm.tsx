"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { addWish, type AddWishState } from "@/lib/wishes/actions";
import { WISH_CATEGORIES, type WishCategory } from "@/lib/wishes/options";

const initialState: AddWishState = { error: null, added: 0 };
const fieldStyle = { background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" };

export function WishForm() {
  const [state, formAction, isPending] = useActionState(addWish, initialState);
  const [category, setCategory] = useState<WishCategory>("lugar");
  const [showNote, setShowNote] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Tras guardar uno, el formulario se vacía para el siguiente.
  useEffect(() => {
    if (state.added > 0) {
      formRef.current?.reset();
      setShowNote(false);
    }
  }, [state.added]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mx-5 flex flex-col gap-3 rounded-2xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
    >
      <input type="hidden" name="category" value={category} />
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="radiogroup" aria-label="Categoría">
        {WISH_CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(c.id)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: active ? "var(--color-accent)" : "var(--color-bg)",
                borderColor: active ? "var(--color-accent)" : "var(--color-line)",
                color: active ? "#ffffff" : "var(--color-ink)",
              }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Ir a Roma, ver Shrek otra vez…"
          className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Añadir deseo"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-60"
          style={{ backgroundImage: "var(--color-gradient)" }}
        >
          <Plus size={20} />
        </button>
      </div>

      {showNote ? (
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          placeholder="Una nota (opcional): cuándo, dónde, por qué…"
          className="resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={fieldStyle}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="self-start text-xs font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          + Añadir una nota
        </button>
      )}

      {state.error ? (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
