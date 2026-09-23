import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { EditNoteForm } from "./EditNoteForm";
import { ChecklistView } from "./ChecklistView";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // La RLS de notes exige pertenencia al espacio: si la nota no existe
  // o es de otro espacio, esto simplemente no devuelve fila.
  const { data: note } = await supabase
    .from("notes")
    .select("id, title, content, note_type")
    .eq("id", id)
    .maybeSingle();

  if (!note) {
    return (
      <>
        <PageHeader title="Nota no encontrada" backHref="/notas" />
        <p className="mx-5 mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Puede que ya la hayáis borrado.{" "}
          <Link href="/notas" style={{ color: "var(--color-accent)" }}>
            Volver a notas
          </Link>
        </p>
      </>
    );
  }

  const isChecklist = note.note_type === "checklist";
  let items: { id: string; content: string; is_checked: boolean }[] = [];

  if (isChecklist) {
    const { data } = await supabase
      .from("note_items")
      .select("id, content, is_checked, sort_order")
      .eq("note_id", note.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    items = data ?? [];
  }

  return (
    <>
      <PageHeader title={isChecklist ? "Lista" : "Nota"} backHref="/notas" />
      <div className="mt-4">
        {isChecklist ? <ChecklistView note={note} items={items} /> : <EditNoteForm note={note} />}
      </div>
    </>
  );
}
