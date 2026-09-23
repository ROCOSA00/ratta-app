import Link from "next/link";
import { ListChecks, NotebookPen, Pin } from "lucide-react";
import { formatDate } from "@/lib/format-date";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { togglePin, deleteNote } from "./actions";

export type NoteRow = {
  id: string;
  title: string;
  content: string;
  note_type: "text" | "checklist";
  created_at: string;
  is_pinned: boolean;
};

export type ChecklistProgress = { done: number; total: number };

export function NoteList({
  notes,
  progress,
}: {
  notes: NoteRow[];
  progress: Map<string, ChecklistProgress>;
}) {
  if (notes.length === 0) {
    return (
      <div
        className="mx-5 flex flex-col items-center gap-2 rounded-2xl border p-8 text-center"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
      >
        <NotebookPen size={24} style={{ color: "var(--color-muted)" }} />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No hay notas todavía.
        </p>
      </div>
    );
  }

  return (
    <ul className="mx-5 flex flex-col gap-2">
      {notes.map((note) => {
        const tint = note.is_pinned ? "var(--color-gold)" : "var(--color-accent)";
        const Icon = note.note_type === "checklist" ? ListChecks : NotebookPen;
        return (
          <li
            key={note.id}
            className="rounded-2xl border p-4"
            style={{
              background: `color-mix(in srgb, ${tint} 6%, var(--color-surface))`,
              borderColor: `color-mix(in srgb, ${tint} 18%, var(--color-line))`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/notas/${note.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${tint} 18%, var(--color-surface))`, color: tint }}
                >
                  <Icon size={14} strokeWidth={2.3} />
                </span>
                <p className="truncate text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  {note.title}
                </p>
              </Link>
              <div className="flex shrink-0 items-center">
                <form action={togglePin}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="nextPinned" value={(!note.is_pinned).toString()} />
                  <button
                    type="submit"
                    aria-label={note.is_pinned ? "Desfijar nota" : "Fijar nota"}
                    className="rounded-full p-1.5"
                    style={{ color: note.is_pinned ? "var(--color-gold)" : "var(--color-muted)" }}
                  >
                    <Pin size={16} fill={note.is_pinned ? "currentColor" : "none"} />
                  </button>
                </form>
                <form action={deleteNote}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <ConfirmDeleteButton
                    label="Borrar nota"
                    confirmMessage={`¿Borrar la nota "${note.title}"? No se puede deshacer.`}
                  />
                </form>
              </div>
            </div>
            <Link href={`/notas/${note.id}`} className="block">
              {note.note_type === "checklist" ? (
                <ChecklistSummary progress={progress.get(note.id)} tint={tint} />
              ) : (
                <p className="mt-1.5 line-clamp-3 text-sm" style={{ color: "var(--color-muted)" }}>
                  {note.content}
                </p>
              )}
              <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
                {formatDate(note.created_at)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ChecklistSummary({ progress, tint }: { progress: ChecklistProgress | undefined; tint: string }) {
  if (!progress || progress.total === 0) {
    return (
      <p className="mt-1.5 text-sm" style={{ color: "var(--color-muted)" }}>
        Lista vacía · toca para añadir
      </p>
    );
  }

  const pct = Math.round((progress.done / progress.total) * 100);
  const allDone = progress.done === progress.total;

  return (
    <div className="mt-2">
      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
        {allDone ? "¡Todo hecho! 🎉" : `${progress.done} de ${progress.total} hechas`}
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-line)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tint }} />
      </div>
    </div>
  );
}
