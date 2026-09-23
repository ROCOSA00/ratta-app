import Link from "next/link";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { NoteList, type ChecklistProgress, type NoteRow } from "./NoteList";
import { NewNoteForm } from "./NewNoteForm";

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);
  const spaceId = await getCurrentSpaceId();

  let notes: NoteRow[] = [];
  const progress = new Map<string, ChecklistProgress>();

  if (spaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notes")
      .select("id, title, content, note_type, created_at, is_pinned")
      .eq("space_id", spaceId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    notes = data ?? [];

    const checklistIds = notes.filter((n) => n.note_type === "checklist").map((n) => n.id);
    if (checklistIds.length > 0) {
      const { data: items } = await supabase
        .from("note_items")
        .select("note_id, is_checked")
        .in("note_id", checklistIds);
      for (const item of items ?? []) {
        const p = progress.get(item.note_id) ?? { done: 0, total: 0 };
        p.total += 1;
        if (item.is_checked) p.done += 1;
        progress.set(item.note_id, p);
      }
    }
  }

  // Se filtra aquí y no en la consulta: son pocas notas, y así el texto
  // buscado nunca se mete dentro de la sintaxis de filtros de Supabase.
  const needle = query.toLowerCase();
  const visibleNotes = needle
    ? notes.filter((n) => n.title.toLowerCase().includes(needle) || n.content.toLowerCase().includes(needle))
    : notes;

  return (
    <>
      <PageHeader title="Notas" subtitle="Ideas, listas y recordatorios" />
      <div className="mt-5 flex flex-col gap-5">
        <NewNoteForm />

        {notes.length > 0 ? (
          <form action="/notas" className="mx-5 flex items-center gap-2">
            <label
              className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}
            >
              <Search size={15} style={{ color: "var(--color-muted)" }} />
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Buscar en las notas…"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--color-ink)" }}
              />
            </label>
            {query ? (
              <Link
                href="/notas"
                aria-label="Quitar búsqueda"
                className="rounded-full p-2"
                style={{ color: "var(--color-muted)" }}
              >
                <X size={16} />
              </Link>
            ) : null}
          </form>
        ) : null}

        {query && visibleNotes.length === 0 ? (
          <p className="mx-5 text-sm" style={{ color: "var(--color-muted)" }}>
            Ninguna nota contiene &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <NoteList notes={visibleNotes} progress={progress} />
        )}
      </div>
    </>
  );
}
