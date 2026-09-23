import { NotebookPen } from "lucide-react";
import { formatDate } from "@/lib/format-date";

export type NoteRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export function NoteList({ notes }: { notes: NoteRow[] }) {
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
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-2xl border p-4"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            {note.title}
          </p>
          <p className="mt-1 line-clamp-3 text-sm" style={{ color: "var(--color-muted)" }}>
            {note.content}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            {formatDate(note.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
