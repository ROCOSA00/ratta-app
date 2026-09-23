import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSpaceId } from "@/lib/spaces/get-current-space";
import { NoteList, type NoteRow } from "./NoteList";
import { NewNoteForm } from "./NewNoteForm";

export default async function NotasPage() {
  const spaceId = await getCurrentSpaceId();

  let notes: NoteRow[] = [];

  if (spaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notes")
      .select("id, title, content, created_at, is_pinned")
      .eq("space_id", spaceId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    notes = data ?? [];
  }

  return (
    <>
      <PageHeader title="Notas" subtitle="Ideas, listas y recordatorios" />
      <div className="mt-5 flex flex-col gap-5">
        <NewNoteForm />
        <NoteList notes={notes} />
      </div>
    </>
  );
}
