import { Check, Trash2 } from "lucide-react";
import { ConfirmDeleteBar } from "@/components/shared/ConfirmDeleteBar";
import { deleteNote, deleteNoteItem, toggleNoteItem, updateNoteTitle } from "../actions";
import { AddItemForm } from "./AddItemForm";

type Item = { id: string; content: string; is_checked: boolean };

export function ChecklistView({
  note,
  items,
}: {
  note: { id: string; title: string };
  items: Item[];
}) {
  const done = items.filter((i) => i.is_checked).length;

  return (
    <div className="mx-5 flex flex-col gap-4">
      <div
        className="rounded-2xl border p-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <form action={updateNoteTitle} className="flex items-center gap-2">
          <input type="hidden" name="noteId" value={note.id} />
          <input
            name="title"
            defaultValue={note.title}
            className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium outline-none"
            style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", color: "var(--color-ink)" }}
          />
          <button
            type="submit"
            aria-label="Guardar título"
            className="rounded-xl p-2 text-white"
            style={{ backgroundImage: "var(--color-gradient)" }}
          >
            <Check size={16} />
          </button>
        </form>

        {items.length > 0 ? (
          <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            {done} de {items.length} hechas
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border p-3"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
            >
              <form action={toggleNoteItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="noteId" value={note.id} />
                <input type="hidden" name="nextChecked" value={(!item.is_checked).toString()} />
                <button
                  type="submit"
                  aria-label={item.is_checked ? "Marcar como pendiente" : "Marcar como hecho"}
                  className="flex h-5 w-5 items-center justify-center rounded-md border"
                  style={{
                    borderColor: item.is_checked ? "var(--color-accent-2)" : "var(--color-line)",
                    background: item.is_checked ? "var(--color-accent-2)" : "transparent",
                  }}
                >
                  {item.is_checked ? <Check size={13} color="#ffffff" /> : null}
                </button>
              </form>
              <p
                className="flex-1 text-sm"
                style={{
                  color: item.is_checked ? "var(--color-muted)" : "var(--color-ink)",
                  textDecoration: item.is_checked ? "line-through" : "none",
                }}
              >
                {item.content}
              </p>
              <form action={deleteNoteItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="noteId" value={note.id} />
                <button type="submit" aria-label="Borrar elemento" className="rounded-full p-1" style={{ color: "var(--color-muted)" }}>
                  <Trash2 size={14} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{ color: "var(--color-muted)", background: "color-mix(in srgb, var(--color-line) 50%, transparent)" }}
        >
          Sin elementos todavía.
        </p>
      )}

      <AddItemForm noteId={note.id} />

      <form action={deleteNote}>
        <input type="hidden" name="noteId" value={note.id} />
        <ConfirmDeleteBar label="Borrar lista" confirmMessage={`¿Borrar la lista "${note.title}"? No se puede deshacer.`} />
      </form>
    </div>
  );
}
